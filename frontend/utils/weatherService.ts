import { WEATHER_LOCATION } from './constants';

export interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  feels_like: number;
  humidity: number;
  wind_speed: number;
}

export async function fetchWeather(apiKey?: string): Promise<WeatherData | null> {
  // If no API key, return simulated weather based on season
  if (!apiKey) {
    return getSimulatedWeather();
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${WEATHER_LOCATION.lat}&lon=${WEATHER_LOCATION.lon}&appid=${apiKey}&units=metric&lang=en`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn('Weather API error, using simulated data');
      return getSimulatedWeather();
    }

    const data = await response.json();
    
    return {
      temp: Math.round(data.main.temp),
      description: data.weather[0].description,
      icon: mapWeatherIcon(data.weather[0].icon),
      feels_like: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      wind_speed: Math.round(data.wind.speed * 3.6), // m/s to km/h
    };
  } catch (error) {
    console.error('Error fetching weather:', error);
    return getSimulatedWeather();
  }
}

function getSimulatedWeather(): WeatherData {
  const month = new Date().getMonth();
  const hour = new Date().getHours();
  
  // Updated seasonal temperatures for Noordwijk, Netherlands (coastal climate - milder)
  // Based on actual average temperatures
  const seasonalTemp: Record<number, { min: number; max: number }> = {
    0: { min: 2, max: 8 },    // Jan - Winter
    1: { min: 3, max: 10 },   // Feb - Late winter (can be mild)
    2: { min: 5, max: 12 },   // Mar - Early spring
    3: { min: 7, max: 15 },   // Apr - Spring
    4: { min: 10, max: 18 },  // May - Late spring
    5: { min: 13, max: 21 },  // Jun - Early summer
    6: { min: 15, max: 23 },  // Jul - Summer
    7: { min: 15, max: 23 },  // Aug - Summer
    8: { min: 13, max: 20 },  // Sep - Early autumn
    9: { min: 9, max: 16 },   // Oct - Autumn
    10: { min: 5, max: 11 },  // Nov - Late autumn
    11: { min: 3, max: 8 },   // Dec - Winter
  };

  const { min, max } = seasonalTemp[month];
  // Temperature varies throughout the day - warmer in afternoon
  const dayProgress = Math.sin((hour - 6) * Math.PI / 12);
  const temp = Math.round(min + (max - min) * Math.max(0.3, dayProgress));

  const conditions = [
    { desc: 'Clear sky', icon: 'sunny' },
    { desc: 'Partly cloudy', icon: 'partly-sunny' },
    { desc: 'Cloudy', icon: 'cloudy' },
    { desc: 'Light rain', icon: 'rainy' },
  ];
  
  // More likely to be sunny in summer, more clouds in winter
  const conditionIndex = month >= 5 && month <= 8 
    ? Math.floor(Math.random() * 2) 
    : Math.floor(Math.random() * conditions.length);
  
  const condition = conditions[conditionIndex];

  return {
    temp,
    description: condition.desc,
    icon: condition.icon,
    feels_like: temp - Math.floor(Math.random() * 2),
    humidity: 65 + Math.floor(Math.random() * 25),
    wind_speed: 15 + Math.floor(Math.random() * 15), // Coastal = more wind
  };
}

function mapWeatherIcon(openWeatherIcon: string): string {
  const iconMap: Record<string, string> = {
    '01d': 'sunny',
    '01n': 'moon',
    '02d': 'partly-sunny',
    '02n': 'cloudy-night',
    '03d': 'cloudy',
    '03n': 'cloudy',
    '04d': 'cloudy',
    '04n': 'cloudy',
    '09d': 'rainy',
    '09n': 'rainy',
    '10d': 'rainy',
    '10n': 'rainy',
    '11d': 'thunderstorm',
    '11n': 'thunderstorm',
    '13d': 'snow',
    '13n': 'snow',
    '50d': 'cloudy',
    '50n': 'cloudy',
  };
  return iconMap[openWeatherIcon] || 'cloudy';
}

export function getWeatherSuggestion(weather: WeatherData): { en: string; nl: string } {
  const temp = weather.temp;
  const desc = weather.description.toLowerCase();

  if (desc.includes('rain') || desc.includes('storm')) {
    return {
      en: "Rainy day – perfect for exploring museums or enjoying the cozy common area",
      nl: "Regenachtige dag – ideaal voor musea of gezellig in de gemeenschappelijke ruimte"
    };
  }
  
  if (temp >= 20) {
    return {
      en: "Beautiful sunny day – perfect for a beach walk or cycling!",
      nl: "Prachtige zonnige dag – ideaal voor een strandwandeling of fietsen!"
    };
  }
  
  if (temp >= 15) {
    return {
      en: "Pleasant weather – great day to explore Noordwijk",
      nl: "Lekker weer – perfecte dag om Noordwijk te ontdekken"
    };
  }
  
  if (temp >= 10) {
    return {
      en: "Cool day – enjoy a walk and warm up with free coffee",
      nl: "Frisse dag – geniet van een wandeling en warm op met gratis koffie"
    };
  }
  
  return {
    en: "Chilly day – relax in our warm common area with board games",
    nl: "Koude dag – ontspan in onze warme gemeenschappelijke ruimte met bordspellen"
  };
}
