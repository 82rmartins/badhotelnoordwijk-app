// XLSX Parser for Mews Manager Reports
// Supports daily, weekly, and monthly reports

import * as XLSX from 'xlsx';
import { Reservation } from './storage';

export interface MewsReportData {
  date: Date;
  occupancy: number;
  occupiedRooms: number;
  revenue: number;
  adr: number;
  arrivals?: number;
  departures?: number;
  customers?: number;
}

export interface ParsedXLSXResult {
  data: MewsReportData[];
  reservations: Reservation[];
  reportType: 'daily' | 'weekly' | 'monthly' | 'unknown';
  errors: string[];
}

// Parse XLSX file content (base64 or array buffer)
export function parseXLSX(content: string | ArrayBuffer, totalRooms: number = 24): ParsedXLSXResult {
  const errors: string[] = [];
  const data: MewsReportData[] = [];
  const reservations: Reservation[] = [];
  let reportType: 'daily' | 'weekly' | 'monthly' | 'unknown' = 'unknown';

  try {
    // Read workbook
    const workbook = XLSX.read(content, { type: typeof content === 'string' ? 'base64' : 'array' });
    
    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    
    if (jsonData.length < 2) {
      errors.push('File has no data rows');
      return { data, reservations, reportType, errors };
    }

    // Find headers row (usually first row with "Date" or "Period" or similar)
    let headerRowIndex = 0;
    let headers: string[] = [];
    
    for (let i = 0; i < Math.min(5, jsonData.length); i++) {
      const row = jsonData[i];
      if (row && Array.isArray(row)) {
        const rowStr = row.map(c => String(c || '').toLowerCase()).join('|');
        if (rowStr.includes('date') || rowStr.includes('period') || rowStr.includes('day') || 
            rowStr.includes('occupancy') || rowStr.includes('revenue') || rowStr.includes('bezetting')) {
          headerRowIndex = i;
          headers = row.map(c => String(c || '').toLowerCase().trim());
          break;
        }
      }
    }

    if (headers.length === 0) {
      // Try to detect data without clear headers
      headers = jsonData[0]?.map((_, i) => `col${i}`) || [];
    }

    // Detect report type based on headers
    const headersStr = headers.join('|');
    if (headersStr.includes('week')) {
      reportType = 'weekly';
    } else if (headersStr.includes('month') || headersStr.includes('maand')) {
      reportType = 'monthly';
    } else {
      reportType = 'daily';
    }

    // Find relevant column indices
    const findColIndex = (keywords: string[]) => {
      for (const keyword of keywords) {
        const index = headers.findIndex(h => h.includes(keyword));
        if (index >= 0) return index;
      }
      return -1;
    };

    const dateCol = findColIndex(['date', 'datum', 'period', 'day', 'week', 'month']);
    const occupancyCol = findColIndex(['occupancy', 'bezetting', '%']);
    const revenueCol = findColIndex(['revenue', 'omzet', 'total']);
    const roomsCol = findColIndex(['rooms', 'kamers', 'occupied']);
    const arrCol = findColIndex(['arrival', 'aankomst', 'check-in', 'in']);
    const depCol = findColIndex(['departure', 'vertrek', 'check-out', 'out']);
    const adrCol = findColIndex(['adr', 'rate', 'tarief', 'average']);

    // Process data rows
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || !Array.isArray(row) || row.length < 2) continue;

      try {
        // Parse date
        let dateValue = dateCol >= 0 ? row[dateCol] : row[0];
        let date: Date | null = null;
        
        if (dateValue) {
          if (typeof dateValue === 'number') {
            // Excel serial date
            date = XLSX.SSF.parse_date_code(dateValue);
            if (date) {
              date = new Date(date.y, date.m - 1, date.d);
            }
          } else if (typeof dateValue === 'string') {
            // Try various date formats
            const cleaned = dateValue.trim();
            const parts = cleaned.split(/[-\/\.]/);
            if (parts.length >= 3) {
              // DD-MM-YYYY or YYYY-MM-DD
              if (parts[0].length === 4) {
                date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
              } else {
                date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
              }
            } else {
              date = new Date(cleaned);
            }
          }
        }

        if (!date || isNaN(date.getTime())) {
          // For weekly/monthly reports without clear dates, generate dates
          if (reportType !== 'daily') {
            date = new Date();
            date.setDate(date.getDate() - (jsonData.length - i));
          } else {
            continue;
          }
        }

        // Parse numeric values
        const parseNum = (val: any): number => {
          if (typeof val === 'number') return val;
          if (typeof val === 'string') {
            const cleaned = val.replace(/[^0-9.,\-]/g, '').replace(',', '.');
            return parseFloat(cleaned) || 0;
          }
          return 0;
        };

        const occupancy = occupancyCol >= 0 ? parseNum(row[occupancyCol]) : 0;
        const revenue = revenueCol >= 0 ? parseNum(row[revenueCol]) : 0;
        const occupiedRooms = roomsCol >= 0 ? parseNum(row[roomsCol]) : Math.round((occupancy / 100) * totalRooms);
        const arrivals = arrCol >= 0 ? parseNum(row[arrCol]) : 0;
        const departures = depCol >= 0 ? parseNum(row[depCol]) : 0;
        const adr = adrCol >= 0 ? parseNum(row[adrCol]) : (occupiedRooms > 0 ? revenue / occupiedRooms : 0);

        // Skip rows with no meaningful data
        if (occupancy === 0 && revenue === 0 && occupiedRooms === 0) continue;

        data.push({
          date,
          occupancy: Math.min(100, Math.max(0, occupancy)),
          occupiedRooms,
          revenue,
          adr,
          arrivals,
          departures,
        });

        // Create reservation entries for each occupied room
        for (let r = 0; r < occupiedRooms; r++) {
          const checkIn = new Date(date);
          const checkOut = new Date(date);
          checkOut.setDate(checkOut.getDate() + 1);
          
          reservations.push({
            reservation_id: `MEWS-${date.getTime()}-${r}`,
            guest_name: `Guest ${r + 1}`,
            room_number: String(100 + (r % totalRooms)),
            check_in: checkIn.toISOString().split('T')[0],
            check_out: checkOut.toISOString().split('T')[0],
            status: 'confirmed',
            adults: 2,
            children: 0,
            total_amount: adr,
            payment_status: 'paid',
          });
        }

      } catch (rowError: any) {
        errors.push(`Row ${i + 1}: ${rowError.message}`);
      }
    }

    if (data.length === 0) {
      errors.push('No valid data found in file');
    }

  } catch (error: any) {
    errors.push(`Parse error: ${error.message}`);
  }

  return { data, reservations, reportType, errors };
}

// Convert XLSX data to displayable stats
export function xlsxDataToStats(data: MewsReportData[], totalRooms: number = 24) {
  if (data.length === 0) return null;

  // Sort by date
  const sorted = [...data].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Today's data (most recent)
  const today = sorted[sorted.length - 1];
  
  // Calculate averages
  const avgOccupancy = data.reduce((sum, d) => sum + d.occupancy, 0) / data.length;
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const avgAdr = data.reduce((sum, d) => sum + d.adr, 0) / data.length;
  
  return {
    today: {
      date: today.date,
      occupancy: today.occupancy,
      occupiedRooms: today.occupiedRooms,
      revenue: today.revenue,
      adr: today.adr,
      arrivals: today.arrivals || 0,
      departures: today.departures || 0,
    },
    period: {
      startDate: sorted[0].date,
      endDate: sorted[sorted.length - 1].date,
      avgOccupancy,
      totalRevenue,
      avgAdr,
      daysCount: data.length,
    },
    daily: sorted,
  };
}
