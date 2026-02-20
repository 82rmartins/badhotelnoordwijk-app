import React, { useState, useCallback } from 'react';
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

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function AdminScreen() {
  const [uploading, setUploading] = useState(false);
  const [seedingData, setSeedingData] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const router = useRouter();

  const pickAndUploadCSV = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      setUploading(true);
      setLastResult(null);

      // Create form data
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name || 'reservations.csv',
        type: 'text/csv',
      } as any);

      const response = await fetch(`${BACKEND_URL}/api/upload/reservations`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setLastResult(`✓ ${data.message}`);
        Alert.alert('Sucesso', data.message);
      } else {
        setLastResult(`✗ Erro: ${data.detail || 'Falha no upload'}`);
        Alert.alert('Erro', data.detail || 'Falha no upload');
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

      const response = await fetch(`${BACKEND_URL}/api/seed-demo-data`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setLastResult(`✓ ${data.message}`);
        Alert.alert('Sucesso', data.message);
      } else {
        setLastResult(`✗ Erro: ${data.detail || 'Falha ao criar dados'}`);
        Alert.alert('Erro', data.detail || 'Falha ao criar dados');
      }
    } catch (error: any) {
      console.error('Seed error:', error);
      setLastResult(`✗ Erro: ${error.message}`);
      Alert.alert('Erro', error.message);
    } finally {
      setSeedingData(false);
    }
  }, []);

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
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color="#60A5FA" />
          <Text style={styles.infoText}>
            Faça upload do arquivo CSV exportado do Mews PMS para atualizar os dados do painel.
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
              <Text style={styles.settingValue}>24</Text>
            </View>
            <View style={styles.settingDivider} />
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Meta alta temporada (Abr-Set)</Text>
              <Text style={styles.settingValue}>85%</Text>
            </View>
            <View style={styles.settingDivider} />
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Meta baixa temporada (Out-Mar)</Text>
              <Text style={styles.settingValue}>65%</Text>
            </View>
          </View>
        </View>

        {/* API Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Integração API</Text>
          <Text style={styles.sectionSubtitle}>Preparado para automação futura</Text>

          <View style={styles.apiCard}>
            <Ionicons name="code-slash" size={20} color="#6B7280" />
            <Text style={styles.apiText}>
              A arquitetura está preparada para integração direta com a API do Mews PMS. Atualmente operando em modo CSV.
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
  apiCard: {
    flexDirection: 'row',
    backgroundColor: '#111113',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F1F23',
    gap: 12,
    alignItems: 'flex-start',
  },
  apiText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
  },
  footerSpacer: {
    height: 40,
  },
});
