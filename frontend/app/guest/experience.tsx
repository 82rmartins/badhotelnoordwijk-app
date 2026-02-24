import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../utils/LanguageContext';

// Experience Card
const ExperienceCard = ({ icon, title, description, color = '#10B981' }: { icon: string; title: string; description: string; color?: string }) => (
  <View style={styles.experienceCard}>
    <View style={[styles.experienceIconContainer, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon as any} size={28} color={color} />
    </View>
    <View style={styles.experienceContent}>
      <Text style={styles.experienceTitle}>{title}</Text>
      <Text style={styles.experienceDescription}>{description}</Text>
    </View>
  </View>
);

// Seasonal Tip
const SeasonalTip = ({ season, tip, icon }: { season: string; tip: string; icon: string }) => (
  <View style={styles.seasonalCard}>
    <Ionicons name={icon as any} size={24} color="#F59E0B" />
    <View style={styles.seasonalContent}>
      <Text style={styles.seasonalTitle}>{season}</Text>
      <Text style={styles.seasonalTip}>{tip}</Text>
    </View>
  </View>
);

export default function HotelExperience() {
  const router = useRouter();
  const { language } = useLanguage();

  const t = language === 'en' ? {
    title: 'Hotel Experience',
    subtitle: 'Make the most of your stay',
    gym: 'Gym & Fitness Area',
    gymDesc: 'Stay active with our treadmill, exercise bike, and more',
    pingpong: 'Ping-pong & Games',
    pingpongDesc: 'Challenge friends or fellow guests to a match',
    books: 'Books & Relax Area',
    booksDesc: 'Enjoy our reading corner with a hot coffee',
    terrace: 'Outdoor Terrace',
    terraceDesc: 'Relax in our sunny garden terrace (open until 22:00)',
    beach: 'Beach Access',
    beachDesc: 'Just 5-7 minutes walk to the beautiful Noordwijk beach',
    kitchen: 'Shared Kitchen',
    kitchenDesc: 'Fully equipped kitchen for preparing your own meals',
    seasonal: 'Seasonal Suggestions',
    summer: 'Summer',
    summerTip: 'Beach walks, cycling, sunset viewing at beach clubs',
    winter: 'Winter',
    winterTip: 'Cozy cafés, museum visits, warm up with our free coffee',
  } : {
    title: 'Hotel Ervaring',
    subtitle: 'Haal het meeste uit uw verblijf',
    gym: 'Fitness & Sportruimte',
    gymDesc: 'Blijf actief met onze loopband, hometrainer en meer',
    pingpong: 'Pingpong & Spelletjes',
    pingpongDesc: 'Daag vrienden of medegasten uit voor een potje',
    books: 'Boeken & Relaxruimte',
    booksDesc: 'Geniet van onze leeshoek met een warme koffie',
    terrace: 'Buitenterras',
    terraceDesc: 'Ontspan op ons zonnige tuinterras (open tot 22:00)',
    beach: 'Strandtoegang',
    beachDesc: 'Slechts 5-7 minuten lopen naar het prachtige strand',
    kitchen: 'Gedeelde Keuken',
    kitchenDesc: 'Volledig uitgeruste keuken voor eigen maaltijden',
    seasonal: 'Seizoenssuggesties',
    summer: 'Zomer',
    summerTip: 'Strandwandelingen, fietsen, zonsondergang bij strandtenten',
    winter: 'Winter',
    winterTip: 'Gezellige cafés, museumbezoeken, opwarmen met gratis koffie',
  };

  const experiences = [
    { icon: 'fitness', title: t.gym, description: t.gymDesc, color: '#10B981' },
    { icon: 'tennisball', title: t.pingpong, description: t.pingpongDesc, color: '#F59E0B' },
    { icon: 'book', title: t.books, description: t.booksDesc, color: '#A78BFA' },
    { icon: 'leaf', title: t.terrace, description: t.terraceDesc, color: '#10B981' },
    { icon: 'umbrella', title: t.beach, description: t.beachDesc, color: '#60A5FA' },
    { icon: 'restaurant', title: t.kitchen, description: t.kitchenDesc, color: '#F472B6' },
  ];

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
        
        {/* Experience Cards */}
        {experiences.map((exp, index) => (
          <ExperienceCard key={index} {...exp} />
        ))}

        {/* Seasonal Suggestions */}
        <View style={styles.seasonalSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={20} color="#F59E0B" />
            <Text style={styles.sectionTitle}>{t.seasonal}</Text>
          </View>
          <SeasonalTip season={t.summer} tip={t.summerTip} icon="sunny" />
          <SeasonalTip season={t.winter} tip={t.winterTip} icon="snow" />
        </View>

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
  experienceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111113', borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#1F1F23' },
  experienceIconContainer: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  experienceContent: { flex: 1, marginLeft: 16 },
  experienceTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  experienceDescription: { fontSize: 13, color: '#9CA3AF', lineHeight: 18 },
  seasonalSection: { marginTop: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  seasonalCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#111113', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1F1F23', gap: 14 },
  seasonalContent: { flex: 1 },
  seasonalTitle: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  seasonalTip: { fontSize: 13, color: '#9CA3AF', lineHeight: 18 },
  footerSpacer: { height: 40 },
});
