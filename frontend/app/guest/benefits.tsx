import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../utils/LanguageContext';

// Benefit Card
const BenefitCard = ({ icon, title, description, highlight, color = '#10B981' }: { icon: string; title: string; description: string; highlight?: string; color?: string }) => (
  <View style={styles.benefitCard}>
    <View style={[styles.benefitIconContainer, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon as any} size={32} color={color} />
    </View>
    <Text style={styles.benefitTitle}>{title}</Text>
    <Text style={styles.benefitDescription}>{description}</Text>
    {highlight && (
      <View style={[styles.highlightBadge, { backgroundColor: color + '20' }]}>
        <Text style={[styles.highlightText, { color }]}>{highlight}</Text>
      </View>
    )}
  </View>
);

// Rule Item
const RuleItem = ({ text }: { text: string }) => (
  <View style={styles.ruleItem}>
    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
    <Text style={styles.ruleText}>{text}</Text>
  </View>
);

export default function Benefits() {
  const router = useRouter();
  const { language } = useLanguage();

  const t = language === 'en' ? {
    title: 'Guest Benefits',
    subtitle: 'Exclusive perks for your stay',
    discount: '10% Discount',
    discountDesc: 'On your next direct booking',
    discountHighlight: 'Use at checkout',
    lateCheckout: 'Late Check-out',
    lateCheckoutDesc: 'Extended departure time',
    lateCheckoutHighlight: 'Subject to availability',
    freeCoffee: 'Free Coffee & Tea',
    freeCoffeeDesc: 'Fresh beans, all day long',
    freeCoffeeHighlight: 'In common area',
    rules: 'How to use',
    rule1: 'Valid during your stay',
    rule2: 'Show this screen at reception if needed',
    rule3: 'Direct booking discount applied automatically',
    rule4: 'Late check-out: ask reception in advance',
    followUs: 'Follow us for more benefits!',
    instagram: '@badhotelnoordwijk',
  } : {
    title: 'Gastvoordelen',
    subtitle: 'Exclusieve voordelen voor uw verblijf',
    discount: '10% Korting',
    discountDesc: 'Op uw volgende directe boeking',
    discountHighlight: 'Gebruik bij afrekenen',
    lateCheckout: 'Late Check-out',
    lateCheckoutDesc: 'Verlengde vertrektijd',
    lateCheckoutHighlight: 'Onder voorbehoud',
    freeCoffee: 'Gratis Koffie & Thee',
    freeCoffeeDesc: 'Verse bonen, de hele dag',
    freeCoffeeHighlight: 'In gemeenschappelijke ruimte',
    rules: 'Hoe te gebruiken',
    rule1: 'Geldig tijdens uw verblijf',
    rule2: 'Toon dit scherm bij de receptie indien nodig',
    rule3: 'Korting voor directe boeking automatisch toegepast',
    rule4: 'Late check-out: vraag vooraf aan de receptie',
    followUs: 'Volg ons voor meer voordelen!',
    instagram: '@badhotelnoordwijk',
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
        
        {/* Benefits Cards */}
        <View style={styles.benefitsGrid}>
          <BenefitCard 
            icon="pricetag" 
            title={t.discount} 
            description={t.discountDesc} 
            highlight={t.discountHighlight}
            color="#10B981" 
          />
          <BenefitCard 
            icon="time" 
            title={t.lateCheckout} 
            description={t.lateCheckoutDesc} 
            highlight={t.lateCheckoutHighlight}
            color="#60A5FA" 
          />
          <BenefitCard 
            icon="cafe" 
            title={t.freeCoffee} 
            description={t.freeCoffeeDesc} 
            highlight={t.freeCoffeeHighlight}
            color="#F59E0B" 
          />
        </View>

        {/* Rules */}
        <View style={styles.rulesSection}>
          <Text style={styles.rulesTitle}>{t.rules}</Text>
          <View style={styles.rulesList}>
            <RuleItem text={t.rule1} />
            <RuleItem text={t.rule2} />
            <RuleItem text={t.rule3} />
            <RuleItem text={t.rule4} />
          </View>
        </View>

        {/* Follow Us */}
        <View style={styles.followSection}>
          <Text style={styles.followTitle}>{t.followUs}</Text>
          <View style={styles.socialLinks}>
            <TouchableOpacity style={styles.socialButton}>
              <Ionicons name="logo-instagram" size={24} color="#E1306C" />
              <Text style={styles.socialHandle}>{t.instagram}</Text>
            </TouchableOpacity>
          </View>
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
  benefitsGrid: { gap: 12 },
  benefitCard: { backgroundColor: '#111113', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#1F1F23' },
  benefitIconContainer: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  benefitTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  benefitDescription: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginBottom: 12 },
  highlightBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  highlightText: { fontSize: 12, fontWeight: '600' },
  rulesSection: { marginTop: 24, backgroundColor: '#111113', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#1F1F23' },
  rulesTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 16 },
  rulesList: { gap: 12 },
  ruleItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ruleText: { fontSize: 14, color: '#D1D5DB', flex: 1 },
  followSection: { marginTop: 24, alignItems: 'center' },
  followTitle: { fontSize: 14, color: '#6B7280', marginBottom: 12 },
  socialLinks: { flexDirection: 'row', gap: 16 },
  socialButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111113', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, gap: 10, borderWidth: 1, borderColor: '#1F1F23' },
  socialHandle: { fontSize: 14, color: '#FFFFFF', fontWeight: '500' },
  footerSpacer: { height: 40 },
});
