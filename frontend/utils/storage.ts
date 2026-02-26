import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyData, WeeklyData, MonthlyData } from './xlsxParser';

// API URL - use backend for cloud storage
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const STORAGE_KEYS = {
  SETTINGS: '@badhotel_settings',
  LAST_UPDATE: '@badhotel_last_update',
  HOTEL_DATA: '@badhotel_hotel_data',
};

// ============================================
// TYPES
// ============================================

export interface HotelSettings {
  total_rooms: number;
  high_season_target: number;
  low_season_target: number;
}

export const DEFAULT_SETTINGS: HotelSettings = {
  total_rooms: 28,
  high_season_target: 85,
  low_season_target: 65,
};

// Main data store - mirrors Excel structure
export interface HotelDataStore {
  lastUpdate: string;
  daily: DailyData[];
  weekly: WeeklyData[];
  monthly: MonthlyData[];
  temperature?: number; // Today's temperature from Excel
}

// Legacy type alias for backward compatibility
export type MewsDailyData = DailyData;
export type MewsReportStore = {
  lastUpdate: string;
  daily: DailyData[];
  weekly: DailyData[]; // Legacy: converted from WeeklyData
  monthly: DailyData[]; // Legacy: converted from MonthlyData
  arrivals?: { date: string; count: number }[];
  departures?: { date: string; count: number }[];
  temperature?: number;
};

// ============================================
// SETTINGS
// ============================================

export async function saveSettings(settings: HotelSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
}

export async function loadSettings(): Promise<HotelSettings> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error loading settings:', error);
    return DEFAULT_SETTINGS;
  }
}

// ============================================
// LAST UPDATE
// ============================================

export async function getLastUpdate(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.LAST_UPDATE);
  } catch (error) {
    console.error('Error getting last update:', error);
    return null;
  }
}

// ============================================
// HOTEL DATA - CLOUD FIRST (MongoDB)
// ============================================

// SAVE: Completely replace all data (as per contract)
export async function saveHotelData(data: {
  daily: DailyData[];
  weekly: WeeklyData[];
  monthly: MonthlyData[];
  temperature?: number;
}): Promise<void> {
  const store: HotelDataStore = {
    lastUpdate: new Date().toISOString(),
    daily: data.daily,
    weekly: data.weekly,
    monthly: data.monthly,
    temperature: data.temperature,
  };

  try {
    // Save to cloud (MongoDB via backend)
    const response = await fetch(`${API_URL}/api/mews-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(store),
    });

    if (response.ok) {
      console.log('[Storage] Data saved to cloud:', {
        daily: data.daily.length,
        weekly: data.weekly.length,
        monthly: data.monthly.length,
      });
      
      // Also save locally as backup
      await AsyncStorage.setItem(STORAGE_KEYS.HOTEL_DATA, JSON.stringify(store));
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_UPDATE, store.lastUpdate);
      return;
    }

    console.warn('[Storage] Cloud save failed:', await response.text());
  } catch (error) {
    console.warn('[Storage] Cloud unavailable, saving locally:', error);
  }

  // Fallback to local
  await AsyncStorage.setItem(STORAGE_KEYS.HOTEL_DATA, JSON.stringify(store));
  await AsyncStorage.setItem(STORAGE_KEYS.LAST_UPDATE, store.lastUpdate);
}

// LOAD: Always try cloud first for consistency across devices
export async function loadHotelData(): Promise<HotelDataStore> {
  const emptyData: HotelDataStore = {
    lastUpdate: '',
    daily: [],
    weekly: [],
    monthly: [],
  };

  try {
    // Try cloud first
    const response = await fetch(`${API_URL}/api/mews-data`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('[Storage] Data loaded from cloud:', {
        daily: data.daily?.length || 0,
        weekly: data.weekly?.length || 0,
        monthly: data.monthly?.length || 0,
      });

      const result: HotelDataStore = {
        lastUpdate: data.lastUpdate || '',
        daily: data.daily || [],
        weekly: data.weekly || [],
        monthly: data.monthly || [],
        temperature: data.temperature,
      };

      // Cache locally
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.HOTEL_DATA, JSON.stringify(result));
      } catch (e) {
        // Ignore local cache errors
      }

      return result;
    }
  } catch (error) {
    console.warn('[Storage] Cloud unavailable:', error);
  }

  // Fallback to local
  try {
    const localData = await AsyncStorage.getItem(STORAGE_KEYS.HOTEL_DATA);
    if (localData) {
      const parsed = JSON.parse(localData);
      console.log('[Storage] Data loaded from local (fallback):', {
        daily: parsed.daily?.length || 0,
        weekly: parsed.weekly?.length || 0,
        monthly: parsed.monthly?.length || 0,
      });
      return {
        lastUpdate: parsed.lastUpdate || '',
        daily: parsed.daily || [],
        weekly: parsed.weekly || [],
        monthly: parsed.monthly || [],
        temperature: parsed.temperature,
      };
    }
  } catch (error) {
    console.error('[Storage] Local load error:', error);
  }

  return emptyData;
}

// CLEAR: Remove all data (cloud + local)
export async function clearAllData(): Promise<void> {
  try {
    // Clear cloud
    try {
      await fetch(`${API_URL}/api/mews-data`, { method: 'DELETE' });
      console.log('[Storage] Cloud data cleared');
    } catch (error) {
      console.warn('[Storage] Could not clear cloud:', error);
    }

    // Clear local
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.HOTEL_DATA,
      STORAGE_KEYS.LAST_UPDATE,
    ]);
    console.log('[Storage] All data cleared');
  } catch (error) {
    console.error('[Storage] Clear error:', error);
    throw error;
  }
}

// ============================================
// LEGACY COMPATIBILITY FUNCTIONS
// ============================================

// Legacy save function - redirects to new saveHotelData
export async function saveMewsData(data: Partial<MewsReportStore>): Promise<void> {
  return saveHotelData({
    daily: data.daily || [],
    weekly: data.weekly?.map(w => ({
      isoWeek: '',
      weekStart: w.date || '',
      weekEnd: '',
      available: w.availableRooms || 0,
      occupied: w.occupiedRooms || 0,
      occupancy: w.occupancy || 0,
      revenueNights: w.revenue || 0,
      adr: w.adr || 0,
      customers: w.customers || 0,
      touristTax: w.touristTax || 0,
      parking: w.parkingRevenue || 0,
      totalRevenue: w.totalRevenue || 0,
    })) || [],
    monthly: data.monthly?.map(m => ({
      month: '',
      monthStart: m.date || '',
      monthEnd: '',
      available: m.availableRooms || 0,
      occupied: m.occupiedRooms || 0,
      occupancy: m.occupancy || 0,
      revenueNights: m.revenue || 0,
      adr: m.adr || 0,
      customers: m.customers || 0,
      touristTax: m.touristTax || 0,
      parking: m.parkingRevenue || 0,
      totalRevenue: m.totalRevenue || 0,
    })) || [],
  });
}

// Legacy load function - returns data in old format with arrivals/departures extracted
export async function loadMewsData(): Promise<MewsReportStore> {
  const emptyData: MewsReportStore = {
    lastUpdate: '',
    daily: [],
    weekly: [],
    monthly: [],
    arrivals: [],
    departures: [],
  };

  try {
    // Try cloud first - API returns new format
    const response = await fetch(`${API_URL}/api/mews-data`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('[Storage] Mews data loaded from CLOUD:', {
        arrivals: data.arrivals?.length || 0,
        daily: data.daily?.length || 0,
        departures: data.departures?.length || 0,
        monthly: data.monthly?.length || 0,
        weekly: data.weekly?.length || 0,
      });

      // Extract arrivals and departures from daily data
      const arrivals: { date: string; count: number }[] = [];
      const departures: { date: string; count: number }[] = [];
      
      for (const day of (data.daily || [])) {
        if (day.arrivals > 0) {
          arrivals.push({ date: day.date, count: day.arrivals });
        }
        if (day.departures > 0) {
          departures.push({ date: day.date, count: day.departures });
        }
      }

      // Convert weekly from new format to legacy format
      const weeklyLegacy: DailyData[] = (data.weekly || []).map((w: any) => ({
        date: w.weekStart || w.date || '',
        occupancy: w.occupancy || 0,
        occupiedRooms: w.occupied || w.occupiedRooms || 0,
        availableRooms: w.available || w.availableRooms || 0,
        revenue: w.revenueNights || w.revenue || 0,
        totalRevenue: w.totalRevenue || 0,
        parkingRevenue: w.parking || w.parkingRevenue || 0,
        touristTax: w.touristTax || 0,
        adr: w.adr || 0,
        arrivals: 0,
        departures: 0,
        customers: w.customers || 0,
      }));

      // Convert monthly from new format to legacy format
      const monthlyLegacy: DailyData[] = (data.monthly || []).map((m: any) => ({
        date: m.monthStart || m.date || '',
        occupancy: m.occupancy || 0,
        occupiedRooms: m.occupied || m.occupiedRooms || 0,
        availableRooms: m.available || m.availableRooms || 0,
        revenue: m.revenueNights || m.revenue || 0,
        totalRevenue: m.totalRevenue || 0,
        parkingRevenue: m.parking || m.parkingRevenue || 0,
        touristTax: m.touristTax || 0,
        adr: m.adr || 0,
        arrivals: 0,
        departures: 0,
        customers: m.customers || 0,
      }));

      return {
        lastUpdate: data.lastUpdate || '',
        daily: data.daily || [],
        weekly: weeklyLegacy,
        monthly: monthlyLegacy,
        arrivals,
        departures,
        temperature: data.temperature,
      };
    }
  } catch (error) {
    console.warn('[Storage] Cloud unavailable:', error);
  }

  return emptyData;
}

// ============================================
// DEPRECATED - Remove in future
// ============================================

export interface Reservation {
  reservation_id: string;
  guest_name: string;
  room_number: string;
  check_in: string;
  check_out: string;
  status: string;
}

export async function saveReservations(reservations: Reservation[]): Promise<void> {
  console.warn('[Storage] saveReservations is deprecated');
}

export async function loadReservations(): Promise<Reservation[]> {
  console.warn('[Storage] loadReservations is deprecated');
  return [];
}

export async function cacheDashboard(data: any): Promise<void> {
  // No-op
}

export async function loadCachedDashboard(): Promise<any | null> {
  return null;
}

export async function getTodayData(): Promise<DailyData | null> {
  const data = await loadHotelData();
  const today = new Date().toISOString().split('T')[0];
  return data.daily.find(d => d.date === today) || null;
}
