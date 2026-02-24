// XLSX Parser for Mews Manager Reports
// Supports daily, weekly, and monthly reports from Mews PMS

import * as XLSX from 'xlsx';
import { MewsDailyData } from './storage';

export interface ParsedXLSXResult {
  data: MewsDailyData[];
  reportType: 'daily' | 'weekly' | 'monthly' | 'unknown';
  errors: string[];
}

// Parse Mews Manager Report XLSX
export function parseXLSX(content: string | ArrayBuffer, totalRooms: number = 24): ParsedXLSXResult {
  const errors: string[] = [];
  const data: MewsDailyData[] = [];
  let reportType: 'daily' | 'weekly' | 'monthly' | 'unknown' = 'unknown';

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

    // Check for Mews structure (should have Parameters and Data sheets)
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

    // Read Data sheet
    const dataSheet = workbook.Sheets['Data'];
    const jsonData = XLSX.utils.sheet_to_json(dataSheet, { header: 1 }) as any[][];

    console.log('Data rows:', jsonData.length);

    if (jsonData.length < 2) {
      errors.push('No data rows found in report');
      return { data, reportType, errors };
    }

    // First row has periods (columns 3+)
    const headerRow = jsonData[0];
    const periods: string[] = [];
    for (let i = 3; i < headerRow.length; i++) {
      if (headerRow[i] && headerRow[i] !== 'Total') {
        periods.push(String(headerRow[i]));
      }
    }
    console.log('Periods found:', periods.length, periods.slice(0, 3));

    // Find key rows by metric name
    let occupancyRow: any[] | null = null;
    let occupiedRow: any[] | null = null;
    let availableRow: any[] | null = null;
    let revenueRow: any[] | null = null;
    let adrRow: any[] | null = null;
    let customersRow: any[] | null = null;

    for (const row of jsonData) {
      const metric = String(row[2] || '').toLowerCase();
      const group = String(row[0] || '').toLowerCase();
      
      // Look for room/accommodation metrics (Stay services)
      if (group.includes('stay') || group.includes('accom') || group.includes('room')) {
        if (metric.includes('occupancy') && !metric.includes('direct')) {
          occupancyRow = row;
          console.log('Found occupancy row');
        } else if (metric === 'occupied' || metric.includes('directly occupied')) {
          occupiedRow = row;
          console.log('Found occupied row');
        } else if (metric === 'available') {
          availableRow = row;
          console.log('Found available row');
        } else if ((metric === 'revenue' || metric.includes('total revenue')) && !metric.includes('per') && !metric.includes('direct')) {
          revenueRow = row;
          console.log('Found revenue row');
        } else if (metric.includes('average rate') || metric.includes('adr')) {
          adrRow = row;
          console.log('Found ADR row');
        } else if (metric === 'customers') {
          customersRow = row;
          console.log('Found customers row');
        }
      }
    }

    // Extract data for each period
    for (let i = 0; i < periods.length; i++) {
      const colIndex = i + 3; // Data starts at column 3

      const parseNum = (row: any[] | null, idx: number): number => {
        if (!row || idx >= row.length) return 0;
        const val = row[idx];
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
          return parseFloat(val.replace(/[^0-9.,\-]/g, '').replace(',', '.')) || 0;
        }
        return 0;
      };

      let occupancy = parseNum(occupancyRow, colIndex);
      const occupied = parseNum(occupiedRow, colIndex);
      const available = parseNum(availableRow, colIndex);
      const revenue = parseNum(revenueRow, colIndex);
      const adr = parseNum(adrRow, colIndex);
      const customers = parseNum(customersRow, colIndex);

      // Convert occupancy if it's a decimal (0.63 -> 63%)
      if (occupancy > 0 && occupancy <= 1) {
        occupancy = occupancy * 100;
      }

      // Skip if no meaningful data
      if (occupied === 0 && revenue === 0 && occupancy === 0) continue;

      // Parse period to date
      const periodDate = parsePeriodToDate(periods[i], reportType);

      data.push({
        date: periodDate,
        occupancy: Math.round(occupancy * 10) / 10,
        occupiedRooms: Math.round(occupied),
        availableRooms: Math.round(available) || totalRooms,
        revenue: Math.round(revenue * 100) / 100,
        adr: Math.round(adr * 100) / 100,
        arrivals: 0, // Not in this report format
        departures: 0,
        customers: Math.round(customers),
      });
    }

    console.log('Parsed data records:', data.length);

    if (data.length === 0) {
      errors.push('No valid data found in report');
    }

  } catch (error: any) {
    console.error('Parse error:', error);
    errors.push(`Parse error: ${error.message}`);
  }

  return { data, reportType, errors };
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
