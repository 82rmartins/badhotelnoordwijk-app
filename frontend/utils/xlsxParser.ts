// XLSX Parser for Bad Hotel Manager Report
// Format: Single sheet "Data" with daily metrics per column

import * as XLSX from 'xlsx';
import { MewsDailyData } from './storage';

export interface ParsedXLSXResult {
  data: MewsDailyData[];
  reportType: 'daily' | 'weekly' | 'monthly' | 'arrivals' | 'departures' | 'badhotel' | 'unknown';
  arrivalsData?: { date: string; count: number }[];
  departuresData?: { date: string; count: number }[];
  errors: string[];
}

// Parse Bad Hotel Manager Report XLSX
export function parseXLSX(content: string | ArrayBuffer, totalRooms: number = 28): ParsedXLSXResult {
  const errors: string[] = [];
  const data: MewsDailyData[] = [];
  let reportType: ParsedXLSXResult['reportType'] = 'unknown';
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

    // Check for Bad Hotel format (sheet named "Data" with specific structure)
    if (workbook.SheetNames.includes('Data')) {
      const dataSheet = workbook.Sheets['Data'];
      const jsonData = XLSX.utils.sheet_to_json(dataSheet, { header: 1 }) as any[][];
      
      if (jsonData.length < 2) {
        errors.push('No data rows found');
        return { data, reportType, errors };
      }

      // Check if first column has expected row labels
      const rowLabels: string[] = [];
      for (let row = 0; row < Math.min(20, jsonData.length); row++) {
        const label = String(jsonData[row]?.[0] || '').toLowerCase();
        rowLabels.push(label);
      }

      // Detect Bad Hotel format by checking for specific row labels
      const hasParkingRevenue = rowLabels.some(l => l.includes('parking'));
      const hasOccupancy = rowLabels.some(l => l.includes('occupancy'));
      const hasAvailable = rowLabels.some(l => l.includes('available'));
      const hasArrival = rowLabels.some(l => l.includes('arrival'));
      const hasDeparture = rowLabels.some(l => l.includes('departure'));

      if (hasOccupancy && hasAvailable && hasArrival && hasDeparture) {
        console.log('Detected Bad Hotel format');
        reportType = 'badhotel';
        return parseBadHotelFormat(jsonData, errors);
      }

      // Check for Mews Manager Report format (Parameters + Data sheets)
      if (workbook.SheetNames.includes('Parameters')) {
        return parseMewsManagerReport(workbook, errors, totalRooms);
      }
    }

    // Check for Reservation report (has Reservations sheet)
    if (workbook.SheetNames.includes('Reservations')) {
      return parseReservationReport(workbook, errors);
    }

    errors.push('Unknown file format. Expected Bad Hotel format or Mews report.');
    
  } catch (error: any) {
    console.error('Parse error:', error);
    errors.push(`Parse error: ${error.message}`);
  }

  return { data, reportType, arrivalsData, departuresData, errors };
}

// Parse Bad Hotel custom format
function parseBadHotelFormat(jsonData: any[][], errors: string[]): ParsedXLSXResult {
  const data: MewsDailyData[] = [];
  const arrivalsData: { date: string; count: number }[] = [];
  const departuresData: { date: string; count: number }[] = [];

  try {
    // Find row indices by label
    const rowIndices: Record<string, number> = {};
    const rowLabelsToFind = [
      'parking', 'occupancy', 'available', 'occupied', 
      'revenue', 'average rate', 'customers', 'turist tax', 'tourist tax',
      'total revenue', 'arrival', 'departure'
    ];

    for (let row = 0; row < jsonData.length; row++) {
      const label = String(jsonData[row]?.[0] || '').toLowerCase().trim();
      
      if (label.includes('parking') && label.includes('revenue')) rowIndices['parking'] = row;
      else if (label === 'occupancy') rowIndices['occupancy'] = row;
      else if (label === 'available') rowIndices['available'] = row;
      else if (label === 'occupied') rowIndices['occupied'] = row;
      else if (label === 'revenue (nights)' || (label === 'revenue' && !rowIndices['revenue'])) rowIndices['revenue'] = row;
      else if (label.includes('average rate')) rowIndices['adr'] = row;
      else if (label === 'customers') rowIndices['customers'] = row;
      else if (label.includes('turist tax') || label.includes('tourist tax')) rowIndices['tax'] = row;
      else if (label === 'total revenue') rowIndices['totalRevenue'] = row;
      else if (label === 'arrival') rowIndices['arrival'] = row;
      else if (label === 'departure') rowIndices['departure'] = row;
    }

    console.log('Row indices found:', rowIndices);

    // Parse dates from first row (starting from column 2)
    const headerRow = jsonData[0];
    
    for (let col = 1; col < headerRow.length; col++) {
      const dateVal = headerRow[col];
      
      if (!dateVal || dateVal === 'Total') continue;

      // Parse date
      let dateStr: string;
      try {
        if (dateVal instanceof Date) {
          dateStr = dateVal.toISOString().split('T')[0];
        } else {
          // Try DD-MM-YYYY format
          const parts = String(dateVal).match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
          if (parts) {
            const d = new Date(parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]));
            dateStr = d.toISOString().split('T')[0];
          } else {
            continue;
          }
        }
      } catch {
        continue;
      }

      // Extract values
      const getValue = (rowKey: string): number => {
        const rowIdx = rowIndices[rowKey];
        if (rowIdx === undefined) return 0;
        const val = jsonData[rowIdx]?.[col];
        if (val === null || val === undefined) return 0;
        return typeof val === 'number' ? val : parseFloat(String(val)) || 0;
      };

      let occupancy = getValue('occupancy');
      const available = getValue('available') || 28;
      const occupied = getValue('occupied');
      const revenue = getValue('revenue');
      const totalRevenue = getValue('totalRevenue');
      const parkingRevenue = getValue('parking');
      const touristTax = getValue('tax');
      const adr = getValue('adr');
      const customers = getValue('customers');
      const arrivals = Math.round(getValue('arrival'));
      const departures = Math.round(getValue('departure'));

      // Convert occupancy from decimal to percentage if needed
      if (occupancy > 0 && occupancy <= 1) {
        occupancy = occupancy * 100;
      }

      data.push({
        date: dateStr,
        occupancy: Math.round(occupancy * 10) / 10,
        occupiedRooms: Math.round(occupied),
        availableRooms: Math.round(available),
        revenue: Math.round(revenue * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        parkingRevenue: Math.round(parkingRevenue * 100) / 100,
        touristTax: Math.round(touristTax * 100) / 100,
        adr: Math.round(adr * 100) / 100,
        arrivals: arrivals,
        departures: departures,
        customers: Math.round(customers),
      });

      // Track arrivals/departures
      if (arrivals > 0) {
        arrivalsData.push({ date: dateStr, count: arrivals });
      }
      if (departures > 0) {
        departuresData.push({ date: dateStr, count: departures });
      }
    }

    console.log(`Parsed ${data.length} days from Bad Hotel format`);
    
  } catch (error: any) {
    errors.push(`Error parsing Bad Hotel format: ${error.message}`);
  }

  return { data, reportType: 'badhotel', arrivalsData, departuresData, errors };
}

// Parse Mews Manager Report format
function parseMewsManagerReport(workbook: XLSX.WorkBook, errors: string[], totalRooms: number): ParsedXLSXResult {
  const data: MewsDailyData[] = [];
  let reportType: ParsedXLSXResult['reportType'] = 'unknown';

  try {
    // Read Parameters sheet to detect mode
    const paramsSheet = workbook.Sheets['Parameters'];
    if (paramsSheet) {
      const paramsData = XLSX.utils.sheet_to_json(paramsSheet, { header: 1 }) as any[][];
      for (const row of paramsData) {
        if (row[0] === 'Mode') {
          const mode = String(row[1] || '').toLowerCase();
          if (mode.includes('day')) reportType = 'daily';
          else if (mode.includes('week')) reportType = 'weekly';
          else if (mode.includes('month')) reportType = 'monthly';
        }
      }
    }

    // Read Data sheet
    const dataSheet = workbook.Sheets['Data'];
    const jsonData = XLSX.utils.sheet_to_json(dataSheet, { header: 1 }) as any[][];

    // Find key rows
    let occupiedRow: any[] | null = null;
    let availableRow: any[] | null = null;
    let revenueRow: any[] | null = null;
    let adrRow: any[] | null = null;

    for (const row of jsonData) {
      const group = String(row[0] || '').toLowerCase();
      const metric = String(row[2] || '').toLowerCase();
      
      if (group.includes('accommodat')) {
        if (metric === 'occupied') occupiedRow = row;
        else if (metric === 'available') availableRow = row;
        else if (metric === 'revenue') revenueRow = row;
        else if (metric.includes('average rate')) adrRow = row;
      }
    }

    // Parse periods from header
    const headerRow = jsonData[0];
    for (let col = 3; col < headerRow.length; col++) {
      const periodVal = headerRow[col];
      if (!periodVal || periodVal === 'Total') continue;

      const dateStr = parsePeriodToDate(String(periodVal), reportType);
      
      const occupied = parseFloat(occupiedRow?.[col]) || 0;
      const available = parseFloat(availableRow?.[col]) || totalRooms;
      const revenue = parseFloat(revenueRow?.[col]) || 0;
      const adr = parseFloat(adrRow?.[col]) || 0;

      const occupancy = available > 0 ? (occupied / available) * 100 : 0;

      data.push({
        date: dateStr,
        occupancy: Math.round(occupancy * 10) / 10,
        occupiedRooms: Math.round(occupied),
        availableRooms: Math.round(available),
        revenue: Math.round(revenue * 100) / 100,
        adr: Math.round(adr * 100) / 100,
        arrivals: 0,
        departures: 0,
        customers: 0,
      });
    }

  } catch (error: any) {
    errors.push(`Error parsing Mews report: ${error.message}`);
  }

  return { data, reportType, arrivalsData: [], departuresData: [], errors };
}

// Parse Reservation report for arrivals/departures
function parseReservationReport(workbook: XLSX.WorkBook, errors: string[]): ParsedXLSXResult {
  const data: MewsDailyData[] = [];
  let reportType: 'arrivals' | 'departures' = 'arrivals';
  const arrivalsData: { date: string; count: number }[] = [];
  const departuresData: { date: string; count: number }[] = [];

  try {
    const sheet = workbook.Sheets['Reservations'];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    if (jsonData.length < 2) {
      errors.push('No reservations found');
      return { data, reportType, arrivalsData, departuresData, errors };
    }

    // Find column indices
    const headers = jsonData[0];
    let arrivalCol = -1, departureCol = -1, statusCol = -1;
    
    for (let i = 0; i < headers.length; i++) {
      const h = String(headers[i] || '').toLowerCase();
      if (h === 'arrival') arrivalCol = i;
      if (h === 'departure') departureCol = i;
      if (h === 'status') statusCol = i;
    }

    // Count by date
    const arrivals: Record<string, number> = {};
    const departures: Record<string, number> = {};

    for (let row = 1; row < jsonData.length; row++) {
      const rowData = jsonData[row];
      
      // Skip cancelled
      if (statusCol >= 0) {
        const status = String(rowData[statusCol] || '').toLowerCase();
        if (status.includes('cancel')) continue;
      }

      // Count arrivals
      if (arrivalCol >= 0 && rowData[arrivalCol]) {
        const dateStr = parseReservationDate(rowData[arrivalCol]);
        if (dateStr) arrivals[dateStr] = (arrivals[dateStr] || 0) + 1;
      }

      // Count departures
      if (departureCol >= 0 && rowData[departureCol]) {
        const dateStr = parseReservationDate(rowData[departureCol]);
        if (dateStr) departures[dateStr] = (departures[dateStr] || 0) + 1;
      }
    }

    // Convert to arrays
    for (const [date, count] of Object.entries(arrivals)) {
      arrivalsData.push({ date, count });
    }
    for (const [date, count] of Object.entries(departures)) {
      departuresData.push({ date, count });
    }

    arrivalsData.sort((a, b) => a.date.localeCompare(b.date));
    departuresData.sort((a, b) => a.date.localeCompare(b.date));

  } catch (error: any) {
    errors.push(`Error parsing reservations: ${error.message}`);
  }

  return { data, reportType, arrivalsData, departuresData, errors };
}

// Helper: Parse reservation date
function parseReservationDate(dateValue: any): string | null {
  if (!dateValue) return null;
  
  if (dateValue instanceof Date) {
    return dateValue.toISOString().split('T')[0];
  }
  
  const str = String(dateValue);
  
  // ISO format
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  
  // DD-MM-YYYY format
  const ddmmMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (ddmmMatch) {
    return `${ddmmMatch[3]}-${ddmmMatch[2].padStart(2, '0')}-${ddmmMatch[1].padStart(2, '0')}`;
  }
  
  return null;
}

// Helper: Parse period to date
function parsePeriodToDate(period: string, reportType: string): string {
  try {
    // Monthly: "January 2026"
    const monthMatch = period.match(/^([A-Za-z]+)\s+(\d{4})$/);
    if (monthMatch) {
      const months: Record<string, number> = {
        january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
        july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
      };
      const m = months[monthMatch[1].toLowerCase()];
      if (m !== undefined) {
        return new Date(parseInt(monthMatch[2]), m, 15).toISOString().split('T')[0];
      }
    }
    
    // Weekly or Daily: "DD-MM-YYYY" or "DD-MM-YYYY - DD-MM-YYYY"
    const dayMatch = period.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (dayMatch) {
      return new Date(parseInt(dayMatch[3]), parseInt(dayMatch[2]) - 1, parseInt(dayMatch[1])).toISOString().split('T')[0];
    }
    
  } catch {}
  
  return new Date().toISOString().split('T')[0];
}
