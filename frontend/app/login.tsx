import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../utils/authContext';
import { useLanguage } from '../utils/LanguageContext';

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

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();
  const { language } = useLanguage();

  const t = language === 'en' ? {
    title: 'Manager Login',
    subtitle: 'Access the operations dashboard',
    email: 'Email',
    emailPlaceholder: 'your@email.com',
    password: 'Password',
    passwordPlaceholder: 'Enter password',
    login: 'Login',
    back: 'Back to Home',
    error: 'Login Failed',
    errorMessage: 'Email not authorized or invalid password. Please contact admin.',
    emptyFields: 'Please fill all fields',
  } : {
    title: 'Manager Login',
    subtitle: 'Toegang tot het operaties dashboard',
    email: 'E-mail',
    emailPlaceholder: 'uw@email.com',
    password: 'Wachtwoord',
    passwordPlaceholder: 'Voer wachtwoord in',
    login: 'Inloggen',
    back: 'Terug naar Home',
    error: 'Login Mislukt',
    errorMessage: 'E-mail niet geautoriseerd of ongeldig wachtwoord. Neem contact op met admin.',
    emptyFields: 'Vul alle velden in',
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t.error, t.emptyFields);
      return;
    }

    setIsLoading(true);
    const success = await login(email, password);
    setIsLoading(false);

    if (success) {
      router.replace('/manager');
    } else {
      Alert.alert(t.error, t.errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#9CA3AF" />
          <Text style={styles.backText}>{t.back}</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <HotelLogo size={70} />
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.subtitle}>{t.subtitle}</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.email}</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder={t.emailPlaceholder}
                placeholderTextColor="#4B5563"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.password}</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder={t.passwordPlaceholder}
                placeholderTextColor="#4B5563"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]} 
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="log-in" size={20} color="#FFFFFF" />
                <Text style={styles.loginButtonText}>{t.login}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={18} color="#60A5FA" />
          <Text style={styles.infoText}>
            {language === 'en' 
              ? 'Only authorized emails can access the Manager dashboard.'
              : 'Alleen geautoriseerde e-mails hebben toegang tot het Manager dashboard.'
            }
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0B' },
  content: { flex: 1, paddingHorizontal: 24 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16 },
  backText: { fontSize: 14, color: '#9CA3AF' },
  header: { alignItems: 'center', marginTop: 20, marginBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginTop: 20 },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 8 },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '500', color: '#D1D5DB' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111113', borderRadius: 12, borderWidth: 1, borderColor: '#1F1F23', paddingHorizontal: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#FFFFFF', paddingVertical: 16 },
  loginButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#60A5FA', borderRadius: 12, paddingVertical: 16, marginTop: 16, gap: 10 },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#1F1F23', borderRadius: 12, padding: 16, marginTop: 'auto', marginBottom: 20, gap: 12 },
  infoText: { flex: 1, fontSize: 13, color: '#9CA3AF', lineHeight: 20 },
});
