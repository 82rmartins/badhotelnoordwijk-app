// Hotel Constants
export const HOTEL_CONFIG = {
  name: 'BadHotel Noordwijk',
  total_rooms: 24, // 20 double + 2 triple + 2 single
  address: 'Julianastraat 32, 2202KD, Noordwijk',
  phone: '+31 6 22 15 40 89',
  phone_alt: '+31 88 5237 224',
  whatsapp: '+31 6 22 15 40 89',
  emergency: '112',
  email: 'info@badhotelnoordwijk.com',
  website: 'https://www.badhotelnoordwijk.com',
  booking_url: 'https://app.mews.com/distributor/8b8294c8-ac09-4297-831e-b31300aeaaeb',
  instagram: 'badhotelnoordwijk',
  facebook: 'badhotelnoordwijk',
  parking_entry: 'Trompstraat 1-2, Noordwijk',
  parking_price: 15,
  check_in: '15:00',
  check_out: '11:00',
  wifi_network: 'KPN',
  wifi_password: '', // Free WiFi - no password needed
  wifi_instructions: 'Connect to KPN network, authorize on the web page that appears',
  terrace_close: '22:00',
  // TV Info
  tv_password: '12345678',
  tv_instructions: 'Our TVs are streaming-only (YouTube, Netflix, etc). No cable channels available.',
};

// Nearby Places - From Flyers (with full addresses for Google Maps)
export const NEARBY_PLACES = {
  breakfast: [
    { name: 'De Smaakmaker Restaurant', category: 'breakfast', address: 'Hoofdstraat 63, 2202 EV Noordwijk' },
    { name: 'Presso Noordwijk', category: 'breakfast', address: 'Hoofdstraat 42, 2202 GC Noordwijk' },
  ],
  bakeries: [
    { name: 'Oerbakker de Witt', category: 'bakery', address: 'Schoolstraat 15-A, 2202 HC Noordwijk' },
  ],
  supermarkets: [
    { name: 'Vomar Voordeelmarkt', category: 'supermarket', address: 'Bomstraat 19, 2202 GH Noordwijk' },
    { name: 'Lidl', category: 'supermarket', address: 'Rederijkersplein 7, 2203 GB Noordwijk' },
  ],
  restaurants: [
    { name: 'Fish & Chips Noordwijk', category: 'restaurant', address: 'Palaceplein 4, 2202 ER Noordwijk' },
    { name: 'Breakers Beach House', category: 'beach_club', address: 'Koningin Astrid Boulevard 5, 2202 BK Noordwijk' },
    { name: 'De Zeemeeuw', category: 'beach_club', address: 'Kon. Wilhelmina Boulevard 108, 2202 GW Noordwijk' },
    { name: 'Beachclub O', category: 'beach_club', address: 'Kon. Wilhelmina Boulevard 106, 2202 GW Noordwijk' },
    { name: 'Nomade Beach House', category: 'beach_club', address: 'Kon. Wilhelmina Boulevard 104, 2202 GW Noordwijk' },
  ],
  culture: [
    { name: 'Library Noordwijk', category: 'culture', address: 'Akkerwinde 1a, 2201 MD Noordwijk' },
    { name: 'Museum Noordwijk', category: 'culture', address: 'Jan Kroonsplein 4, 2202 JC Noordwijk' },
    { name: 'Museum Engelandvaarders', category: 'culture', address: 'Bosweg 15, 2202 NX Noordwijk' },
    { name: 'Atlantikwall Museum Noordwijk', category: 'culture', address: 'Verlengde Bosweg 1, 2202 NT Noordwijk' },
    { name: 'Museum of Comic Art', category: 'culture', address: 'Bomstraat 11, 2202 GH Noordwijk' },
    { name: 'Space Expo', category: 'culture', address: 'Keplerlaan 3, 2201 AZ Noordwijk' },
  ],
  wellness: [
    { name: 'Holland & Barrett', category: 'wellness', address: 'Hoofdstraat 51, 2202 ET Noordwijk' },
    { name: 'Kruidvat', category: 'pharmacy', address: 'Hoofdstraat 60, 2202 GB Noordwijk' },
    { name: 'Xenos Noordwijk', category: 'shop', address: 'Hoofdstraat 94, 2202 GA Noordwijk' },
  ],
};

// Authorized emails for Manager Mode
export const AUTHORIZED_EMAILS = [
  'carmen@eccleiden.com',
  'lgerrits@kafrahousing.com',
  'viviane@eccleiden.com',
  'msmets@kafrahousing.com',
  'sbeska@kafrahousing.com',
  'fvangool@kafrahousing.com',
  'mbeska@kafrahousing.com',
  'rmartins@kafrahousing.com',
  'ssebralla@kafrahousing.com',
];

// Weather API (OpenWeatherMap free tier)
export const WEATHER_API_KEY = ''; // Will be set via env or user input
export const WEATHER_LOCATION = {
  lat: 52.2446,
  lon: 4.4362,
  city: 'Noordwijk'
};
