import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { NEARBY_PLACES, HOTEL_CONFIG } from '../../utils/constants';
import { useLanguage } from '../../utils/LanguageContext';

type CategoryType = 'all' | 'breakfast' | 'restaurants' | 'supermarkets' | 'culture' | 'wellness';

// Place Card
const PlaceCard = ({ name, category, address }: { name: string; category: string; address: string }) => {
  const getCategoryIcon = (cat: string) => {
    const icons: Record<string, string> = {
      'breakfast': 'cafe',
      'bakery': 'nutrition',
      'supermarket': 'cart',
      'restaurant': 'restaurant',
      'beach_club': 'umbrella',
      'culture': 'library',
      'wellness': 'heart',
      'pharmacy': 'medical',
      'shop': 'bag',
    };
    return icons[cat] || 'location';
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      'breakfast': '#F59E0B',
      'bakery': '#F97316',
      'supermarket': '#10B981',
      'restaurant': '#EF4444',
      'beach_club': '#60A5FA',
      'culture': '#A78BFA',
      'wellness': '#F472B6',
      'pharmacy': '#10B981',
      'shop': '#6B7280',
    };
    return colors[cat] || '#6B7280';
  };

  const openInMaps = () => {
    // Use the full address for Google Maps search - more accurate
    const query = encodeURIComponent(`${name}, ${address}`);
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    Linking.openURL(googleMapsUrl);
  };

  const color = getCategoryColor(category);

  return (
    <TouchableOpacity style={styles.placeCard} onPress={openInMaps} activeOpacity={0.7}>
      <View style={[styles.placeIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={getCategoryIcon(category) as any} size={24} color={color} />
      </View>
      <View style={styles.placeInfo}>
        <Text style={styles.placeName}>{name}</Text>
        <Text style={styles.placeAddress} numberOfLines={1}>{address}</Text>
      </View>
      <View style={styles.placeAction}>
        <Ionicons name="navigate" size={20} color="#10B981" />
      </View>
    </TouchableOpacity>
  );
};

// Category Filter - Simplified
const CategoryFilter = ({ active, onSelect, language }: { active: CategoryType; onSelect: (cat: CategoryType) => void; language: string }) => {
  const categories: { id: CategoryType; label: { en: string; nl: string } }[] = [
    { id: 'all', label: { en: 'All', nl: 'Alles' } },
    { id: 'breakfast', label: { en: 'Eat', nl: 'Eten' } },
    { id: 'restaurants', label: { en: 'Dine', nl: 'Diner' } },
    { id: 'supermarkets', label: { en: 'Shop', nl: 'Winkel' } },
    { id: 'culture', label: { en: 'Culture', nl: 'Cultuur' } },
  ];

  return (
    <View style={styles.filterRow}>
      {categories.map((cat) => (
        <TouchableOpacity
          key={cat.id}
          style={[styles.filterBtn, active === cat.id && styles.filterBtnActive]}
          onPress={() => onSelect(cat.id)}
        >
          <Text style={[styles.filterText, active === cat.id && styles.filterTextActive]}>
            {cat.label[language as 'en' | 'nl'] || cat.label.en}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default function AroundYou() {
  const [activeCategory, setActiveCategory] = useState<CategoryType>('all');
  const router = useRouter();
  const { language } = useLanguage();

  const t = language === 'en' ? {
    title: 'Around You',
    subtitle: 'Discover nearby places',
    beach: 'Beach is 5-7 min walk',
  } : {
    title: 'Om U Heen',
    subtitle: 'Ontdek plekken in de buurt',
    beach: 'Strand is 5-7 min lopen',
  };

  // Filter places based on category
  const getFilteredPlaces = () => {
    const allPlaces = [
      ...NEARBY_PLACES.breakfast,
      ...NEARBY_PLACES.bakeries,
      ...NEARBY_PLACES.supermarkets,
      ...NEARBY_PLACES.restaurants,
      ...NEARBY_PLACES.culture,
      ...NEARBY_PLACES.wellness,
    ];

    if (activeCategory === 'all') return allPlaces;

    const categoryMap: Record<CategoryType, string[]> = {
      'all': [],
      'breakfast': ['breakfast', 'bakery'],
      'restaurants': ['restaurant', 'beach_club'],
      'supermarkets': ['supermarket', 'shop'],
      'culture': ['culture'],
      'wellness': ['wellness', 'pharmacy'],
    };

    return allPlaces.filter(p => categoryMap[activeCategory]?.includes(p.category));
  };

  const filteredPlaces = getFilteredPlaces();

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

      {/* Beach Banner */}
      <View style={styles.beachBanner}>
        <Ionicons name="umbrella" size={20} color="#60A5FA" />
        <Text style={styles.beachText}>{t.beach}</Text>
        <Ionicons name="walk" size={20} color="#60A5FA" />
      </View>

      {/* Category Filter */}
      <CategoryFilter active={activeCategory} onSelect={setActiveCategory} language={language} />

      {/* Places List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filteredPlaces.map((place, index) => (
          <PlaceCard key={index} {...place} />
        ))}
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
  beachBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1F1F23', paddingVertical: 12, gap: 10 },
  beachText: { fontSize: 14, color: '#60A5FA', fontWeight: '500' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#111113', borderBottomWidth: 1, borderBottomColor: '#1F1F23' },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#1F1F23', marginHorizontal: 4 },
  filterBtnActive: { backgroundColor: '#10B981' },
  filterText: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },
  filterTextActive: { color: '#FFFFFF' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  placeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111113', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1F1F23' },
  placeIconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  placeInfo: { flex: 1, marginLeft: 14 },
  placeName: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  placeAddress: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  placeAction: { padding: 8 },
  footerSpacer: { height: 40 },
});
