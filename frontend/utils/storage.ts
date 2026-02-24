import AsyncStorage from '@react-native-async-storage/async-storage';

// API URL - use backend for cloud storage
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const STORAGE_KEYS = {
  RESERVATIONS: '@badhotel_reservations',
  SETTINGS: '@badhotel_settings',
  LAST_UPDATE: '@badhotel_last_update',
  DASHBOARD_CACHE: '@badhotel_dashboard_cache',
  MEWS_DATA: '@badhotel_mews_data', // NEW: Store Mews report data directly
};

export interface Reservation {
  reservation_id: string;
  guest_name: string;
  room_number: string;
  check_in: string; // ISO date string
  check_out: string; // ISO date string
  room_revenue?: number;
  parking_revenue?: number;
  vending_revenue?: number;
  city_tax?: number;
  status: string;
  adults?: number;
  children?: number;
  total_amount?: number;
  payment_status?: string;
}

// NEW: Direct Mews data structure
export interface MewsDailyData {
  date: string; // ISO date
  occupancy: number; // percentage
  occupiedRooms: number;
  availableRooms: number;
  revenue: number;
  adr: number;
  arrivals: number;
  departures: number;
  customers: number;
}

export interface MewsReportStore {
  lastUpdate: string;
  daily: MewsDailyData[];
  weekly: MewsDailyData[];
  monthly: MewsDailyData[];
  arrivals: { date: string; count: number }[];
  departures: { date: string; count: number }[];
}

export interface HotelSettings {
  total_rooms: number;
  high_season_target: number;
  low_season_target: number;
}

export const DEFAULT_SETTINGS: HotelSettings = {
  total_rooms: 24, // 20 double + 2 triple + 2 single
  high_season_target: 85,
  low_season_target: 65,
};

// Save reservations to local storage
export async function saveReservations(reservations: Reservation[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.RESERVATIONS, JSON.stringify(reservations));
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_UPDATE, new Date().toISOString());
  } catch (error) {
    console.error('Error saving reservations:', error);
    throw error;
  }
}

// Load reservations from local storage
export async function loadReservations(): Promise<Reservation[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.RESERVATIONS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading reservations:', error);
    return [];
  }
}

// Save settings
export async function saveSettings(settings: HotelSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
}

// Load settings
export async function loadSettings(): Promise<HotelSettings> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error loading settings:', error);
    return DEFAULT_SETTINGS;
  }
}

// Get last update timestamp
export async function getLastUpdate(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.LAST_UPDATE);
  } catch (error) {
    console.error('Error getting last update:', error);
    return null;
  }
}

// Cache dashboard data for offline access
export async function cacheDashboard(data: any): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.DASHBOARD_CACHE, JSON.stringify(data));
  } catch (error) {
    console.error('Error caching dashboard:', error);
  }
}

// Load cached dashboard
export async function loadCachedDashboard(): Promise<any | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.DASHBOARD_CACHE);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading cached dashboard:', error);
    return null;
  }
}

// Clear all data
export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    console.log('All data cleared successfully');
  } catch (error) {
    console.error('Error clearing data:', error);
    throw error;
  }
}

// NEW: Save Mews report data to CLOUD (MongoDB via backend API)
export async function saveMewsData(data: Partial<MewsReportStore>): Promise<void> {
  try {
    // Prepare data
    const updated: MewsReportStore = {
      lastUpdate: new Date().toISOString(),
      daily: data.daily !== undefined ? data.daily : [],
      weekly: data.weekly !== undefined ? data.weekly : [],
      monthly: data.monthly !== undefined ? data.monthly : [],
      arrivals: data.arrivals !== undefined ? data.arrivals : [],
      departures: data.departures !== undefined ? data.departures : [],
    };
    
    // Save to backend (cloud storage)
    try {
      const response = await fetch(`${API_URL}/api/mews-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      
      if (response.ok) {
        console.log('Mews data saved to cloud:', { 
          daily: updated.daily.length, 
          weekly: updated.weekly.length, 
          monthly: updated.monthly.length,
          arrivals: updated.arrivals.length,
          departures: updated.departures.length,
        });
        
        // Also save locally as backup
        await AsyncStorage.setItem(STORAGE_KEYS.MEWS_DATA, JSON.stringify(updated));
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_UPDATE, new Date().toISOString());
        return;
      } else {
        console.warn('Cloud save failed, falling back to local:', await response.text());
      }
    } catch (apiError) {
      console.warn('API not available, saving locally:', apiError);
    }
    
    // Fallback to local storage
    await AsyncStorage.setItem(STORAGE_KEYS.MEWS_DATA, JSON.stringify(updated));
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_UPDATE, new Date().toISOString());
    console.log('Mews data saved locally:', { 
      daily: updated.daily.length, 
      weekly: updated.weekly.length, 
      monthly: updated.monthly.length,
    });
  } catch (error) {
    console.error('Error saving Mews data:', error);
    throw error;
  }
}

// NEW: Load Mews report data
export async function loadMewsData(): Promise<MewsReportStore> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.MEWS_DATA);
    if (data) {
      const parsed = JSON.parse(data);
      // Ensure all fields exist for backward compatibility
      return {
        lastUpdate: parsed.lastUpdate || '',
        daily: parsed.daily || [],
        weekly: parsed.weekly || [],
        monthly: parsed.monthly || [],
        arrivals: parsed.arrivals || [],
        departures: parsed.departures || [],
      };
    }
    return { lastUpdate: '', daily: [], weekly: [], monthly: [], arrivals: [], departures: [] };
  } catch (error) {
    console.error('Error loading Mews data:', error);
    return { lastUpdate: '', daily: [], weekly: [], monthly: [], arrivals: [], departures: [] };
  }
}

// NEW: Get today's data from Mews store
export async function getTodayData(): Promise<MewsDailyData | null> {
  try {
    const mewsData = await loadMewsData();
    const today = new Date().toISOString().split('T')[0];
    
    // Look in daily data first
    if (mewsData.daily.length > 0) {
      const todayData = mewsData.daily.find(d => d.date === today);
      if (todayData) return todayData;
      
      // If no exact match, return most recent
      return mewsData.daily[mewsData.daily.length - 1];
    }
    
    return null;
  } catch (error) {
    console.error('Error getting today data:', error);
    return null;
  }
}
