import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { loadReservations, loadSettings, getLastUpdate, loadCachedDashboard, cacheDashboard, DEFAULT_SETTINGS, saveSettings, saveReservations } from '../utils/storage';
import { calculateDashboard, DashboardData, generateDemoReservations } from '../utils/calculations';
import { useLanguage } from '../utils/LanguageContext';
import { getDayNames, getMonthNames, getFullMonthNames, formatString } from '../utils/i18n';

const { width } = Dimensions.get('window');

// Hotel Logo Component
const HotelLogo = ({ size = 40 }: { size?: number }) => {
  return (
    <View style={[logoStyles.container, { width: size, height: size }]}>
      <View style={[logoStyles.topHalf, { borderTopLeftRadius: size/2, borderTopRightRadius: size/2 }]} />
      <View style={[logoStyles.bottomHalf, { borderBottomLeftRadius: size/2, borderBottomRightRadius: size/2 }]}>
        <View style={logoStyles.wave} />
      </View>
    </View>
  );
};

const logoStyles = StyleSheet.create({
  container: { overflow: 'hidden', borderRadius: 999 },
  topHalf: { flex: 1, backgroundColor: '#8FAFC4' },
  bottomHalf: { flex: 1, backgroundColor: '#5F7F94', position: 'relative' },
  wave: { position: 'absolute', top: -6, left: 0, right: 0, height: 12, backgroundColor: '#8FAFC4', borderBottomLeftRadius: 100, borderBottomRightRadius: 100, transform: [{ scaleX: 1.5 }] },
});

// Animated Counter Component
const AnimatedCounter = ({ value, suffix = '', prefix = '', decimals = 0, style }: {
  value: number; suffix?: string; prefix?: string; decimals?: number; style?: any;
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    animatedValue.setValue(0);
    Animated.timing(animatedValue, { toValue: value, duration: 1000, useNativeDriver: false }).start();
    const listener = animatedValue.addListener(({ value }) => setDisplayValue(value));
    return () => animatedValue.removeListener(listener);
  }, [value]);

  return <Text style={style}>{prefix}{displayValue.toFixed(decimals)}{suffix}</Text>;
};

// Real-time Clock Component
const RealTimeClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <Text style={styles.clockText}>{time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</Text>;
};

// Language Toggle Component
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
    </View>
  );
};

// Status Badge Component with Reason and translations
const StatusBadge = ({ status, reason, reasonParams }: { status: 'green' | 'yellow' | 'red'; reason?: string | null; reasonParams?: string[] }) => {
  const { t } = useLanguage();
  const statusConfig = {
    green: { color: '#10B981', text: t.underControl, icon: 'checkmark-circle' },
    yellow: { color: '#F59E0B', text: t.attention, icon: 'warning' },
    red: { color: '#EF4444', text: t.risk, icon: 'alert-circle' },
  };
  const config = statusConfig[status];

  // Translate reason
  const translateReason = (reasonKey: string | null, params: string[] = []) => {
    if (!reasonKey) return null;
    const reasonMap: Record<string, string> = {
      'today_occupancy_below': t.todayOccupancyBelow,
      'd7_below_target': t.d7BelowTarget,
      'd14_below_target': t.d14BelowTarget,
    };
    let message = reasonMap[reasonKey] || reasonKey;
    params.forEach((param, index) => {
      message = message.replace(`{${index}}`, param);
    });
    return message;
  };

  const translatedReason = reason ? translateReason(reason, reasonParams || []) : null;

  return (
    <View style={styles.statusContainer}>
      <View style={[styles.statusBadge, { backgroundColor: config.color + '20' }]}>
        <Ionicons name={config.icon as any} size={16} color={config.color} />
        <Text style={[styles.statusText, { color: config.color }]}>{config.text}</Text>
      </View>
      {translatedReason && status !== 'green' && (
        <Text style={[styles.statusReason, { color: config.color }]}>{translatedReason}</Text>
      )}
    </View>
  );
};

// Trend Indicator Component
const TrendIndicator = ({ trend }: { trend: 'improving' | 'stable' | 'worsening' }) => {
  const { t } = useLanguage();
  const trendConfig = {
    improving: { icon: '↑', text: t.improving, color: '#10B981' },
    stable: { icon: '→', text: t.stable, color: '#6B7280' },
    worsening: { icon: '↓', text: t.worsening, color: '#EF4444' },
  };
  const config = trendConfig[trend];
  return (
    <View style={styles.trendContainer}>
      <Text style={[styles.trendArrow, { color: config.color }]}>{config.icon}</Text>
      <Text style={[styles.trendText, { color: config.color }]}>{config.text}</Text>
    </View>
  );
};

// Radar Day Card Component
const RadarDayCard = ({ day, index }: { day: any; index: number }) => {
  const { language } = useLanguage();
  const dayNames = getDayNames(language);
  const monthNames = getMonthNames(language);
  
  const dayOfWeek = new Date(day.date).getDay();
  const monthIndex = new Date(day.date).getMonth();
  
  const getUrgencyColor = () => {
    if (day.occupancy_percent >= day.target * 0.9) return '#10B981';
    if (day.occupancy_percent >= day.target * 0.7) return '#F59E0B';
    return '#EF4444';
  };

  const getBorderColor = () => {
    if (day.urgency === 'high') return '#EF4444';
    if (day.urgency === 'medium') return '#F59E0B';
    return '#374151';
  };

  return (
    <View style={[styles.radarCard, { borderLeftColor: getBorderColor(), borderLeftWidth: 3 }, index === 0 && styles.radarCardFirst]}>
      <View style={styles.radarDateContainer}>
        <Text style={styles.radarDayName}>{dayNames[dayOfWeek]}</Text>
        <Text style={styles.radarDayNum}>{day.day_num}</Text>
        <Text style={styles.radarMonth}>{monthNames[monthIndex]}</Text>
      </View>
      <View style={styles.radarStatsContainer}>
        <View style={styles.radarOccupancy}>
          <Text style={[styles.radarOccupancyValue, { color: getUrgencyColor() }]}>{day.occupancy_percent.toFixed(0)}%</Text>
          <Text style={styles.radarOccupancyLabel}>occupancy</Text>
        </View>
        <View style={styles.radarRooms}>
          <Text style={styles.radarRoomsValue}>{day.rooms_sold}/{day.total_rooms}</Text>
          <Text style={styles.radarRoomsLabel}>rooms</Text>
        </View>
        {day.adr > 0 && (
          <View style={styles.radarAdr}>
            <Text style={styles.radarAdrValue}>€{day.adr.toFixed(0)}</Text>
            <Text style={styles.radarAdrLabel}>ADR</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// Enhanced Alert Component with translations
const AlertItem = ({ alert }: { alert: any }) => {
  const { t } = useLanguage();
  
  const getStatusColor = (status: string) => {
    if (status === 'ok') return '#10B981';
    if (status === 'warning') return '#F59E0B';
    return '#EF4444';
  };

  // Translate alert message
  const translateMessage = (messageKey: string, params: string[] = []) => {
    const translationMap: Record<string, string> = {
      'occupancy_below_target': t.occupancyBelowTarget,
      'critical_days_ahead': t.criticalDaysAhead,
      'consecutive_low_days': t.consecutiveLowDays,
      'no_critical_issues': t.noCriticalIssues,
    };
    
    let message = translationMap[messageKey] || messageKey;
    params.forEach((param, index) => {
      message = message.replace(`{${index}}`, param);
    });
    return message;
  };

  // Translate context
  const translateContext = (contextKey: string) => {
    const contextMap: Record<string, string> = {
      'next_days_on_track': t.nextDaysOnTrack,
      'next_days_below_target': t.nextDaysBelowTarget,
      'today_on_target': t.todayOnTarget,
      'requires_attention': t.requiresAttention,
    };
    return contextMap[contextKey] || contextKey;
  };

  const message = translateMessage(alert.message, alert.message_params || []);
  const context = alert.context ? translateContext(alert.context) : '';

  return (
    <View style={styles.alertItem}>
      <View style={styles.alertIndicators}>
        <View style={[styles.alertDot, { backgroundColor: getStatusColor(alert.today_status) }]} />
        <View style={styles.alertDotConnector} />
        <View style={[styles.alertDot, { backgroundColor: getStatusColor(alert.future_status) }]} />
      </View>
      <View style={styles.alertContent}>
        <Text style={styles.alertText}>{message}</Text>
        {context ? <Text style={styles.alertContext}>{context}</Text> : null}
      </View>
    </View>
  );
};

// Simple Weekly Occupancy Chart Component - BIGGER VERSION
const WeeklyOccupancyChart = ({ weekData }: { weekData: any[] }) => {
  const { t, language } = useLanguage();
  const dayNames = getDayNames(language);
  
  const maxValue = 100;
  const chartHeight = 120; // BIGGER

  const getBarColor = (value: number) => {
    if (value >= 70) return '#10B981';
    if (value >= 50) return '#F59E0B';
    return '#EF4444';
  };

  if (!weekData || weekData.length === 0) return null;

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{t.weeklyOccupancy}</Text>
      <View style={styles.chartWrapper}>
        {/* Y-axis labels */}
        <View style={styles.yAxis}>
          <Text style={styles.yAxisLabel}>100%</Text>
          <Text style={styles.yAxisLabel}>50%</Text>
          <Text style={styles.yAxisLabel}>0%</Text>
        </View>
        {/* Bars */}
        <View style={styles.barsContainer}>
          {weekData.map((day, index) => {
            const barHeight = Math.max(4, (day.occupancy_percent / maxValue) * chartHeight);
            return (
              <View key={index} style={styles.barWrapper}>
                <View style={[styles.barColumn, { height: chartHeight }]}>
                  <View 
                    style={[
                      styles.bar, 
                      { 
                        height: barHeight, 
                        backgroundColor: getBarColor(day.occupancy_percent) 
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.barLabel}>{dayNames[index]}</Text>
                <Text style={styles.barValue}>{day.occupancy_percent.toFixed(0)}%</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weekChartData, setWeekChartData] = useState<any[]>([]);
  const router = useRouter();
  const { t, language } = useLanguage();

  const loadDashboard = useCallback(async () => {
    try {
      // ALWAYS load fresh settings first
      const settings = await loadSettings();
      
      // Force settings to have 26 rooms if not set
      if (settings.total_rooms !== 26) {
        settings.total_rooms = 26;
        await saveSettings(settings);
      }
      
      let reservations = await loadReservations();
      const lastUpdate = await getLastUpdate();
      
      // If no reservations, generate demo data with correct settings
      if (reservations.length === 0) {
        reservations = generateDemoReservations(settings);
        await saveReservations(reservations);
      }
      
      // ALWAYS calculate fresh dashboard (don't use cache for data)
      const dashboardData = calculateDashboard(reservations, settings, lastUpdate);
      setData(dashboardData);
      
      // Generate weekly chart data (Mon-Sun)
      const today = new Date();
      const dayOfWeek = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
      
      const weekStats = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const radar = dashboardData.radar.find(r => {
          const rDate = new Date(r.date);
          return rDate.toDateString() === date.toDateString();
        });
        weekStats.push({
          date,
          occupancy_percent: radar?.occupancy_percent || 0,
        });
      }
      setWeekChartData(weekStats);
      
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboard();
  }, [loadDashboard]);

  const formatCurrency = (value: number) => `€${value.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t.never;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) + ' ' +
           date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const fullMonthNames = getFullMonthNames(language);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Fixed Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.brandContainer}>
            <HotelLogo size={36} />
            <View style={styles.brandTextContainer}>
              <Text style={styles.brandName}>BadHotel</Text>
              <Text style={styles.brandLocation}>Noordwijk</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <LanguageToggle />
            <TouchableOpacity style={styles.adminButton} onPress={() => router.push('/admin')}>
              <Ionicons name="settings-outline" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.statusRow}>
          <StatusBadge status={data?.status || 'green'} reason={data?.status_reason} reasonParams={data?.status_reason_params} />
          <TrendIndicator trend={data?.trend || 'stable'} />
          <RealTimeClock />
        </View>
        
        <Text style={styles.lastUpdate}>{t.lastUpdate}: {formatDate(data?.last_update || null)}</Text>
      </View>

      {/* Scrollable Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}>
        
        {/* Section 1: TODAY */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="today" size={20} color="#10B981" />
            <Text style={styles.sectionTitle}>{t.today}</Text>
            <Text style={styles.sectionSubtitle}>{t.operation}</Text>
          </View>

          <View style={styles.cardGrid}>
            <View style={styles.cardLarge}>
              <Text style={styles.cardLabel}>{t.occupancy}</Text>
              <AnimatedCounter value={data?.today.occupancy_percent || 0} suffix="%" style={styles.occupancyValue} />
              <Text style={styles.cardSubtext}>{data?.today.rooms_occupied || 0} / {data?.today.total_rooms || 26} {t.rooms}</Text>
            </View>
            <View style={styles.cardMedium}>
              <View style={styles.arrDepRow}>
                <View style={styles.arrDepItem}>
                  <Ionicons name="log-in" size={18} color="#10B981" />
                  <Text style={styles.arrDepValue}>{data?.today.arrivals || 0}</Text>
                  <Text style={styles.arrDepLabel}>{t.arrivals}</Text>
                </View>
                <View style={styles.arrDepDivider} />
                <View style={styles.arrDepItem}>
                  <Ionicons name="log-out" size={18} color="#F59E0B" />
                  <Text style={styles.arrDepValue}>{data?.today.departures || 0}</Text>
                  <Text style={styles.arrDepLabel}>{t.departures}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.revenueSection}>
            <Text style={styles.revenueSectionTitle}>{t.dailyRevenue}</Text>
            <View style={styles.revenueGrid}>
              <View style={styles.revenueItem}>
                <Ionicons name="bed" size={16} color="#60A5FA" />
                <Text style={styles.revenueValue}>{formatCurrency(data?.today.room_revenue || 0)}</Text>
                <Text style={styles.revenueLabel}>{t.rooms}</Text>
              </View>
              <View style={styles.revenueItem}>
                <Ionicons name="car" size={16} color="#A78BFA" />
                <Text style={styles.revenueValue}>{formatCurrency(data?.today.parking_revenue || 0)}</Text>
                <Text style={styles.revenueLabel}>{t.parking}</Text>
              </View>
              <View style={styles.revenueItem}>
                <Ionicons name="cafe" size={16} color="#F472B6" />
                <Text style={styles.revenueValue}>{formatCurrency(data?.today.vending_revenue || 0)}</Text>
                <Text style={styles.revenueLabel}>{t.vending}</Text>
              </View>
            </View>
            <View style={styles.cityTaxContainer}>
              <Ionicons name="document-text-outline" size={14} color="#6B7280" />
              <Text style={styles.cityTaxText}>{t.cityTax}: {formatCurrency(data?.today.city_tax || 0)} ({t.separate})</Text>
            </View>
          </View>
        </View>

        {/* Section 2: RADAR */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="radio" size={20} color="#F59E0B" />
            <Text style={styles.sectionTitle}>{t.radar}</Text>
            <Text style={styles.sectionSubtitle}>{t.next14Days}</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.radarScroll}>
            {data?.radar.map((day, index) => <RadarDayCard key={index} day={day} index={index} />)}
          </ScrollView>

          <View style={styles.alertsBox}>
            <View style={styles.alertsHeader}>
              <Ionicons name="alert-circle" size={18} color="#F59E0B" />
              <Text style={styles.alertsTitle}>{t.whatNeedsAttention}</Text>
            </View>
            <View style={styles.alertLegend}>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#6B7280' }]} /><Text style={styles.legendText}>{t.todayLabel}</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#6B7280' }]} /><Text style={styles.legendText}>{t.nextDays}</Text></View>
            </View>
            {data?.alerts.map((alert, index) => <AlertItem key={index} alert={alert} />)}
          </View>
        </View>

        {/* Section 3: CONTROL */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="analytics" size={20} color="#60A5FA" />
            <Text style={styles.sectionTitle}>{t.control}</Text>
            <Text style={styles.sectionSubtitle}>{t.weekAndMonth}</Text>
          </View>

          {/* Weekly Occupancy Chart */}
          {weekChartData.length > 0 && <WeeklyOccupancyChart weekData={weekChartData} />}

          {/* Week Stats */}
          <View style={styles.controlCard}>
            <View style={styles.controlCardHeader}>
              <Text style={styles.controlCardTitle}>{t.currentWeek}</Text>
              <View style={styles.trendBadge}>
                <Ionicons name={data?.week.trend === 'up' ? 'trending-up' : data?.week.trend === 'down' ? 'trending-down' : 'remove'} size={14} color={data?.week.trend === 'up' ? '#10B981' : data?.week.trend === 'down' ? '#EF4444' : '#6B7280'} />
                <Text style={[styles.weekTrendText, { color: data?.week.trend === 'up' ? '#10B981' : data?.week.trend === 'down' ? '#EF4444' : '#6B7280' }]}>{t.vsLast}</Text>
              </View>
            </View>
            <View style={styles.controlStatsRow}>
              <View style={styles.controlStat}>
                <AnimatedCounter value={data?.week.occupancy_avg || 0} suffix="%" style={styles.controlStatValue} />
                <Text style={styles.controlStatLabel}>{t.avgOccupancy}</Text>
              </View>
              <View style={styles.controlStatDivider} />
              <View style={styles.controlStat}>
                <Text style={styles.controlStatValue}>{formatCurrency(data?.week.revenue_total || 0)}</Text>
                <Text style={styles.controlStatLabel}>{t.totalRevenue}</Text>
              </View>
              <View style={styles.controlStatDivider} />
              <View style={styles.controlStat}>
                <Text style={styles.controlStatValue}>€{(data?.week.adr_avg || 0).toFixed(0)}</Text>
                <Text style={styles.controlStatLabel}>{t.avgAdr}</Text>
              </View>
            </View>
          </View>

          {/* Month Stats */}
          <View style={styles.controlCard}>
            <View style={styles.controlCardHeader}>
              <Text style={styles.controlCardTitle}>{fullMonthNames[new Date().getMonth()]}</Text>
              <Text style={styles.monthProgress}>{t.day} {data?.month.days_elapsed || 0} {t.of} {data?.month.days_total || 30}</Text>
            </View>
            <View style={styles.controlStatsRow}>
              <View style={styles.controlStat}>
                <AnimatedCounter value={data?.month.occupancy_accumulated || 0} suffix="%" style={styles.controlStatValue} />
                <Text style={styles.controlStatLabel}>{t.accumulatedOccupancy}</Text>
              </View>
              <View style={styles.controlStatDivider} />
              <View style={styles.controlStat}>
                <Text style={styles.controlStatValue}>{formatCurrency(data?.month.revenue_accumulated || 0)}</Text>
                <Text style={styles.controlStatLabel}>{t.accumulatedRevenue}</Text>
              </View>
            </View>
            <View style={styles.projectionBox}>
              <Ionicons name="analytics-outline" size={14} color="#9CA3AF" />
              <Text style={styles.projectionText}>{t.projectionMessage} {(data?.month.projected_occupancy || 0).toFixed(0)}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.footerSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0B' },
  loadingContainer: { flex: 1, backgroundColor: '#0A0A0B', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#9CA3AF', marginTop: 16, fontSize: 14 },
  header: { backgroundColor: '#111113', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1F1F23' },
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
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  statusContainer: { flexDirection: 'column', gap: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },
  statusReason: { fontSize: 10, marginTop: 2, marginLeft: 4 },
  trendContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendArrow: { fontSize: 16, fontWeight: '700' },
  trendText: { fontSize: 11, fontWeight: '500' },
  clockText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  lastUpdate: { fontSize: 11, color: '#6B7280', marginTop: 8 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  section: { paddingHorizontal: 16, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#1F1F23' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 1 },
  sectionSubtitle: { fontSize: 12, color: '#6B7280', marginLeft: 8 },
  cardGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  cardLarge: { flex: 1, backgroundColor: '#111113', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1F1F23' },
  cardMedium: { flex: 1, backgroundColor: '#111113', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1F1F23', justifyContent: 'center' },
  cardLabel: { fontSize: 12, color: '#6B7280', marginBottom: 8 },
  occupancyValue: { fontSize: 42, fontWeight: '700', color: '#10B981', fontVariant: ['tabular-nums'] },
  cardSubtext: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  arrDepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  arrDepItem: { alignItems: 'center', flex: 1 },
  arrDepDivider: { width: 1, height: 40, backgroundColor: '#1F1F23' },
  arrDepValue: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginTop: 4 },
  arrDepLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  revenueSection: { backgroundColor: '#111113', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1F1F23' },
  revenueSectionTitle: { fontSize: 12, color: '#6B7280', marginBottom: 12 },
  revenueGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  revenueItem: { alignItems: 'center', flex: 1 },
  revenueValue: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginTop: 6 },
  revenueLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  cityTaxContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1F1F23', gap: 6 },
  cityTaxText: { fontSize: 12, color: '#6B7280' },
  radarScroll: { paddingVertical: 4, gap: 10 },
  radarCard: { backgroundColor: '#111113', borderRadius: 10, padding: 12, width: 100, borderWidth: 1, borderColor: '#1F1F23' },
  radarCardFirst: { backgroundColor: '#1A1A1D' },
  radarDateContainer: { alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#1F1F23' },
  radarDayName: { fontSize: 11, color: '#6B7280', textTransform: 'uppercase' },
  radarDayNum: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginVertical: 2 },
  radarMonth: { fontSize: 10, color: '#6B7280' },
  radarStatsContainer: { gap: 6 },
  radarOccupancy: { alignItems: 'center' },
  radarOccupancyValue: { fontSize: 18, fontWeight: '700' },
  radarOccupancyLabel: { fontSize: 9, color: '#6B7280' },
  radarRooms: { alignItems: 'center' },
  radarRoomsValue: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  radarRoomsLabel: { fontSize: 9, color: '#6B7280' },
  radarAdr: { alignItems: 'center' },
  radarAdrValue: { fontSize: 11, fontWeight: '600', color: '#60A5FA' },
  radarAdrLabel: { fontSize: 9, color: '#6B7280' },
  alertsBox: { backgroundColor: '#111113', borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#1F1F23' },
  alertsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  alertsTitle: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  alertLegend: { flexDirection: 'row', gap: 16, marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#1F1F23' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontSize: 10, color: '#6B7280' },
  alertItem: { flexDirection: 'row', marginVertical: 8, gap: 12 },
  alertIndicators: { alignItems: 'center', width: 20 },
  alertDot: { width: 8, height: 8, borderRadius: 4 },
  alertDotConnector: { width: 1, height: 8, backgroundColor: '#374151', marginVertical: 2 },
  alertContent: { flex: 1 },
  alertText: { fontSize: 13, color: '#D1D5DB', lineHeight: 18 },
  alertContext: { fontSize: 11, color: '#6B7280', marginTop: 2, fontStyle: 'italic' },
  chartContainer: { backgroundColor: '#111113', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1F1F23' },
  chartTitle: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginBottom: 16 },
  chartWrapper: { flexDirection: 'row', alignItems: 'flex-end' },
  yAxis: { width: 40, height: 120, justifyContent: 'space-between', marginRight: 12 },
  yAxisLabel: { fontSize: 10, color: '#6B7280', textAlign: 'right' },
  barsContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 120 },
  barWrapper: { alignItems: 'center', flex: 1 },
  barColumn: { justifyContent: 'flex-end' },
  bar: { width: 30, borderRadius: 6, minHeight: 6 },
  barLabel: { fontSize: 10, color: '#9CA3AF', marginTop: 8, fontWeight: '600' },
  barValue: { fontSize: 9, color: '#FFFFFF', marginTop: 4, fontWeight: '500' },
  controlCard: { backgroundColor: '#111113', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1F1F23' },
  controlCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  controlCardTitle: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  weekTrendText: { fontSize: 11, fontWeight: '500' },
  monthProgress: { fontSize: 11, color: '#6B7280' },
  controlStatsRow: { flexDirection: 'row', alignItems: 'center' },
  controlStat: { flex: 1, alignItems: 'center' },
  controlStatDivider: { width: 1, height: 30, backgroundColor: '#1F1F23' },
  controlStatValue: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  controlStatLabel: { fontSize: 10, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  projectionBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1D', borderRadius: 8, padding: 12, marginTop: 12, gap: 8 },
  projectionText: { fontSize: 12, color: '#9CA3AF', flex: 1 },
  footerSpacer: { height: 40 },
});
