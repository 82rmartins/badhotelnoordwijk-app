// XLSX Parser for Mews Manager Reports
// Supports daily, weekly, monthly, arrivals and departures reports from Mews PMS

import * as XLSX from 'xlsx';
import { MewsDailyData } from './storage';

export interface ParsedXLSXResult {
  data: MewsDailyData[];
  reportType: 'daily' | 'weekly' | 'monthly' | 'arrivals' | 'departures' | 'unknown';
  arrivalsData?: { date: string; count: number }[];
  departuresData?: { date: string; count: number }[];
  errors: string[];
}

// Parse Mews Manager Report XLSX
export function parseXLSX(content: string | ArrayBuffer, totalRooms: number = 26): ParsedXLSXResult {
  const errors: string[] = [];
  const data: MewsDailyData[] = [];
  let reportType: 'daily' | 'weekly' | 'monthly' | 'arrivals' | 'departures' | 'unknown' = 'unknown';
  let arrivalsData: { date: string; count: number }[] = [];
  let departuresData: { date: string; count: number }[] = [];

  try {
    // Read workbook
    let workbook;
    try {
      workbook = XLSX.read(content, { 
        type: typeof content === 'string' ? 'base64' : 'array',
        cellDates: true,
        cellNF: true,
      });
    } catch (readError: any) {
      errors.push(`Could not parse Excel file: ${readError.message}`);
      return { data, reportType, errors };
    }

    console.log('Workbook sheets:', workbook.SheetNames);

    // Check if this is a Reservation Report (Arrivals/Departures)
    if (workbook.SheetNames.includes('Reservations')) {
      return parseReservationReport(workbook, errors);
    }

    // Check for Manager Report structure (should have Parameters and Data sheets)
    if (!workbook.SheetNames.includes('Data')) {
      errors.push('Invalid Mews report: Missing "Data" sheet');
      return { data, reportType, errors };
    }

    // Read Parameters to detect report type
    if (workbook.SheetNames.includes('Parameters')) {
      const paramsSheet = workbook.Sheets['Parameters'];
      const paramsData = XLSX.utils.sheet_to_json(paramsSheet, { header: 1 }) as any[][];
      
      for (const row of paramsData) {
        if (row[0] === 'Mode') {
          const mode = String(row[1] || '').toLowerCase();
          console.log('Report mode:', mode);
          if (mode.includes('day')) reportType = 'daily';
          else if (mode.includes('week')) reportType = 'weekly';
          else if (mode.includes('month')) reportType = 'monthly';
          break;
        }
      }
    }

    // Read Data sheet as raw 2D array
    const dataSheet = workbook.Sheets['Data'];
    const jsonData = XLSX.utils.sheet_to_json(dataSheet, { header: 1 }) as any[][];

    console.log('Data rows:', jsonData.length, 'Report type:', reportType);

    if (jsonData.length < 2) {
      errors.push('No data rows found in report');
      return { data, reportType, errors };
    }

    // First row has periods/dates starting from column 4 (index 3)
    const headerRow = jsonData[0];
    const periods: string[] = [];
    for (let i = 3; i < headerRow.length; i++) {
      const val = headerRow[i];
      if (val && val !== 'Total') {
        periods.push(String(val));
      }
    }
    console.log('Periods found:', periods.length, 'First 3:', periods.slice(0, 3));

    // Find key data rows by structure:
    // Col A (0) = Group (Accommodatie, None, etc)
    // Col B (1) = Type (Room, etc)
    // Col C (2) = Metric (Occupancy, Occupied, Available, Revenue, etc)
    // Col D+ (3+) = Values per period

    // Find the rows we need
    let accomOccupancyRow: any[] | null = null;
    let accomOccupiedRow: any[] | null = null;
    let accomAvailableRow: any[] | null = null;
    let accomRevenueRow: any[] | null = null;
    let accomAdrRow: any[] | null = null;
    let accomCustomersRow: any[] | null = null;
    let noneAvailableRow: any[] | null = null;
    let noneOutOfOrderRow: any[] | null = null;

    for (const row of jsonData) {
      const group = String(row[0] || '').toLowerCase();
      const type = String(row[1] || '').toLowerCase();
      const metric = String(row[2] || '').toLowerCase();
      
      // Accommodatie metrics (actual guest rooms)
      if (group.includes('accommodat') || group.includes('stay')) {
        if (type.includes('room')) {
          if (metric === 'occupancy') {
            accomOccupancyRow = row;
          } else if (metric === 'occupied') {
            accomOccupiedRow = row;
          } else if (metric === 'available') {
            accomAvailableRow = row;
          } else if (metric === 'revenue' || metric === 'revenue (nights)') {
            accomRevenueRow = row;
          } else if (metric.includes('average rate') || metric === 'average rate (nightly)') {
            accomAdrRow = row;
          } else if (metric === 'customers') {
            accomCustomersRow = row;
          }
        }
      }
      
      // None category (additional/blocked rooms)
      if (group === 'none') {
        if (type.includes('room')) {
          if (metric === 'available') {
            noneAvailableRow = row;
          } else if (metric.includes('out of order')) {
            noneOutOfOrderRow = row;
          }
        }
      }
    }

    console.log('Found rows:', {
      accomOccupancy: !!accomOccupancyRow,
      accomOccupied: !!accomOccupiedRow,
      accomAvailable: !!accomAvailableRow,
      accomRevenue: !!accomRevenueRow,
      accomAdr: !!accomAdrRow,
      noneAvailable: !!noneAvailableRow,
      noneOutOfOrder: !!noneOutOfOrderRow,
    });

    // Helper to parse numeric value
    const parseNum = (row: any[] | null, idx: number): number => {
      if (!row || idx >= row.length) return 0;
      const val = row[idx];
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        return parseFloat(val.replace(/[^0-9.,\-]/g, '').replace(',', '.')) || 0;
      }
      return 0;
    };

    // Extract data for each period
    for (let i = 0; i < periods.length; i++) {
      const colIndex = i + 3; // Data starts at column index 3

      // Get values from file
      let occupancyFromFile = parseNum(accomOccupancyRow, colIndex);
      const occupiedRooms = parseNum(accomOccupiedRow, colIndex);
      const accomAvailable = parseNum(accomAvailableRow, colIndex);
      const noneAvailable = parseNum(noneAvailableRow, colIndex);
      const outOfOrder = parseNum(noneOutOfOrderRow, colIndex);
      const revenue = parseNum(accomRevenueRow, colIndex);
      const adr = parseNum(accomAdrRow, colIndex);
      const customers = parseNum(accomCustomersRow, colIndex);

      // Calculate ACTUAL total rooms from the file
      // Total rooms = Accommodatie Available + None Available - Out of Order
      const actualTotalRooms = accomAvailable + noneAvailable - outOfOrder;

      // Convert occupancy if it's a decimal (0.63 -> 63%)
      let occupancy = occupancyFromFile;
      if (occupancy > 0 && occupancy <= 1) {
        occupancy = occupancy * 100;
      }

      // For WEEKLY reports, occupied/available are totals for 7 days
      let dailyOccupied = occupiedRooms;
      let dailyTotalRooms = actualTotalRooms;
      
      if (reportType === 'weekly') {
        dailyOccupied = occupiedRooms / 7; // Average per day
        dailyTotalRooms = actualTotalRooms / 7; // Average per day
      }
      
      // For MONTHLY reports, calculate from available
      if (reportType === 'monthly') {
        // Monthly available is total room-nights in the month
        // We need to figure out days in month from the period
        const periodDate = parsePeriodToDate(periods[i], reportType);
        const d = new Date(periodDate);
        const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        dailyTotalRooms = accomAvailable / daysInMonth;
        dailyOccupied = occupiedRooms / daysInMonth;
      }

      // Skip if no meaningful data
      if (dailyOccupied === 0 && revenue === 0 && occupancy === 0) continue;

      // Parse period to date
      const periodDate = parsePeriodToDate(periods[i], reportType);

      // Recalculate occupancy using actual room count
      let finalOccupancy = occupancy;
      if (dailyTotalRooms > 0) {
        finalOccupancy = (dailyOccupied / dailyTotalRooms) * 100;
      }

      // Cap at 100%
      if (finalOccupancy > 100) finalOccupancy = 100;

      data.push({
        date: periodDate,
        occupancy: Math.round(finalOccupancy * 10) / 10,
        occupiedRooms: Math.round(dailyOccupied),
        availableRooms: Math.round(dailyTotalRooms),
        revenue: Math.round(revenue * 100) / 100,
        adr: Math.round(adr * 100) / 100,
        arrivals: 0, // Will be filled from arrivals report
        departures: 0, // Will be filled from departures report
        customers: Math.round(customers),
      });
    }

    console.log('Parsed data records:', data.length);
    if (data.length > 0) {
      console.log('First record:', data[0]);
      console.log('Last record:', data[data.length - 1]);
    }

    if (data.length === 0) {
      errors.push('No valid data found in report');
    }

  } catch (error: any) {
    console.error('Parse error:', error);
    errors.push(`Parse error: ${error.message}`);
  }

  return { data, reportType, arrivalsData, departuresData, errors };
}

// Parse Reservation report for arrivals/departures counts
function parseReservationReport(workbook: XLSX.WorkBook, errors: string[]): ParsedXLSXResult {
  const data: MewsDailyData[] = [];
  let reportType: 'arrivals' | 'departures' = 'arrivals';
  let arrivalsData: { date: string; count: number }[] = [];
  let departuresData: { date: string; count: number }[] = [];

  try {
    // Check Parameters sheet to determine if arrivals or departures
    const paramsSheet = workbook.Sheets['Parameters'];
    if (paramsSheet) {
      const paramsData = XLSX.utils.sheet_to_json(paramsSheet, { header: 1 }) as any[][];
      
      for (const row of paramsData) {
        const key = String(row[0] || '').toLowerCase();
        const value = String(row[1] || '').toLowerCase();
        
        // Check Filter field
        if (key === 'filter') {
          if (value.includes('departure')) {
            reportType = 'departures';
          } else if (value.includes('arrival')) {
            reportType = 'arrivals';
          }
        }
        
        // Also check title row
        if (key.includes('reservation report')) {
          if (key.includes('depart') || value.includes('depart')) {
            reportType = 'departures';
          }
        }
      }
    }

    console.log('Reservation report type detected:', reportType);

    // Parse Reservations sheet to count arrivals/departures per date
    const reservationsSheet = workbook.Sheets['Reservations'];
    if (!reservationsSheet) {
      errors.push('No Reservations sheet found');
      return { data, reportType, arrivalsData, departuresData, errors };
    }

    const reservations = XLSX.utils.sheet_to_json(reservationsSheet, { header: 1 }) as any[][];
    
    if (reservations.length < 2) {
      errors.push('No reservations data found');
      return { data, reportType, arrivalsData, departuresData, errors };
    }

    // Find column indices from header row
    const headers = reservations[0];
    let arrivalCol = -1;
    let departureCol = -1;
    let statusCol = -1;
    
    for (let i = 0; i < headers.length; i++) {
      const h = String(headers[i] || '').toLowerCase();
      if (h === 'arrival') arrivalCol = i;
      if (h === 'departure') departureCol = i;
      if (h === 'status') statusCol = i;
    }

    console.log('Column indices:', { arrivalCol, departureCol, statusCol });

    // Count by date
    const arrivalCounts: Record<string, number> = {};
    const departureCounts: Record<string, number> = {};

    for (let rowIdx = 1; rowIdx < reservations.length; rowIdx++) {
      const row = reservations[rowIdx];
      
      // Skip cancelled reservations
      if (statusCol >= 0) {
        const status = String(row[statusCol] || '').toLowerCase();
        if (status.includes('cancel')) continue;
      }

      // Count arrivals
      if (arrivalCol >= 0 && row[arrivalCol]) {
        const dateStr = parseReservationDate(row[arrivalCol]);
        if (dateStr) {
          arrivalCounts[dateStr] = (arrivalCounts[dateStr] || 0) + 1;
        }
      }

      // Count departures
      if (departureCol >= 0 && row[departureCol]) {
        const dateStr = parseReservationDate(row[departureCol]);
        if (dateStr) {
          departureCounts[dateStr] = (departureCounts[dateStr] || 0) + 1;
        }
      }
    }

    // Convert to arrays
    arrivalsData = Object.entries(arrivalCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    departuresData = Object.entries(departureCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    console.log('Parsed arrivals:', arrivalsData.length, 'days');
    console.log('Parsed departures:', departuresData.length, 'days');
    
    // Log some samples
    const today = new Date().toISOString().split('T')[0];
    const todayArrivals = arrivalsData.find(a => a.date === today);
    const todayDepartures = departuresData.find(d => d.date === today);
    console.log('Today arrivals:', todayArrivals);
    console.log('Today departures:', todayDepartures);

  } catch (error: any) {
    console.error('Reservation parse error:', error);
    errors.push(`Parse error: ${error.message}`);
  }

  return { data, reportType, arrivalsData, departuresData, errors };
}

// Parse reservation date value to ISO string
function parseReservationDate(dateValue: any): string | null {
  if (!dateValue) return null;
  
  // If it's a Date object
  if (dateValue instanceof Date) {
    return dateValue.toISOString().split('T')[0];
  }
  
  // If it's a string with datetime like "2026-02-25 14:00:00.000000"
  const str = String(dateValue);
  
  // Try ISO format first
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  
  // Try DD-MM-YYYY format
  const ddmmMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (ddmmMatch) {
    const day = ddmmMatch[1].padStart(2, '0');
    const month = ddmmMatch[2].padStart(2, '0');
    return `${ddmmMatch[3]}-${month}-${day}`;
  }
  
  // Try to parse as Date
  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch {}
  
  return null;
}

// Parse period string to ISO date
function parsePeriodToDate(period: string, reportType: string): string {
  try {
    const cleaned = period.trim();
    
    // Monthly: "January 2026" or "February 2026"
    const monthMatch = cleaned.match(/^([A-Za-z]+)\s+(\d{4})$/);
    if (monthMatch) {
      const months: Record<string, number> = {
        january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
        july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
      };
      const monthNum = months[monthMatch[1].toLowerCase()];
      if (monthNum !== undefined) {
        const date = new Date(parseInt(monthMatch[2]), monthNum, 15);
        return date.toISOString().split('T')[0];
      }
    }
    
    // Weekly: "29-12-2025 - 04-01-2026" - use start date
    const weekMatch = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (weekMatch) {
      const date = new Date(parseInt(weekMatch[3]), parseInt(weekMatch[2]) - 1, parseInt(weekMatch[1]));
      return date.toISOString().split('T')[0];
    }
    
    // Daily: "24-02-2026" or "2026-02-24"
    const dayMatch1 = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dayMatch1) {
      const date = new Date(parseInt(dayMatch1[3]), parseInt(dayMatch1[2]) - 1, parseInt(dayMatch1[1]));
      return date.toISOString().split('T')[0];
    }
    
    const dayMatch2 = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (dayMatch2) {
      const date = new Date(parseInt(dayMatch2[1]), parseInt(dayMatch2[2]) - 1, parseInt(dayMatch2[3]));
      return date.toISOString().split('T')[0];
    }
    
    // If nothing matched, use current date
    return new Date().toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}
