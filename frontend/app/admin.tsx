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
  saveMewsData,
  loadMewsData,
  HotelSettings,
  DEFAULT_SETTINGS,
  MewsDailyData 
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
  const [dataDetails, setDataDetails] = useState({ daily: 0, weekly: 0, monthly: 0 });
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();

  useEffect(() => {
    loadCurrentData();
  }, []);

  const loadCurrentData = async () => {
    try {
      const [loadedSettings, update, mewsData] = await Promise.all([
        loadSettings(),
        getLastUpdate(),
        loadMewsData(),
      ]);
      setSettings(loadedSettings);
      setLastUpdate(update);
      // Count total periods from Mews data
      const totalPeriods = mewsData.daily.length + mewsData.weekly.length + mewsData.monthly.length;
      setReservationCount(totalPeriods);
      setDataDetails({
        daily: mewsData.daily.length,
        weekly: mewsData.weekly.length,
        monthly: mewsData.monthly.length,
      });
      console.log('Current Mews data:', { daily: mewsData.daily.length, weekly: mewsData.weekly.length, monthly: mewsData.monthly.length });
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Process XLSX files and save to Mews data store (REPLACES, doesn't append)
  const processAndSaveXLSXFiles = async (filesData: { content: ArrayBuffer | string, fileName: string }[]): Promise<string[]> => {
    const results: string[] = [];
    
    // First, clear existing data to avoid duplicates
    await clearAllData();
    
    // Collect all data by type
    const dailyData: MewsDailyData[] = [];
    const weeklyData: MewsDailyData[] = [];
    const monthlyData: MewsDailyData[] = [];

    for (const { content, fileName } of filesData) {
      try {
        const { data, reportType, errors } = parseXLSX(content, settings.total_rooms);

        if (data.length === 0) {
          results.push(`✗ ${fileName}: ${errors.length > 0 ? errors[0] : 'No data found'}`);
          continue;
        }

        // Sort data by type
        if (reportType === 'daily') {
          dailyData.push(...data);
        } else if (reportType === 'weekly') {
          weeklyData.push(...data);
        } else if (reportType === 'monthly') {
          monthlyData.push(...data);
        } else {
          // Unknown type - try to guess based on period format
          monthlyData.push(...data);
        }

        const typeLabel = reportType === 'daily' ? 'Daily' : 
                          reportType === 'weekly' ? 'Weekly' : 
                          reportType === 'monthly' ? 'Monthly' : 'Report';
        
        results.push(`✓ ${fileName} (${typeLabel}): ${data.length} periods`);
      } catch (error: any) {
        results.push(`✗ ${fileName}: ${error.message}`);
      }
    }

    // Save all collected data (REPLACES existing)
    await saveMewsData({
      daily: dailyData,
      weekly: weeklyData,
      monthly: monthlyData,
    });

    console.log('Saved Mews data:', { daily: dailyData.length, weekly: weeklyData.length, monthly: monthlyData.length });

    return results;
  };

  // Web-specific: Handle multiple files
  const handleWebMultiFileUpload = useCallback(async (event: any) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setLastResult(null);

    try {
      // Read all files first
      const filesData: { content: ArrayBuffer | string, fileName: string }[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = file.name;
        const isXLSX = fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls');

        if (!isXLSX) {
          continue; // Skip non-XLSX files
        }

        const content = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
          reader.onerror = () => reject(new Error('Could not read file'));
          reader.readAsArrayBuffer(file);
        });

        filesData.push({ content, fileName });
      }

      if (filesData.length === 0) {
        Alert.alert(
          language === 'en' ? 'Error' : 'Fehler',
          language === 'en' ? 'No valid XLSX files selected' : 'Keine gültigen XLSX-Dateien ausgewählt'
        );
        setUploading(false);
        return;
      }

      // Process all files and save (REPLACES existing data)
      const results = await processAndSaveXLSXFiles(filesData);
      
      await loadCurrentData();
      
      const successCount = results.filter(r => r.startsWith('✓')).length;
      const summary = `${successCount}/${filesData.length} ${language === 'en' ? 'files imported' : 'Dateien importiert'}\n\n${results.join('\n')}\n\n${language === 'en' ? 'Previous data was replaced.' : 'Vorherige Daten wurden ersetzt.'}`;
      setLastResult(summary);
      
      Alert.alert(
        successCount > 0 ? (language === 'en' ? 'Import Complete' : 'Import Abgeschlossen') : (language === 'en' ? 'Import Failed' : 'Import Fehlgeschlagen'),
        summary
      );
    } catch (error: any) {
      setLastResult(`✗ Error: ${error.message}`);
      Alert.alert(language === 'en' ? 'Error' : 'Fehler', error.message);
    } finally {
      setUploading(false);
    }
  }, [language, settings.total_rooms]);

  // Mobile-specific: Pick multiple files
  const pickAndUploadFiles = useCallback(async () => {
    // For web, use hidden file input with multiple
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx,.xls';
      input.multiple = true; // Allow multiple files
      input.onchange = handleWebMultiFileUpload;
      input.click();
      return;
    }

    // For mobile (Expo Go), use document picker
    try {
      console.log('Starting file picker...');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
               'application/vnd.ms-excel', '*/*'],
        copyToCacheDirectory: true,
        multiple: true, // Allow multiple files on supported platforms
      });

      console.log('Picker result:', JSON.stringify(result));

      if (result.canceled) {
        console.log('User cancelled file selection');
        return;
      }

      setUploading(true);
      setLastResult(null);

      // Collect all files content first
      const filesData: { content: ArrayBuffer | string, fileName: string }[] = [];

      for (const file of result.assets) {
        console.log('Reading file:', file.name, file.uri);
        const fileName = file.name.toLowerCase();
        const isXLSX = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

        if (!isXLSX) {
          console.log('Skipping non-XLSX file:', file.name);
          continue;
        }

        try {
          // Try multiple methods to read the XLSX file
          let content: ArrayBuffer | string | null = null;
          
          // Method 1: Try using fetch (works on most platforms)
          try {
            console.log('Trying fetch method...');
            const response = await fetch(file.uri);
            content = await response.arrayBuffer();
            console.log('Fetch succeeded, size:', (content as ArrayBuffer).byteLength);
          } catch (fetchError) {
            console.log('Fetch failed:', fetchError);
          }

          // Method 2: Try FileSystem as base64
          if (!content) {
            try {
              console.log('Trying FileSystem base64 method...');
              const base64Content = await FileSystem.readAsStringAsync(file.uri, { 
                encoding: 'base64' as any
              });
              console.log('FileSystem succeeded, length:', base64Content.length);
              content = base64Content; // Keep as base64 string
            } catch (fsError) {
              console.log('FileSystem failed:', fsError);
            }
          }

          if (content) {
            filesData.push({ content, fileName: file.name });
          } else {
            console.log('Could not read file:', file.name);
          }
        } catch (fileError: any) {
          console.log('Error reading file:', file.name, fileError.message);
        }
      }

      if (filesData.length === 0) {
        Alert.alert(
          language === 'en' ? 'Error' : language === 'nl' ? 'Fout' : 'Fehler',
          language === 'en' ? 'No valid XLSX files could be read' : language === 'nl' ? 'Geen geldige XLSX-bestanden konden worden gelezen' : 'Keine gültigen XLSX-Dateien konnten gelesen werden'
        );
        setUploading(false);
        return;
      }

      // Process all files and save (REPLACES existing data - clears first!)
      const results = await processAndSaveXLSXFiles(filesData);
      
      await loadCurrentData();
      
      const successCount = results.filter(r => r.startsWith('✓')).length;
      const summary = `${successCount}/${filesData.length} ${language === 'en' ? 'files imported' : language === 'nl' ? 'bestanden geïmporteerd' : 'Dateien importiert'}\n\n${results.join('\n')}\n\n${language === 'en' ? 'Previous data was replaced.' : language === 'nl' ? 'Vorige gegevens zijn vervangen.' : 'Vorherige Daten wurden ersetzt.'}`;
      setLastResult(summary);
      
      Alert.alert(
        successCount > 0 ? (language === 'en' ? 'Import Complete' : language === 'nl' ? 'Import Voltooid' : 'Import Abgeschlossen') : (language === 'en' ? 'Import Failed' : language === 'nl' ? 'Import Mislukt' : 'Import Fehlgeschlagen'),
        summary
      );
    } catch (error: any) {
      console.error('Upload error:', error);
      setLastResult(`✗ ${t.error}: ${error.message}`);
      Alert.alert(t.error, error.message);
    } finally {
      setUploading(false);
    }
  }, [language, t, settings.total_rooms, handleWebMultiFileUpload, processAndSaveXLSXFiles]);

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
              <Text style={styles.statusValue}>{dataDetails.daily}</Text>
              <Text style={styles.statusItemLabel}>Daily</Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>{dataDetails.weekly}</Text>
              <Text style={styles.statusItemLabel}>Weekly</Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>{dataDetails.monthly}</Text>
              <Text style={styles.statusItemLabel}>Monthly</Text>
            </View>
          </View>
          <View style={[styles.statusDetails, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1F1F23' }]}>
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>{settings.total_rooms}</Text>
              <Text style={styles.statusItemLabel}>{t.rooms}</Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <Text style={[styles.statusValue, { fontSize: 14 }]}>{formatDate(lastUpdate)}</Text>
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
            onPress={pickAndUploadFiles}
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
