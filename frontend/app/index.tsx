import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  Animated,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface DashboardData {
  status: 'green' | 'yellow' | 'red';
  rhythm: 'up' | 'stable' | 'down';
  last_update: string | null;
  today: {
    date: string;
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
  };
  radar: Array<{
    date: string;
    day_name: string;
    day_num: number;
    month: string;
    rooms_sold: number;
    total_rooms: number;
    occupancy_percent: number;
    adr: number;
    target: number;
    urgency: 'high' | 'medium' | 'low';
  }>;
  week: {
    start: string;
    end: string;
    occupancy_avg: number;
    revenue_total: number;
    adr_avg: number;
    trend: 'up' | 'down' | 'stable';
  };
  month: {
    name: string;
    occupancy_accumulated: number;
    revenue_accumulated: number;
    projected_occupancy: number;
    days_elapsed: number;
    days_total: number;
  };
  alerts: string[];
}

// Animated Counter Component
const AnimatedCounter = ({ value, suffix = '', prefix = '', decimals = 0, style }: {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  style?: any;
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    animatedValue.setValue(0);
    Animated.timing(animatedValue, {
      toValue: value,
      duration: 1000,
      useNativeDriver: false,
    }).start();

    const listener = animatedValue.addListener(({ value }) => {
      setDisplayValue(value);
    });

    return () => animatedValue.removeListener(listener);
  }, [value]);

  return (
    <Text style={style}>
      {prefix}{displayValue.toFixed(decimals)}{suffix}
    </Text>
  );
};

// Real-time Clock Component
const RealTimeClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Text style={styles.clockText}>
      {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </Text>
  );
};

// Status Badge Component
const StatusBadge = ({ status }: { status: 'green' | 'yellow' | 'red' }) => {
  const statusConfig = {
    green: { color: '#10B981', text: 'Sob Controle', icon: 'checkmark-circle' },
    yellow: { color: '#F59E0B', text: 'Atenção', icon: 'warning' },
    red: { color: '#EF4444', text: 'Risco', icon: 'alert-circle' },
  };

  const config = statusConfig[status];

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.color + '20' }]}>
      <Ionicons name={config.icon as any} size={16} color={config.color} />
      <Text style={[styles.statusText, { color: config.color }]}>{config.text}</Text>
    </View>
  );
};

// Rhythm Indicator Component
const RhythmIndicator = ({ rhythm }: { rhythm: 'up' | 'stable' | 'down' }) => {
  const rhythmConfig = {
    up: { icon: 'trending-up', text: 'Acelerando', color: '#10B981' },
    stable: { icon: 'trending-up', text: 'Estável', color: '#6B7280', rotation: 0 },
    down: { icon: 'trending-down', text: 'Desacelerando', color: '#EF4444' },
  };

  const config = rhythmConfig[rhythm];

  return (
    <View style={styles.rhythmContainer}>
      <Ionicons name={config.icon as any} size={14} color={config.color} />
      <Text style={[styles.rhythmText, { color: config.color }]}>{config.text}</Text>
    </View>
  );
};

// Radar Day Card Component
const RadarDayCard = ({ day, index }: { day: any; index: number }) => {
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
    <View style={[
      styles.radarCard,
      { borderLeftColor: getBorderColor(), borderLeftWidth: 3 },
      index === 0 && styles.radarCardFirst
    ]}>
      <View style={styles.radarDateContainer}>
        <Text style={styles.radarDayName}>{day.day_name}</Text>
        <Text style={styles.radarDayNum}>{day.day_num}</Text>
        <Text style={styles.radarMonth}>{day.month}</Text>
      </View>
      <View style={styles.radarStatsContainer}>
        <View style={styles.radarOccupancy}>
          <Text style={[styles.radarOccupancyValue, { color: getUrgencyColor() }]}>
            {day.occupancy_percent.toFixed(0)}%
          </Text>
          <Text style={styles.radarOccupancyLabel}>ocupação</Text>
        </View>
        <View style={styles.radarRooms}>
          <Text style={styles.radarRoomsValue}>
            {day.rooms_sold}/{day.total_rooms}
          </Text>
          <Text style={styles.radarRoomsLabel}>quartos</Text>
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

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/dashboard`);
      if (!response.ok) throw new Error('Failed to fetch dashboard');
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching dashboard:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard();
  }, [fetchDashboard]);

  const formatCurrency = (value: number) => `€${value.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' +
           date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Carregando dados...</Text>
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
            <Text style={styles.brandName}>Bad Hotel</Text>
            <Text style={styles.brandLocation}>Noordwijk</Text>
          </View>
          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => router.push('/admin')}
          >
            <Ionicons name="settings-outline" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.statusRow}>
          <StatusBadge status={data?.status || 'green'} />
          <RhythmIndicator rhythm={data?.rhythm || 'stable'} />
          <RealTimeClock />
        </View>
        
        <Text style={styles.lastUpdate}>
          Última atualização: {formatDate(data?.last_update || null)}
        </Text>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10B981"
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Section 1: TODAY */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="today" size={20} color="#10B981" />
            <Text style={styles.sectionTitle}>HOJE</Text>
            <Text style={styles.sectionSubtitle}>Operação</Text>
          </View>

          <View style={styles.cardGrid}>
            {/* Occupancy Card */}
            <View style={styles.cardLarge}>
              <Text style={styles.cardLabel}>Ocupação</Text>
              <View style={styles.occupancyDisplay}>
                <AnimatedCounter
                  value={data?.today.occupancy_percent || 0}
                  suffix="%"
                  style={styles.occupancyValue}
                />
              </View>
              <Text style={styles.cardSubtext}>
                {data?.today.rooms_occupied || 0} / {data?.today.total_rooms || 24} quartos
              </Text>
            </View>

            {/* Arrivals/Departures Card */}
            <View style={styles.cardMedium}>
              <View style={styles.arrDepRow}>
                <View style={styles.arrDepItem}>
                  <Ionicons name="log-in" size={18} color="#10B981" />
                  <Text style={styles.arrDepValue}>{data?.today.arrivals || 0}</Text>
                  <Text style={styles.arrDepLabel}>Chegadas</Text>
                </View>
                <View style={styles.arrDepDivider} />
                <View style={styles.arrDepItem}>
                  <Ionicons name="log-out" size={18} color="#F59E0B" />
                  <Text style={styles.arrDepValue}>{data?.today.departures || 0}</Text>
                  <Text style={styles.arrDepLabel}>Saídas</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Revenue Section */}
          <View style={styles.revenueSection}>
            <Text style={styles.revenueSectionTitle}>Receita do Dia</Text>
            <View style={styles.revenueGrid}>
              <View style={styles.revenueItem}>
                <Ionicons name="bed" size={16} color="#60A5FA" />
                <Text style={styles.revenueValue}>{formatCurrency(data?.today.room_revenue || 0)}</Text>
                <Text style={styles.revenueLabel}>Quartos</Text>
              </View>
              <View style={styles.revenueItem}>
                <Ionicons name="car" size={16} color="#A78BFA" />
                <Text style={styles.revenueValue}>{formatCurrency(data?.today.parking_revenue || 0)}</Text>
                <Text style={styles.revenueLabel}>Estacionamento</Text>
              </View>
              <View style={styles.revenueItem}>
                <Ionicons name="cafe" size={16} color="#F472B6" />
                <Text style={styles.revenueValue}>{formatCurrency(data?.today.vending_revenue || 0)}</Text>
                <Text style={styles.revenueLabel}>Vending</Text>
              </View>
            </View>
            <View style={styles.cityTaxContainer}>
              <Ionicons name="document-text-outline" size={14} color="#6B7280" />
              <Text style={styles.cityTaxText}>
                City Tax: {formatCurrency(data?.today.city_tax || 0)} (separado)
              </Text>
            </View>
          </View>
        </View>

        {/* Section 2: RADAR (14 DAYS) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="radio" size={20} color="#F59E0B" />
            <Text style={styles.sectionTitle}>RADAR</Text>
            <Text style={styles.sectionSubtitle}>Próximos 14 dias</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.radarScroll}
          >
            {data?.radar.map((day, index) => (
              <RadarDayCard key={index} day={day} index={index} />
            ))}
          </ScrollView>

          {/* Alerts Box */}
          <View style={styles.alertsBox}>
            <View style={styles.alertsHeader}>
              <Ionicons name="alert-circle" size={18} color="#F59E0B" />
              <Text style={styles.alertsTitle}>O que merece atenção</Text>
            </View>
            {data?.alerts.map((alert, index) => (
              <View key={index} style={styles.alertItem}>
                <View style={styles.alertDot} />
                <Text style={styles.alertText}>{alert}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Section 3: CONTROL (WEEK & MONTH) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="analytics" size={20} color="#60A5FA" />
            <Text style={styles.sectionTitle}>CONTROLE</Text>
            <Text style={styles.sectionSubtitle}>Semana & Mês</Text>
          </View>

          {/* Week Stats */}
          <View style={styles.controlCard}>
            <View style={styles.controlCardHeader}>
              <Text style={styles.controlCardTitle}>Semana Atual</Text>
              <View style={styles.trendBadge}>
                <Ionicons
                  name={data?.week.trend === 'up' ? 'trending-up' : data?.week.trend === 'down' ? 'trending-down' : 'remove'}
                  size={14}
                  color={data?.week.trend === 'up' ? '#10B981' : data?.week.trend === 'down' ? '#EF4444' : '#6B7280'}
                />
                <Text style={[
                  styles.trendText,
                  { color: data?.week.trend === 'up' ? '#10B981' : data?.week.trend === 'down' ? '#EF4444' : '#6B7280' }
                ]}>
                  {data?.week.trend === 'up' ? 'vs anterior' : data?.week.trend === 'down' ? 'vs anterior' : 'estável'}
                </Text>
              </View>
            </View>
            <View style={styles.controlStatsRow}>
              <View style={styles.controlStat}>
                <AnimatedCounter
                  value={data?.week.occupancy_avg || 0}
                  suffix="%"
                  style={styles.controlStatValue}
                />
                <Text style={styles.controlStatLabel}>Ocupação média</Text>
              </View>
              <View style={styles.controlStatDivider} />
              <View style={styles.controlStat}>
                <Text style={styles.controlStatValue}>{formatCurrency(data?.week.revenue_total || 0)}</Text>
                <Text style={styles.controlStatLabel}>Receita total</Text>
              </View>
              <View style={styles.controlStatDivider} />
              <View style={styles.controlStat}>
                <Text style={styles.controlStatValue}>€{(data?.week.adr_avg || 0).toFixed(0)}</Text>
                <Text style={styles.controlStatLabel}>ADR médio</Text>
              </View>
            </View>
          </View>

          {/* Month Stats */}
          <View style={styles.controlCard}>
            <View style={styles.controlCardHeader}>
              <Text style={styles.controlCardTitle}>{data?.month.name || 'Mês Atual'}</Text>
              <Text style={styles.monthProgress}>
                Dia {data?.month.days_elapsed || 0} de {data?.month.days_total || 30}
              </Text>
            </View>
            <View style={styles.controlStatsRow}>
              <View style={styles.controlStat}>
                <AnimatedCounter
                  value={data?.month.occupancy_accumulated || 0}
                  suffix="%"
                  style={styles.controlStatValue}
                />
                <Text style={styles.controlStatLabel}>Ocupação acumulada</Text>
              </View>
              <View style={styles.controlStatDivider} />
              <View style={styles.controlStat}>
                <Text style={styles.controlStatValue}>{formatCurrency(data?.month.revenue_accumulated || 0)}</Text>
                <Text style={styles.controlStatLabel}>Receita acumulada</Text>
              </View>
            </View>
            <View style={styles.projectionBox}>
              <Ionicons name="analytics-outline" size={14} color="#9CA3AF" />
              <Text style={styles.projectionText}>
                Mantido o ritmo atual, a ocupação média projetada é de {(data?.month.projected_occupancy || 0).toFixed(0)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Footer Spacer */}
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0A0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 16,
    fontSize: 14,
  },
  header: {
    backgroundColor: '#111113',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F23',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  brandLocation: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  adminButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#1F1F23',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rhythmContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rhythmText: {
    fontSize: 12,
    fontWeight: '500',
  },
  clockText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    marginLeft: 'auto',
  },
  lastUpdate: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F23',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  cardGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  cardLarge: {
    flex: 1,
    backgroundColor: '#111113',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F1F23',
  },
  cardMedium: {
    flex: 1,
    backgroundColor: '#111113',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F1F23',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  occupancyDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  occupancyValue: {
    fontSize: 42,
    fontWeight: '700',
    color: '#10B981',
    fontVariant: ['tabular-nums'],
  },
  cardSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  arrDepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  arrDepItem: {
    alignItems: 'center',
    flex: 1,
  },
  arrDepDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#1F1F23',
  },
  arrDepValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  arrDepLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  revenueSection: {
    backgroundColor: '#111113',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F1F23',
  },
  revenueSectionTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  revenueGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  revenueItem: {
    alignItems: 'center',
    flex: 1,
  },
  revenueValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 6,
  },
  revenueLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  cityTaxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F1F23',
    gap: 6,
  },
  cityTaxText: {
    fontSize: 12,
    color: '#6B7280',
  },
  radarScroll: {
    paddingVertical: 4,
    gap: 10,
  },
  radarCard: {
    backgroundColor: '#111113',
    borderRadius: 10,
    padding: 12,
    width: 100,
    borderWidth: 1,
    borderColor: '#1F1F23',
  },
  radarCardFirst: {
    backgroundColor: '#1A1A1D',
  },
  radarDateContainer: {
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F23',
  },
  radarDayName: {
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  radarDayNum: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginVertical: 2,
  },
  radarMonth: {
    fontSize: 10,
    color: '#6B7280',
  },
  radarStatsContainer: {
    gap: 6,
  },
  radarOccupancy: {
    alignItems: 'center',
  },
  radarOccupancyValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  radarOccupancyLabel: {
    fontSize: 9,
    color: '#6B7280',
  },
  radarRooms: {
    alignItems: 'center',
  },
  radarRoomsValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  radarRoomsLabel: {
    fontSize: 9,
    color: '#6B7280',
  },
  radarAdr: {
    alignItems: 'center',
  },
  radarAdrValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#60A5FA',
  },
  radarAdrLabel: {
    fontSize: 9,
    color: '#6B7280',
  },
  alertsBox: {
    backgroundColor: '#111113',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#1F1F23',
  },
  alertsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  alertsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 6,
    gap: 10,
  },
  alertDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
    marginTop: 5,
  },
  alertText: {
    fontSize: 13,
    color: '#D1D5DB',
    flex: 1,
    lineHeight: 18,
  },
  controlCard: {
    backgroundColor: '#111113',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1F1F23',
  },
  controlCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  controlCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '500',
  },
  monthProgress: {
    fontSize: 11,
    color: '#6B7280',
  },
  controlStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlStat: {
    flex: 1,
    alignItems: 'center',
  },
  controlStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#1F1F23',
  },
  controlStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  controlStatLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  projectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1D',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  projectionText: {
    fontSize: 12,
    color: '#9CA3AF',
    flex: 1,
  },
  footerSpacer: {
    height: 40,
  },
});
