// ============================================
// XLSX PARSER - BAD HOTEL 2026
// ============================================
// Contract: App NEVER calculates, only READS from Excel
// File: BadHotel_Manager_2026_Template_with_Formulas.xlsx
// Sheets: 2026_Values, 2026_Weekly, 2026_Monthly

import * as XLSX from 'xlsx';

// ============================================
// DATA TYPES - Exact Excel Structure
// ============================================

export interface DailyData {
  date: string;           // DD-MM-YYYY (Excel format)
  dateISO: string;        // YYYY-MM-DD (for sorting)
  occupancy: number;      // Percentage 0-100 (from fraction)
  occupied: number;       // Rooms occupied
  available: number;      // Rooms available (usually 28)
  totalRevenue: number;   // Total Revenue row ONLY
  revenueNights: number;  // Revenue (nights)
  adr: number;            // Average rate (nightly)
  parking: number;        // Total revenue Parking
  touristTax: number;     // Turist tax revenue
  arrivals: number;       // Arrival
  departures: number;     // Departure
  customers: number;      // Customers
  // Weather data (may be null)
  temperature?: number;   // Weather row
  weatherCondition?: string; // Partly Cloud row
  humidity?: number;      // Humidade row
  wind?: number;          // ventos row
}

export interface WeeklyData {
  isoWeek: string;        // e.g. "2026-W09"
  weekStart: string;      // YYYY-MM-DD
  weekEnd: string;        // YYYY-MM-DD
  available: number;
  occupied: number;
  occupancy: number;      // Percentage 0-100
  revenueNights: number;
  adr: number;
  customers: number;
  touristTax: number;
  parking: number;
  totalRevenue: number;
}

export interface MonthlyData {
  month: string;          // e.g. "February"
  monthIndex: number;     // 0-11
  monthStart: string;     // YYYY-MM-DD
  monthEnd: string;       // YYYY-MM-DD
  available: number;
  occupied: number;
  occupancy: number;      // Percentage 0-100
  revenueNights: number;
  adr: number;
  customers: number;
  touristTax: number;
  parking: number;
  totalRevenue: number;
}

export interface ParsedHotelData {
  daily: DailyData[];
  weekly: WeeklyData[];
  monthly: MonthlyData[];
  errors: string[];
  success: boolean;
}

// ============================================
// ROW MAPPING - 2026_Values (1-indexed)
// ============================================
const ROW_MAP = {
  // Row 1 = dates header
  PARKING: 2,           // Total revenue Parking
  OCCUPANCY: 3,         // Occupancy (fraction 0-1)
  AVAILABLE: 4,         // Available
  OCCUPIED: 5,          // Occupied
  REVENUE_NIGHTS: 6,    // Revenue (nights)
  ADR: 7,               // Average rate (nightly)
  CUSTOMERS: 8,         // Customers
  // Row 9 = Revenue (duplicate, skip)
  TOURIST_TAX: 10,      // Turist tax revenue
  // Row 11 = Revenue (duplicate, skip)
  TOTAL_REVENUE: 12,    // Total Revenue ← THE ONE TO USE
  // Row 13 = empty
  ARRIVAL: 14,          // Arrival
  DEPARTURE: 15,        // Departure
  // Row 16 = empty
  WEATHER: 17,          // Weather (temperature)
  WEATHER_COND: 18,     // Partly Cloud
  HUMIDITY: 19,         // Humidade
  WIND: 20,             // ventos
};

// ============================================
// MAIN PARSER
// ============================================

export function parseBadHotelExcel(content: string | ArrayBuffer): ParsedHotelData {
  const errors: string[] = [];
  const result: ParsedHotelData = {
    daily: [],
    weekly: [],
    monthly: [],
    errors: [],
    success: false,
  };

  try {
    const workbook = XLSX.read(content, {
      type: typeof content === 'string' ? 'base64' : 'array',
      cellDates: true,
    });

    console.log('[Parser] Sheets:', workbook.SheetNames);

    // Validate required sheets
    const required = ['2026_Values', '2026_Weekly', '2026_Monthly'];
    const missing = required.filter(s => !workbook.SheetNames.includes(s));
    if (missing.length > 0) {
      errors.push(`Missing sheets: ${missing.join(', ')}`);
      result.errors = errors;
      return result;
    }

    // Parse each sheet
    result.daily = parseValuesSheet(workbook.Sheets['2026_Values'], errors);
    result.weekly = parseWeeklySheet(workbook.Sheets['2026_Weekly'], errors);
    result.monthly = parseMonthlySheet(workbook.Sheets['2026_Monthly'], errors);

    result.errors = errors;
    result.success = errors.length === 0 && result.daily.length > 0;

    console.log('[Parser] Result:', {
      daily: result.daily.length,
      weekly: result.weekly.length,
      monthly: result.monthly.length,
    });

  } catch (error: any) {
    errors.push(`Parse error: ${error.message}`);
    result.errors = errors;
  }

  return result;
}

// ============================================
// PARSE 2026_Values (TRANSPOSED FORMAT)
// Dates in Row 1, Metrics in Column A
// ============================================

function parseValuesSheet(sheet: XLSX.WorkSheet, errors: string[]): DailyData[] {
  const data: DailyData[] = [];

  try {
    // Convert to 2D array (0-indexed)
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    if (rows.length < 15) {
      errors.push('2026_Values: Not enough rows');
      return data;
    }

    const headerRow = rows[0]; // Row 1 = dates
    
    // Parse each date column (starting col 2, index 1)
    for (let col = 1; col < headerRow.length; col++) {
      const dateVal = headerRow[col];
      if (!dateVal || String(dateVal).toLowerCase() === 'total') continue;

      // Parse date to DD-MM-YYYY
      const { dateDDMMYYYY, dateISO } = parseDate(dateVal);
      if (!dateDDMMYYYY) continue;

      // Helper to get value from specific row
      const getValue = (rowIndex: number): number => {
        // Convert from 1-indexed row to 0-indexed array
        const arrayRow = rowIndex - 1;
        if (arrayRow < 0 || arrayRow >= rows.length) return 0;
        const val = rows[arrayRow]?.[col];
        if (val === null || val === undefined || val === '') return 0;
        return typeof val === 'number' ? val : parseFloat(String(val)) || 0;
      };

      const getStringValue = (rowIndex: number): string | undefined => {
        const arrayRow = rowIndex - 1;
        if (arrayRow < 0 || arrayRow >= rows.length) return undefined;
        const val = rows[arrayRow]?.[col];
        return val ? String(val) : undefined;
      };

      // Get occupancy (fraction → percentage)
      let occupancy = getValue(ROW_MAP.OCCUPANCY);
      if (occupancy > 0 && occupancy <= 1) {
        occupancy = occupancy * 100;
      }

      // Get humidity (fraction → percentage)
      let humidity = getValue(ROW_MAP.HUMIDITY);
      if (humidity > 0 && humidity <= 1) {
        humidity = humidity * 100;
      }

      data.push({
        date: dateDDMMYYYY,
        dateISO: dateISO,
        occupancy: Math.round(occupancy * 100) / 100,
        occupied: Math.round(getValue(ROW_MAP.OCCUPIED)),
        available: Math.round(getValue(ROW_MAP.AVAILABLE)) || 28,
        totalRevenue: Math.round(getValue(ROW_MAP.TOTAL_REVENUE) * 100) / 100,
        revenueNights: Math.round(getValue(ROW_MAP.REVENUE_NIGHTS) * 100) / 100,
        adr: Math.round(getValue(ROW_MAP.ADR) * 100) / 100,
        parking: Math.round(getValue(ROW_MAP.PARKING) * 100) / 100,
        touristTax: Math.round(getValue(ROW_MAP.TOURIST_TAX) * 100) / 100,
        arrivals: Math.round(getValue(ROW_MAP.ARRIVAL)),
        departures: Math.round(getValue(ROW_MAP.DEPARTURE)),
        customers: Math.round(getValue(ROW_MAP.CUSTOMERS)),
        temperature: getValue(ROW_MAP.WEATHER) || undefined,
        weatherCondition: getStringValue(ROW_MAP.WEATHER_COND),
        humidity: humidity || undefined,
        wind: getValue(ROW_MAP.WIND) || undefined,
      });
    }

    // Sort by ISO date
    data.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
    console.log('[Parser] 2026_Values:', data.length, 'days');

  } catch (error: any) {
    errors.push(`2026_Values error: ${error.message}`);
  }

  return data;
}

// ============================================
// PARSE 2026_Weekly
// ============================================

function parseWeeklySheet(sheet: XLSX.WorkSheet, errors: string[]): WeeklyData[] {
  const data: WeeklyData[] = [];

  try {
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    // Skip header row (index 0)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[0]) continue;

      const isoWeek = String(row[0]);
      if (!isoWeek.startsWith('2026-W')) continue;

      // Get occupancy (fraction → percentage)
      let occupancy = parseFloat(row[5]) || 0;
      if (occupancy > 0 && occupancy <= 1) {
        occupancy = occupancy * 100;
      }

      data.push({
        isoWeek,
        weekStart: formatDateToISO(row[1]),
        weekEnd: formatDateToISO(row[2]),
        available: Math.round(parseFloat(row[3]) || 0),
        occupied: Math.round(parseFloat(row[4]) || 0),
        occupancy: Math.round(occupancy * 100) / 100,
        revenueNights: Math.round((parseFloat(row[6]) || 0) * 100) / 100,
        adr: Math.round((parseFloat(row[7]) || 0) * 100) / 100,
        customers: Math.round(parseFloat(row[8]) || 0),
        touristTax: Math.round((parseFloat(row[9]) || 0) * 100) / 100,
        parking: Math.round((parseFloat(row[10]) || 0) * 100) / 100,
        totalRevenue: Math.round((parseFloat(row[11]) || 0) * 100) / 100,
      });
    }

    console.log('[Parser] 2026_Weekly:', data.length, 'weeks');

  } catch (error: any) {
    errors.push(`2026_Weekly error: ${error.message}`);
  }

  return data;
}

// ============================================
// PARSE 2026_Monthly
// ============================================

function parseMonthlySheet(sheet: XLSX.WorkSheet, errors: string[]): MonthlyData[] {
  const data: MonthlyData[] = [];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];

  try {
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[0]) continue;

      const month = String(row[0]);
      const monthIndex = monthNames.indexOf(month);
      if (monthIndex === -1) continue;

      // Get occupancy (fraction → percentage)
      let occupancy = parseFloat(row[5]) || 0;
      if (occupancy > 0 && occupancy <= 1) {
        occupancy = occupancy * 100;
      }

      data.push({
        month,
        monthIndex,
        monthStart: formatDateToISO(row[1]),
        monthEnd: formatDateToISO(row[2]),
        available: Math.round(parseFloat(row[3]) || 0),
        occupied: Math.round(parseFloat(row[4]) || 0),
        occupancy: Math.round(occupancy * 100) / 100,
        revenueNights: Math.round((parseFloat(row[6]) || 0) * 100) / 100,
        adr: Math.round((parseFloat(row[7]) || 0) * 100) / 100,
        customers: Math.round(parseFloat(row[8]) || 0),
        touristTax: Math.round((parseFloat(row[9]) || 0) * 100) / 100,
        parking: Math.round((parseFloat(row[10]) || 0) * 100) / 100,
        totalRevenue: Math.round((parseFloat(row[11]) || 0) * 100) / 100,
      });
    }

    // Sort by month index
    data.sort((a, b) => a.monthIndex - b.monthIndex);
    console.log('[Parser] 2026_Monthly:', data.length, 'months');

  } catch (error: any) {
    errors.push(`2026_Monthly error: ${error.message}`);
  }

  return data;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function parseDate(dateVal: any): { dateDDMMYYYY: string | null; dateISO: string } {
  if (!dateVal) return { dateDDMMYYYY: null, dateISO: '' };

  try {
    // If Date object
    if (dateVal instanceof Date) {
      const d = dateVal.getDate();
      const m = dateVal.getMonth() + 1;
      const y = dateVal.getFullYear();
      return {
        dateDDMMYYYY: `${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}-${y}`,
        dateISO: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      };
    }

    const str = String(dateVal);

    // Try DD-MM-YYYY
    const match = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (match) {
      const d = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const y = parseInt(match[3], 10);
      return {
        dateDDMMYYYY: `${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}-${y}`,
        dateISO: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      };
    }

  } catch {
    // Ignore
  }

  return { dateDDMMYYYY: null, dateISO: '' };
}

function formatDateToISO(dateVal: any): string {
  if (!dateVal) return '';
  if (dateVal instanceof Date) {
    return dateVal.toISOString().split('T')[0];
  }
  return '';
}

// ============================================
// UTILITY: Get Today's Date Key (DD-MM-YYYY)
// Uses Europe/Amsterdam timezone
// ============================================

export function getTodayDateKey(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Amsterdam',
  };
  // Format: DD/MM/YYYY → convert to DD-MM-YYYY
  const formatted = new Intl.DateTimeFormat('en-GB', options).format(now);
  return formatted.replace(/\//g, '-');
}

export function getTodayISO(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Europe/Amsterdam',
  };
  const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(now);
  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const d = parts.find(p => p.type === 'day')?.value;
  return `${y}-${m}-${d}`;
}

export function getCurrentWeekISO(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `2026-W${String(weekNum).padStart(2, '0')}`;
}

export function getCurrentMonthIndex(): number {
  return new Date().getMonth(); // 0-11
}
