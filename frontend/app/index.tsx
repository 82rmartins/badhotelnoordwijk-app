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

import { loadReservations, loadSettings, getLastUpdate, loadCachedDashboard, cacheDashboard, DEFAULT_SETTINGS } from '../utils/storage';
import { calculateDashboard, DashboardData, generateDemoReservations } from '../utils/calculations';

const { width } = Dimensions.get('window');

// Hotel Logo Component (SVG-style rendering)
const HotelLogo = ({ size = 40 }: { size?: number }) => {
  return (
    <View style={[logoStyles.container, { width: size, height: size }]}>
      {/* Top half - lighter blue */}
      <View style={[logoStyles.topHalf, { borderTopLeftRadius: size/2, borderTopRightRadius: size/2 }]} />
      {/* Bottom half - darker blue with wave */}
      <View style={[logoStyles.bottomHalf, { borderBottomLeftRadius: size/2, borderBottomRightRadius: size/2 }]}>
        {/* Wave effect */}
        <View style={logoStyles.wave} />
      </View>
    </View>
  );
};

const logoStyles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 999,
  },
  topHalf: {
    flex: 1,
    backgroundColor: '#8FAFC4', // Light blue
  },
  bottomHalf: {
    flex: 1,
    backgroundColor: '#5F7F94', // Darker blue
    position: 'relative',
  },
  wave: {
    position: 'absolute',
    top: -6,
    left: 0,
    right: 0,
    height: 12,
    backgroundColor: '#8FAFC4',
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
    transform: [{ scaleX: 1.5 }],
  },
});

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

// Status Badge Component with Reason
const StatusBadge = ({ status, reason }: { status: 'green' | 'yellow' | 'red'; reason?: string | null }) => {
  const statusConfig = {
    green: { color: '#10B981', text: 'Sob Controle', icon: 'checkmark-circle' },
    yellow: { color: '#F59E0B', text: 'Atenção', icon: 'warning' },
    red: { color: '#EF4444', text: 'Risco', icon: 'alert-circle' },
  };

  const config = statusConfig[status];

  return (
    <View style={styles.statusContainer}>
      <View style={[styles.statusBadge, { backgroundColor: config.color + '20' }]}>
        <Ionicons name={config.icon as any} size={16} color={config.color} />
        <Text style={[styles.statusText, { color: config.color }]}>{config.text}</Text>
      </View>
      {reason && status !== 'green' && (
        <Text style={[styles.statusReason, { color: config.color }]}>{reason}</Text>
      )}
    </View>
  );
};

// Trend Indicator Component (↑ → ↓)
const TrendIndicator = ({ trend }: { trend: 'improving' | 'stable' | 'worsening' }) => {
  const trendConfig = {
    improving: { icon: '↑', text: 'Melhorando', color: '#10B981' },
    stable: { icon: '→', text: 'Estável', color: '#6B7280' },
    worsening: { icon: '↓', text: 'Piorando', color: '#EF4444' },
  };

  const config = trendConfig[trend];

  return (
    <View style={styles.trendContainer}>
      <Text style={[styles.trendArrow, { color: config.color }]}>{config.icon}</Text>
      <Text style={[styles.trendText, { color: config.color }]}>{config.text}</Text>
    </View>
  );
};

// Rhythm Indicator Component
const RhythmIndicator = ({ rhythm }: { rhythm: 'up' | 'stable' | 'down' }) => {
  const rhythmConfig = {
    up: { icon: 'trending-up', text: 'Acelerando', color: '#10B981' },
    stable: { icon: 'remove', text: 'Estável', color: '#6B7280' },
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

// Enhanced Alert Component
const AlertItem = ({ alert }: { alert: any }) => {
  const getStatusColor = (status: string) => {
    if (status === 'ok') return '#10B981';
    if (status === 'warning') return '#F59E0B';
    return '#EF4444';
  };

  return (
    <View style={styles.alertItem}>
      <View style={styles.alertIndicators}>
        <View style={[styles.alertDot, { backgroundColor: getStatusColor(alert.today_status) }]} />
        <View style={styles.alertDotConnector} />
        <View style={[styles.alertDot, { backgroundColor: getStatusColor(alert.future_status) }]} />
      </View>
      <View style={styles.alertContent}>
        <Text style={styles.alertText}>{alert.message}</Text>
        {alert.context ? (
          <Text style={styles.alertContext}>{alert.context}</Text>
        ) : null}
      </View>
    </View>
  );
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadDashboard = useCallback(async () => {
    try {
      // Load from local storage
      let reservations = await loadReservations();
      const settings = await loadSettings();
      const lastUpdate = await getLastUpdate();
      
      // If no data, try to load cached dashboard
      if (reservations.length === 0) {
        const cached = await loadCachedDashboard();
        if (cached) {
          setData(cached);
          setLoading(false);
          setRefreshing(false);
          return;
        }
        // Generate demo data for first use
        reservations = generateDemoReservations(settings);
      }
      
      // Calculate dashboard
      const dashboardData = calculateDashboard(reservations, settings, lastUpdate);
      setData(dashboardData);
      
      // Cache for offline access
      await cacheDashboard(dashboardData);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      // Try to load cached version
      const cached = await loadCachedDashboard();
      if (cached) setData(cached);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboard();
  }, [loadDashboard]);

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
          <StatusBadge status={data?.status || 'green'} reason={data?.status_reason} />
          <TrendIndicator trend={data?.trend || 'stable'} />
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

          {/* Enhanced Alerts Box */}
          <View style={styles.alertsBox}>
            <View style={styles.alertsHeader}>
              <Ionicons name="alert-circle" size={18} color="#F59E0B" />
              <Text style={styles.alertsTitle}>O que merece atenção</Text>
            </View>
            <View style={styles.alertLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#6B7280' }]} />
                <Text style={styles.legendText}>hoje</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#6B7280' }]} />
                <Text style={styles.legendText}>próx. dias</Text>
              </View>
            </View>
            {data?.alerts.map((alert, index) => (
              <AlertItem key={index} alert={alert} />
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
                  styles.weekTrendText,
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
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusContainer: {
    flexDirection: 'column',
    gap: 2,
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
  statusReason: {
    fontSize: 10,
    marginTop: 2,
    marginLeft: 4,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendArrow: {
    fontSize: 16,
    fontWeight: '700',
  },
  trendText: {
    fontSize: 11,
    fontWeight: '500',
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
    marginBottom: 8,
    gap: 8,
  },
  alertsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  alertLegend: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F23',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    color: '#6B7280',
  },
  alertItem: {
    flexDirection: 'row',
    marginVertical: 8,
    gap: 12,
  },
  alertIndicators: {
    alignItems: 'center',
    width: 20,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  alertDotConnector: {
    width: 1,
    height: 8,
    backgroundColor: '#374151',
    marginVertical: 2,
  },
  alertContent: {
    flex: 1,
  },
  alertText: {
    fontSize: 13,
    color: '#D1D5DB',
    lineHeight: 18,
  },
  alertContext: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontStyle: 'italic',
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
  weekTrendText: {
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
