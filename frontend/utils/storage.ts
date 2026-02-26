import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyData, WeeklyData, MonthlyData } from './xlsxParser';

// API URL
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

export interface HotelDataStore {
  lastUpdate: string;
  daily: DailyData[];
  weekly: WeeklyData[];
  monthly: MonthlyData[];
}

// ============================================
// SETTINGS
// ============================================

export async function saveSettings(settings: HotelSettings): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

export async function loadSettings(): Promise<HotelSettings> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function getLastUpdate(): Promise<string | null> {
  return await AsyncStorage.getItem(STORAGE_KEYS.LAST_UPDATE);
}

// ============================================
// HOTEL DATA - CLOUD STORAGE (MongoDB)
// ============================================

export async function saveHotelData(data: {
  daily: DailyData[];
  weekly: WeeklyData[];
  monthly: MonthlyData[];
}): Promise<void> {
  const store: HotelDataStore = {
    lastUpdate: new Date().toISOString(),
    daily: data.daily,
    weekly: data.weekly,
    monthly: data.monthly,
  };

  try {
    const response = await fetch(`${API_URL}/api/mews-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(store),
    });

    if (response.ok) {
      console.log('[Storage] Saved to cloud:', {
        daily: data.daily.length,
        weekly: data.weekly.length,
        monthly: data.monthly.length,
      });
      await AsyncStorage.setItem(STORAGE_KEYS.HOTEL_DATA, JSON.stringify(store));
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_UPDATE, store.lastUpdate);
      return;
    }
  } catch (error) {
    console.warn('[Storage] Cloud save failed:', error);
  }

  // Fallback to local
  await AsyncStorage.setItem(STORAGE_KEYS.HOTEL_DATA, JSON.stringify(store));
  await AsyncStorage.setItem(STORAGE_KEYS.LAST_UPDATE, store.lastUpdate);
}

export async function loadHotelData(): Promise<HotelDataStore> {
  const empty: HotelDataStore = { lastUpdate: '', daily: [], weekly: [], monthly: [] };

  try {
    const response = await fetch(`${API_URL}/api/mews-data`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('[Storage] Loaded from cloud:', {
        daily: data.daily?.length || 0,
        weekly: data.weekly?.length || 0,
        monthly: data.monthly?.length || 0,
      });
      return {
        lastUpdate: data.lastUpdate || '',
        daily: data.daily || [],
        weekly: data.weekly || [],
        monthly: data.monthly || [],
      };
    }
  } catch (error) {
    console.warn('[Storage] Cloud load failed:', error);
  }

  // Fallback to local
  try {
    const local = await AsyncStorage.getItem(STORAGE_KEYS.HOTEL_DATA);
    if (local) {
      const parsed = JSON.parse(local);
      return {
        lastUpdate: parsed.lastUpdate || '',
        daily: parsed.daily || [],
        weekly: parsed.weekly || [],
        monthly: parsed.monthly || [],
      };
    }
  } catch {
    // Ignore
  }

  return empty;
}

export async function clearAllData(): Promise<void> {
  try {
    await fetch(`${API_URL}/api/mews-data`, { method: 'DELETE' });
  } catch {
    // Ignore
  }
  await AsyncStorage.multiRemove([STORAGE_KEYS.HOTEL_DATA, STORAGE_KEYS.LAST_UPDATE]);
}

// ============================================
// LEGACY COMPATIBILITY (for manager/index.tsx)
// ============================================

export type MewsDailyData = DailyData;

export interface MewsReportStore {
  lastUpdate: string;
  daily: DailyData[];
  weekly: WeeklyData[];
  monthly: MonthlyData[];
}

export async function loadMewsData(): Promise<MewsReportStore> {
  const data = await loadHotelData();
  return {
    lastUpdate: data.lastUpdate,
    daily: data.daily,
    weekly: data.weekly,
    monthly: data.monthly,
  };
}

export async function saveMewsData(data: Partial<MewsReportStore>): Promise<void> {
  await saveHotelData({
    daily: data.daily || [],
    weekly: data.weekly || [],
    monthly: data.monthly || [],
  });
}
