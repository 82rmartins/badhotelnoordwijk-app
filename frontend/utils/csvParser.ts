import Papa from 'papaparse';
import { Reservation } from './storage';

interface CSVRow {
  [key: string]: string;
}

// Parse date from multiple formats
function parseDate(dateStr: string): Date {
  if (!dateStr || dateStr.trim() === '') {
    return new Date();
  }
  
  const trimmed = dateStr.trim();
  
  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return new Date(trimmed);
  }
  
  // Try DD/MM/YYYY
  const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // Try MM/DD/YYYY
  const mmddyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) {
    const [, month, day, year] = mmddyyyy;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // Fallback to Date parser
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

// Get value from row with multiple possible column names
function getValue(row: CSVRow, ...keys: string[]): string {
  for (const key of keys) {
    // Try exact match
    if (row[key] !== undefined) return row[key];
    // Try lowercase
    const lowerKey = key.toLowerCase();
    for (const rowKey of Object.keys(row)) {
      if (rowKey.toLowerCase() === lowerKey) return row[rowKey];
    }
  }
  return '';
}

// Parse numeric value
function parseNumber(value: string): number {
  if (!value || value.trim() === '') return 0;
  // Remove currency symbols and whitespace
  const cleaned = value.replace(/[€$£,\s]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Parse CSV content into reservations
export function parseCSV(content: string): { reservations: Reservation[]; errors: string[] } {
  const errors: string[] = [];
  const reservations: Reservation[] = [];
  
  const result = Papa.parse<CSVRow>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });
  
  if (result.errors.length > 0) {
    result.errors.forEach(err => errors.push(`Linha ${err.row}: ${err.message}`));
  }
  
  result.data.forEach((row, index) => {
    try {
      const checkInStr = getValue(row, 'check_in', 'Check-in', 'CheckIn', 'Arrival', 'arrival_date');
      const checkOutStr = getValue(row, 'check_out', 'Check-out', 'CheckOut', 'Departure', 'departure_date');
      
      if (!checkInStr || !checkOutStr) {
        errors.push(`Linha ${index + 2}: Datas de check-in/check-out ausentes`);
        return;
      }
      
      const checkIn = parseDate(checkInStr);
      const checkOut = parseDate(checkOutStr);
      
      const reservation: Reservation = {
        reservation_id: getValue(row, 'reservation_id', 'Reservation ID', 'ReservationId', 'id', 'booking_id') || `RES-${index}-${Date.now()}`,
        guest_name: getValue(row, 'guest_name', 'Guest Name', 'GuestName', 'guest', 'name') || 'Guest',
        room_number: getValue(row, 'room_number', 'Room', 'RoomNumber', 'room', 'room_id') || 'N/A',
        check_in: checkIn.toISOString(),
        check_out: checkOut.toISOString(),
        room_revenue: parseNumber(getValue(row, 'room_revenue', 'Room Revenue', 'Revenue', 'total', 'amount')),
        parking_revenue: parseNumber(getValue(row, 'parking_revenue', 'Parking', 'parking')),
        vending_revenue: parseNumber(getValue(row, 'vending_revenue', 'Vending', 'vending', 'extras')),
        city_tax: parseNumber(getValue(row, 'city_tax', 'City Tax', 'CityTax', 'tax')),
        status: (getValue(row, 'status', 'Status', 'state') || 'confirmed').toLowerCase(),
      };
      
      reservations.push(reservation);
    } catch (err) {
      errors.push(`Linha ${index + 2}: Erro ao processar`);
    }
  });
  
  return { reservations, errors };
}
