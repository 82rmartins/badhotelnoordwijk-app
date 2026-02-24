import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { parseXLSX } from '../utils/xlsxParser';
import { generateDemoReservations } from '../utils/calculations';
import { useLanguage } from '../utils/LanguageContext';

export default function AdminScreen() {
  const [uploading, setUploading] = useState(false);
  const [seedingData, setSeedingData] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [settings, setSettings] = useState<HotelSettings>(DEFAULT_SETTINGS);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [reservationCount, setReservationCount] = useState(0);
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();

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

  const pickAndUploadFile = useCallback(async () => {
    try {
      console.log('Starting file picker...');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv', 
               'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
               'application/vnd.ms-excel', '*/*'],
        copyToCacheDirectory: true,
      });

      console.log('Picker result:', JSON.stringify(result));

      if (result.canceled) {
        console.log('User cancelled file selection');
        return;
      }

      const file = result.assets[0];
      console.log('File selected:', file.name, file.uri);
      const fileName = file.name.toLowerCase();
      const isXLSX = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
      
      setUploading(true);
      setLastResult(null);

      if (isXLSX) {
        // Handle XLSX file
        let content: string;
        try {
          content = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
        } catch (readError) {
          throw new Error(language === 'en' ? 'Could not read Excel file.' : language === 'nl' ? 'Kon Excel bestand niet lezen.' : 'Excel-Datei konnte nicht gelesen werden.');
        }

        const { reservations, data, reportType, errors } = parseXLSX(content, settings.total_rooms);

        if (reservations.length === 0 && data.length === 0) {
          throw new Error(language === 'en' ? 'No valid data found in Excel file.' : language === 'nl' ? 'Geen geldige data gevonden in Excel bestand.' : 'Keine gültigen Daten in Excel-Datei gefunden.');
        }

        await saveReservations(reservations);
        await loadCurrentData();

        const typeLabel = reportType === 'daily' ? (language === 'en' ? 'Daily' : language === 'nl' ? 'Dagelijks' : 'Täglich') :
                          reportType === 'weekly' ? (language === 'en' ? 'Weekly' : language === 'nl' ? 'Wekelijks' : 'Wöchentlich') :
                          reportType === 'monthly' ? (language === 'en' ? 'Monthly' : language === 'nl' ? 'Maandelijks' : 'Monatlich') : '';
        
        const message = `✓ ${typeLabel} ${language === 'en' ? 'report imported' : language === 'nl' ? 'rapport geïmporteerd' : 'Bericht importiert'}: ${data.length} ${language === 'en' ? 'days of data' : language === 'nl' ? 'dagen aan data' : 'Tage an Daten'}`;
        setLastResult(message);
        
        Alert.alert(
          language === 'en' ? 'Success' : language === 'nl' ? 'Succes' : 'Erfolg',
          message
        );
      } else {
        // Handle CSV file
        let content: string;
        try {
          content = await FileSystem.readAsStringAsync(file.uri);
        } catch (readError) {
          throw new Error(language === 'en' ? 'Could not read file. Make sure it is a valid CSV.' : 'Kon bestand niet lezen. Zorg ervoor dat het een geldig CSV is.');
        }

        const { reservations, errors } = parseCSV(content);

        if (reservations.length === 0) {
          throw new Error(language === 'en' ? 'No valid reservations found in file.' : 'Geen geldige reserveringen gevonden in bestand.');
        }

        await saveReservations(reservations);
        await loadCurrentData();

        const message = `✓ ${language === 'en' ? 'Processed' : 'Verwerkt'}: ${reservations.length} ${language === 'en' ? 'reservations imported' : 'reserveringen geïmporteerd'}`;
        setLastResult(message);
        
        if (errors.length > 0) {
          Alert.alert(
            language === 'en' ? 'Import Complete' : 'Import Voltooid',
            `${reservations.length} ${language === 'en' ? 'reservations imported' : 'reserveringen geïmporteerd'}.\n\n${language === 'en' ? 'Warnings' : 'Waarschuwingen'}:\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? `\n...${language === 'en' ? 'and' : 'en nog'} ${errors.length - 3} ${language === 'en' ? 'more' : 'meer'}` : ''}`
          );
        } else {
          Alert.alert(t.success, message);
        }
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setLastResult(`✗ ${t.error}: ${error.message}`);
      Alert.alert(t.error, error.message);
    } finally {
      setUploading(false);
    }
  }, [language, t, settings.total_rooms]);

  const seedDemoData = useCallback(async () => {
    try {
      setSeedingData(true);
      setLastResult(null);

      const demoReservations = generateDemoReservations(settings);
      await saveReservations(demoReservations);
      await loadCurrentData();

      const message = `✓ ${demoReservations.length} ${language === 'en' ? 'demo reservations created' : 'demo reserveringen aangemaakt'}`;
      setLastResult(message);
      Alert.alert(t.success, message);
    } catch (error: any) {
      console.error('Seed error:', error);
      setLastResult(`✗ ${t.error}: ${error.message}`);
      Alert.alert(t.error, error.message);
    } finally {
      setSeedingData(false);
    }
  }, [settings, language, t]);

  const handleClearData = useCallback(async () => {
    Alert.alert(
      t.clearConfirmTitle,
      t.clearConfirmMessage,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
              await loadCurrentData();
              setLastResult(`✓ ${t.dataCleared}`);
              Alert.alert(t.success, t.dataCleared);
            } catch (error: any) {
              Alert.alert(t.error, error.message);
            }
          },
        },
      ]
    );
  }, [t]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t.never;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
           date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.administration}</Text>
        <View style={styles.langToggle}>
          <TouchableOpacity style={[styles.langBtn, language === 'en' && styles.langBtnActive]} onPress={() => setLanguage('en')}>
            <Text style={[styles.langBtnText, language === 'en' && styles.langBtnTextActive]}>EN</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.langBtn, language === 'nl' && styles.langBtnActive]} onPress={() => setLanguage('nl')}>
            <Text style={[styles.langBtnText, language === 'nl' && styles.langBtnTextActive]}>NL</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.langBtn, language === 'de' && styles.langBtnActive]} onPress={() => setLanguage('de')}>
            <Text style={[styles.langBtnText, language === 'de' && styles.langBtnTextActive]}>DE</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Ionicons name="server-outline" size={20} color="#10B981" />
            <Text style={styles.statusLabel}>{t.localData}</Text>
          </View>
          <View style={styles.statusDetails}>
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>{reservationCount}</Text>
              <Text style={styles.statusItemLabel}>{t.reservations}</Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>{settings.total_rooms}</Text>
              <Text style={styles.statusItemLabel}>{t.rooms}</Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>{formatDate(lastUpdate).split(' ')[0]}</Text>
              <Text style={styles.statusItemLabel}>{t.update}</Text>
            </View>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color="#60A5FA" />
          <Text style={styles.infoText}>{t.uploadInfo}</Text>
        </View>

        {/* Upload Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.importFromMews}</Text>
          <Text style={styles.sectionSubtitle}>{t.csvUpload}</Text>

          <TouchableOpacity
            style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
            onPress={pickAndUploadFile}
            disabled={uploading}
          >
            {uploading ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="cloud-upload" size={24} color="#FFFFFF" />}
            <Text style={styles.uploadButtonText}>{uploading ? t.processing : t.selectCsvFile}</Text>
          </TouchableOpacity>

          <View style={styles.formatInfo}>
            <Text style={styles.formatTitle}>{t.expectedFormat}</Text>
            <View style={styles.formatRow}>
              <Text style={styles.formatLabel}>{t.requiredColumns}</Text>
              <Text style={styles.formatValue}>reservation_id, guest_name, room_number, check_in, check_out</Text>
            </View>
            <View style={styles.formatRow}>
              <Text style={styles.formatLabel}>{t.optionalColumns}</Text>
              <Text style={styles.formatValue}>room_revenue, parking_revenue, vending_revenue, city_tax, status</Text>
            </View>
            <View style={styles.formatRow}>
              <Text style={styles.formatLabel}>{t.dateFormats}</Text>
              <Text style={styles.formatValue}>YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY</Text>
            </View>
          </View>
        </View>

        {/* Demo Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.demoData}</Text>
          <Text style={styles.sectionSubtitle}>{t.generateTestData}</Text>

          <TouchableOpacity
            style={[styles.demoButton, seedingData && styles.uploadButtonDisabled]}
            onPress={seedDemoData}
            disabled={seedingData}
          >
            {seedingData ? <ActivityIndicator color="#111113" /> : <Ionicons name="flask" size={24} color="#111113" />}
            <Text style={styles.demoButtonText}>{seedingData ? t.generating : t.createDemoData}</Text>
          </TouchableOpacity>

          <Text style={styles.warningText}>
            <Ionicons name="warning" size={12} color="#F59E0B" /> {t.warning}: {t.replaceWarning}
          </Text>
        </View>

        {/* Last Result */}
        {lastResult && (
          <View style={[styles.resultBox, lastResult.startsWith('✓') ? styles.resultSuccess : styles.resultError]}>
            <Text style={styles.resultText}>{lastResult}</Text>
          </View>
        )}

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.hotelSettings}</Text>
          <Text style={styles.sectionSubtitle}>{t.currentParams}</Text>

          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>{t.totalRooms}</Text>
              <Text style={styles.settingValue}>{settings.total_rooms}</Text>
            </View>
            <View style={styles.settingDivider} />
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>{t.highSeasonTarget}</Text>
              <Text style={styles.settingValue}>{settings.high_season_target}%</Text>
            </View>
            <View style={styles.settingDivider} />
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>{t.lowSeasonTarget}</Text>
              <Text style={styles.settingValue}>{settings.low_season_target}%</Text>
            </View>
          </View>
        </View>

        {/* Clear Data Section */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.dangerButton} onPress={handleClearData}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
            <Text style={styles.dangerButtonText}>{t.clearAllData}</Text>
          </TouchableOpacity>
        </View>

        {/* Architecture Info */}
        <View style={styles.section}>
          <View style={styles.archCard}>
            <Ionicons name="phone-portrait-outline" size={20} color="#6B7280" />
            <Text style={styles.archText}>{t.v1Architecture}</Text>
          </View>
        </View>

        <View style={styles.footerSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0B' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1F1F23' },
  backButton: { padding: 8, borderRadius: 8, backgroundColor: '#1F1F23' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  langToggle: { flexDirection: 'row', backgroundColor: '#1F1F23', borderRadius: 6, overflow: 'hidden' },
  langBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  langBtnActive: { backgroundColor: '#10B981' },
  langBtnText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  langBtnTextActive: { color: '#FFFFFF' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  statusCard: { backgroundColor: '#10B98115', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#10B98130' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  statusLabel: { fontSize: 14, fontWeight: '600', color: '#10B981' },
  statusDetails: { flexDirection: 'row', justifyContent: 'space-around' },
  statusItem: { alignItems: 'center', flex: 1 },
  statusValue: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  statusItemLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  statusDivider: { width: 1, height: 30, backgroundColor: '#10B98130' },
  infoCard: { flexDirection: 'row', backgroundColor: '#60A5FA15', borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#60A5FA30', gap: 12 },
  infoText: { flex: 1, fontSize: 13, color: '#93C5FD', lineHeight: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  uploadButton: { flexDirection: 'row', backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', gap: 12 },
  uploadButtonDisabled: { opacity: 0.6 },
  uploadButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  formatInfo: { backgroundColor: '#111113', borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#1F1F23' },
  formatTitle: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', marginBottom: 12 },
  formatRow: { marginBottom: 10 },
  formatLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  formatValue: { fontSize: 11, color: '#D1D5DB', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  demoButton: { flexDirection: 'row', backgroundColor: '#F59E0B', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', gap: 12 },
  demoButtonText: { fontSize: 16, fontWeight: '600', color: '#111113' },
  warningText: { fontSize: 12, color: '#F59E0B', marginTop: 12, textAlign: 'center' },
  resultBox: { borderRadius: 12, padding: 16, marginBottom: 24 },
  resultSuccess: { backgroundColor: '#10B98115', borderWidth: 1, borderColor: '#10B98130' },
  resultError: { backgroundColor: '#EF444415', borderWidth: 1, borderColor: '#EF444430' },
  resultText: { fontSize: 14, color: '#FFFFFF', textAlign: 'center' },
  settingsCard: { backgroundColor: '#111113', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1F1F23' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  settingDivider: { height: 1, backgroundColor: '#1F1F23' },
  settingLabel: { fontSize: 13, color: '#9CA3AF' },
  settingValue: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  dangerButton: { flexDirection: 'row', backgroundColor: '#EF444415', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#EF444430' },
  dangerButtonText: { fontSize: 14, fontWeight: '500', color: '#EF4444' },
  archCard: { flexDirection: 'row', backgroundColor: '#111113', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1F1F23', gap: 12, alignItems: 'flex-start' },
  archText: { flex: 1, fontSize: 12, color: '#6B7280', lineHeight: 18 },
  footerSpacer: { height: 40 },
});
