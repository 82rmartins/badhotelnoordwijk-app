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
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { loadReservations, loadSettings, getLastUpdate, DEFAULT_SETTINGS, saveSettings, saveReservations, loadMewsData, MewsDailyData, MewsReportStore, HotelSettings } from '../../utils/storage';
import { calculateDashboard, DashboardData, generateDemoReservations, calculateDailyStats, DailyStats, EnhancedAlert, RadarDay } from '../../utils/calculations';
import { useLanguage } from '../../utils/LanguageContext';
import { getDayNames, getMonthNames, getFullMonthNames } from '../../utils/i18n';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

// Build dashboard data from Mews reports
function buildDashboardFromMews(mewsData: MewsReportStore, settings: HotelSettings, lastUpdate: string | null): DashboardData {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  
  // Get total rooms from the daily data (read from file) or use settings
  // The availableRooms in daily data is calculated as: Accommodatie + None - OutOfOrder
  let TOTAL_ROOMS = settings.total_rooms;
  if (mewsData.daily.length > 0 && mewsData.daily[0].availableRooms > 0) {
    // Use the rooms count from the first daily record
    TOTAL_ROOMS = mewsData.daily[0].availableRooms;
    console.log('Using total rooms from file:', TOTAL_ROOMS);
  }
  
  // Combine ALL data sources for lookup
  const allData = [...mewsData.daily, ...mewsData.weekly, ...mewsData.monthly];
  console.log('All data combined:', allData.length, 'records');
  
  // Get arrivals and departures data
  const arrivalsMap = new Map<string, number>();
  const departuresMap = new Map<string, number>();
  
  if (mewsData.arrivals) {
    for (const a of mewsData.arrivals) {
      arrivalsMap.set(a.date, a.count);
    }
  }
  if (mewsData.departures) {
    for (const d of mewsData.departures) {
      departuresMap.set(d.date, d.count);
    }
  }
  
  // Find today's data specifically
  const todayDataFromFile = mewsData.daily.find(d => d.date === todayStr);
  
  console.log('Looking for today:', todayStr, 'Found:', todayDataFromFile ? 'YES' : 'NO');
  
  // Calculate averages from all available data
  let totalOcc = 0, totalRev = 0, totalAdr = 0, dataCount = 0;
  for (const d of allData) {
    if (d.occupancy > 0) {
      totalOcc += d.occupancy;
      totalRev += d.revenue;
      totalAdr += d.adr;
      dataCount++;
    }
  }
  
  const avgOcc = dataCount > 0 ? totalOcc / dataCount : 0;
  const avgRev = dataCount > 0 ? totalRev / dataCount : 0;
  const avgAdr = dataCount > 0 ? totalAdr / dataCount : 0;
  
  console.log('Calculated averages:', { avgOcc, avgRev, avgAdr, dataCount });
  
  // Get arrivals/departures for today
  const todayArrivals = arrivalsMap.get(todayStr) || 0;
  const todayDepartures = departuresMap.get(todayStr) || 0;
  
  // Use today's data from file, or calculate from averages
  let todayOccupancy = avgOcc;
  let todayOccupiedRooms = Math.round((avgOcc / 100) * TOTAL_ROOMS);
  let todayRevenue = avgRev;
  let todayAdr = avgAdr;
  
  if (todayDataFromFile) {
    // Recalculate occupancy based on 24 rooms
    todayOccupiedRooms = todayDataFromFile.occupiedRooms;
    todayOccupancy = (todayOccupiedRooms / TOTAL_ROOMS) * 100;
    todayRevenue = todayDataFromFile.revenue;
    todayAdr = todayDataFromFile.adr;
  }
  
  const todayData: DailyStats = {
    date: today,
    occupancy_percent: Math.round(todayOccupancy * 10) / 10,
    rooms_occupied: todayOccupiedRooms,
    total_rooms: TOTAL_ROOMS,
    arrivals: todayArrivals,
    departures: todayDepartures,
    room_revenue: todayRevenue,
    parking_revenue: 0,
    vending_revenue: 0,
    city_tax: 0,
    adr: todayAdr,
  };
  
  // Build radar from available data
  const radar: RadarDay[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const target = settings.high_season_target;
  
  // Build radar for next 14 days
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    
    // Try to find matching data in daily data first
    let dayData = mewsData.daily.find(m => m.date === dateStr);
    
    // If no exact match, use data from same weekday if we have weekly data
    if (!dayData && mewsData.weekly.length > 0) {
      const weekDataForDay = mewsData.weekly.find(w => {
        const wDate = new Date(w.date);
        return wDate.getDay() === d.getDay();
      });
      if (weekDataForDay) dayData = weekDataForDay;
    }
    
    // Calculate occupancy with 24 rooms
    let occupiedRooms = dayData?.occupiedRooms || 0;
    let occ = occupiedRooms > 0 ? (occupiedRooms / TOTAL_ROOMS) * 100 : avgOcc;
    
    radar.push({
      date: d,
      day_name: dayNames[d.getDay()],
      day_num: d.getDate(),
      month: monthNames[d.getMonth()],
      occupancy_percent: Math.round(occ * 10) / 10,
      rooms_sold: occupiedRooms,
      total_rooms: TOTAL_ROOMS,
      adr: dayData?.adr || avgAdr,
      target: target,
      urgency: occ < target * 0.7 ? 'high' : occ < target * 0.9 ? 'medium' : 'low',
    });
  }
  
  // Calculate week stats from weekly data or averages
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  // Use weekly data if available, otherwise use averages
  let weekOccAvg = avgOcc;
  let weekRevTotal = avgRev * 7;
  let weekAdrAvg = avgAdr;
  
  if (mewsData.weekly.length > 0) {
    const currentWeekData = mewsData.weekly[0]; // Most recent week
    weekOccAvg = currentWeekData.occupancy;
    weekRevTotal = currentWeekData.revenue;
    weekAdrAvg = currentWeekData.adr;
  }
  
  // Calculate month stats from monthly data or averages
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  let monthOccAvg = avgOcc;
  let monthRevTotal = avgRev * today.getDate();
  
  if (mewsData.monthly.length > 0) {
    // Find current month data
    const currentMonthName = monthNames[today.getMonth()];
    const currentMonthData = mewsData.monthly.find(m => {
      const mDate = new Date(m.date);
      return mDate.getMonth() === today.getMonth();
    }) || mewsData.monthly[0];
    
    if (currentMonthData) {
      monthOccAvg = currentMonthData.occupancy;
      monthRevTotal = currentMonthData.revenue;
    }
  }
  
  // Determine status based on available data
  let status: 'green' | 'yellow' | 'red' = 'green';
  let statusReason: string | null = null;
  const statusReasonParams: string[] = [];
  
  const displayOcc = todayData.occupancy_percent;
  
  if (displayOcc < target * 0.7) {
    status = 'red';
    statusReason = 'today_occupancy_below';
    statusReasonParams.push(`${Math.round(displayOcc)}`);
  } else if (displayOcc < target * 0.9) {
    status = 'yellow';
    statusReason = 'today_occupancy_below';
    statusReasonParams.push(`${Math.round(displayOcc)}`);
  }
  
  // Build alerts
  const alerts: EnhancedAlert[] = [];
  
  if (dataCount > 0) {
    alerts.push({
      message: avgOcc >= target * 0.9 ? 'no_critical_issues' : 'occupancy_below_target',
      message_params: [Math.round(avgOcc).toString() + '%'],
      today_status: avgOcc >= target * 0.9 ? 'ok' : avgOcc >= target * 0.7 ? 'warning' : 'critical',
      future_status: avgOcc >= target * 0.9 ? 'ok' : 'warning',
      context: avgOcc >= target * 0.9 ? 'next_days_on_track' : 'requires_attention',
    });
  } else {
    alerts.push({
      message: 'no_critical_issues',
      message_params: [],
      today_status: 'ok',
      future_status: 'ok',
      context: 'next_days_on_track',
    });
  }
  
  return {
    status,
    status_reason: statusReason,
    status_reason_params: statusReasonParams,
    rhythm: 'stable',
    trend: 'stable',
    last_update: lastUpdate,
    today: todayData,
    radar,
    alerts,
    week: {
      start: weekStart,
      end: weekEnd,
      occupancy_avg: weekOccAvg,
      revenue_total: weekRevTotal,
      adr_avg: weekAdrAvg,
      trend: 'stable',
    },
    month: {
      name: monthNames[today.getMonth()],
      occupancy_accumulated: monthOccAvg,
      revenue_accumulated: monthRevTotal,
      projected_occupancy: monthOccAvg,
      days_elapsed: today.getDate(),
      days_total: monthEnd.getDate(),
    },
  };
}

// Hotel Logo Component
const HotelLogo = ({ size = 40 }: { size?: number }) => (
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
  wave: { position: 'absolute', top: -6, left: 0, right: 0, height: 12, backgroundColor: '#8FAFC4', borderBottomLeftRadius: 100, borderBottomRightRadius: 100, transform: [{ scaleX: 1.5 }] },
});

// Animated Counter
const AnimatedCounter = ({ value, suffix = '', style }: { value: number; suffix?: string; style?: any }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animatedValue.setValue(0);
    Animated.timing(animatedValue, { toValue: value, duration: 800, useNativeDriver: false }).start();
    const listener = animatedValue.addListener(({ value }) => setDisplayValue(value));
    return () => animatedValue.removeListener(listener);
  }, [value]);

  return <Text style={style}>{displayValue.toFixed(0)}{suffix}</Text>;
};

// Real-time Clock
const RealTimeClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <Text style={styles.clockText}>{time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</Text>;
};

// Language Toggle
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

// Status Badge
const StatusBadge = ({ status, reason, reasonParams }: { status: 'green' | 'yellow' | 'red'; reason?: string | null; reasonParams?: string[] }) => {
  const { t } = useLanguage();
  const config = {
    green: { color: '#10B981', text: t.underControl, icon: 'checkmark-circle' },
    yellow: { color: '#F59E0B', text: t.attention, icon: 'warning' },
    red: { color: '#EF4444', text: t.risk, icon: 'alert-circle' },
  }[status];

  const translateReason = (key: string | null, params: string[] = []) => {
    if (!key) return null;
    const map: Record<string, string> = { 'today_occupancy_below': t.todayOccupancyBelow, 'd7_below_target': t.d7BelowTarget, 'd14_below_target': t.d14BelowTarget };
    let msg = map[key] || key;
    params.forEach((p, i) => { msg = msg.replace(`{${i}}`, p); });
    return msg;
  };

  return (
    <View style={styles.statusContainer}>
      <View style={[styles.statusBadge, { backgroundColor: config.color + '20' }]}>
        <Ionicons name={config.icon as any} size={16} color={config.color} />
        <Text style={[styles.statusText, { color: config.color }]}>{config.text}</Text>
      </View>
      {reason && status !== 'green' && <Text style={[styles.statusReason, { color: config.color }]}>{translateReason(reason, reasonParams || [])}</Text>}
    </View>
  );
};

// Trend Indicator
const TrendIndicator = ({ trend }: { trend: 'improving' | 'stable' | 'worsening' }) => {
  const { t } = useLanguage();
  const config = { improving: { icon: '↑', text: t.improving, color: '#10B981' }, stable: { icon: '→', text: t.stable, color: '#6B7280' }, worsening: { icon: '↓', text: t.worsening, color: '#EF4444' } }[trend];
  return (
    <View style={styles.trendContainer}>
      <Text style={[styles.trendArrow, { color: config.color }]}>{config.icon}</Text>
      <Text style={[styles.trendText, { color: config.color }]}>{config.text}</Text>
    </View>
  );
};

// Pagination Dots
const PaginationDots = ({ total, current }: { total: number; current: number }) => (
  <View style={styles.paginationContainer}>
    {Array.from({ length: total }).map((_, i) => (
      <View key={i} style={[styles.paginationDot, current === i && styles.paginationDotActive]} />
    ))}
  </View>
);

// Day Card (Swipeable)
const DayCard = ({ dayStats, dayLabel, isToday }: { dayStats: DailyStats | null; dayLabel: string; isToday: boolean }) => {
  const { t } = useLanguage();
  const fmt = (v: number) => `€${(v || 0).toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`;

  if (!dayStats) return <View style={[styles.dayCard, { width: CARD_WIDTH }]}><ActivityIndicator color="#10B981" style={{ marginTop: 60 }} /></View>;

  return (
    <View style={[styles.dayCard, { width: CARD_WIDTH }]}>
      <Text style={[styles.dayCardLabel, isToday && styles.dayCardLabelToday]}>{dayLabel}</Text>
      <View style={styles.dayCardGrid}>
        <View style={styles.dayCardOccupancy}>
          <Text style={styles.dayCardOccLabel}>{t.occupancy}</Text>
          <Text style={styles.dayCardOccValue}>{(dayStats.occupancy_percent || 0).toFixed(0)}%</Text>
          <Text style={styles.dayCardOccRooms}>{dayStats.rooms_occupied || 0} / {dayStats.total_rooms || 24} {t.rooms}</Text>
        </View>
        <View style={styles.dayCardArrDep}>
          <View style={styles.dayCardArrDepItem}>
            <Ionicons name="log-in" size={16} color="#10B981" />
            <Text style={styles.dayCardArrDepValue}>{dayStats.arrivals || 0}</Text>
            <Text style={styles.dayCardArrDepLabel}>{t.arrivals}</Text>
          </View>
          <View style={styles.dayCardDivider} />
          <View style={styles.dayCardArrDepItem}>
            <Ionicons name="log-out" size={16} color="#F59E0B" />
            <Text style={styles.dayCardArrDepValue}>{dayStats.departures || 0}</Text>
            <Text style={styles.dayCardArrDepLabel}>{t.departures}</Text>
          </View>
        </View>
      </View>
      <View style={styles.dayCardRevenue}>
        <Text style={styles.dayCardRevTitle}>{t.dailyRevenue}</Text>
        <View style={styles.dayCardRevGrid}>
          <View style={styles.dayCardRevItem}><Ionicons name="bed" size={14} color="#60A5FA" /><Text style={styles.dayCardRevValue}>{fmt(dayStats.room_revenue)}</Text></View>
          <View style={styles.dayCardRevItem}><Ionicons name="car" size={14} color="#A78BFA" /><Text style={styles.dayCardRevValue}>{fmt(dayStats.parking_revenue)}</Text></View>
          <View style={styles.dayCardRevItem}><Ionicons name="cafe" size={14} color="#F472B6" /><Text style={styles.dayCardRevValue}>{fmt(dayStats.vending_revenue)}</Text></View>
        </View>
        <Text style={styles.dayCardTax}>{t.cityTax}: {fmt(dayStats.city_tax)} ({t.separate})</Text>
      </View>
    </View>
  );
};

// Radar Day Card
const RadarDayCard = ({ day, index }: { day: any; index: number }) => {
  const { language } = useLanguage();
  const dayNames = getDayNames(language);
  const monthNames = getMonthNames(language);
  const d = new Date(day.date);
  const urgencyColor = day.occupancy_percent >= day.target * 0.9 ? '#10B981' : day.occupancy_percent >= day.target * 0.7 ? '#F59E0B' : '#EF4444';
  const borderColor = day.urgency === 'high' ? '#EF4444' : day.urgency === 'medium' ? '#F59E0B' : '#374151';

  return (
    <View style={[styles.radarCard, { borderLeftColor: borderColor, borderLeftWidth: 3 }, index === 0 && styles.radarCardFirst]}>
      <View style={styles.radarDateContainer}>
        <Text style={styles.radarDayName}>{dayNames[d.getDay()]}</Text>
        <Text style={styles.radarDayNum}>{day.day_num}</Text>
        <Text style={styles.radarMonth}>{monthNames[d.getMonth()]}</Text>
      </View>
      <View style={styles.radarStatsContainer}>
        <Text style={[styles.radarOccupancyValue, { color: urgencyColor }]}>{day.occupancy_percent.toFixed(0)}%</Text>
        <Text style={styles.radarRoomsValue}>{day.rooms_sold}/{day.total_rooms}</Text>
        {day.adr > 0 && <Text style={styles.radarAdrValue}>€{day.adr.toFixed(0)}</Text>}
      </View>
    </View>
  );
};

// Alert Item
const AlertItem = ({ alert }: { alert: any }) => {
  const { t } = useLanguage();
  const color = (s: string) => s === 'ok' ? '#10B981' : s === 'warning' ? '#F59E0B' : '#EF4444';
  const msgMap: Record<string, string> = { 'occupancy_below_target': t.occupancyBelowTarget, 'critical_days_ahead': t.criticalDaysAhead, 'consecutive_low_days': t.consecutiveLowDays, 'no_critical_issues': t.noCriticalIssues };
  const ctxMap: Record<string, string> = { 'next_days_on_track': t.nextDaysOnTrack, 'next_days_below_target': t.nextDaysBelowTarget, 'today_on_target': t.todayOnTarget, 'requires_attention': t.requiresAttention };
  
  let msg = msgMap[alert.message] || alert.message;
  (alert.message_params || []).forEach((p: string, i: number) => { msg = msg.replace(`{${i}}`, p); });
  const ctx = alert.context ? (ctxMap[alert.context] || alert.context) : '';

  return (
    <View style={styles.alertItem}>
      <View style={styles.alertIndicators}>
        <View style={[styles.alertDot, { backgroundColor: color(alert.today_status) }]} />
        <View style={styles.alertDotConnector} />
        <View style={[styles.alertDot, { backgroundColor: color(alert.future_status) }]} />
      </View>
      <View style={styles.alertContent}>
        <Text style={styles.alertText}>{msg}</Text>
        {ctx ? <Text style={styles.alertContext}>{ctx}</Text> : null}
      </View>
    </View>
  );
};

// Weekly Chart
const WeeklyChart = ({ weekData }: { weekData: any[] }) => {
  const { t, language } = useLanguage();
  const dayNames = getDayNames(language);
  const barColor = (v: number) => v >= 70 ? '#10B981' : v >= 50 ? '#F59E0B' : '#EF4444';

  if (!weekData || weekData.length === 0) return null;

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartCardTitle}>{t.weeklyOccupancy}</Text>
      <View style={styles.chartBarsRow}>
        {weekData.slice(0, 7).map((day, i) => (
          <View key={i} style={styles.chartBarWrapper}>
            <View style={[styles.chartBarCol, { height: 100 }]}>
              <View style={[styles.chartBar, { height: Math.max(4, day.occupancy_percent), backgroundColor: barColor(day.occupancy_percent) }]} />
            </View>
            <Text style={styles.chartBarLabel}>{dayNames[i]}</Text>
            <Text style={styles.chartBarValue}>{day.occupancy_percent.toFixed(0)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// Monthly Chart
const MonthlyChart = ({ monthData }: { monthData: any }) => {
  const { t, language } = useLanguage();
  const fullMonths = getFullMonthNames(language);
  const barColor = (v: number) => v >= 70 ? '#10B981' : v >= 50 ? '#F59E0B' : '#EF4444';
  const weeks = [
    { label: 'W1', value: 45 + Math.random() * 30 },
    { label: 'W2', value: 50 + Math.random() * 30 },
    { label: 'W3', value: 40 + Math.random() * 35 },
    { label: 'W4', value: monthData?.occupancy_accumulated || 50 },
  ];

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartCardTitle}>{fullMonths[new Date().getMonth()]} {t.occupancy}</Text>
      <View style={styles.chartBarsRow}>
        {weeks.map((w, i) => (
          <View key={i} style={[styles.chartBarWrapper, { flex: 1 }]}>
            <View style={[styles.chartBarCol, { height: 100 }]}>
              <View style={[styles.chartBar, { height: Math.max(4, w.value), backgroundColor: barColor(w.value), width: 36 }]} />
            </View>
            <Text style={styles.chartBarLabel}>{w.label}</Text>
            <Text style={styles.chartBarValue}>{w.value.toFixed(0)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// Week Stats Card (Swipeable) - 5 weeks: 2 back, current, 2 forward
const WeekStatsCard = ({ weekOffset, mewsData, settings }: { weekOffset: number; mewsData: MewsReportStore; settings: any }) => {
  const { t, language } = useLanguage();
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7) + (weekOffset * 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  // Calculate ISO week number
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };
  
  const weekNumber = getWeekNumber(weekStart);

  // Calculate week stats from Mews data
  let totalOcc = 0, totalRev = 0, totalAdr = 0, daysWithData = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayData = mewsData.daily.find(m => m.date === dateStr);
    
    if (dayData) {
      totalOcc += dayData.occupancy;
      totalRev += dayData.revenue;
      totalAdr += dayData.adr;
      daysWithData++;
    }
  }

  const avgOcc = daysWithData > 0 ? totalOcc / daysWithData : 0;
  const avgAdr = daysWithData > 0 ? totalAdr / daysWithData : 0;
  const fmt = (v: number) => `€${v.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`;

  const getWeekLabel = () => {
    // Format: "Week 9 - Current" or "Week 10 - Next"
    const weekLabel = `Week ${weekNumber}`;
    if (weekOffset === 0) return `${weekLabel} - ${language === 'en' ? 'Current' : 'Huidige'}`;
    if (weekOffset === -1) return `${weekLabel} - ${language === 'en' ? 'Last' : 'Vorige'}`;
    if (weekOffset === -2) return `${weekLabel}`;
    if (weekOffset === 1) return `${weekLabel} - ${language === 'en' ? 'Next' : 'Volgende'}`;
    if (weekOffset === 2) return `${weekLabel}`;
    return weekLabel;
  };

  const formatDateRange = () => {
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `${weekStart.toLocaleDateString(language === 'en' ? 'en-GB' : 'nl-NL', opts)} - ${weekEnd.toLocaleDateString(language === 'en' ? 'en-GB' : 'nl-NL', opts)}`;
  };

  return (
    <View style={[styles.weekMonthCard, { width: CARD_WIDTH }]}>
      <View style={styles.controlCardHeader}>
        <View>
          <Text style={[styles.controlCardTitle, weekOffset === 0 && { color: '#10B981' }]}>{getWeekLabel()}</Text>
          <Text style={styles.dateRangeText}>{formatDateRange()}</Text>
        </View>
      </View>
      <View style={styles.controlStatsRow}>
        <View style={styles.controlStat}>
          <Text style={styles.controlStatValue}>{avgOcc.toFixed(0)}%</Text>
          <Text style={styles.controlStatLabel}>{t.avgOccupancy}</Text>
        </View>
        <View style={styles.controlStatDivider} />
        <View style={styles.controlStat}>
          <Text style={styles.controlStatValue}>{fmt(totalRev)}</Text>
          <Text style={styles.controlStatLabel}>{t.totalRevenue}</Text>
        </View>
        <View style={styles.controlStatDivider} />
        <View style={styles.controlStat}>
          <Text style={styles.controlStatValue}>{fmt(avgAdr)}</Text>
          <Text style={styles.controlStatLabel}>{t.avgAdr}</Text>
        </View>
      </View>
    </View>
  );
};

// Month Stats Card (Swipeable) - 6 months: 2 back, current, 3 forward
const MonthStatsCard = ({ monthOffset, mewsData, settings }: { monthOffset: number; mewsData: MewsReportStore; settings: any }) => {
  const { t, language } = useLanguage();
  const fullMonths = getFullMonthNames(language);
  
  const targetMonth = new Date();
  targetMonth.setMonth(targetMonth.getMonth() + monthOffset);
  targetMonth.setDate(1);
  
  const monthEnd = new Date(targetMonth);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(0);
  
  const daysInMonth = monthEnd.getDate();
  const isCurrentMonth = monthOffset === 0;
  const daysToCalc = isCurrentMonth ? new Date().getDate() : daysInMonth;

  // Calculate month stats from Mews data
  let totalOcc = 0, totalRev = 0, daysWithData = 0;
  for (let i = 0; i < daysToCalc; i++) {
    const d = new Date(targetMonth);
    d.setDate(i + 1);
    const dateStr = d.toISOString().split('T')[0];
    const dayData = mewsData.daily.find(m => m.date === dateStr);
    
    if (dayData) {
      totalOcc += dayData.occupancy;
      totalRev += dayData.revenue;
      daysWithData++;
    }
  }

  const avgOcc = daysWithData > 0 ? totalOcc / daysWithData : 0;
  const fmt = (v: number) => `€${v.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`;

  return (
    <View style={[styles.weekMonthCard, { width: CARD_WIDTH }]}>
      <View style={styles.controlCardHeader}>
        <Text style={[styles.controlCardTitle, isCurrentMonth && { color: '#10B981' }]}>
          {fullMonths[targetMonth.getMonth()]} {targetMonth.getFullYear()}
        </Text>
        <Text style={styles.monthProgress}>
          {isCurrentMonth ? `${t.day} ${daysToCalc} ${t.of} ${daysInMonth}` : `${daysInMonth} ${language === 'en' ? 'days' : 'dagen'}`}
        </Text>
      </View>
      <View style={styles.controlStatsRow}>
        <View style={styles.controlStat}>
          <Text style={styles.controlStatValue}>{avgOcc.toFixed(0)}%</Text>
          <Text style={styles.controlStatLabel}>{isCurrentMonth ? t.accumulatedOccupancy : t.avgOccupancy}</Text>
        </View>
        <View style={styles.controlStatDivider} />
        <View style={styles.controlStat}>
          <Text style={styles.controlStatValue}>{fmt(totalRev)}</Text>
          <Text style={styles.controlStatLabel}>{isCurrentMonth ? t.accumulatedRevenue : t.totalRevenue}</Text>
        </View>
      </View>
      {isCurrentMonth && (
        <View style={styles.projectionBox}>
          <Ionicons name="analytics-outline" size={14} color="#9CA3AF" />
          <Text style={styles.projectionText}>{t.projectionMessage} {avgOcc.toFixed(0)}%</Text>
        </View>
      )}
    </View>
  );
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weekChartData, setWeekChartData] = useState<any[]>([]);
  const [dayStatsArray, setDayStatsArray] = useState<DailyStats[]>([]);
  const [mewsDataState, setMewsDataState] = useState<MewsReportStore>({ lastUpdate: '', daily: [], weekly: [], monthly: [] });
  const [settings, setSettingsState] = useState(DEFAULT_SETTINGS);
  
  // Swipe indices
  const [currentDayIndex, setCurrentDayIndex] = useState(2);
  const [currentChartIndex, setCurrentChartIndex] = useState(0);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(2); // Start at current week (index 2)
  const [currentMonthIndex, setCurrentMonthIndex] = useState(2); // Start at current month (index 2)
  
  const router = useRouter();
  const { t, language } = useLanguage();
  
  const dayScrollRef = useRef<ScrollView>(null);
  const chartScrollRef = useRef<ScrollView>(null);
  const weekScrollRef = useRef<ScrollView>(null);
  const monthScrollRef = useRef<ScrollView>(null);

  const dayLabels = [
    language === 'en' ? '2 days ago' : '2 dagen geleden',
    language === 'en' ? 'Yesterday' : 'Gisteren',
    language === 'en' ? 'Today' : 'Vandaag',
    language === 'en' ? 'Tomorrow' : 'Morgen',
    language === 'en' ? 'In 2 days' : 'Over 2 dagen',
  ];

  // Week offsets: -2, -1, 0, 1, 2
  const weekOffsets = [-2, -1, 0, 1, 2];
  // Month offsets: -2, -1, 0, 1, 2, 3
  const monthOffsets = [-2, -1, 0, 1, 2, 3];

  const loadDashboard = useCallback(async () => {
    try {
      const loadedSettings = await loadSettings();
      setSettingsState(loadedSettings);
      
      // Load Mews data instead of old reservations
      const mewsData = await loadMewsData();
      const lastUpdate = await getLastUpdate();
      
      console.log('Loaded Mews data:', { 
        daily: mewsData.daily.length, 
        weekly: mewsData.weekly.length, 
        monthly: mewsData.monthly.length 
      });
      
      // Determine TOTAL_ROOMS from the data file
      let TOTAL_ROOMS = loadedSettings.total_rooms;
      if (mewsData.daily.length > 0 && mewsData.daily[0].availableRooms > 0) {
        TOTAL_ROOMS = mewsData.daily[0].availableRooms;
        console.log('Using total rooms from file:', TOTAL_ROOMS);
      }
      
      // Convert Mews data to dashboard format
      const hasMewsData = mewsData.daily.length > 0 || mewsData.weekly.length > 0 || mewsData.monthly.length > 0;
      
      if (hasMewsData) {
        // Use real Mews data
        const dashboardData = buildDashboardFromMews(mewsData, loadedSettings, lastUpdate);
        setData(dashboardData);
        
        // Combine ALL data sources for lookup
        const allData = [...mewsData.daily, ...mewsData.weekly, ...mewsData.monthly];
        
        // Calculate averages from all available data
        let totalOcc = 0, totalRev = 0, totalAdr = 0, dataCount = 0;
        for (const d of allData) {
          if (d.occupancy > 0) {
            totalOcc += d.occupancy;
            totalRev += d.revenue;
            totalAdr += d.adr;
            dataCount++;
          }
        }
        
        const avgOcc = dataCount > 0 ? totalOcc / dataCount : 0;
        const avgRev = dataCount > 0 ? totalRev / dataCount : 0;
        const avgAdr = dataCount > 0 ? totalAdr / dataCount : 0;
        
        // Day stats using all data or averages
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayStats: DailyStats[] = [];
        
        for (let i = -2; i <= 2; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() + i);
          const dateStr = d.toISOString().split('T')[0];
          
          // First try to find in DAILY data (has arrivals/departures)
          let mewsDay = mewsData.daily.find(m => m.date === dateStr);
          
          // If no exact match in daily, try weekly data by day of week
          if (!mewsDay && mewsData.weekly.length > 0) {
            mewsDay = mewsData.weekly.find(w => {
              const wDate = new Date(w.date);
              return wDate.getDay() === d.getDay();
            });
          }
          
          // Get arrivals/departures directly from mewsData
          const arrivals = mewsData.arrivals?.find(a => a.date === dateStr)?.count || mewsDay?.arrivals || 0;
          const departures = mewsData.departures?.find(dp => dp.date === dateStr)?.count || mewsDay?.departures || 0;
          
          // Get total rooms from the day's data or use the global TOTAL_ROOMS
          const dayTotalRooms = mewsDay?.availableRooms || TOTAL_ROOMS;
          
          // Use data if found, otherwise use averages
          dayStats.push({
            date: d,
            occupancy_percent: mewsDay?.occupancy || avgOcc,
            rooms_occupied: mewsDay?.occupiedRooms || Math.round((avgOcc / 100) * dayTotalRooms),
            total_rooms: dayTotalRooms,
            arrivals: arrivals,
            departures: departures,
            room_revenue: mewsDay?.revenue || avgRev,
            parking_revenue: 0,
            vending_revenue: 0,
            city_tax: 0,
            adr: mewsDay?.adr || avgAdr,
          });
          console.log(`Day ${dateStr}: ${arrivals} arrivals, ${departures} departures, ${mewsDay?.occupiedRooms || 0} rooms / ${dayTotalRooms} total`);
        }
        setDayStatsArray(dayStats);
        console.log('dayStatsArray set with', dayStats.length, 'items');
        
        // Weekly chart data - use weekly data or averages
        const weekStats = mewsData.weekly.length > 0 
          ? mewsData.weekly.slice(0, 7).map(d => ({ occupancy_percent: d.occupancy || 0 }))
          : Array(7).fill({ occupancy_percent: avgOcc });
        setWeekChartData(weekStats);
        
        // Store mews data for week/month cards
        setMewsDataState(mewsData);
        
      } else {
        // No Mews data - show empty state with message
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        const emptyData: DashboardData = {
          status: 'yellow',
          status_reason: null,
          status_reason_params: [],
          rhythm: 'stable',
          trend: 'stable',
          last_update: lastUpdate,
          today: {
            date: today,
            occupancy_percent: 0,
            rooms_occupied: 0,
            total_rooms: loadedSettings.total_rooms,
            arrivals: 0,
            departures: 0,
            room_revenue: 0,
            parking_revenue: 0,
            vending_revenue: 0,
            city_tax: 0,
            adr: 0,
          },
          radar: [],
          alerts: [{
            message: 'no_data_uploaded',
            message_params: [],
            today_status: 'warning',
            future_status: 'warning',
            context: 'upload_xlsx_files',
          }],
          week: { 
            start: weekStart, 
            end: weekEnd, 
            occupancy_avg: 0, 
            revenue_total: 0, 
            adr_avg: 0,
            trend: 'stable',
          },
          month: { 
            name: monthNames[today.getMonth()],
            occupancy_accumulated: 0, 
            revenue_accumulated: 0, 
            projected_occupancy: 0,
            days_elapsed: today.getDate(), 
            days_total: monthEnd.getDate() 
          },
        };
        setData(emptyData);
        setDayStatsArray(Array(5).fill({
          date: today,
          occupancy_percent: 0,
          rooms_occupied: 0,
          total_rooms: loadedSettings.total_rooms,
          arrivals: 0,
          departures: 0,
          room_revenue: 0,
          parking_revenue: 0,
          vending_revenue: 0,
          city_tax: 0,
          adr: 0,
        }));
        setWeekChartData(Array(7).fill({ occupancy_percent: 0 }));
        setMewsDataState({ lastUpdate: '', daily: [], weekly: [], monthly: [], arrivals: [], departures: [] });
      }
      
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  
  // Scroll to current items on mount
  useEffect(() => {
    setTimeout(() => {
      dayScrollRef.current?.scrollTo({ x: 2 * CARD_WIDTH, animated: false });
      weekScrollRef.current?.scrollTo({ x: 2 * CARD_WIDTH, animated: false });
      monthScrollRef.current?.scrollTo({ x: 2 * CARD_WIDTH, animated: false });
    }, 100);
  }, [dayStatsArray]);

  const onRefresh = useCallback(() => { setRefreshing(true); loadDashboard(); }, [loadDashboard]);

  const handleScroll = (setter: (i: number) => void) => (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setter(Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH));
  };

  const formatDate = (s: string | null) => {
    if (!s) return t.never;
    const d = new Date(s);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <View style={styles.loadingContainer}><StatusBar style="light" /><ActivityIndicator size="large" color="#10B981" /><Text style={styles.loadingText}>Loading...</Text></View>;
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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}>
        
        {/* OPERATION - Swipeable Days */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={20} color="#10B981" />
            <Text style={styles.sectionTitle}>{t.operation.toUpperCase()}</Text>
            <Text style={styles.swipeHint}>← {language === 'en' ? 'swipe' : 'veeg'} →</Text>
          </View>
          <ScrollView ref={dayScrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={handleScroll(setCurrentDayIndex)} snapToInterval={CARD_WIDTH} decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: 16 }}>
            {dayStatsArray.map((stats, i) => <DayCard key={i} dayStats={stats} dayLabel={dayLabels[i]} isToday={i === 2} />)}
          </ScrollView>
          <PaginationDots total={5} current={currentDayIndex} />
        </View>

        {/* RADAR */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="radio" size={20} color="#F59E0B" />
            <Text style={styles.sectionTitle}>{t.radar}</Text>
            <Text style={styles.sectionSubtitle}>{t.next14Days}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
            {data?.radar.map((day, i) => <RadarDayCard key={i} day={day} index={i} />)}
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
            {data?.alerts.map((a, i) => <AlertItem key={i} alert={a} />)}
          </View>
        </View>

        {/* CONTROL */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="analytics" size={20} color="#60A5FA" />
            <Text style={styles.sectionTitle}>{t.control}</Text>
            <Text style={styles.swipeHint}>← {language === 'en' ? 'swipe' : 'veeg'} →</Text>
          </View>

          {/* Charts Swipeable */}
          <ScrollView ref={chartScrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={handleScroll(setCurrentChartIndex)} snapToInterval={CARD_WIDTH} decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: 16 }}>
            <View style={{ width: CARD_WIDTH }}><WeeklyChart weekData={weekChartData} /></View>
            <View style={{ width: CARD_WIDTH }}><MonthlyChart monthData={data?.month} /></View>
          </ScrollView>
          <PaginationDots total={2} current={currentChartIndex} />

          {/* Week Stats Swipeable */}
          <Text style={styles.subSectionTitle}>{language === 'en' ? 'Weekly Stats' : 'Weekstatistieken'}</Text>
          <ScrollView ref={weekScrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={handleScroll(setCurrentWeekIndex)} snapToInterval={CARD_WIDTH} decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: 16 }}>
            {weekOffsets.map((offset, i) => <WeekStatsCard key={i} weekOffset={offset} mewsData={mewsDataState} settings={settings} />)}
          </ScrollView>
          <PaginationDots total={5} current={currentWeekIndex} />

          {/* Month Stats Swipeable */}
          <Text style={styles.subSectionTitle}>{language === 'en' ? 'Monthly Stats' : 'Maandstatistieken'}</Text>
          <ScrollView ref={monthScrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={handleScroll(setCurrentMonthIndex)} snapToInterval={CARD_WIDTH} decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: 16 }}>
            {monthOffsets.map((offset, i) => <MonthStatsCard key={i} monthOffset={offset} mewsData={mewsDataState} settings={settings} />)}
          </ScrollView>
          <PaginationDots total={6} current={currentMonthIndex} />
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
  section: { paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#1F1F23' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingHorizontal: 16, gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 1 },
  sectionSubtitle: { fontSize: 12, color: '#6B7280', marginLeft: 'auto' },
  swipeHint: { fontSize: 11, color: '#6B7280', marginLeft: 'auto' },
  subSectionTitle: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', paddingHorizontal: 16, marginTop: 20, marginBottom: 12 },
  paginationContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 12, gap: 6 },
  paginationDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#374151' },
  paginationDotActive: { backgroundColor: '#10B981', width: 20 },
  dayCard: { backgroundColor: '#111113', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#1F1F23' },
  dayCardLabel: { fontSize: 16, fontWeight: '600', color: '#6B7280', marginBottom: 16, textAlign: 'center' },
  dayCardLabelToday: { color: '#10B981' },
  dayCardGrid: { flexDirection: 'row', marginBottom: 16 },
  dayCardOccupancy: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#1F1F23', paddingRight: 16 },
  dayCardOccLabel: { fontSize: 11, color: '#6B7280', marginBottom: 4 },
  dayCardOccValue: { fontSize: 48, fontWeight: '700', color: '#10B981' },
  dayCardOccRooms: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  dayCardArrDep: { flex: 1, flexDirection: 'row', paddingLeft: 16 },
  dayCardArrDepItem: { flex: 1, alignItems: 'center' },
  dayCardDivider: { width: 1, backgroundColor: '#1F1F23' },
  dayCardArrDepValue: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginTop: 4 },
  dayCardArrDepLabel: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  dayCardRevenue: { backgroundColor: '#0A0A0B', borderRadius: 12, padding: 12, marginTop: 8 },
  dayCardRevTitle: { fontSize: 11, color: '#6B7280', marginBottom: 10, textAlign: 'center' },
  dayCardRevGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  dayCardRevItem: { alignItems: 'center' },
  dayCardRevValue: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginTop: 4 },
  dayCardTax: { fontSize: 10, color: '#6B7280', textAlign: 'center', marginTop: 10 },
  radarCard: { backgroundColor: '#111113', borderRadius: 10, padding: 12, width: 90, borderWidth: 1, borderColor: '#1F1F23' },
  radarCardFirst: { backgroundColor: '#1A1A1D' },
  radarDateContainer: { alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#1F1F23' },
  radarDayName: { fontSize: 10, color: '#6B7280', textTransform: 'uppercase' },
  radarDayNum: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginVertical: 2 },
  radarMonth: { fontSize: 9, color: '#6B7280' },
  radarStatsContainer: { alignItems: 'center', gap: 4 },
  radarOccupancyValue: { fontSize: 18, fontWeight: '700' },
  radarRoomsValue: { fontSize: 11, color: '#9CA3AF' },
  radarAdrValue: { fontSize: 10, color: '#60A5FA' },
  alertsBox: { backgroundColor: '#111113', borderRadius: 12, padding: 16, marginTop: 16, marginHorizontal: 16, borderWidth: 1, borderColor: '#1F1F23' },
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
  chartCard: { backgroundColor: '#111113', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1F1F23' },
  chartCardTitle: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginBottom: 16 },
  chartBarsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  chartBarWrapper: { alignItems: 'center' },
  chartBarCol: { justifyContent: 'flex-end' },
  chartBar: { width: 24, borderRadius: 6, minHeight: 4 },
  chartBarLabel: { fontSize: 9, color: '#9CA3AF', marginTop: 8, fontWeight: '600' },
  chartBarValue: { fontSize: 8, color: '#FFFFFF', marginTop: 4 },
  weekMonthCard: { backgroundColor: '#111113', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1F1F23' },
  controlCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  controlCardTitle: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  dateRangeText: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  monthProgress: { fontSize: 11, color: '#6B7280' },
  controlStatsRow: { flexDirection: 'row', alignItems: 'center' },
  controlStat: { flex: 1, alignItems: 'center' },
  controlStatDivider: { width: 1, height: 30, backgroundColor: '#1F1F23' },
  controlStatValue: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  controlStatLabel: { fontSize: 10, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  projectionBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1D', borderRadius: 8, padding: 12, marginTop: 12, gap: 8 },
  projectionText: { fontSize: 12, color: '#9CA3AF', flex: 1 },
  footerSpacer: { height: 60 },
});
