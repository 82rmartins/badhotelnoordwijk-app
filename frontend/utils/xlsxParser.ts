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
export function parseXLSX(content: string | ArrayBuffer, totalRooms: number = 24): ParsedXLSXResult {
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
    if (workbook.SheetNames.includes('Age categories') || workbook.SheetNames.includes('Reservations')) {
      // This is an Arrivals or Departures report
      const paramsSheet = workbook.Sheets['Parameters'];
      const paramsData = XLSX.utils.sheet_to_json(paramsSheet, { header: 1 }) as any[][];
      
      // Detect if arrivals or departures
      let isArrivals = false;
      let isDepartures = false;
      
      for (const row of paramsData) {
        const key = String(row[0] || '').toLowerCase();
        const value = String(row[1] || '').toLowerCase();
        if (key === 'mode' || key.includes('filter')) {
          if (value.includes('arrival')) isArrivals = true;
          if (value.includes('departure')) isDepartures = true;
        }
      }
      
      // Check filename hint from first param row
      const firstRow = String(paramsData[0]?.[0] || '').toLowerCase();
      if (firstRow.includes('arriv')) isArrivals = true;
      if (firstRow.includes('depart')) isDepartures = true;
      
      reportType = isArrivals ? 'arrivals' : isDepartures ? 'departures' : 'arrivals';
      
      // Parse Age categories sheet for arrival/departure dates
      if (workbook.SheetNames.includes('Age categories')) {
        const ageSheet = workbook.Sheets['Age categories'];
        const ageData = XLSX.utils.sheet_to_json(ageSheet) as any[];
        
        const countsByDate: Record<string, number> = {};
        
        for (const row of ageData) {
          let dateValue;
          if (reportType === 'arrivals') {
            dateValue = row['Arrival'];
          } else {
            dateValue = row['Departure'];
          }
          
          if (dateValue) {
            let dateStr: string;
            if (dateValue instanceof Date) {
              dateStr = dateValue.toISOString().split('T')[0];
            } else {
              const parsed = new Date(dateValue);
              dateStr = !isNaN(parsed.getTime()) ? parsed.toISOString().split('T')[0] : '';
            }
            
            if (dateStr) {
              countsByDate[dateStr] = (countsByDate[dateStr] || 0) + 1;
            }
          }
        }
        
        // Convert to array
        const resultData = Object.entries(countsByDate)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date));
        
        if (reportType === 'arrivals') {
          arrivalsData = resultData;
          console.log('Parsed arrivals:', arrivalsData.length, 'days');
        } else {
          departuresData = resultData;
          console.log('Parsed departures:', departuresData.length, 'days');
        }
      }
      
      return { data, reportType, arrivalsData, departuresData, errors };
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
        } else if ((metric.includes('revenue') && metric.includes('night')) && !metric.includes('per') && !metric.includes('direct')) {
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
      const availableFromFile = parseNum(availableRow, colIndex);
      const revenue = parseNum(revenueRow, colIndex);
      const adr = parseNum(adrRow, colIndex);
      const customers = parseNum(customersRow, colIndex);

      // Convert occupancy if it's a decimal (0.63 -> 63%)
      if (occupancy > 0 && occupancy <= 1) {
        occupancy = occupancy * 100;
      }

      // For WEEKLY reports, the "occupied" and "available" are totals for 7 days
      // So we need to calculate daily average
      let dailyOccupied = occupied;
      if (reportType === 'weekly' && occupied > totalRooms) {
        dailyOccupied = occupied / 7; // Average per day
      }

      // Skip if no meaningful data
      if (dailyOccupied === 0 && revenue === 0 && occupancy === 0) continue;

      // Parse period to date
      const periodDate = parsePeriodToDate(periods[i], reportType);

      // ALWAYS use totalRooms (24) instead of file value
      const roomsToUse = totalRooms;
      
      // Calculate occupancy based on 24 rooms per day
      // Use the occupancy from file if it's reasonable, otherwise recalculate
      let adjustedOccupancy = occupancy;
      
      // If occupancy is over 100%, it's wrong - recalculate from occupied rooms
      if (occupancy > 100 || occupancy === 0) {
        adjustedOccupancy = (dailyOccupied / roomsToUse) * 100;
      }
      
      // For weekly data with many rooms, recalculate to be safe
      if (reportType === 'weekly' && dailyOccupied > 0) {
        adjustedOccupancy = (dailyOccupied / roomsToUse) * 100;
      }

      // Cap at 100%
      if (adjustedOccupancy > 100) adjustedOccupancy = 100;

      data.push({
        date: periodDate,
        occupancy: Math.round(adjustedOccupancy * 10) / 10,
        occupiedRooms: Math.round(dailyOccupied),
        availableRooms: roomsToUse, // Always 24
        revenue: Math.round(revenue * 100) / 100,
        adr: Math.round(adr * 100) / 100,
        arrivals: 0, // Will be filled from arrivals report
        departures: 0, // Will be filled from departures report
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

  return { data, reportType, arrivalsData, departuresData, errors };
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
