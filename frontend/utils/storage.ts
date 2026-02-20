import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  RESERVATIONS: '@badhotel_reservations',
  SETTINGS: '@badhotel_settings',
  LAST_UPDATE: '@badhotel_last_update',
  DASHBOARD_CACHE: '@badhotel_dashboard_cache',
};

export interface Reservation {
  reservation_id: string;
  guest_name: string;
  room_number: string;
  check_in: string; // ISO date string
  check_out: string; // ISO date string
  room_revenue: number;
  parking_revenue: number;
  vending_revenue: number;
  city_tax: number;
  status: string;
}

export interface HotelSettings {
  total_rooms: number;
  high_season_target: number;
  low_season_target: number;
}

export const DEFAULT_SETTINGS: HotelSettings = {
  total_rooms: 24,
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
  } catch (error) {
    console.error('Error clearing data:', error);
    throw error;
  }
}
