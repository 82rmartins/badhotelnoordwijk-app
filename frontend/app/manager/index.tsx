// ============================================
// MANAGER MODE - DESIGN ORIGINAL + DATA CONTRACT
// ============================================
// Visual: Dark theme matching Guest Mode
// Data: App NEVER calculates, only READS from Excel

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { loadHotelData, loadSettings, HotelDataStore, HotelSettings, DEFAULT_SETTINGS } from '../../utils/storage';
import { DailyData, WeeklyData, MonthlyData, getTodayDateKey, getTodayISO, getCurrentWeekISO, getCurrentMonthIndex } from '../../utils/xlsxParser';
import { useLanguage } from '../../utils/LanguageContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

// ============================================
// HOTEL LOGO COMPONENT
// ============================================
const HotelLogo = ({ size = 36 }: { size?: number }) => (
  <View style={[logoStyles.container, { width: size, height: size }]}>
    <View style={[logoStyles.topHalf, { borderTopLeftRadius: size/2, borderTopRightRadius: size/2 }]} />
    <View style={[logoStyles.bottomHalf, { borderBottomLeftRadius: size/2, borderBottomRightRadius: size/2 }]}>
      <View style={logoStyles.wave} />
    </View>
  </View>
);

const logoStyles = StyleSheet.create({
  container: { overflow: 'hidden', borderRadius: 999 },
  topHalf: { flex: 1, backgroundColor: '#8FAFC4' },
  bottomHalf: { flex: 1, backgroundColor: '#5F7F94', position: 'relative' },
  wave: { position: 'absolute', top: -4, left: 0, right: 0, height: 8, backgroundColor: '#8FAFC4', borderBottomLeftRadius: 100, borderBottomRightRadius: 100, transform: [{ scaleX: 1.5 }] },
});

// ============================================
// LANGUAGE TOGGLE (EN, NL, DE)
// ============================================
const LanguageToggle = () => {
  const { language, setLanguage } = useLanguage();
  return (
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
  );
};

// ============================================
// TOOLTIPS (FIXED TEXT)
// ============================================
const TOOLTIPS = {
  operation: "Shows today's real occupancy, rooms sold and total revenue based on the daily operational data uploaded.",
  radar: "Displays day-by-day operational performance for the next 15 calendar days based on daily inputs.",
  attention: "Highlights today's critical metrics that are below the defined operational targets.",
  monthlyOccupancy: "Shows occupancy aggregated by calendar month using pre-calculated monthly data.",
  weeklyStats: "Shows weekly performance metrics using ISO calendar weeks, including past and future periods.",
  monthlyStats: "Shows accumulated monthly performance with historical and forward-looking context.",
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function ManagerDashboard() {
  const router = useRouter();
  const { language } = useLanguage();
  
  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<HotelDataStore | null>(null);
  const [settings, setSettings] = useState<HotelSettings>(DEFAULT_SETTINGS);
  const [tooltipVisible, setTooltipVisible] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  
  // Derived data
  const [todayData, setTodayData] = useState<DailyData | null>(null);
  const [radarDays, setRadarDays] = useState<DailyData[]>([]);
  const [weeklyRange, setWeeklyRange] = useState<WeeklyData[]>([]);
  const [monthlyRange, setMonthlyRange] = useState<MonthlyData[]>([]);
  const [currentMonthWeeks, setCurrentMonthWeeks] = useState<WeeklyData[]>([]);
  
  // Scroll refs
  const radarScrollRef = useRef<ScrollView>(null);
  
  // Translations
  const t = {
    en: {
      managerMode: 'Manager Mode',
      operation: 'Operation',
      occupancyToday: 'Occupancy Today',
      roomsSold: 'Rooms Sold',
      totalRevenue: 'Total Revenue',
      arrivals: 'Arrivals',
      departures: 'Departures',
      attention: 'What Needs Attention',
      requiresAttention: 'Requires immediate attention',
      allOnTarget: 'All metrics on target',
      noIssues: 'No issues require attention',
      radar: 'Radar 15 Days',
      control: 'CONTROL',
      weeklyStats: 'Weekly Stats',
      monthlyStats: 'Monthly Stats',
      occupancy: 'Occupancy',
      revenue: 'Revenue',
      adr: 'ADR',
      noData: 'Data unavailable',
      uploadData: 'Upload XLSX in Admin',
      lastUpdate: 'Last update',
      never: 'Never',
    },
    nl: {
      managerMode: 'Manager Modus',
      operation: 'Operatie',
      occupancyToday: 'Bezetting Vandaag',
      roomsSold: 'Kamers Verkocht',
      totalRevenue: 'Totale Omzet',
      arrivals: 'Aankomsten',
      departures: 'Vertrekken',
      attention: 'Aandacht Nodig',
      requiresAttention: 'Directe aandacht vereist',
      allOnTarget: 'Alle metrics op doel',
      noIssues: 'Geen problemen',
      radar: 'Radar 15 Dagen',
      control: 'CONTROLE',
      weeklyStats: 'Wekelijkse Stats',
      monthlyStats: 'Maandelijkse Stats',
      occupancy: 'Bezetting',
      revenue: 'Omzet',
      adr: 'ADR',
      noData: 'Geen data',
      uploadData: 'Upload XLSX in Admin',
      lastUpdate: 'Laatste update',
      never: 'Nooit',
    },
    de: {
      managerMode: 'Manager Modus',
      operation: 'Betrieb',
      occupancyToday: 'Auslastung Heute',
      roomsSold: 'Zimmer Verkauft',
      totalRevenue: 'Gesamtumsatz',
      arrivals: 'Ankünfte',
      departures: 'Abreisen',
      attention: 'Achtung Erforderlich',
      requiresAttention: 'Sofortige Aufmerksamkeit erforderlich',
      allOnTarget: 'Alle Metriken im Ziel',
      noIssues: 'Keine Probleme',
      radar: 'Radar 15 Tage',
      control: 'KONTROLLE',
      weeklyStats: 'Wöchentliche Stats',
      monthlyStats: 'Monatliche Stats',
      occupancy: 'Auslastung',
      revenue: 'Umsatz',
      adr: 'ADR',
      noData: 'Keine Daten',
      uploadData: 'XLSX im Admin hochladen',
      lastUpdate: 'Letzte Aktualisierung',
      never: 'Nie',
    },
  };
  
  const text = t[language as keyof typeof t] || t.en;
  
  // Load data
  const loadData = useCallback(async () => {
    try {
      const [hotelData, loadedSettings] = await Promise.all([
        loadHotelData(),
        loadSettings(),
      ]);
      
      setData(hotelData);
      setSettings(loadedSettings);
      setLastUpdate(hotelData.lastUpdate);
      
      console.log('[Manager] Data loaded:', {
        daily: hotelData.daily.length,
        weekly: hotelData.weekly.length,
        monthly: hotelData.monthly.length,
      });
      
      processData(hotelData);
      
    } catch (error) {
      console.error('[Manager] Load error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  // Process data according to contract
  const processData = (hotelData: HotelDataStore) => {
    const { daily, weekly, monthly } = hotelData;
    
    // TODAY'S DATA (from 2026_Values)
    const todayKey = getTodayDateKey();
    const todayISO = getTodayISO();
    
    console.log('[Manager] Looking for today:', todayKey, 'or', todayISO);
    
    let todayRecord = daily.find(d => d.date === todayKey);
    if (!todayRecord) {
      todayRecord = daily.find(d => d.dateISO === todayISO);
    }
    
    if (todayRecord) {
      console.log('[Manager] Found today:', todayRecord.date, 'occ:', todayRecord.occupancy);
      setTodayData(todayRecord);
    } else {
      console.log('[Manager] Today not found');
      setTodayData(null);
    }
    
    // RADAR 15 DAYS
    const todayDate = new Date();
    const radar: DailyData[] = [];
    
    for (let i = 0; i < 15; i++) {
      const date = new Date(todayDate);
      date.setDate(todayDate.getDate() + i);
      
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      const dateKey = `${d}-${m}-${y}`;
      const dateISO = `${y}-${m}-${d}`;
      
      let dayData = daily.find(x => x.date === dateKey);
      if (!dayData) {
        dayData = daily.find(x => x.dateISO === dateISO);
      }
      
      if (dayData) {
        radar.push(dayData);
      }
    }
    
    setRadarDays(radar);
    
    // WEEKLY STATS: 2 back + 24 forward
    const currentWeek = getCurrentWeekISO();
    const weekNum = parseInt(currentWeek.split('-W')[1], 10);
    const weekStart = Math.max(1, weekNum - 2);
    const weekEnd = Math.min(53, weekNum + 24);
    
    const weeklyFiltered = weekly.filter(w => {
      const wNum = parseInt(w.isoWeek.split('-W')[1], 10);
      return wNum >= weekStart && wNum <= weekEnd;
    });
    
    setWeeklyRange(weeklyFiltered);
    
    // MONTHLY STATS: 2 back + 6 forward
    const currentMonth = getCurrentMonthIndex();
    const monthStart = Math.max(0, currentMonth - 2);
    const monthEnd = Math.min(11, currentMonth + 6);
    
    const monthlyFiltered = monthly.filter(m => m.monthIndex >= monthStart && m.monthIndex <= monthEnd);
    setMonthlyRange(monthlyFiltered);
    
    // CURRENT MONTH WEEKS (W1-W4)
    const monthWeeks = weekly.filter(w => {
      if (!w.weekStart) return false;
      const startDate = new Date(w.weekStart);
      const endDate = new Date(w.weekEnd);
      const monthFirst = new Date(2026, currentMonth, 1);
      const monthLast = new Date(2026, currentMonth + 1, 0);
      return startDate <= monthLast && endDate >= monthFirst;
    }).slice(0, 4);
    
    setCurrentMonthWeeks(monthWeeks);
  };
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);
  
  // Help icon
  const HelpIcon = ({ tooltipKey }: { tooltipKey: string }) => (
    <TouchableOpacity onPress={() => setTooltipVisible(tooltipKey)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Ionicons name="help-circle-outline" size={18} color="#6B7280" />
    </TouchableOpacity>
  );
  
  // Format date
  const formatDate = (s: string | null) => {
    if (!s) return text.never;
    const d = new Date(s);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };
  
  // Status
  const isRisk = todayData ? todayData.occupancy < settings.low_season_target : false;
  const statusColor = isRisk ? '#EF4444' : '#10B981';
  const statusText = isRisk ? 'Risk' : 'Stable';
  
  // Month names
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.brandContainer}>
            <HotelLogo size={36} />
            <View style={styles.brandTextContainer}>
              <Text style={styles.brandName}>BadHotel</Text>
              <Text style={styles.brandLocation}>Noordwijk aan Zee</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <LanguageToggle />
            <TouchableOpacity onPress={() => router.push('/admin')} style={styles.adminButton}>
              <Ionicons name="settings-outline" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.statusRow}>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
            </View>
            {isRisk && todayData && (
              <Text style={[styles.statusReason, { color: statusColor }]}>
                Occupancy {todayData.occupancy.toFixed(1)}% below target
              </Text>
            )}
          </View>
          <Text style={styles.lastUpdate}>{text.lastUpdate}: {formatDate(lastUpdate)}</Text>
        </View>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
        showsVerticalScrollIndicator={false}
      >
        {/* OPERATION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="pulse" size={18} color="#10B981" />
            <Text style={styles.sectionTitle}>{text.operation.toUpperCase()}</Text>
            <HelpIcon tooltipKey="operation" />
          </View>
          
          {todayData ? (
            <View style={styles.operationCard}>
              <Text style={styles.operationDate}>{todayData.date}</Text>
              
              <View style={styles.operationMain}>
                <View style={styles.operationOccupancy}>
                  <Text style={styles.operationOccLabel}>{text.occupancyToday}</Text>
                  <Text style={[styles.operationOccValue, { color: isRisk ? '#EF4444' : '#10B981' }]}>
                    {todayData.occupancy.toFixed(1)}%
                  </Text>
                  <Text style={styles.operationOccRooms}>
                    {todayData.occupied} / {todayData.available} rooms
                  </Text>
                </View>
                
                <View style={styles.operationDivider} />
                
                <View style={styles.operationArrDep}>
                  <View style={styles.operationArrDepItem}>
                    <Ionicons name="arrow-down-circle" size={24} color="#60A5FA" />
                    <Text style={styles.operationArrDepValue}>{todayData.arrivals}</Text>
                    <Text style={styles.operationArrDepLabel}>{text.arrivals}</Text>
                  </View>
                  <View style={styles.operationArrDepItem}>
                    <Ionicons name="arrow-up-circle" size={24} color="#F59E0B" />
                    <Text style={styles.operationArrDepValue}>{todayData.departures}</Text>
                    <Text style={styles.operationArrDepLabel}>{text.departures}</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.operationRevenue}>
                <Ionicons name="wallet" size={16} color="#10B981" />
                <Text style={styles.operationRevenueLabel}>{text.totalRevenue}</Text>
                <Text style={styles.operationRevenueValue}>€{todayData.totalRevenue.toFixed(2)}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.noDataCard}>
              <Ionicons name="cloud-upload-outline" size={40} color="#374151" />
              <Text style={styles.noDataText}>{text.noData}</Text>
              <Text style={styles.noDataSub}>{text.uploadData}</Text>
            </View>
          )}
        </View>
        
        {/* WHAT NEEDS ATTENTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="warning" size={18} color="#F59E0B" />
            <Text style={styles.sectionTitle}>{text.attention.toUpperCase()}</Text>
            <HelpIcon tooltipKey="attention" />
          </View>
          
          <View style={styles.alertCard}>
            {todayData && todayData.occupancy < settings.low_season_target ? (
              <View style={styles.alertItem}>
                <View style={[styles.alertIcon, { backgroundColor: '#EF444420' }]}>
                  <Ionicons name="alert-circle" size={20} color="#EF4444" />
                </View>
                <View style={styles.alertContent}>
                  <Text style={styles.alertTitle}>{text.requiresAttention}</Text>
                  <Text style={styles.alertDesc}>
                    {text.occupancyToday} ({todayData.occupancy.toFixed(1)}%) &lt; target ({settings.low_season_target}%)
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.alertItem}>
                <View style={[styles.alertIcon, { backgroundColor: '#10B98120' }]}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                </View>
                <View style={styles.alertContent}>
                  <Text style={[styles.alertTitle, { color: '#10B981' }]}>{text.allOnTarget}</Text>
                  <Text style={styles.alertDesc}>{text.noIssues}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
        
        {/* RADAR 15 DAYS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="radio" size={18} color="#8B5CF6" />
            <Text style={styles.sectionTitle}>{text.radar.toUpperCase()}</Text>
            <HelpIcon tooltipKey="radar" />
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} ref={radarScrollRef} contentContainerStyle={styles.radarScroll}>
            {radarDays.map((day, idx) => {
              const dateObj = new Date(day.dateISO);
              const isToday = idx === 0;
              const urgency = day.occupancy < settings.low_season_target * 0.7 ? 'high' : 
                             day.occupancy < settings.low_season_target ? 'medium' : 'low';
              const urgencyColor = urgency === 'high' ? '#EF4444' : urgency === 'medium' ? '#F59E0B' : '#10B981';
              
              return (
                <View key={idx} style={[styles.radarCard, isToday && styles.radarCardFirst]}>
                  <View style={styles.radarDateContainer}>
                    <Text style={styles.radarDayName}>{dayNames[dateObj.getDay()]}</Text>
                    <Text style={styles.radarDayNum}>{dateObj.getDate()}</Text>
                    <Text style={styles.radarMonth}>{monthNames[dateObj.getMonth()].substring(0, 3)}</Text>
                  </View>
                  <View style={styles.radarStatsContainer}>
                    <Text style={[styles.radarOccValue, { color: urgencyColor }]}>{day.occupancy.toFixed(0)}%</Text>
                    <Text style={styles.radarRoomsValue}>{day.occupied}r</Text>
                    <Text style={styles.radarRevValue}>€{day.totalRevenue.toFixed(0)}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
        
        {/* CONTROL SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="stats-chart" size={18} color="#60A5FA" />
            <Text style={styles.sectionTitle}>{text.control}</Text>
          </View>
          
          {/* Current Month Occupancy W1-W4 */}
          <View style={styles.controlCard}>
            <View style={styles.controlCardHeader}>
              <Text style={styles.controlCardTitle}>
                {monthNames[getCurrentMonthIndex()]} {text.occupancy}
              </Text>
              <HelpIcon tooltipKey="monthlyOccupancy" />
            </View>
            
            {currentMonthWeeks.length > 0 ? (
              <View style={styles.weekBars}>
                {currentMonthWeeks.map((week, idx) => {
                  const barHeight = Math.min(week.occupancy, 100);
                  const barColor = week.occupancy < 30 ? '#EF4444' : week.occupancy < 60 ? '#F59E0B' : '#10B981';
                  return (
                    <View key={idx} style={styles.weekBarItem}>
                      <Text style={styles.weekBarValue}>{week.occupancy.toFixed(0)}%</Text>
                      <View style={styles.weekBarBg}>
                        <View style={[styles.weekBarFill, { height: `${barHeight}%`, backgroundColor: barColor }]} />
                      </View>
                      <Text style={styles.weekBarLabel}>W{idx + 1}</Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.noDataSmall}>{text.noData}</Text>
            )}
          </View>
          
          {/* Weekly Stats */}
          <Text style={styles.subSectionTitle}>{text.weeklyStats}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {weeklyRange.map((week, idx) => (
              <View key={idx} style={styles.statsCard}>
                <Text style={styles.statsWeek}>{week.isoWeek}</Text>
                <View style={styles.statsDivider} />
                <Text style={styles.statsLabel}>{text.occupancy}</Text>
                <Text style={styles.statsValue}>{week.occupancy.toFixed(1)}%</Text>
                <Text style={styles.statsLabel}>{text.revenue}</Text>
                <Text style={styles.statsValueSmall}>€{week.totalRevenue.toFixed(0)}</Text>
                <Text style={styles.statsLabel}>{text.adr}</Text>
                <Text style={styles.statsValueSmall}>€{week.adr.toFixed(0)}</Text>
              </View>
            ))}
          </ScrollView>
          
          {/* Monthly Stats */}
          <Text style={styles.subSectionTitle}>{text.monthlyStats}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {monthlyRange.map((month, idx) => (
              <View key={idx} style={styles.statsCard}>
                <Text style={styles.statsWeek}>{month.month.substring(0, 3)}</Text>
                <View style={styles.statsDivider} />
                <Text style={styles.statsLabel}>{text.occupancy}</Text>
                <Text style={styles.statsValue}>{month.occupancy.toFixed(1)}%</Text>
                <Text style={styles.statsLabel}>{text.revenue}</Text>
                <Text style={styles.statsValueSmall}>€{month.totalRevenue.toFixed(0)}</Text>
                <Text style={styles.statsLabel}>{text.adr}</Text>
                <Text style={styles.statsValueSmall}>€{month.adr.toFixed(0)}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
        
        <View style={styles.footerSpacer} />
      </ScrollView>
      
      {/* Tooltip Modal */}
      <Modal visible={tooltipVisible !== null} transparent animationType="fade" onRequestClose={() => setTooltipVisible(null)}>
        <TouchableOpacity style={styles.tooltipOverlay} activeOpacity={1} onPress={() => setTooltipVisible(null)}>
          <View style={styles.tooltipBox}>
            <Text style={styles.tooltipText}>{tooltipVisible ? TOOLTIPS[tooltipVisible as keyof typeof TOOLTIPS] : ''}</Text>
            <TouchableOpacity style={styles.tooltipClose} onPress={() => setTooltipVisible(null)}>
              <Text style={styles.tooltipCloseText}>OK</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================
// STYLES - DARK THEME
// ============================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0B' },
  loadingContainer: { flex: 1, backgroundColor: '#0A0A0B', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#9CA3AF', marginTop: 16, fontSize: 14 },
  
  // Header
  header: { backgroundColor: '#111113', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1F1F23' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  brandContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandTextContainer: { flexDirection: 'column' },
  brandName: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5 },
  brandLocation: { fontSize: 11, color: '#8FAFC4', marginTop: -2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  adminButton: { padding: 8, borderRadius: 8, backgroundColor: '#1F1F23' },
  langToggle: { flexDirection: 'row', backgroundColor: '#1F1F23', borderRadius: 6, overflow: 'hidden' },
  langBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  langBtnActive: { backgroundColor: '#10B981' },
  langBtnText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  langBtnTextActive: { color: '#FFFFFF' },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusContainer: { flexDirection: 'column' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },
  statusReason: { fontSize: 10, marginTop: 2, marginLeft: 4 },
  lastUpdate: { fontSize: 10, color: '#6B7280' },
  
  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  
  // Section
  section: { paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#1F1F23' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', letterSpacing: 1, flex: 1 },
  subSectionTitle: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginTop: 16, marginBottom: 12 },
  
  // Operation Card
  operationCard: { backgroundColor: '#111113', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1F1F23' },
  operationDate: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginBottom: 12 },
  operationMain: { flexDirection: 'row', alignItems: 'center' },
  operationOccupancy: { flex: 1, alignItems: 'center' },
  operationOccLabel: { fontSize: 11, color: '#6B7280', marginBottom: 4 },
  operationOccValue: { fontSize: 48, fontWeight: '700' },
  operationOccRooms: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  operationDivider: { width: 1, height: 80, backgroundColor: '#1F1F23', marginHorizontal: 16 },
  operationArrDep: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  operationArrDepItem: { alignItems: 'center' },
  operationArrDepValue: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginTop: 4 },
  operationArrDepLabel: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  operationRevenue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0A0B', borderRadius: 8, padding: 12, marginTop: 12, gap: 8 },
  operationRevenueLabel: { fontSize: 12, color: '#9CA3AF' },
  operationRevenueValue: { fontSize: 18, fontWeight: '700', color: '#10B981' },
  
  // No Data
  noDataCard: { backgroundColor: '#111113', borderRadius: 12, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#1F1F23' },
  noDataText: { fontSize: 14, color: '#6B7280', marginTop: 12 },
  noDataSub: { fontSize: 12, color: '#374151', marginTop: 4 },
  noDataSmall: { fontSize: 12, color: '#6B7280', textAlign: 'center', paddingVertical: 16 },
  
  // Alert Card
  alertCard: { backgroundColor: '#111113', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1F1F23' },
  alertItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  alertIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
  alertDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  
  // Radar
  radarScroll: { paddingRight: 16 },
  radarCard: { backgroundColor: '#111113', borderRadius: 10, padding: 12, width: 80, marginRight: 8, borderWidth: 1, borderColor: '#1F1F23' },
  radarCardFirst: { backgroundColor: '#1A1A1D', borderColor: '#10B981' },
  radarDateContainer: { alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#1F1F23' },
  radarDayName: { fontSize: 10, color: '#6B7280', textTransform: 'uppercase' },
  radarDayNum: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginVertical: 2 },
  radarMonth: { fontSize: 9, color: '#6B7280' },
  radarStatsContainer: { alignItems: 'center', gap: 2 },
  radarOccValue: { fontSize: 18, fontWeight: '700' },
  radarRoomsValue: { fontSize: 11, color: '#9CA3AF' },
  radarRevValue: { fontSize: 10, color: '#10B981' },
  
  // Control Card
  controlCard: { backgroundColor: '#111113', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1F1F23' },
  controlCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  controlCardTitle: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  
  // Week Bars
  weekBars: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 100 },
  weekBarItem: { alignItems: 'center', width: 50 },
  weekBarValue: { fontSize: 11, color: '#FFFFFF', fontWeight: '600', marginBottom: 4 },
  weekBarBg: { width: 24, height: 60, backgroundColor: '#1F1F23', borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
  weekBarFill: { width: '100%', borderRadius: 4 },
  weekBarLabel: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  
  // Stats Card
  statsCard: { backgroundColor: '#111113', borderRadius: 10, padding: 12, width: 100, marginRight: 8, borderWidth: 1, borderColor: '#1F1F23', alignItems: 'center' },
  statsWeek: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  statsDivider: { width: 40, height: 1, backgroundColor: '#1F1F23', marginVertical: 8 },
  statsLabel: { fontSize: 9, color: '#6B7280', marginTop: 4 },
  statsValue: { fontSize: 16, fontWeight: '700', color: '#10B981' },
  statsValueSmall: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  
  // Footer
  footerSpacer: { height: 40 },
  
  // Tooltip
  tooltipOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  tooltipBox: { backgroundColor: '#1F1F23', borderRadius: 12, padding: 20, marginHorizontal: 32, maxWidth: 320 },
  tooltipText: { fontSize: 14, color: '#D1D5DB', lineHeight: 20, textAlign: 'center' },
  tooltipClose: { marginTop: 16, alignItems: 'center' },
  tooltipCloseText: { fontSize: 14, fontWeight: '600', color: '#10B981' },
});
