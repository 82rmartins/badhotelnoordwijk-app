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
};

// Nearby Places - From Flyers
export const NEARBY_PLACES = {
  breakfast: [
    { name: 'De Smaakmaker', category: 'breakfast', lat: 52.2446, lng: 4.4362 },
    { name: 'Presso Noordwijk', category: 'breakfast', lat: 52.2440, lng: 4.4350 },
  ],
  bakeries: [
    { name: 'Oerbakker De Witt', category: 'bakery', lat: 52.2448, lng: 4.4365 },
  ],
  supermarkets: [
    { name: 'Vomar Voordeelmarkt', category: 'supermarket', lat: 52.2445, lng: 4.4370 },
    { name: 'Lidl', category: 'supermarket', lat: 52.2442, lng: 4.4355 },
  ],
  restaurants: [
    { name: 'Fish & Chips Noordwijk', category: 'restaurant', lat: 52.2450, lng: 4.4400 },
    { name: 'Breakers Beach House', category: 'beach_club', lat: 52.2460, lng: 4.4420 },
    { name: 'De Zeemeeuw Strandpaviljoen', category: 'beach_club', lat: 52.2455, lng: 4.4415 },
    { name: 'Beachclub O', category: 'beach_club', lat: 52.2458, lng: 4.4418 },
    { name: 'Nomade Beach House', category: 'beach_club', lat: 52.2462, lng: 4.4422 },
  ],
  culture: [
    { name: 'Bibliotheek Bollenstreek', category: 'culture', lat: 52.2440, lng: 4.4340 },
    { name: 'Museum Noordwijk', category: 'culture', lat: 52.2435, lng: 4.4335 },
    { name: 'Museum Engelandvaarders', category: 'culture', lat: 52.2438, lng: 4.4338 },
    { name: 'Atlantikwall Museum Noordwijk', category: 'culture', lat: 52.2465, lng: 4.4400 },
    { name: 'Museum of Comic Art', category: 'culture', lat: 52.2433, lng: 4.4330 },
    { name: 'Space Expo', category: 'culture', lat: 52.2190, lng: 4.4200 },
  ],
  wellness: [
    { name: 'Holland & Barrett', category: 'wellness', lat: 52.2444, lng: 4.4358 },
    { name: 'Kruidvat', category: 'pharmacy', lat: 52.2443, lng: 4.4356 },
    { name: 'Xenos Noordwijk', category: 'shop', lat: 52.2441, lng: 4.4354 },
  ],
};

// Authorized emails for Manager Mode
export const AUTHORIZED_EMAILS = [
  'admin@badhotelnoordwijk.com',
  'manager@badhotelnoordwijk.com',
  // Add more emails here
];

// Weather API (OpenWeatherMap free tier)
export const WEATHER_API_KEY = ''; // Will be set via env or user input
export const WEATHER_LOCATION = {
  lat: 52.2446,
  lon: 4.4362,
  city: 'Noordwijk'
};
