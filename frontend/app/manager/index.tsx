// ============================================
// MANAGER MODE - RESET TOTAL
// ============================================
// Contract: App NEVER calculates, only READS from Excel
// All data comes from: BadHotel_Manager_2026_Template_with_Formulas.xlsx

import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { loadHotelData, loadSettings, HotelDataStore, HotelSettings, DEFAULT_SETTINGS } from '../../utils/storage';
import { DailyData, WeeklyData, MonthlyData, getTodayDateKey, getTodayISO, getCurrentWeekISO, getCurrentMonthIndex } from '../../utils/xlsxParser';
import { useLanguage } from '../../utils/LanguageContext';

const { width } = Dimensions.get('window');

// ============================================
// TYPES
// ============================================

interface TodayData {
  date: string;
  occupancy: number;
  occupied: number;
  available: number;
  totalRevenue: number;
  arrivals: number;
  departures: number;
}

// ============================================
// TOOLTIP CONTENT (FIXED - NO AI)
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
  
  // Derived data
  const [todayData, setTodayData] = useState<TodayData | null>(null);
  const [radarDays, setRadarDays] = useState<DailyData[]>([]);
  const [weeklyRange, setWeeklyRange] = useState<WeeklyData[]>([]);
  const [monthlyRange, setMonthlyRange] = useState<MonthlyData[]>([]);
  const [currentMonthWeeks, setCurrentMonthWeeks] = useState<WeeklyData[]>([]);
  
  // Load data
  const loadData = useCallback(async () => {
    try {
      const [hotelData, loadedSettings] = await Promise.all([
        loadHotelData(),
        loadSettings(),
      ]);
      
      setData(hotelData);
      setSettings(loadedSettings);
      
      console.log('[Manager] Data loaded:', {
        daily: hotelData.daily.length,
        weekly: hotelData.weekly.length,
        monthly: hotelData.monthly.length,
      });
      
      // Process data
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
    
    // =====================
    // TODAY'S DATA (from 2026_Values)
    // =====================
    const todayKey = getTodayDateKey(); // DD-MM-YYYY
    const todayISO = getTodayISO();     // YYYY-MM-DD
    
    console.log('[Manager] Looking for today:', todayKey, 'or', todayISO);
    
    // Find today in daily data (try both formats)
    let todayRecord = daily.find(d => d.date === todayKey);
    if (!todayRecord) {
      todayRecord = daily.find(d => d.dateISO === todayISO);
    }
    
    if (todayRecord) {
      console.log('[Manager] Found today:', todayRecord);
      setTodayData({
        date: todayRecord.date,
        occupancy: todayRecord.occupancy,
        occupied: todayRecord.occupied,
        available: todayRecord.available,
        totalRevenue: todayRecord.totalRevenue,
        arrivals: todayRecord.arrivals,
        departures: todayRecord.departures,
      });
    } else {
      console.log('[Manager] Today not found in data');
      setTodayData(null);
    }
    
    // =====================
    // RADAR 15 DAYS (from 2026_Values)
    // Today + 14 days = 15 total
    // =====================
    const todayDate = new Date();
    const radar: DailyData[] = [];
    
    for (let i = 0; i < 15; i++) {
      const date = new Date(todayDate);
      date.setDate(todayDate.getDate() + i);
      
      // Format as DD-MM-YYYY
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      const dateKey = `${d}-${m}-${y}`;
      const dateISO = `${y}-${m}-${d}`;
      
      // Find in daily data
      let dayData = daily.find(x => x.date === dateKey);
      if (!dayData) {
        dayData = daily.find(x => x.dateISO === dateISO);
      }
      
      if (dayData) {
        radar.push(dayData);
      }
    }
    
    setRadarDays(radar);
    console.log('[Manager] Radar days:', radar.length);
    
    // =====================
    // WEEKLY STATS: 2 back + 24 forward = 27 weeks
    // =====================
    const currentWeek = getCurrentWeekISO();
    const weekNum = parseInt(currentWeek.split('-W')[1], 10);
    
    const weekStart = Math.max(1, weekNum - 2);
    const weekEnd = Math.min(53, weekNum + 24);
    
    const weeklyFiltered = weekly.filter(w => {
      const wNum = parseInt(w.isoWeek.split('-W')[1], 10);
      return wNum >= weekStart && wNum <= weekEnd;
    });
    
    setWeeklyRange(weeklyFiltered);
    console.log('[Manager] Weekly range:', weeklyFiltered.length, 'weeks');
    
    // =====================
    // MONTHLY STATS: 2 back + 6 forward = 9 months
    // =====================
    const currentMonth = getCurrentMonthIndex(); // 0-11
    
    const monthStart = Math.max(0, currentMonth - 2);
    const monthEnd = Math.min(11, currentMonth + 6);
    
    const monthlyFiltered = monthly.filter(m => {
      return m.monthIndex >= monthStart && m.monthIndex <= monthEnd;
    });
    
    setMonthlyRange(monthlyFiltered);
    console.log('[Manager] Monthly range:', monthlyFiltered.length, 'months');
    
    // =====================
    // CURRENT MONTH WEEKS (for W1-W4 chart)
    // =====================
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonthName = monthNames[currentMonth];
    
    // Find weeks that overlap with current month
    const monthWeeks = weekly.filter(w => {
      if (!w.weekStart) return false;
      const startDate = new Date(w.weekStart);
      const endDate = new Date(w.weekEnd);
      const monthFirst = new Date(2026, currentMonth, 1);
      const monthLast = new Date(2026, currentMonth + 1, 0);
      return startDate <= monthLast && endDate >= monthFirst;
    }).slice(0, 4); // Max 4 weeks
    
    setCurrentMonthWeeks(monthWeeks);
    console.log('[Manager] Month weeks:', monthWeeks.length);
  };
  
  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // Refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);
  
  // Show tooltip
  const showTooltip = (key: string) => {
    setTooltipVisible(key);
  };
  
  // Render help icon
  const HelpIcon = ({ tooltipKey }: { tooltipKey: string }) => (
    <TouchableOpacity 
      onPress={() => showTooltip(tooltipKey)}
      style={styles.helpIcon}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="help-circle-outline" size={18} color="#666" />
    </TouchableOpacity>
  );
  
  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a365d" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Status
  const isRisk = todayData ? todayData.occupancy < settings.low_season_target : false;
  const statusColor = isRisk ? '#C53030' : '#38A169';
  const statusText = isRisk ? 'Risk' : 'Stable';
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1a365d" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Manager Mode</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => router.push('/admin')} style={styles.adminButton}>
          <Ionicons name="settings-outline" size={24} color="#1a365d" />
        </TouchableOpacity>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ===================== */}
        {/* OPERATION CARD */}
        {/* ===================== */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Operation</Text>
            <HelpIcon tooltipKey="operation" />
          </View>
          
          {todayData ? (
            <View style={styles.operationGrid}>
              <View style={styles.operationItem}>
                <Text style={styles.operationLabel}>Occupancy Today</Text>
                <Text style={styles.operationValue}>{todayData.occupancy.toFixed(1)}%</Text>
              </View>
              <View style={styles.operationItem}>
                <Text style={styles.operationLabel}>Rooms Sold</Text>
                <Text style={styles.operationValue}>{todayData.occupied} / {todayData.available}</Text>
              </View>
              <View style={styles.operationItem}>
                <Text style={styles.operationLabel}>Total Revenue</Text>
                <Text style={styles.operationValue}>€{todayData.totalRevenue.toFixed(2)}</Text>
              </View>
              <View style={styles.operationItem}>
                <Text style={styles.operationLabel}>Arrivals / Departures</Text>
                <Text style={styles.operationValue}>{todayData.arrivals} / {todayData.departures}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.noData}>
              <Text style={styles.noDataText}>Data unavailable</Text>
              <Text style={styles.noDataSub}>No data for today ({getTodayDateKey()})</Text>
            </View>
          )}
        </View>
        
        {/* ===================== */}
        {/* WHAT NEEDS ATTENTION */}
        {/* ===================== */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>What Needs Attention</Text>
            <HelpIcon tooltipKey="attention" />
          </View>
          
          {todayData && todayData.occupancy < settings.low_season_target ? (
            <View style={styles.alertItem}>
              <View style={styles.alertIcon}>
                <Ionicons name="warning" size={20} color="#C53030" />
              </View>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>Requires immediate attention</Text>
                <Text style={styles.alertDesc}>
                  Today's occupancy ({todayData.occupancy.toFixed(1)}%) is below target ({settings.low_season_target}%)
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.alertItem}>
              <View style={[styles.alertIcon, { backgroundColor: '#38A16920' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#38A169" />
              </View>
              <View style={styles.alertContent}>
                <Text style={[styles.alertTitle, { color: '#38A169' }]}>All metrics on target</Text>
                <Text style={styles.alertDesc}>No issues require attention</Text>
              </View>
            </View>
          )}
        </View>
        
        {/* ===================== */}
        {/* RADAR 15 DAYS */}
        {/* ===================== */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Radar 15 Days</Text>
            <HelpIcon tooltipKey="radar" />
          </View>
          
          {radarDays.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.radarScroll}>
              {radarDays.map((day, idx) => (
                <View key={idx} style={styles.radarDay}>
                  <Text style={styles.radarDate}>{day.date.split('-')[0]}/{day.date.split('-')[1]}</Text>
                  <Text style={styles.radarOcc}>{day.occupancy.toFixed(0)}%</Text>
                  <Text style={styles.radarRooms}>{day.occupied}r</Text>
                  <Text style={styles.radarRev}>€{day.totalRevenue.toFixed(0)}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noDataText}>No radar data available</Text>
          )}
        </View>
        
        {/* ===================== */}
        {/* CONTROL SECTION */}
        {/* ===================== */}
        <Text style={styles.sectionTitle}>Control</Text>
        
        {/* Current Month Occupancy W1-W4 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              {['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'][getCurrentMonthIndex()]} Occupancy
            </Text>
            <HelpIcon tooltipKey="monthlyOccupancy" />
          </View>
          
          {currentMonthWeeks.length > 0 ? (
            <View style={styles.weekBars}>
              {currentMonthWeeks.map((week, idx) => (
                <View key={idx} style={styles.weekBarItem}>
                  <Text style={styles.weekBarLabel}>W{idx + 1}</Text>
                  <View style={styles.weekBarBg}>
                    <View 
                      style={[styles.weekBarFill, { height: `${Math.min(week.occupancy, 100)}%` }]} 
                    />
                  </View>
                  <Text style={styles.weekBarValue}>{week.occupancy.toFixed(0)}%</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noDataText}>No weekly data for current month</Text>
          )}
        </View>
        
        {/* Weekly Stats (2 back + 24 forward) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Weekly Stats</Text>
            <HelpIcon tooltipKey="weeklyStats" />
          </View>
          
          {weeklyRange.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {weeklyRange.map((week, idx) => (
                <View key={idx} style={styles.statsCard}>
                  <Text style={styles.statsWeek}>{week.isoWeek}</Text>
                  <Text style={styles.statsLabel}>Occupancy</Text>
                  <Text style={styles.statsValue}>{week.occupancy.toFixed(1)}%</Text>
                  <Text style={styles.statsLabel}>Revenue</Text>
                  <Text style={styles.statsValue}>€{week.totalRevenue.toFixed(0)}</Text>
                  <Text style={styles.statsLabel}>ADR</Text>
                  <Text style={styles.statsValue}>€{week.adr.toFixed(0)}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noDataText}>No weekly data available</Text>
          )}
        </View>
        
        {/* Monthly Stats (2 back + 6 forward) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Monthly Stats</Text>
            <HelpIcon tooltipKey="monthlyStats" />
          </View>
          
          {monthlyRange.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {monthlyRange.map((month, idx) => (
                <View key={idx} style={styles.statsCard}>
                  <Text style={styles.statsWeek}>{month.month.substring(0, 3)}</Text>
                  <Text style={styles.statsLabel}>Occupancy</Text>
                  <Text style={styles.statsValue}>{month.occupancy.toFixed(1)}%</Text>
                  <Text style={styles.statsLabel}>Revenue</Text>
                  <Text style={styles.statsValue}>€{month.totalRevenue.toFixed(0)}</Text>
                  <Text style={styles.statsLabel}>ADR</Text>
                  <Text style={styles.statsValue}>€{month.adr.toFixed(0)}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noDataText}>No monthly data available</Text>
          )}
        </View>
        
        <View style={styles.footerSpacer} />
      </ScrollView>
      
      {/* Tooltip Modal */}
      <Modal
        visible={tooltipVisible !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setTooltipVisible(null)}
      >
        <TouchableOpacity 
          style={styles.tooltipOverlay} 
          activeOpacity={1}
          onPress={() => setTooltipVisible(null)}
        >
          <View style={styles.tooltipBox}>
            <Text style={styles.tooltipText}>
              {tooltipVisible ? TOOLTIPS[tooltipVisible as keyof typeof TOOLTIPS] : ''}
            </Text>
            <TouchableOpacity 
              style={styles.tooltipClose}
              onPress={() => setTooltipVisible(null)}
            >
              <Text style={styles.tooltipCloseText}>OK</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a365d',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  adminButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a365d',
    marginTop: 24,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a365d',
  },
  helpIcon: {
    padding: 4,
  },
  operationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  operationItem: {
    width: '50%',
    paddingVertical: 8,
  },
  operationLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  operationValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a365d',
  },
  noData: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  noDataSub: {
    fontSize: 12,
    color: '#bbb',
    marginTop: 4,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
  },
  alertIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#C5303020',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C53030',
    marginBottom: 2,
  },
  alertDesc: {
    fontSize: 12,
    color: '#666',
  },
  radarScroll: {
    marginHorizontal: -8,
  },
  radarDay: {
    width: 70,
    alignItems: 'center',
    paddingVertical: 8,
    marginHorizontal: 4,
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
  },
  radarDate: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  radarOcc: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a365d',
  },
  radarRooms: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  radarRev: {
    fontSize: 11,
    color: '#38A169',
    fontWeight: '600',
    marginTop: 2,
  },
  weekBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 8,
  },
  weekBarItem: {
    alignItems: 'center',
    width: 50,
  },
  weekBarLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  weekBarBg: {
    width: 30,
    height: 80,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  weekBarFill: {
    width: '100%',
    backgroundColor: '#4299E1',
    borderRadius: 4,
  },
  weekBarValue: {
    fontSize: 11,
    color: '#1a365d',
    fontWeight: '600',
    marginTop: 4,
  },
  statsCard: {
    width: 100,
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    alignItems: 'center',
  },
  statsWeek: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a365d',
    marginBottom: 8,
  },
  statsLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
  statsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a365d',
  },
  footerSpacer: {
    height: 40,
  },
  tooltipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltipBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 32,
    maxWidth: 320,
  },
  tooltipText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    textAlign: 'center',
  },
  tooltipClose: {
    marginTop: 16,
    alignItems: 'center',
  },
  tooltipCloseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4299E1',
  },
});
