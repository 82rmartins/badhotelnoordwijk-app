import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '../utils/LanguageContext';

const { width } = Dimensions.get('window');

// Hotel Logo Component
const HotelLogo = ({ size = 80 }: { size?: number }) => (
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
  wave: { position: 'absolute', top: -8, left: 0, right: 0, height: 16, backgroundColor: '#8FAFC4', borderBottomLeftRadius: 100, borderBottomRightRadius: 100, transform: [{ scaleX: 1.5 }] },
});

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

// Mode Card
const ModeCard = ({ 
  icon, 
  title, 
  description, 
  onPress, 
  color,
  highlight 
}: { 
  icon: string; 
  title: string; 
  description: string; 
  onPress: () => void; 
  color: string;
  highlight?: string;
}) => (
  <TouchableOpacity style={styles.modeCard} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.modeIconContainer, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon as any} size={40} color={color} />
    </View>
    <Text style={styles.modeTitle}>{title}</Text>
    <Text style={styles.modeDescription}>{description}</Text>
    {highlight && (
      <View style={[styles.highlightBadge, { backgroundColor: color + '20' }]}>
        <Text style={[styles.highlightText, { color }]}>{highlight}</Text>
      </View>
    )}
    <View style={[styles.modeArrow, { backgroundColor: color }]}>
      <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
    </View>
  </TouchableOpacity>
);

export default function ModeSelector() {
  const router = useRouter();
  const { language } = useLanguage();

  const translations: Record<string, any> = {
    en: {
      welcome: 'Welcome to',
      hotelName: 'BadHotel Noordwijk',
      selectMode: 'Select your access mode',
      guestMode: 'Guest Mode',
      guestDesc: 'Hotel information, amenities, nearby places & booking',
      guestHighlight: 'Scan QR Code',
      managerMode: 'Manager Mode',
      managerDesc: 'Live operations dashboard, occupancy & revenue analytics',
      managerHighlight: 'Login Required',
    },
    nl: {
      welcome: 'Welkom bij',
      hotelName: 'BadHotel Noordwijk',
      selectMode: 'Selecteer uw toegangsmodus',
      guestMode: 'Gastmodus',
      guestDesc: 'Hotel informatie, voorzieningen, nabije plekken & boeken',
      guestHighlight: 'Scan QR Code',
      managerMode: 'Manager Modus',
      managerDesc: 'Live operaties dashboard, bezetting & omzet analyses',
      managerHighlight: 'Login Vereist',
    },
    de: {
      welcome: 'Willkommen bei',
      hotelName: 'BadHotel Noordwijk',
      selectMode: 'Wählen Sie Ihren Zugang',
      guestMode: 'Gastmodus',
      guestDesc: 'Hotelinfo, Einrichtungen, Umgebung & Buchung',
      guestHighlight: 'QR-Code scannen',
      managerMode: 'Manager Modus',
      managerDesc: 'Live-Dashboard, Belegung & Umsatzanalysen',
      managerHighlight: 'Login erforderlich',
    }
  };
  
  const t = translations[language] || translations.en;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <LanguageToggle />
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <HotelLogo size={90} />
        <Text style={styles.welcomeText}>{t.welcome}</Text>
        <Text style={styles.hotelName}>{t.hotelName}</Text>
        <Text style={styles.selectModeText}>{t.selectMode}</Text>
      </View>

      {/* Mode Selection */}
      <View style={styles.modesContainer}>
        <ModeCard 
          icon="person"
          title={t.guestMode}
          description={t.guestDesc}
          onPress={() => router.push('/guest')}
          color="#10B981"
          highlight={t.guestHighlight}
        />
        
        <ModeCard 
          icon="analytics"
          title={t.managerMode}
          description={t.managerDesc}
          onPress={() => router.push('/manager')}
          color="#60A5FA"
          highlight={t.managerHighlight}
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Julianastraat 32, Noordwijk</Text>
        <Text style={styles.footerText}>• info@badhotelnoordwijk.com</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0B' },
  header: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 12 },
  langToggle: { flexDirection: 'row', backgroundColor: '#1F1F23', borderRadius: 8, overflow: 'hidden' },
  langBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  langBtnActive: { backgroundColor: '#10B981' },
  langBtnText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  langBtnTextActive: { color: '#FFFFFF' },
  hero: { alignItems: 'center', paddingVertical: 40 },
  welcomeText: { fontSize: 16, color: '#6B7280', marginTop: 24 },
  hotelName: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginTop: 4 },
  selectModeText: { fontSize: 14, color: '#9CA3AF', marginTop: 16 },
  modesContainer: { flex: 1, paddingHorizontal: 20, gap: 16 },
  modeCard: { backgroundColor: '#111113', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#1F1F23', position: 'relative' },
  modeIconContainer: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modeTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  modeDescription: { fontSize: 14, color: '#9CA3AF', lineHeight: 20, marginBottom: 12 },
  highlightBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, alignSelf: 'flex-start' },
  highlightText: { fontSize: 12, fontWeight: '600' },
  modeArrow: { position: 'absolute', right: 20, bottom: 20, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 20, gap: 8 },
  footerText: { fontSize: 12, color: '#6B7280' },
});
