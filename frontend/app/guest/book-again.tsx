import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { HOTEL_CONFIG } from '../../utils/constants';
import { useLanguage } from '../../utils/LanguageContext';

export default function BookAgain() {
  const router = useRouter();
  const { language } = useLanguage();

  const t = language === 'en' ? {
    title: 'Book Again',
    subtitle: 'We\'d love to welcome you back!',
    enjoyed: 'Enjoyed your stay at',
    hotelName: 'BAD Hotel Noordwijk?',
    message: 'Book again with a guest-only offer and enjoy all the amenities you loved.',
    bookNow: 'Book on Official Website',
    discountApplied: '10% guest discount available',
    suggestions: 'Suggested Future Dates',
    summer: 'Summer Season',
    summerDates: 'June - August 2026',
    summerDesc: 'Perfect beach weather & outdoor activities',
    tulip: 'Tulip Season',
    tulipDates: 'April - May 2026',
    tulipDesc: 'Keukenhof & beautiful flower fields nearby',
    winter: 'Winter Deal',
    winterDates: 'November - March',
    winterDesc: 'Cozy atmosphere & special rates',
    contact: 'Questions? Contact us',
  } : {
    title: 'Opnieuw Boeken',
    subtitle: 'We verwelkomen u graag weer!',
    enjoyed: 'Genoten van uw verblijf bij',
    hotelName: 'BAD Hotel Noordwijk?',
    message: 'Boek opnieuw met een exclusief gastenaanbod en geniet van alle voorzieningen.',
    bookNow: 'Boek op Officiële Website',
    discountApplied: '10% gastkorting beschikbaar',
    suggestions: 'Voorgestelde Data',
    summer: 'Zomerseizoen',
    summerDates: 'Juni - Augustus 2026',
    summerDesc: 'Perfect strandweer & buitenactiviteiten',
    tulip: 'Tulpenseizoen',
    tulipDates: 'April - Mei 2026',
    tulipDesc: 'Keukenhof & prachtige bollenvelden',
    winter: 'Winterdeal',
    winterDates: 'November - Maart',
    winterDesc: 'Gezellige sfeer & speciale tarieven',
    contact: 'Vragen? Neem contact op',
  };

  const openBooking = () => {
    Linking.openURL(HOTEL_CONFIG.booking_url);
  };

  const openEmail = () => {
    Linking.openURL(`mailto:${HOTEL_CONFIG.email}?subject=Booking%20Inquiry`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{t.title}</Text>
          <Text style={styles.headerSubtitle}>{t.subtitle}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Main CTA */}
        <View style={styles.ctaCard}>
          <View style={styles.ctaIcon}>
            <Ionicons name="heart" size={48} color="#F472B6" />
          </View>
          <Text style={styles.ctaTitle}>{t.enjoyed}</Text>
          <Text style={styles.ctaHotel}>{t.hotelName}</Text>
          <Text style={styles.ctaMessage}>{t.message}</Text>
          
          <TouchableOpacity style={styles.bookButton} onPress={openBooking} activeOpacity={0.8}>
            <Ionicons name="calendar" size={24} color="#FFFFFF" />
            <Text style={styles.bookButtonText}>{t.bookNow}</Text>
          </TouchableOpacity>
          
          <View style={styles.discountBadge}>
            <Ionicons name="pricetag" size={16} color="#10B981" />
            <Text style={styles.discountText}>{t.discountApplied}</Text>
          </View>
        </View>

        {/* Suggested Dates */}
        <View style={styles.suggestionsSection}>
          <Text style={styles.suggestionsTitle}>{t.suggestions}</Text>
          
          <TouchableOpacity style={styles.suggestionCard} onPress={openBooking}>
            <View style={[styles.suggestionIcon, { backgroundColor: '#F59E0B20' }]}>
              <Ionicons name="sunny" size={24} color="#F59E0B" />
            </View>
            <View style={styles.suggestionContent}>
              <Text style={styles.suggestionTitle}>{t.summer}</Text>
              <Text style={styles.suggestionDates}>{t.summerDates}</Text>
              <Text style={styles.suggestionDesc}>{t.summerDesc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.suggestionCard} onPress={openBooking}>
            <View style={[styles.suggestionIcon, { backgroundColor: '#F472B620' }]}>
              <Ionicons name="flower" size={24} color="#F472B6" />
            </View>
            <View style={styles.suggestionContent}>
              <Text style={styles.suggestionTitle}>{t.tulip}</Text>
              <Text style={styles.suggestionDates}>{t.tulipDates}</Text>
              <Text style={styles.suggestionDesc}>{t.tulipDesc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.suggestionCard} onPress={openBooking}>
            <View style={[styles.suggestionIcon, { backgroundColor: '#60A5FA20' }]}>
              <Ionicons name="snow" size={24} color="#60A5FA" />
            </View>
            <View style={styles.suggestionContent}>
              <Text style={styles.suggestionTitle}>{t.winter}</Text>
              <Text style={styles.suggestionDates}>{t.winterDates}</Text>
              <Text style={styles.suggestionDesc}>{t.winterDesc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Contact */}
        <TouchableOpacity style={styles.contactButton} onPress={openEmail}>
          <Ionicons name="mail" size={20} color="#60A5FA" />
          <Text style={styles.contactText}>{t.contact}</Text>
        </TouchableOpacity>

        <View style={styles.footerSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0B' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111113', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1F1F23' },
  backButton: { padding: 8, marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  ctaCard: { backgroundColor: '#111113', borderRadius: 20, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#1F1F23', marginBottom: 24 },
  ctaIcon: { marginBottom: 20 },
  ctaTitle: { fontSize: 16, color: '#9CA3AF', marginBottom: 4 },
  ctaHotel: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 16 },
  ctaMessage: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  bookButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B981', borderRadius: 14, paddingHorizontal: 32, paddingVertical: 16, gap: 12, width: '100%', justifyContent: 'center' },
  bookButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  discountBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 8 },
  discountText: { fontSize: 14, color: '#10B981', fontWeight: '500' },
  suggestionsSection: { marginBottom: 24 },
  suggestionsTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 16 },
  suggestionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111113', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1F1F23' },
  suggestionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  suggestionContent: { flex: 1, marginLeft: 14 },
  suggestionTitle: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  suggestionDates: { fontSize: 12, color: '#10B981', marginTop: 2 },
  suggestionDesc: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  contactButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 8 },
  contactText: { fontSize: 14, color: '#60A5FA' },
  footerSpacer: { height: 40 },
});
