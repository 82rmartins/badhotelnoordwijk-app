import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { HOTEL_CONFIG } from '../../utils/constants';
import { fetchWeather, getWeatherSuggestion, WeatherData } from '../../utils/weatherService';
import { useLanguage } from '../../utils/LanguageContext';

const { width } = Dimensions.get('window');

// Hotel Logo Component
const HotelLogo = ({ size = 60 }: { size?: number }) => (
  <View style={[logoStyles.container, { width: size, height: size }]}>
    <View style={[logoStyles.topHalf, { borderTopLeftRadius: size/2, borderTopRightRadius: size/2 }]} />
    <View style={[logoStyles.bottomHalf, { borderBottomLeftRadius: size/2, borderBottomRightRadius: size/2 }]}>
      <View style={logoStyles.wave} />
    </View>
  </View>
);

const logoStyles = StyleSheet.create({
  container: { overflow: 'hidden', borderRadius: 999 },
  topHalf: { flex: 1, backgroundColor: '#8FAFC4' },
  bottomHalf: { flex: 1, backgroundColor: '#5F7F94', position: 'relative' },
  wave: { position: 'absolute', top: -6, left: 0, right: 0, height: 12, backgroundColor: '#8FAFC4', borderBottomLeftRadius: 100, borderBottomRightRadius: 100, transform: [{ scaleX: 1.5 }] },
});

// Weather Card
const WeatherCard = ({ weather, suggestion, language }: { weather: WeatherData | null; suggestion: string; language: string }) => {
  if (!weather) return null;
  
  const getWeatherIcon = (icon: string) => {
    const icons: Record<string, string> = {
      'sunny': 'sunny',
      'partly-sunny': 'partly-sunny',
      'cloudy': 'cloudy',
      'rainy': 'rainy',
      'thunderstorm': 'thunderstorm',
      'snow': 'snow',
      'moon': 'moon',
    };
    return icons[icon] || 'cloudy';
  };

  return (
    <View style={styles.weatherCard}>
      <View style={styles.weatherHeader}>
        <Text style={styles.weatherTitle}>
          {language === 'en' ? 'Today at BAD Hotel Noordwijk' : 'Vandaag bij BAD Hotel Noordwijk'}
        </Text>
      </View>
      <View style={styles.weatherContent}>
        <View style={styles.weatherMain}>
          <Ionicons name={getWeatherIcon(weather.icon) as any} size={48} color="#F59E0B" />
          <Text style={styles.weatherTemp}>{weather.temp}°C</Text>
        </View>
        <View style={styles.weatherDetails}>
          <Text style={styles.weatherDesc}>{weather.description}</Text>
          <View style={styles.weatherMeta}>
            <View style={styles.weatherMetaItem}>
              <Ionicons name="water" size={14} color="#60A5FA" />
              <Text style={styles.weatherMetaText}>{weather.humidity}%</Text>
            </View>
            <View style={styles.weatherMetaItem}>
              <Ionicons name="speedometer" size={14} color="#A78BFA" />
              <Text style={styles.weatherMetaText}>{weather.wind_speed} km/h</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.suggestionBox}>
        <Ionicons name="bulb" size={16} color="#10B981" />
        <Text style={styles.suggestionText}>{suggestion}</Text>
      </View>
    </View>
  );
};

// Language Toggle - 3 languages
const LanguageToggle = () => {
  const { language, setLanguage } = useLanguage();
  return (
    <View style={styles.langToggle}>
      <TouchableOpacity 
        style={[styles.langBtn, language === 'en' && styles.langBtnActive]} 
        onPress={() => setLanguage('en')}
      >
        <Text style={[styles.langBtnText, language === 'en' && styles.langBtnTextActive]}>EN</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.langBtn, language === 'nl' && styles.langBtnActive]} 
        onPress={() => setLanguage('nl')}
      >
        <Text style={[styles.langBtnText, language === 'nl' && styles.langBtnTextActive]}>NL</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.langBtn, language === 'de' && styles.langBtnActive]} 
        onPress={() => setLanguage('de')}
      >
        <Text style={[styles.langBtnText, language === 'de' && styles.langBtnTextActive]}>DE</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function GuestHome() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { language } = useLanguage();

  const loadWeather = async () => {
    const data = await fetchWeather(); // No API key = simulated
    setWeather(data);
  };

  useEffect(() => {
    loadWeather();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWeather();
    setRefreshing(false);
  };

  const suggestion = weather ? getWeatherSuggestion(weather)[language as 'en' | 'nl'] || getWeatherSuggestion(weather).en : '';

  const translations: Record<string, any> = {
    en: {
      welcome: 'Welcome to your stay',
      yourStay: 'Your Stay',
      aroundYou: 'Around You',
      hotelExperience: 'Hotel Experience',
      benefits: 'Benefits',
      bookAgain: 'Book Again',
      freeWifi: 'Free WiFi & Coffee all day ☕',
    },
    nl: {
      welcome: 'Welkom bij uw verblijf',
      yourStay: 'Uw Verblijf',
      aroundYou: 'Om U Heen',
      hotelExperience: 'Hotel Ervaring',
      benefits: 'Voordelen',
      bookAgain: 'Opnieuw Boeken',
      freeWifi: 'Gratis WiFi & Koffie de hele dag ☕',
    },
    de: {
      welcome: 'Willkommen zu Ihrem Aufenthalt',
      yourStay: 'Ihr Aufenthalt',
      aroundYou: 'Um Sie Herum',
      hotelExperience: 'Hotel Erlebnis',
      benefits: 'Vorteile',
      bookAgain: 'Erneut Buchen',
      freeWifi: 'Gratis WLAN & Kaffee den ganzen Tag ☕',
    }
  };
  
  const t = translations[language] || translations.en;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.brandContainer}>
            <HotelLogo size={50} />
            <View style={styles.brandTextContainer}>
              <Text style={styles.brandName}>BadHotel</Text>
              <Text style={styles.brandLocation}>Noordwijk</Text>
            </View>
          </View>
          <LanguageToggle />
        </View>
        <Text style={styles.welcomeText}>{t.welcome}</Text>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
        }
      >
        {/* Weather Card */}
        <WeatherCard weather={weather} suggestion={suggestion} language={language} />

        {/* Free Coffee Banner */}
        <View style={styles.coffeeBanner}>
          <Ionicons name="cafe" size={20} color="#F59E0B" />
          <Text style={styles.coffeeBannerText}>{t.freeWifi}</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/guest/your-stay')}>
            <View style={[styles.quickActionIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
              <Ionicons name="bed" size={28} color="#10B981" />
            </View>
            <Text style={styles.quickActionText}>{t.yourStay}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/guest/around-you')}>
            <View style={[styles.quickActionIconBox, { backgroundColor: 'rgba(96, 165, 250, 0.2)' }]}>
              <Ionicons name="map" size={28} color="#60A5FA" />
            </View>
            <Text style={styles.quickActionText}>{t.aroundYou}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/guest/experience')}>
            <View style={[styles.quickActionIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
              <Ionicons name="star" size={28} color="#F59E0B" />
            </View>
            <Text style={styles.quickActionText}>{t.hotelExperience}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/guest/benefits')}>
            <View style={[styles.quickActionIconBox, { backgroundColor: 'rgba(167, 139, 250, 0.2)' }]}>
              <Ionicons name="gift" size={28} color="#A78BFA" />
            </View>
            <Text style={styles.quickActionText}>{t.benefits}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/guest/book-again')}>
            <View style={[styles.quickActionIconBox, { backgroundColor: 'rgba(244, 114, 182, 0.2)' }]}>
              <Ionicons name="calendar" size={28} color="#F472B6" />
            </View>
            <Text style={styles.quickActionText}>{t.bookAgain}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0B' },
  header: { backgroundColor: '#111113', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1F1F23' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  brandContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandTextContainer: { flexDirection: 'column' },
  brandName: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5 },
  brandLocation: { fontSize: 13, color: '#8FAFC4', marginTop: -2 },
  welcomeText: { fontSize: 16, color: '#9CA3AF', marginTop: 8 },
  langToggle: { flexDirection: 'row', backgroundColor: '#1F1F23', borderRadius: 8, overflow: 'hidden' },
  langBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  langBtnActive: { backgroundColor: '#10B981' },
  langBtnText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  langBtnTextActive: { color: '#FFFFFF' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  weatherCard: { backgroundColor: '#111113', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#1F1F23' },
  weatherHeader: { marginBottom: 16 },
  weatherTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  weatherContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  weatherMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  weatherTemp: { fontSize: 36, fontWeight: '700', color: '#FFFFFF' },
  weatherDetails: { marginLeft: 'auto' },
  weatherDesc: { fontSize: 14, color: '#9CA3AF', textTransform: 'capitalize' },
  weatherMeta: { flexDirection: 'row', gap: 16, marginTop: 8 },
  weatherMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  weatherMetaText: { fontSize: 12, color: '#6B7280' },
  suggestionBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#1A1A1D', borderRadius: 10, padding: 12, gap: 10 },
  suggestionText: { flex: 1, fontSize: 13, color: '#D1D5DB', lineHeight: 20 },
  coffeeBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1F1F23', borderRadius: 12, padding: 14, marginBottom: 20, gap: 10 },
  coffeeBannerText: { fontSize: 14, color: '#FFFFFF', fontWeight: '500' },
  quickActionsContainer: { gap: 12 },
  quickActionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111113', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1F1F23' },
  quickActionIconBox: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  quickActionText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  footerSpacer: { height: 40 },
});
