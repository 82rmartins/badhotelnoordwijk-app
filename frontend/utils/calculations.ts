import { Reservation, HotelSettings, DEFAULT_SETTINGS } from './storage';

// ============== TYPES ==============

export interface DailyStats {
  date: Date;
  rooms_occupied: number;
  total_rooms: number;
  occupancy_percent: number;
  arrivals: number;
  departures: number;
  room_revenue: number;
  parking_revenue: number;
  vending_revenue: number;
  city_tax: number;
  adr: number;
}

export interface EnhancedAlert {
  message: string;  // Translation key
  message_params?: string[];  // Parameters for translation
  today_status: 'ok' | 'warning' | 'critical';
  future_status: 'ok' | 'warning' | 'critical';
  context: string;  // Translation key or empty
}

export interface DashboardData {
  status: 'green' | 'yellow' | 'red';
  status_reason: string | null;  // Translation key
  status_reason_params?: string[];  // Parameters for translation
  rhythm: 'up' | 'stable' | 'down';
  trend: 'improving' | 'stable' | 'worsening';
  last_update: string | null;
  today: DailyStats;
  radar: RadarDay[];
  week: WeekStats;
  month: MonthStats;
  alerts: EnhancedAlert[];
}

export interface RadarDay {
  date: Date;
  day_name: string;
  day_num: number;
  month: string;
  rooms_sold: number;
  total_rooms: number;
  occupancy_percent: number;
  adr: number;
  target: number;
  urgency: 'high' | 'medium' | 'low';
}

export interface WeekStats {
  start: Date;
  end: Date;
  occupancy_avg: number;
  revenue_total: number;
  adr_avg: number;
  trend: 'up' | 'down' | 'stable';
}

export interface MonthStats {
  name: string;
  occupancy_accumulated: number;
  revenue_accumulated: number;
  projected_occupancy: number;
  days_elapsed: number;
  days_total: number;
}

// ============== HELPER FUNCTIONS ==============

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTH_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function isHighSeason(date: Date): boolean {
  const month = date.getMonth() + 1; // 1-12
  return month >= 4 && month <= 9;
}

function getSeasonTarget(date: Date, settings: HotelSettings): number {
  return isHighSeason(date) ? settings.high_season_target : settings.low_season_target;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

function isDateInRange(date: Date, start: Date, end: Date): boolean {
  const d = startOfDay(date).getTime();
  const s = startOfDay(start).getTime();
  const e = startOfDay(end).getTime();
  return d >= s && d < e;
}

// ============== CALCULATION FUNCTIONS ==============

// Calculate daily stats for a specific date
export function calculateDailyStats(
  date: Date,
  reservations: Reservation[],
  settings: HotelSettings
): DailyStats {
  const dayStart = startOfDay(date);
  const dayEnd = addDays(dayStart, 1);
  
  // Find active reservations for this date
  const activeReservations = reservations.filter(res => {
    if (res.status === 'cancelled') return false;
    const checkIn = new Date(res.check_in);
    const checkOut = new Date(res.check_out);
    return checkIn <= dayStart && checkOut > dayStart;
  });
  
  // Count arrivals (check-in on this date)
  const arrivals = reservations.filter(res => {
    if (res.status === 'cancelled') return false;
    const checkIn = startOfDay(new Date(res.check_in));
    return isSameDay(checkIn, dayStart);
  }).length;
  
  // Count departures (check-out on this date)
  const departures = reservations.filter(res => {
    if (res.status === 'cancelled') return false;
    const checkOut = startOfDay(new Date(res.check_out));
    return isSameDay(checkOut, dayStart);
  }).length;
  
  const rooms_occupied = activeReservations.length;
  const total_rooms = settings.total_rooms;
  const occupancy_percent = total_rooms > 0 ? (rooms_occupied / total_rooms) * 100 : 0;
  
  // Calculate daily revenue (pro-rated)
  let room_revenue = 0;
  let parking_revenue = 0;
  let vending_revenue = 0;
  let city_tax = 0;
  
  activeReservations.forEach(res => {
    const checkIn = new Date(res.check_in);
    const checkOut = new Date(res.check_out);
    const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
    
    room_revenue += res.room_revenue / nights;
    parking_revenue += res.parking_revenue / nights;
    vending_revenue += res.vending_revenue / nights;
    city_tax += res.city_tax / nights;
  });
  
  const adr = rooms_occupied > 0 ? room_revenue / rooms_occupied : 0;
  
  return {
    date: dayStart,
    rooms_occupied,
    total_rooms,
    occupancy_percent: Math.round(occupancy_percent * 10) / 10,
    arrivals,
    departures,
    room_revenue: Math.round(room_revenue * 100) / 100,
    parking_revenue: Math.round(parking_revenue * 100) / 100,
    vending_revenue: Math.round(vending_revenue * 100) / 100,
    city_tax: Math.round(city_tax * 100) / 100,
    adr: Math.round(adr * 100) / 100,
  };
}

// Calculate status with reason - returns keys for translation
function calculateStatusWithReason(
  todayStats: DailyStats,
  radarStats: DailyStats[],
  settings: HotelSettings
): { status: 'green' | 'yellow' | 'red'; reason: string | null; reason_params: string[] } {
  const today = new Date();
  const todayTarget = getSeasonTarget(today, settings);
  const d7Target = getSeasonTarget(addDays(today, 7), settings);
  const d14Target = getSeasonTarget(addDays(today, 14), settings);
  
  const todayOcc = todayStats.occupancy_percent;
  const d7Occ = radarStats[6]?.occupancy_percent || 0;
  const d14Occ = radarStats[13]?.occupancy_percent || 0;
  
  const todayOk = todayOcc >= todayTarget * 0.8;
  const d7Ok = d7Occ >= d7Target * 0.9;
  const d14Ok = d14Occ >= d14Target * 0.8;
  
  // Build reason with translation key
  if (!todayOk) {
    const key = 'today_occupancy_below';
    const params = [todayOcc.toFixed(0)];
    if (todayOk && d7Ok && d14Ok) {
      return { status: 'green', reason: null, reason_params: [] };
    }
    return { status: d7Ok || d14Ok ? 'yellow' : 'red', reason: key, reason_params: params };
  }
  
  if (!d7Ok) {
    const key = 'd7_below_target';
    const params = [d7Occ.toFixed(0)];
    return { status: d14Ok ? 'yellow' : 'red', reason: key, reason_params: params };
  }
  
  if (!d14Ok) {
    const key = 'd14_below_target';
    const params = [d14Occ.toFixed(0)];
    return { status: 'yellow', reason: key, reason_params: params };
  }
  
  return { status: 'green', reason: null, reason_params: [] };
}

// Calculate rhythm (week-over-week revenue)
function calculateRhythm(currentWeekRevenue: number, previousWeekRevenue: number): 'up' | 'stable' | 'down' {
  if (previousWeekRevenue === 0) return 'stable';
  const change = (currentWeekRevenue - previousWeekRevenue) / previousWeekRevenue;
  if (change > 0.05) return 'up';
  if (change < -0.05) return 'down';
  return 'stable';
}

// Calculate trend (7-day occupancy comparison)
function calculateTrend(
  currentWeekStats: DailyStats[],
  previousWeekStats: DailyStats[]
): 'improving' | 'stable' | 'worsening' {
  if (previousWeekStats.length === 0) return 'stable';
  
  const currentAvg = currentWeekStats.reduce((sum, s) => sum + s.occupancy_percent, 0) / Math.max(currentWeekStats.length, 1);
  const previousAvg = previousWeekStats.reduce((sum, s) => sum + s.occupancy_percent, 0) / Math.max(previousWeekStats.length, 1);
  
  if (previousAvg === 0) return 'stable';
  const change = (currentAvg - previousAvg) / previousAvg;
  
  if (change > 0.05) return 'improving';
  if (change < -0.05) return 'worsening';
  return 'stable';
}

// Generate enhanced alerts - returns keys for translation
function generateEnhancedAlerts(
  todayStats: DailyStats,
  radarStats: DailyStats[],
  settings: HotelSettings
): EnhancedAlert[] {
  const alerts: EnhancedAlert[] = [];
  const today = new Date();
  
  const todayOcc = todayStats.occupancy_percent;
  const todayTarget = getSeasonTarget(today, settings);
  const todayBelow = todayOcc < todayTarget * 0.8;
  
  // Future outlook (next 7 days average)
  const futureStats = radarStats.slice(1, 8);
  const futureAvg = futureStats.reduce((sum, s) => sum + s.occupancy_percent, 0) / Math.max(futureStats.length, 1);
  const futureTarget = futureStats.reduce((sum, s) => sum + getSeasonTarget(s.date, settings), 0) / Math.max(futureStats.length, 1);
  const futureOk = futureAvg >= futureTarget * 0.8;
  
  // Alert 1: Today's occupancy
  if (todayBelow) {
    alerts.push({
      message: 'occupancy_below_target',
      message_params: [todayOcc.toFixed(0), todayTarget.toFixed(0)],
      today_status: 'critical',
      future_status: futureOk ? 'ok' : 'critical',
      context: futureOk ? 'next_days_on_track' : 'next_days_below_target',
    });
  }
  
  // Alert 2: Critical days ahead
  const lowDays = futureStats.filter(s => {
    const target = getSeasonTarget(s.date, settings);
    return s.occupancy_percent < target * 0.7;
  });
  
  if (lowDays.length >= 2 && alerts.length < 3) {
    alerts.push({
      message: 'critical_days_ahead',
      message_params: [lowDays.length.toString()],
      today_status: todayBelow ? 'critical' : 'ok',
      future_status: 'critical',
      context: todayBelow ? '' : 'today_on_target',
    });
  }
  
  // Alert 3: Consecutive weak days
  let consecutiveWeak = 0;
  for (const stat of radarStats.slice(0, 7)) {
    if (stat.occupancy_percent < 50) {
      consecutiveWeak++;
    } else {
      break;
    }
  }
  
  if (consecutiveWeak >= 3 && alerts.length < 3) {
    alerts.push({
      message: 'consecutive_low_days',
      message_params: [consecutiveWeak.toString()],
      today_status: todayBelow ? 'critical' : 'warning',
      future_status: 'critical',
      context: 'requires_attention',
    });
  }
  
  // No critical issues
  if (alerts.length === 0) {
    alerts.push({
      message: 'no_critical_issues',
      message_params: [],
      today_status: 'ok',
      future_status: 'ok',
      context: '',
    });
  }
  
  return alerts.slice(0, 3);
}

// ============== MAIN CALCULATION FUNCTION ==============

export function calculateDashboard(
  reservations: Reservation[],
  settings: HotelSettings,
  lastUpdate: string | null
): DashboardData {
  const today = startOfDay(new Date());
  
  // Calculate stats for today and radar (14 days)
  const radarStats: DailyStats[] = [];
  for (let i = 0; i < 14; i++) {
    const date = addDays(today, i);
    radarStats.push(calculateDailyStats(date, reservations, settings));
  }
  
  const todayStats = radarStats[0];
  
  // Calculate past 7 days for comparison
  const pastWeekStats: DailyStats[] = [];
  for (let i = 1; i <= 7; i++) {
    pastWeekStats.push(calculateDailyStats(addDays(today, -i), reservations, settings));
  }
  
  // Calculate previous week (8-14 days ago)
  const previousWeekStats: DailyStats[] = [];
  for (let i = 8; i <= 14; i++) {
    previousWeekStats.push(calculateDailyStats(addDays(today, -i), reservations, settings));
  }
  
  // Week stats (current week Mon-Sun)
  const dayOfWeek = today.getDay();
  const weekStart = addDays(today, -((dayOfWeek + 6) % 7)); // Monday
  const weekEnd = addDays(weekStart, 7);
  
  const currentWeekStats: DailyStats[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    if (date <= today) {
      currentWeekStats.push(calculateDailyStats(date, reservations, settings));
    }
  }
  
  const prevWeekStart = addDays(weekStart, -7);
  const prevWeekStats: DailyStats[] = [];
  for (let i = 0; i < 7; i++) {
    prevWeekStats.push(calculateDailyStats(addDays(prevWeekStart, i), reservations, settings));
  }
  
  const weekOccupancy = currentWeekStats.reduce((sum, s) => sum + s.occupancy_percent, 0) / Math.max(currentWeekStats.length, 1);
  const weekRevenue = currentWeekStats.reduce((sum, s) => sum + s.room_revenue + s.parking_revenue + s.vending_revenue, 0);
  const weekAdrValues = currentWeekStats.filter(s => s.adr > 0);
  const weekAdr = weekAdrValues.reduce((sum, s) => sum + s.adr, 0) / Math.max(weekAdrValues.length, 1);
  
  const prevWeekRevenue = prevWeekStats.reduce((sum, s) => sum + s.room_revenue + s.parking_revenue + s.vending_revenue, 0);
  const prevWeekOccupancy = prevWeekStats.reduce((sum, s) => sum + s.occupancy_percent, 0) / Math.max(prevWeekStats.length, 1);
  
  const weekTrend = weekOccupancy > prevWeekOccupancy * 1.05 ? 'up' : weekOccupancy < prevWeekOccupancy * 0.95 ? 'down' : 'stable';
  
  // Month stats
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const daysInMonth = Math.ceil((monthEnd.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24));
  const daysElapsed = today.getDate();
  
  const monthStats: DailyStats[] = [];
  for (let i = 0; i < daysElapsed; i++) {
    monthStats.push(calculateDailyStats(addDays(monthStart, i), reservations, settings));
  }
  
  const monthOccupancy = monthStats.reduce((sum, s) => sum + s.occupancy_percent, 0) / Math.max(monthStats.length, 1);
  const monthRevenue = monthStats.reduce((sum, s) => sum + s.room_revenue + s.parking_revenue + s.vending_revenue, 0);
  
  // Build radar with labels
  const radar: RadarDay[] = radarStats.map((stat, i) => ({
    date: stat.date,
    day_name: DAY_NAMES[stat.date.getDay()],
    day_num: stat.date.getDate(),
    month: MONTH_NAMES[stat.date.getMonth()],
    rooms_sold: stat.rooms_occupied,
    total_rooms: stat.total_rooms,
    occupancy_percent: stat.occupancy_percent,
    adr: stat.adr,
    target: getSeasonTarget(stat.date, settings),
    urgency: i <= 3 ? 'high' : i <= 7 ? 'medium' : 'low',
  }));
  
  // Calculate status, rhythm, trend, alerts
  const { status, reason, reason_params } = calculateStatusWithReason(todayStats, radarStats, settings);
  const rhythm = calculateRhythm(weekRevenue, prevWeekRevenue);
  const trend = calculateTrend(currentWeekStats, prevWeekStats);
  const alerts = generateEnhancedAlerts(todayStats, radarStats, settings);
  
  return {
    status,
    status_reason: reason,
    rhythm,
    trend,
    last_update: lastUpdate,
    today: todayStats,
    radar,
    week: {
      start: weekStart,
      end: weekEnd,
      occupancy_avg: Math.round(weekOccupancy * 10) / 10,
      revenue_total: Math.round(weekRevenue * 100) / 100,
      adr_avg: Math.round(weekAdr * 100) / 100,
      trend: weekTrend,
    },
    month: {
      name: MONTH_FULL[today.getMonth()],
      occupancy_accumulated: Math.round(monthOccupancy * 10) / 10,
      revenue_accumulated: Math.round(monthRevenue * 100) / 100,
      projected_occupancy: Math.round(monthOccupancy * 10) / 10,
      days_elapsed: daysElapsed,
      days_total: daysInMonth,
    },
    alerts,
  };
}

// Generate demo data
export function generateDemoReservations(settings: HotelSettings): Reservation[] {
  const reservations: Reservation[] = [];
  const today = startOfDay(new Date());
  
  for (let dayOffset = -7; dayOffset < 31; dayOffset++) {
    const date = addDays(today, dayOffset);
    const dayOfWeek = date.getDay();
    
    // Higher occupancy on weekends
    let baseOccupancy = dayOfWeek === 5 || dayOfWeek === 6 ? 0.85 : 0.65;
    baseOccupancy += (Math.random() - 0.5) * 0.3;
    baseOccupancy = Math.max(0.4, Math.min(0.95, baseOccupancy));
    
    const roomsToFill = Math.floor(settings.total_rooms * baseOccupancy);
    
    for (let room = 1; room <= roomsToFill; room++) {
      // Check if room already occupied
      const existing = reservations.find(r => {
        const checkIn = new Date(r.check_in);
        const checkOut = new Date(r.check_out);
        return r.room_number === String(room) && checkIn <= date && checkOut > date;
      });
      
      if (!existing) {
        const nights = Math.floor(Math.random() * 3) + 1;
        const roomRevenue = (120 + Math.random() * 160) * nights;
        
        reservations.push({
          reservation_id: `DEMO-${date.toISOString().slice(0,10)}-${room}`,
          guest_name: `Guest ${room}`,
          room_number: String(room),
          check_in: date.toISOString(),
          check_out: addDays(date, nights).toISOString(),
          room_revenue: Math.round(roomRevenue * 100) / 100,
          parking_revenue: Math.random() > 0.5 ? Math.round(Math.random() * 25 * nights * 100) / 100 : 0,
          vending_revenue: Math.random() > 0.7 ? Math.round(Math.random() * 15 * nights * 100) / 100 : 0,
          city_tax: Math.round(nights * 3.5 * 100) / 100,
          status: dayOffset < 0 ? 'checked_out' : 'confirmed',
        });
      }
    }
  }
  
  return reservations;
}
