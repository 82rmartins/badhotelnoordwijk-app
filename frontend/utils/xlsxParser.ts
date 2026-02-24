// XLSX Parser for Mews Manager Reports
// Supports daily, weekly, and monthly reports from Mews PMS

import * as XLSX from 'xlsx';
import { Reservation } from './storage';

export interface MewsReportData {
  period: string;
  occupancy: number;
  occupiedRooms: number;
  available: number;
  revenue: number;
  adr: number;
  customers: number;
}

export interface ParsedXLSXResult {
  data: MewsReportData[];
  reservations: Reservation[];
  reportType: 'daily' | 'weekly' | 'monthly' | 'unknown';
  errors: string[];
}

// Parse Mews Manager Report XLSX
export function parseXLSX(content: string | ArrayBuffer, totalRooms: number = 24): ParsedXLSXResult {
  const errors: string[] = [];
  const data: MewsReportData[] = [];
  const reservations: Reservation[] = [];
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
      return { data, reservations, reportType, errors };
    }

    // Check for Mews structure (should have Parameters and Data sheets)
    if (!workbook.SheetNames.includes('Data')) {
      errors.push('Invalid Mews report: Missing "Data" sheet');
      return { data, reservations, reportType, errors };
    }

    // Read Parameters to detect report type
    if (workbook.SheetNames.includes('Parameters')) {
      const paramsSheet = workbook.Sheets['Parameters'];
      const paramsData = XLSX.utils.sheet_to_json(paramsSheet, { header: 1 }) as any[][];
      
      for (const row of paramsData) {
        if (row[0] === 'Mode') {
          const mode = String(row[1] || '').toLowerCase();
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

    if (jsonData.length < 2) {
      errors.push('No data rows found in report');
      return { data, reservations, reportType, errors };
    }

    // First row has periods (columns 3+)
    const headerRow = jsonData[0];
    const periods: string[] = [];
    for (let i = 3; i < headerRow.length; i++) {
      if (headerRow[i] && headerRow[i] !== 'Total') {
        periods.push(String(headerRow[i]));
      }
    }

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
      
      // Look for room/accommodation metrics
      if (group.includes('stay') || group.includes('accom') || group.includes('room')) {
        if (metric.includes('occupancy') && !metric.includes('direct')) {
          occupancyRow = row;
        } else if (metric === 'occupied' || metric === 'directly occupied') {
          occupiedRow = row;
        } else if (metric === 'available') {
          availableRow = row;
        } else if (metric === 'revenue' && !metric.includes('per') && !metric.includes('direct')) {
          revenueRow = row;
        } else if (metric.includes('average rate') || metric.includes('adr')) {
          adrRow = row;
        } else if (metric === 'customers') {
          customersRow = row;
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

      const occupancy = parseNum(occupancyRow, colIndex);
      const occupied = parseNum(occupiedRow, colIndex);
      const available = parseNum(availableRow, colIndex);
      const revenue = parseNum(revenueRow, colIndex);
      const adr = parseNum(adrRow, colIndex);
      const customers = parseNum(customersRow, colIndex);

      // Skip if no meaningful data
      if (occupied === 0 && revenue === 0) continue;

      data.push({
        period: periods[i],
        occupancy: occupancy > 1 ? occupancy : occupancy * 100, // Convert if decimal
        occupiedRooms: Math.round(occupied),
        available: Math.round(available),
        revenue: revenue,
        adr: adr,
        customers: Math.round(customers),
      });

      // Create reservation entries for tracking
      const periodDate = parsePeriodDate(periods[i]);
      if (periodDate && occupied > 0) {
        for (let r = 0; r < Math.min(occupied, 100); r++) {
          const checkOut = new Date(periodDate);
          checkOut.setDate(checkOut.getDate() + 1);
          
          reservations.push({
            reservation_id: `MEWS-${periodDate.getTime()}-${r}`,
            guest_name: `Guest ${r + 1}`,
            room_number: String(100 + (r % totalRooms)),
            check_in: periodDate.toISOString().split('T')[0],
            check_out: checkOut.toISOString().split('T')[0],
            status: 'confirmed',
            adults: 2,
            children: 0,
            total_amount: adr,
            payment_status: 'paid',
          });
        }
      }
    }

    if (data.length === 0) {
      errors.push('No valid data found in report');
    }

  } catch (error: any) {
    errors.push(`Parse error: ${error.message}`);
  }

  return { data, reservations, reportType, errors };
}

// Parse period string to date
function parsePeriodDate(period: string): Date | null {
  try {
    // Handle formats like "January 2026", "29-12-2025 - 04-01-2026", etc.
    const cleaned = period.trim();
    
    // Monthly: "January 2026"
    const monthMatch = cleaned.match(/^([A-Za-z]+)\s+(\d{4})$/);
    if (monthMatch) {
      const months: Record<string, number> = {
        january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
        july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
      };
      const monthNum = months[monthMatch[1].toLowerCase()];
      if (monthNum !== undefined) {
        return new Date(parseInt(monthMatch[2]), monthNum, 15);
      }
    }
    
    // Weekly: "29-12-2025 - 04-01-2026" - use start date
    const weekMatch = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (weekMatch) {
      return new Date(parseInt(weekMatch[3]), parseInt(weekMatch[2]) - 1, parseInt(weekMatch[1]));
    }
    
    // Daily: "24-02-2026" or "2026-02-24"
    const dayMatch1 = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dayMatch1) {
      return new Date(parseInt(dayMatch1[3]), parseInt(dayMatch1[2]) - 1, parseInt(dayMatch1[1]));
    }
    
    const dayMatch2 = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (dayMatch2) {
      return new Date(parseInt(dayMatch2[1]), parseInt(dayMatch2[2]) - 1, parseInt(dayMatch2[3]));
    }
    
    return null;
  } catch {
    return null;
  }
}

// Convert parsed data to dashboard stats
export function xlsxDataToStats(data: MewsReportData[], reportType: string) {
  if (data.length === 0) return null;

  const avgOccupancy = data.reduce((sum, d) => sum + d.occupancy, 0) / data.length;
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const avgAdr = data.filter(d => d.adr > 0).length > 0 
    ? data.reduce((sum, d) => sum + d.adr, 0) / data.filter(d => d.adr > 0).length 
    : 0;
  const totalCustomers = data.reduce((sum, d) => sum + d.customers, 0);
  const totalOccupied = data.reduce((sum, d) => sum + d.occupiedRooms, 0);

  return {
    periods: data,
    summary: {
      avgOccupancy: Math.round(avgOccupancy * 10) / 10,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgAdr: Math.round(avgAdr * 100) / 100,
      totalCustomers,
      totalOccupied,
      reportType,
    }
  };
}
