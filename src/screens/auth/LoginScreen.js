// src/screens/auth/LoginScreen.js

import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuthStore } from '../../store/authStore';

const DEMO_ACCOUNTS = [
  {
    label: 'Student',
    email: 'student@nust.na',
    icon: 'school-outline',
    color: '#1E56A0',
  },
  {
    label: 'Supervisor',
    email: 'supervisor@nust.na',
    icon: 'person-outline',
    color: '#163172',
  },
  {
    label: 'HOD',
    email: 'hod@nust.na',
    icon: 'business-outline',
    color: '#0D3B66',
  },
  {
    label: 'Internal Evaluator',
    email: 'internal@nust.na',
    icon: 'clipboard-outline',
    color: '#1B4332',
  },
  {
    label: 'External Evaluator',
    email: 'external@nust.na',
    icon: 'document-text-outline',
    color: '#2C3E50',
  },
  {
    label: 'FPGC-R',
    email: 'fpgcr@nust.na',
    icon: 'people-outline',
    color: '#4A1942',
  },
  {
    label: 'FPGC',
    email: 'fpgc@nust.na',
    icon: 'shield-checkmark-outline',
    color: '#7C2D12',
  },
  {
    label: 'Admin',
    email: 'admin@nust.na',
    icon: 'settings-outline',
    color: '#1A1A2E',
  },
];

const DEFAULT_TEST_PASSWORD = 'Password123!';

function isValidEmail(value) {
  return /\S+@\S+\.\S+/.test(String(value || '').trim());
}

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [securePassword, setSecurePassword] = useState(true);
  const [showDemoAccounts, setShowDemoAccounts] = useState(true);

  const selectedDemoAccount = useMemo(
    () =>
      DEMO_ACCOUNTS.find(
        (account) =>
          account.email.toLowerCase() === email.trim().toLowerCase()
      ),
    [email]
  );

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  const fillDemoAccount = (account) => {
    setEmail(account.email);
    setPassword(DEFAULT_TEST_PASSWORD);
    Keyboard.dismiss();
  };

  const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      Alert.alert('Missing Details', 'Please enter your email and password.');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    Keyboard.dismiss();

    await login({
      email: cleanEmail,
      password,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandBlock}>
          <View style={styles.logoCircle}>
            <Ionicons name="school-outline" size={34} color="#FFFFFF" />
          </View>

          <Text style={styles.brandTitle}>NUST PGMS</Text>
          <Text style={styles.brandSubtitle}>
            Postgraduate Management System
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.kicker}>Secure Access</Text>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>
            Use your postgraduate system account to continue.
          </Text>

          <Text style={styles.label}>Email address</Text>
          <View
            style={[
              styles.inputWrap,
              selectedDemoAccount && {
                borderColor: selectedDemoAccount.color,
              },
            ]}
          >
            <Ionicons
              name="mail-outline"
              size={18}
              color={selectedDemoAccount?.color || '#6B7280'}
            />

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="student@nust.na"
              placeholderTextColor="#9BA4B5"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="username"
              autoComplete="email"
              style={styles.input}
              editable={!loading}
              returnKeyType="next"
            />
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color="#6B7280" />

            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#9BA4B5"
              secureTextEntry={securePassword}
              textContentType="password"
              autoComplete="password"
              style={styles.input}
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            <TouchableOpacity
              onPress={() => setSecurePassword((value) => !value)}
              disabled={loading}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={securePassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>

          {selectedDemoAccount ? (
            <View
              style={[
                styles.selectedRolePill,
                {
                  backgroundColor: `${selectedDemoAccount.color}14`,
                  borderColor: `${selectedDemoAccount.color}40`,
                },
              ]}
            >
              <Ionicons
                name={selectedDemoAccount.icon}
                size={16}
                color={selectedDemoAccount.color}
              />
              <Text
                style={[
                  styles.selectedRoleText,
                  {
                    color: selectedDemoAccount.color,
                  },
                ]}
              >
                Signing in as {selectedDemoAccount.label}
              </Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color="#C62828" />
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            style={[
              styles.button,
              (!canSubmit || loading) && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={!canSubmit || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.buttonText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>Test accounts</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity
            style={styles.toggleDemoBtn}
            onPress={() => setShowDemoAccounts((value) => !value)}
            disabled={loading}
          >
            <Text style={styles.toggleDemoText}>
              {showDemoAccounts ? 'Hide test accounts' : 'Show test accounts'}
            </Text>
            <Ionicons
              name={showDemoAccounts ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#1E56A0"
            />
          </TouchableOpacity>

          {showDemoAccounts ? (
            <View style={styles.demoGrid}>
              {DEMO_ACCOUNTS.map((account) => {
                const active =
                  account.email.toLowerCase() === email.trim().toLowerCase();

                return (
                  <TouchableOpacity
                    key={account.email}
                    style={[
                      styles.demoAccount,
                      active && {
                        borderColor: account.color,
                        backgroundColor: `${account.color}10`,
                      },
                    ]}
                    onPress={() => fillDemoAccount(account)}
                    disabled={loading}
                  >
                    <View
                      style={[
                        styles.demoIcon,
                        {
                          backgroundColor: account.color,
                        },
                      ]}
                    >
                      <Ionicons name={account.icon} size={16} color="#FFFFFF" />
                    </View>

                    <View style={styles.demoTextBlock}>
                      <Text style={styles.demoLabel} numberOfLines={1}>
                        {account.label}
                      </Text>
                      <Text style={styles.demoEmail} numberOfLines={1}>
                        {account.email}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          <Text style={styles.helper}>
            Password for all seeded test users: {DEFAULT_TEST_PASSWORD}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0A1931',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 22,
    paddingVertical: 36,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 22,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1E56A0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
  },
  brandSubtitle: {
    color: '#9BA4B5',
    fontSize: 14,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: {
      width: 0,
      height: 16,
    },
    shadowRadius: 26,
    elevation: 10,
  },
  kicker: {
    color: '#1E56A0',
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  title: {
    color: '#07122A',
    fontSize: 32,
    fontWeight: '900',
  },
  subtitle: {
    color: '#5D6678',
    marginTop: 8,
    marginBottom: 22,
    lineHeight: 20,
  },
  label: {
    color: '#1D2A3D',
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 12,
  },
  inputWrap: {
    borderWidth: 1,
    borderColor: '#D8E0EE',
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#FAFCFF',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    gap: 10,
  },
  input: {
    flex: 1,
    color: '#07122A',
    fontSize: 15,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },
  selectedRolePill: {
    marginTop: 12,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  selectedRoleText: {
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  errorBox: {
    marginTop: 14,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  error: {
    color: '#C62828',
    fontWeight: '700',
    flex: 1,
    lineHeight: 18,
  },
  button: {
    marginTop: 20,
    backgroundColor: '#1E56A0',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  dividerRow: {
    marginTop: 22,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  toggleDemoBtn: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  toggleDemoText: {
    color: '#1E56A0',
    fontWeight: '800',
    fontSize: 13,
  },
  demoGrid: {
    gap: 8,
  },
  demoAccount: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  demoIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoTextBlock: {
    flex: 1,
  },
  demoLabel: {
    color: '#07122A',
    fontWeight: '800',
    fontSize: 13,
  },
  demoEmail: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  helper: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 18,
  },
});
