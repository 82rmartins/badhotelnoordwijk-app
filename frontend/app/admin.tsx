import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

import { 
  saveReservations, 
  loadReservations, 
  saveSettings, 
  loadSettings, 
  getLastUpdate,
  clearAllData,
  HotelSettings,
  DEFAULT_SETTINGS 
} from '../utils/storage';
import { parseCSV } from '../utils/csvParser';
import { generateDemoReservations } from '../utils/calculations';

export default function AdminScreen() {
  const [uploading, setUploading] = useState(false);
  const [seedingData, setSeedingData] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [settings, setSettings] = useState<HotelSettings>(DEFAULT_SETTINGS);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [reservationCount, setReservationCount] = useState(0);
  const router = useRouter();

  // Load current data on mount
  useEffect(() => {
    loadCurrentData();
  }, []);

  const loadCurrentData = async () => {
    try {
      const [loadedSettings, update, reservations] = await Promise.all([
        loadSettings(),
        getLastUpdate(),
        loadReservations(),
      ]);
      setSettings(loadedSettings);
      setLastUpdate(update);
      setReservationCount(reservations.length);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const pickAndUploadCSV = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      setUploading(true);
      setLastResult(null);

      // Read file content
      let content: string;
      try {
        content = await FileSystem.readAsStringAsync(file.uri);
      } catch (readError) {
        throw new Error('Não foi possível ler o arquivo. Verifique se é um CSV válido.');
      }

      // Parse CSV
      const { reservations, errors } = parseCSV(content);

      if (reservations.length === 0) {
        throw new Error('Nenhuma reserva válida encontrada no arquivo.');
      }

      // Save to local storage
      await saveReservations(reservations);

      // Update state
      await loadCurrentData();

      const message = `✓ Processado: ${reservations.length} reservas importadas`;
      setLastResult(message);
      
      if (errors.length > 0) {
        Alert.alert(
          'Importação Concluída',
          `${reservations.length} reservas importadas.\n\nAvisos:\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? `\n...e mais ${errors.length - 3}` : ''}`
        );
      } else {
        Alert.alert('Sucesso', message);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setLastResult(`✗ Erro: ${error.message}`);
      Alert.alert('Erro', error.message);
    } finally {
      setUploading(false);
    }
  }, []);

  const seedDemoData = useCallback(async () => {
    try {
      setSeedingData(true);
      setLastResult(null);

      // Generate demo reservations
      const demoReservations = generateDemoReservations(settings);

      // Save to local storage
      await saveReservations(demoReservations);

      // Update state
      await loadCurrentData();

      const message = `✓ ${demoReservations.length} reservas de demonstração criadas`;
      setLastResult(message);
      Alert.alert('Sucesso', message);
    } catch (error: any) {
      console.error('Seed error:', error);
      setLastResult(`✗ Erro: ${error.message}`);
      Alert.alert('Erro', error.message);
    } finally {
      setSeedingData(false);
    }
  }, [settings]);

  const handleClearData = useCallback(async () => {
    Alert.alert(
      'Limpar Dados',
      'Tem certeza que deseja apagar todos os dados? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
              await loadCurrentData();
              setLastResult('✓ Dados apagados com sucesso');
              Alert.alert('Sucesso', 'Todos os dados foram apagados.');
            } catch (error: any) {
              Alert.alert('Erro', error.message);
            }
          },
        },
      ]
    );
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
           date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Administração</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Ionicons name="server-outline" size={20} color="#10B981" />
            <Text style={styles.statusLabel}>Dados Locais</Text>
          </View>
          <View style={styles.statusDetails}>
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>{reservationCount}</Text>
              <Text style={styles.statusItemLabel}>Reservas</Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>{settings.total_rooms}</Text>
              <Text style={styles.statusItemLabel}>Quartos</Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>{formatDate(lastUpdate).split(' ')[0]}</Text>
              <Text style={styles.statusItemLabel}>Atualização</Text>
            </View>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color="#60A5FA" />
          <Text style={styles.infoText}>
            Faça upload do arquivo CSV exportado do Mews PMS para atualizar os dados. Todos os cálculos são feitos localmente no dispositivo.
          </Text>
        </View>

        {/* Upload Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Importar Dados do Mews</Text>
          <Text style={styles.sectionSubtitle}>
            Upload de arquivo CSV com reservas
          </Text>

          <TouchableOpacity
            style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
            onPress={pickAndUploadCSV}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Ionicons name="cloud-upload" size={24} color="#FFFFFF" />
            )}
            <Text style={styles.uploadButtonText}>
              {uploading ? 'Processando...' : 'Selecionar Arquivo CSV'}
            </Text>
          </TouchableOpacity>

          <View style={styles.formatInfo}>
            <Text style={styles.formatTitle}>Formato esperado do CSV:</Text>
            <View style={styles.formatRow}>
              <Text style={styles.formatLabel}>Colunas obrigatórias:</Text>
              <Text style={styles.formatValue}>
                reservation_id, guest_name, room_number, check_in, check_out
              </Text>
            </View>
            <View style={styles.formatRow}>
              <Text style={styles.formatLabel}>Colunas opcionais:</Text>
              <Text style={styles.formatValue}>
                room_revenue, parking_revenue, vending_revenue, city_tax, status
              </Text>
            </View>
            <View style={styles.formatRow}>
              <Text style={styles.formatLabel}>Formatos de data:</Text>
              <Text style={styles.formatValue}>
                YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY
              </Text>
            </View>
          </View>
        </View>

        {/* Demo Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados de Demonstração</Text>
          <Text style={styles.sectionSubtitle}>
            Gerar dados fictícios para teste
          </Text>

          <TouchableOpacity
            style={[styles.demoButton, seedingData && styles.uploadButtonDisabled]}
            onPress={seedDemoData}
            disabled={seedingData}
          >
            {seedingData ? (
              <ActivityIndicator color="#111113" />
            ) : (
              <Ionicons name="flask" size={24} color="#111113" />
            )}
            <Text style={styles.demoButtonText}>
              {seedingData ? 'Gerando...' : 'Criar Dados de Demo'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.warningText}>
            <Ionicons name="warning" size={12} color="#F59E0B" />
            {' '}Atenção: Esta ação irá substituir todos os dados existentes.
          </Text>
        </View>

        {/* Last Result */}
        {lastResult && (
          <View style={[
            styles.resultBox,
            lastResult.startsWith('✓') ? styles.resultSuccess : styles.resultError
          ]}>
            <Text style={styles.resultText}>{lastResult}</Text>
          </View>
        )}

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configurações do Hotel</Text>
          <Text style={styles.sectionSubtitle}>Parâmetros atuais</Text>

          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Total de quartos</Text>
              <Text style={styles.settingValue}>{settings.total_rooms}</Text>
            </View>
            <View style={styles.settingDivider} />
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Meta alta temporada (Abr-Set)</Text>
              <Text style={styles.settingValue}>{settings.high_season_target}%</Text>
            </View>
            <View style={styles.settingDivider} />
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Meta baixa temporada (Out-Mar)</Text>
              <Text style={styles.settingValue}>{settings.low_season_target}%</Text>
            </View>
          </View>
        </View>

        {/* Clear Data Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleClearData}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
            <Text style={styles.dangerButtonText}>Limpar Todos os Dados</Text>
          </TouchableOpacity>
        </View>

        {/* Architecture Info */}
        <View style={styles.section}>
          <View style={styles.archCard}>
            <Ionicons name="phone-portrait-outline" size={20} color="#6B7280" />
            <Text style={styles.archText}>
              V1 — Processamento 100% local. Dados armazenados no dispositivo. Funciona offline.
            </Text>
          </View>
        </View>

        <View style={styles.footerSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F23',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#1F1F23',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  statusCard: {
    backgroundColor: '#10B98115',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#10B98130',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  statusDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
    flex: 1,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusItemLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  statusDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#10B98130',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#60A5FA15',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#60A5FA30',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#93C5FD',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  uploadButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  formatInfo: {
    backgroundColor: '#111113',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#1F1F23',
  },
  formatTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 12,
  },
  formatRow: {
    marginBottom: 10,
  },
  formatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  formatValue: {
    fontSize: 11,
    color: '#D1D5DB',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  demoButton: {
    flexDirection: 'row',
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  demoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111113',
  },
  warningText: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 12,
    textAlign: 'center',
  },
  resultBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  resultSuccess: {
    backgroundColor: '#10B98115',
    borderWidth: 1,
    borderColor: '#10B98130',
  },
  resultError: {
    backgroundColor: '#EF444415',
    borderWidth: 1,
    borderColor: '#EF444430',
  },
  resultText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  settingsCard: {
    backgroundColor: '#111113',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F1F23',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingDivider: {
    height: 1,
    backgroundColor: '#1F1F23',
  },
  settingLabel: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dangerButton: {
    flexDirection: 'row',
    backgroundColor: '#EF444415',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#EF444430',
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#EF4444',
  },
  archCard: {
    flexDirection: 'row',
    backgroundColor: '#111113',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F1F23',
    gap: 12,
    alignItems: 'flex-start',
  },
  archText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  footerSpacer: {
    height: 40,
  },
});
