import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { HOTEL_CONFIG } from '../../utils/constants';
import { useLanguage } from '../../utils/LanguageContext';

// Info Card Component
const InfoCard = ({ icon, title, items, color = '#10B981' }: { icon: string; title: string; items: { icon?: string; text: string; subtext?: string; action?: () => void }[]; color?: string }) => (
  <View style={styles.infoCard}>
    <View style={styles.infoCardHeader}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={styles.infoCardTitle}>{title}</Text>
    </View>
    <View style={styles.infoCardContent}>
      {items.map((item, index) => (
        <TouchableOpacity 
          key={index} 
          style={styles.infoItem} 
          onPress={item.action}
          activeOpacity={item.action ? 0.7 : 1}
        >
          {item.icon && <Ionicons name={item.icon as any} size={16} color="#9CA3AF" style={styles.infoItemIcon} />}
          <View style={styles.infoItemTextContainer}>
            <Text style={[styles.infoItemText, item.action && styles.infoItemTextAction]}>{item.text}</Text>
            {item.subtext && <Text style={styles.infoItemSubtext}>{item.subtext}</Text>}
          </View>
          {item.action && <Ionicons name="chevron-forward" size={16} color="#6B7280" />}
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

// Contact Button
const ContactButton = ({ icon, label, onPress, color }: { icon: string; label: string; onPress: () => void; color: string }) => (
  <TouchableOpacity style={[styles.contactBtn, { borderColor: color }]} onPress={onPress} activeOpacity={0.7}>
    <Ionicons name={icon as any} size={24} color={color} />
    <Text style={[styles.contactBtnText, { color }]}>{label}</Text>
  </TouchableOpacity>
);

type TranslationKey = 'en' | 'nl' | 'de';

export default function YourStay() {
  const router = useRouter();
  const { language } = useLanguage();

  const translations: Record<TranslationKey, any> = {
    en: {
      title: 'Your Stay',
      essentials: 'Essentials',
      wifi: 'WiFi',
      wifiNetwork: 'Network: KPN (Free)',
      wifiInstructions: 'Connect to KPN, authorize on the web page',
      tv: 'TV (Streaming Only)',
      tvPassword: `Password: ${HOTEL_CONFIG.tv_password}`,
      tvInfo: 'YouTube, Netflix, etc. No cable channels.',
      checkInOut: 'Check-in / Check-out',
      checkIn: `Check-in: from ${HOTEL_CONFIG.check_in}`,
      checkOut: `Check-out: until ${HOTEL_CONFIG.check_out}`,
      freeAmenities: 'Free coffee & tea all day',
      coffeeDesc: 'Coffee machine with fresh beans',
      gym: 'Gym access (treadmill, bike, ping-pong)',
      facilities: 'Facilities',
      laundry: 'Laundry service',
      laundryDesc: 'Available by appointment – contact reception',
      kitchen: 'Shared kitchen',
      kitchenDesc: 'Fully equipped: oven, microwave, fridge',
      games: 'Books & board games area',
      terrace: 'Outdoor terrace & garden',
      terraceTime: `Open until ${HOTEL_CONFIG.terrace_close}`,
      bikeParking: 'Bike parking (covered & secure)',
      carParking: 'Private parking',
      carParkingDesc: `€${HOTEL_CONFIG.parking_price}/day, subject to availability`,
      vending: 'Vending machines (snacks & drinks)',
      houseRules: 'House Rules',
      smoking: 'No smoking inside the hotel',
      noise: 'Quiet hours: 22:00 - 08:00',
      visitors: 'Visitors must register at reception',
      pets: 'Pets not allowed',
      contact: 'Quick Contact',
      call: 'Call',
      whatsapp: 'WhatsApp',
      emergency: 'Emergency',
      emergencyInfo: 'For emergencies, call 112 (European emergency number) or contact reception.',
    },
    nl: {
      title: 'Uw Verblijf',
      essentials: 'Essentials',
      wifi: 'WiFi',
      wifiNetwork: 'Netwerk: KPN (Gratis)',
      wifiInstructions: 'Verbind met KPN, autoriseer op de webpagina',
      tv: 'TV (Alleen Streaming)',
      tvPassword: `Wachtwoord: ${HOTEL_CONFIG.tv_password}`,
      tvInfo: 'YouTube, Netflix, etc. Geen kabelkanalen.',
      checkInOut: 'Check-in / Check-out',
      checkIn: `Check-in: vanaf ${HOTEL_CONFIG.check_in}`,
      checkOut: `Check-out: tot ${HOTEL_CONFIG.check_out}`,
      freeAmenities: 'Gratis koffie & thee de hele dag',
      coffeeDesc: 'Koffiemachine met verse bonen',
      gym: 'Fitnessruimte (loopband, fiets, pingpong)',
      facilities: 'Faciliteiten',
      laundry: 'Wasservice',
      laundryDesc: 'Op afspraak – neem contact op met de receptie',
      kitchen: 'Gedeelde keuken',
      kitchenDesc: 'Volledig uitgerust: oven, magnetron, koelkast',
      games: 'Boeken & bordspellen',
      terrace: 'Buitenterras & tuin',
      terraceTime: `Open tot ${HOTEL_CONFIG.terrace_close}`,
      bikeParking: 'Fietsparkeren (overdekt & beveiligd)',
      carParking: 'Privé parkeren',
      carParkingDesc: `€${HOTEL_CONFIG.parking_price}/dag, onder voorbehoud`,
      vending: 'Automaten (snacks & drankjes)',
      houseRules: 'Huisregels',
      smoking: 'Niet roken in het hotel',
      noise: 'Stille uren: 22:00 - 08:00',
      visitors: 'Bezoekers moeten zich melden bij de receptie',
      pets: 'Huisdieren niet toegestaan',
      contact: 'Snel Contact',
      call: 'Bel',
      whatsapp: 'WhatsApp',
      emergency: 'Noodgeval',
      emergencyInfo: 'Voor noodgevallen, bel 112 of neem contact op met de receptie.',
    },
    de: {
      title: 'Ihr Aufenthalt',
      essentials: 'Essentials',
      wifi: 'WLAN',
      wifiNetwork: 'Netzwerk: KPN (Kostenlos)',
      wifiInstructions: 'Mit KPN verbinden, auf der Webseite autorisieren',
      tv: 'TV (Nur Streaming)',
      tvPassword: `Passwort: ${HOTEL_CONFIG.tv_password}`,
      tvInfo: 'YouTube, Netflix, usw. Keine Kabelkanäle.',
      checkInOut: 'Check-in / Check-out',
      checkIn: `Check-in: ab ${HOTEL_CONFIG.check_in}`,
      checkOut: `Check-out: bis ${HOTEL_CONFIG.check_out}`,
      freeAmenities: 'Gratis Kaffee & Tee den ganzen Tag',
      coffeeDesc: 'Kaffeemaschine mit frischen Bohnen',
      gym: 'Fitnessbereich (Laufband, Fahrrad, Tischtennis)',
      facilities: 'Einrichtungen',
      laundry: 'Wäscheservice',
      laundryDesc: 'Nach Vereinbarung – Rezeption kontaktieren',
      kitchen: 'Gemeinschaftsküche',
      kitchenDesc: 'Voll ausgestattet: Ofen, Mikrowelle, Kühlschrank',
      games: 'Bücher & Brettspiele',
      terrace: 'Außenterrasse & Garten',
      terraceTime: `Geöffnet bis ${HOTEL_CONFIG.terrace_close}`,
      bikeParking: 'Fahrradparkplatz (überdacht & sicher)',
      carParking: 'Privatparkplatz',
      carParkingDesc: `€${HOTEL_CONFIG.parking_price}/Tag, nach Verfügbarkeit`,
      vending: 'Automaten (Snacks & Getränke)',
      houseRules: 'Hausregeln',
      smoking: 'Rauchen im Hotel nicht gestattet',
      noise: 'Ruhezeiten: 22:00 - 08:00',
      visitors: 'Besucher müssen sich an der Rezeption melden',
      pets: 'Haustiere nicht erlaubt',
      contact: 'Schnellkontakt',
      call: 'Anrufen',
      whatsapp: 'WhatsApp',
      emergency: 'Notfall',
      emergencyInfo: 'Bei Notfällen rufen Sie 112 (europäische Notrufnummer) an oder kontaktieren Sie die Rezeption.',
    }
  };

  const t = translations[language as TranslationKey] || translations.en;

  const callReception = () => {
    Linking.openURL(`tel:${HOTEL_CONFIG.phone.replace(/\s/g, '')}`);
  };

  const openWhatsApp = () => {
    Linking.openURL(`https://wa.me/${HOTEL_CONFIG.whatsapp.replace(/[^0-9]/g, '')}`);
  };

  const callEmergency = () => {
    Alert.alert(
      t.emergency,
      t.emergencyInfo,
      [
        { text: '112', onPress: () => Linking.openURL('tel:112') },
        { text: t.call, onPress: callReception },
        { text: 'OK', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Essentials */}
        <InfoCard 
          icon="key" 
          title={t.essentials} 
          color="#10B981"
          items={[
            { icon: 'wifi', text: t.wifiNetwork, subtext: t.wifiInstructions },
            { icon: 'time', text: t.checkIn },
            { icon: 'time-outline', text: t.checkOut },
            { icon: 'cafe', text: t.freeAmenities, subtext: t.coffeeDesc },
            { icon: 'fitness', text: t.gym },
          ]}
        />

        {/* Facilities */}
        <InfoCard 
          icon="business" 
          title={t.facilities} 
          color="#60A5FA"
          items={[
            { icon: 'shirt', text: t.laundry, subtext: t.laundryDesc },
            { icon: 'restaurant', text: t.kitchen, subtext: t.kitchenDesc },
            { icon: 'book', text: t.games },
            { icon: 'leaf', text: t.terrace, subtext: t.terraceTime },
            { icon: 'bicycle', text: t.bikeParking },
            { icon: 'car', text: t.carParking, subtext: t.carParkingDesc },
            { icon: 'cube', text: t.vending },
          ]}
        />

        {/* House Rules */}
        <InfoCard 
          icon="document-text" 
          title={t.houseRules} 
          color="#F59E0B"
          items={[
            { icon: 'close-circle', text: t.smoking },
            { icon: 'volume-mute', text: t.noise },
            { icon: 'people', text: t.visitors },
            { icon: 'paw', text: t.pets },
          ]}
        />

        {/* Quick Contact */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>{t.contact}</Text>
          <View style={styles.contactButtons}>
            <ContactButton icon="call" label={t.call} onPress={callReception} color="#10B981" />
            <ContactButton icon="logo-whatsapp" label={t.whatsapp} onPress={openWhatsApp} color="#25D366" />
            <ContactButton icon="warning" label={t.emergency} onPress={callEmergency} color="#EF4444" />
          </View>
          <Text style={styles.phoneNumber}>{HOTEL_CONFIG.phone}</Text>
        </View>

        <View style={styles.footerSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0B' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111113', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1F1F23' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  infoCard: { backgroundColor: '#111113', borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#1F1F23', overflow: 'hidden' },
  infoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderBottomWidth: 1, borderBottomColor: '#1F1F23' },
  infoCardTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  infoCardContent: { padding: 16, gap: 14 },
  infoItem: { flexDirection: 'row', alignItems: 'flex-start' },
  infoItemIcon: { marginRight: 12, width: 20, marginTop: 2 },
  infoItemTextContainer: { flex: 1 },
  infoItemText: { fontSize: 14, color: '#D1D5DB', lineHeight: 20 },
  infoItemSubtext: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  infoItemTextAction: { color: '#10B981' },
  contactSection: { marginTop: 8 },
  contactTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 16 },
  contactButtons: { flexDirection: 'row', gap: 12 },
  contactBtn: { flex: 1, flexDirection: 'column', alignItems: 'center', backgroundColor: '#111113', borderRadius: 12, padding: 16, borderWidth: 2, gap: 8 },
  contactBtnText: { fontSize: 12, fontWeight: '600' },
  phoneNumber: { textAlign: 'center', color: '#6B7280', fontSize: 12, marginTop: 12 },
  footerSpacer: { height: 40 },
});
