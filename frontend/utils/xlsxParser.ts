// XLSX Parser for Bad Hotel Manager 2026
// Format: BadHotel_Manager_2026_Template_with_Formulas.xlsx
// Sheets: 2026_Values, 2026_Weekly, 2026_Monthly (2026_Formulas ignored)
// IMPORTANT: App NEVER calculates - only READS from Excel

import * as XLSX from 'xlsx';

// ============================================
// DATA TYPES
// ============================================

export interface DailyData {
  date: string; // YYYY-MM-DD
  occupancy: number; // percentage (0-100)
  occupiedRooms: number;
  availableRooms: number;
  revenue: number; // Revenue (nights)
  totalRevenue: number;
  parkingRevenue: number;
  touristTax: number;
  adr: number; // Average rate (nightly)
  arrivals: number;
  departures: number;
  customers: number;
  temperature?: number; // From Excel when available
}

export interface WeeklyData {
  isoWeek: string; // e.g. "2026-W09"
  weekStart: string; // YYYY-MM-DD
  weekEnd: string;
  available: number;
  occupied: number;
  occupancy: number; // percentage (0-100)
  revenueNights: number;
  adr: number;
  customers: number;
  touristTax: number;
  parking: number;
  totalRevenue: number;
}

export interface MonthlyData {
  month: string; // e.g. "February"
  monthStart: string; // YYYY-MM-DD
  monthEnd: string;
  available: number;
  occupied: number;
  occupancy: number; // percentage (0-100)
  revenueNights: number;
  adr: number;
  customers: number;
  touristTax: number;
  parking: number;
  totalRevenue: number;
}

export interface ParsedBadHotelData {
  daily: DailyData[];
  weekly: WeeklyData[];
  monthly: MonthlyData[];
  errors: string[];
  success: boolean;
  temperature?: number; // Today's temperature from Excel
}

// ============================================
// MAIN PARSER
// ============================================

export function parseBadHotelExcel(content: string | ArrayBuffer): ParsedBadHotelData {
  const errors: string[] = [];
  const result: ParsedBadHotelData = {
    daily: [],
    weekly: [],
    monthly: [],
    errors: [],
    success: false,
  };

  try {
    // Read workbook
    const workbook = XLSX.read(content, {
      type: typeof content === 'string' ? 'base64' : 'array',
      cellDates: true,
      cellNF: true,
    });

    console.log('[Parser] Sheets found:', workbook.SheetNames);

    // Validate required sheets exist
    const requiredSheets = ['2026_Values', '2026_Weekly', '2026_Monthly'];
    const missingSheets = requiredSheets.filter(s => !workbook.SheetNames.includes(s));
    
    if (missingSheets.length > 0) {
      errors.push(`Missing required sheets: ${missingSheets.join(', ')}`);
      result.errors = errors;
      return result;
    }

    // Parse each sheet
    result.daily = parseValuesSheet(workbook.Sheets['2026_Values'], errors);
    result.weekly = parseWeeklySheet(workbook.Sheets['2026_Weekly'], errors);
    result.monthly = parseMonthlySheet(workbook.Sheets['2026_Monthly'], errors);

    // Get today's temperature if available
    const today = getTodayDateStr();
    const todayData = result.daily.find(d => d.date === today);
    if (todayData?.temperature !== undefined) {
      result.temperature = todayData.temperature;
    }

    result.errors = errors;
    result.success = errors.length === 0 && result.daily.length > 0;

    console.log('[Parser] Parsed successfully:', {
      daily: result.daily.length,
      weekly: result.weekly.length,
      monthly: result.monthly.length,
      errors: errors.length,
    });

  } catch (error: any) {
    console.error('[Parser] Critical error:', error);
    errors.push(`Parse error: ${error.message}`);
    result.errors = errors;
  }

  return result;
}

// ============================================
// PARSE 2026_Values SHEET (Transposed format)
// ============================================

function parseValuesSheet(sheet: XLSX.WorkSheet, errors: string[]): DailyData[] {
  const data: DailyData[] = [];

  try {
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    
    if (jsonData.length < 15) {
      errors.push('2026_Values: Insufficient rows (expected at least 15)');
      return data;
    }

    // Row mapping (0-indexed, but row 1 in Excel = index 0)
    // Row 1 (index 0): Dates header
    // Row 2 (index 1): Total revenue Parking
    // Row 3 (index 2): Occupancy
    // Row 4 (index 3): Available
    // Row 5 (index 4): Occupied
    // Row 6 (index 5): Revenue (nights)
    // Row 7 (index 6): Average rate (nightly)
    // Row 8 (index 7): Customers
    // Row 9 (index 8): Revenue
    // Row 10 (index 9): Turist tax revenue
    // Row 11 (index 10): Revenue
    // Row 12 (index 11): Total Revenue
    // Row 14 (index 13): Arrival
    // Row 15 (index 14): Departure

    const ROW_PARKING = 1;
    const ROW_OCCUPANCY = 2;
    const ROW_AVAILABLE = 3;
    const ROW_OCCUPIED = 4;
    const ROW_REVENUE_NIGHTS = 5;
    const ROW_ADR = 6;
    const ROW_CUSTOMERS = 7;
    const ROW_TOURIST_TAX = 9;
    const ROW_TOTAL_REVENUE = 11;
    const ROW_ARRIVAL = 13;
    const ROW_DEPARTURE = 14;

    // Find temperature row if it exists (look for "Temperature" label in column A)
    let ROW_TEMPERATURE = -1;
    for (let row = 0; row < jsonData.length; row++) {
      const label = String(jsonData[row]?.[0] || '').toLowerCase();
      if (label.includes('temp')) {
        ROW_TEMPERATURE = row;
        console.log('[Parser] Found temperature row:', row);
        break;
      }
    }

    // Parse each date column (starting from column 2, index 1)
    const headerRow = jsonData[0];
    
    for (let col = 1; col < headerRow.length; col++) {
      const dateVal = headerRow[col];
      
      // Skip "Total" column or empty
      if (!dateVal || String(dateVal).toLowerCase() === 'total') continue;

      // Parse date
      const dateStr = parseDateValue(dateVal);
      if (!dateStr) continue;

      // Extract values (handle null/undefined as 0)
      const getValue = (rowIndex: number): number => {
        if (rowIndex < 0 || rowIndex >= jsonData.length) return 0;
        const val = jsonData[rowIndex]?.[col];
        if (val === null || val === undefined || val === '') return 0;
        return typeof val === 'number' ? val : parseFloat(String(val)) || 0;
      };

      // Get occupancy (convert from decimal 0-1 to percentage 0-100)
      let occupancy = getValue(ROW_OCCUPANCY);
      if (occupancy > 0 && occupancy <= 1) {
        occupancy = occupancy * 100;
      }

      const dayData: DailyData = {
        date: dateStr,
        occupancy: Math.round(occupancy * 10) / 10,
        occupiedRooms: Math.round(getValue(ROW_OCCUPIED)),
        availableRooms: Math.round(getValue(ROW_AVAILABLE)) || 28, // Default to 28 if missing
        revenue: Math.round(getValue(ROW_REVENUE_NIGHTS) * 100) / 100,
        totalRevenue: Math.round(getValue(ROW_TOTAL_REVENUE) * 100) / 100,
        parkingRevenue: Math.round(getValue(ROW_PARKING) * 100) / 100,
        touristTax: Math.round(getValue(ROW_TOURIST_TAX) * 100) / 100,
        adr: Math.round(getValue(ROW_ADR) * 100) / 100,
        arrivals: Math.round(getValue(ROW_ARRIVAL)),
        departures: Math.round(getValue(ROW_DEPARTURE)),
        customers: Math.round(getValue(ROW_CUSTOMERS)),
      };

      // Add temperature if row exists
      if (ROW_TEMPERATURE >= 0) {
        dayData.temperature = getValue(ROW_TEMPERATURE);
      }

      data.push(dayData);
    }

    // Sort by date
    data.sort((a, b) => a.date.localeCompare(b.date));

    console.log('[Parser] 2026_Values: Parsed', data.length, 'days');

  } catch (error: any) {
    errors.push(`2026_Values parse error: ${error.message}`);
  }

  return data;
}

// ============================================
// PARSE 2026_Weekly SHEET
// ============================================

function parseWeeklySheet(sheet: XLSX.WorkSheet, errors: string[]): WeeklyData[] {
  const data: WeeklyData[] = [];

  try {
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    
    if (jsonData.length < 2) {
      errors.push('2026_Weekly: No data rows found');
      return data;
    }

    // Headers are in row 1:
    // ISO Week, Week Start, Week End, Available (sum), Occupied (sum), Occupancy,
    // Revenue Nights (€), ADR (€), Customers (sum), Tourist Tax (€), Parking (€), Total Revenue (€)

    // Parse data rows (starting from row 2, index 1)
    for (let row = 1; row < jsonData.length; row++) {
      const rowData = jsonData[row];
      if (!rowData || !rowData[0]) continue;

      const isoWeek = String(rowData[0] || '');
      if (!isoWeek.startsWith('2026-W')) continue;

      // Get occupancy (convert from decimal to percentage if needed)
      let occupancy = parseFloat(rowData[5]) || 0;
      if (occupancy > 0 && occupancy <= 1) {
        occupancy = occupancy * 100;
      }

      data.push({
        isoWeek,
        weekStart: parseDateValue(rowData[1]) || '',
        weekEnd: parseDateValue(rowData[2]) || '',
        available: Math.round(parseFloat(rowData[3]) || 0),
        occupied: Math.round(parseFloat(rowData[4]) || 0),
        occupancy: Math.round(occupancy * 10) / 10,
        revenueNights: Math.round((parseFloat(rowData[6]) || 0) * 100) / 100,
        adr: Math.round((parseFloat(rowData[7]) || 0) * 100) / 100,
        customers: Math.round(parseFloat(rowData[8]) || 0),
        touristTax: Math.round((parseFloat(rowData[9]) || 0) * 100) / 100,
        parking: Math.round((parseFloat(rowData[10]) || 0) * 100) / 100,
        totalRevenue: Math.round((parseFloat(rowData[11]) || 0) * 100) / 100,
      });
    }

    console.log('[Parser] 2026_Weekly: Parsed', data.length, 'weeks');

  } catch (error: any) {
    errors.push(`2026_Weekly parse error: ${error.message}`);
  }

  return data;
}

// ============================================
// PARSE 2026_Monthly SHEET
// ============================================

function parseMonthlySheet(sheet: XLSX.WorkSheet, errors: string[]): MonthlyData[] {
  const data: MonthlyData[] = [];

  try {
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    
    if (jsonData.length < 2) {
      errors.push('2026_Monthly: No data rows found');
      return data;
    }

    // Headers are in row 1:
    // Month, Month Start, Month End, Available (sum), Occupied (sum), Occupancy,
    // Revenue Nights (€), ADR (€), Customers (sum), Tourist Tax (€), Parking (€), Total Revenue (€)

    // Parse data rows (starting from row 2, index 1)
    for (let row = 1; row < jsonData.length; row++) {
      const rowData = jsonData[row];
      if (!rowData || !rowData[0]) continue;

      const month = String(rowData[0] || '');
      if (!month) continue;

      // Get occupancy (convert from decimal to percentage if needed)
      let occupancy = parseFloat(rowData[5]) || 0;
      if (occupancy > 0 && occupancy <= 1) {
        occupancy = occupancy * 100;
      }

      data.push({
        month,
        monthStart: parseDateValue(rowData[1]) || '',
        monthEnd: parseDateValue(rowData[2]) || '',
        available: Math.round(parseFloat(rowData[3]) || 0),
        occupied: Math.round(parseFloat(rowData[4]) || 0),
        occupancy: Math.round(occupancy * 10) / 10,
        revenueNights: Math.round((parseFloat(rowData[6]) || 0) * 100) / 100,
        adr: Math.round((parseFloat(rowData[7]) || 0) * 100) / 100,
        customers: Math.round(parseFloat(rowData[8]) || 0),
        touristTax: Math.round((parseFloat(rowData[9]) || 0) * 100) / 100,
        parking: Math.round((parseFloat(rowData[10]) || 0) * 100) / 100,
        totalRevenue: Math.round((parseFloat(rowData[11]) || 0) * 100) / 100,
      });
    }

    console.log('[Parser] 2026_Monthly: Parsed', data.length, 'months');

  } catch (error: any) {
    errors.push(`2026_Monthly parse error: ${error.message}`);
  }

  return data;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function parseDateValue(dateVal: any): string | null {
  if (!dateVal) return null;

  try {
    // If it's already a Date object
    if (dateVal instanceof Date) {
      return formatDateToISO(dateVal);
    }

    const str = String(dateVal);

    // Try DD-MM-YYYY format (European)
    const ddmmMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (ddmmMatch) {
      const d = parseInt(ddmmMatch[1], 10);
      const m = parseInt(ddmmMatch[2], 10) - 1;
      const y = parseInt(ddmmMatch[3], 10);
      return formatDateToISO(new Date(y, m, d));
    }

    // Try ISO format YYYY-MM-DD
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

  } catch {
    // Ignore parse errors
  }

  return null;
}

function formatDateToISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getTodayDateStr(): string {
  const now = new Date();
  // Use Europe/Amsterdam timezone
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Europe/Amsterdam',
  };
  const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

// ============================================
// UTILITY FUNCTIONS FOR APP
// ============================================

// Get current ISO week number
export function getCurrentISOWeek(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `2026-W${String(weekNum).padStart(2, '0')}`;
}

// Get current month name
export function getCurrentMonthName(): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return months[new Date().getMonth()];
}

// Get weeks for current month from weekly data
export function getWeeksForMonth(weekly: WeeklyData[], month: number, year: number = 2026): WeeklyData[] {
  return weekly.filter(w => {
    if (!w.weekStart) return false;
    const startDate = new Date(w.weekStart);
    // Include weeks that overlap with the month
    const endDate = new Date(w.weekEnd);
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    return startDate <= monthEnd && endDate >= monthStart;
  });
}
