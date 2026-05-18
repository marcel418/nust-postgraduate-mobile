// src/screens/admin/SettingsScreen.js

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import AppHeader from '../../components/AppHeader';
import { useAuthStore } from '../../store/authStore';
import { formatLabel, getInitials } from './adminHelpers';

export default function SettingsScreen({ navigation }) {
  const logout = useAuthStore((state) => state.logout);
  const authUser = useAuthStore((state) => state.user);
  const roles = useAuthStore((state) => state.roles);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const primaryRole = Array.isArray(roles) && roles.length > 0 ? roles[0] : 'SYSTEM_ADMIN';

  const handleClearCache = () => {
    Alert.alert('Clear Local Cache', 'Clear locally cached admin preferences for this session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setNotificationsEnabled(true);
          setEmailAlertsEnabled(true);
          setMaintenanceMode(false);
          Alert.alert('Done', 'Local admin preferences have been reset.');
        },
      },
    ]);
  };

  const confirmMaintenanceChange = (nextValue) => {
    Alert.alert(
      nextValue ? 'Enable Maintenance Mode' : 'Disable Maintenance Mode',
      nextValue
        ? 'This updates the local mobile admin setting only. A production-wide maintenance toggle needs a backend settings endpoint.'
        : 'Maintenance mode will be disabled locally for this admin session.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => setMaintenanceMode(nextValue) },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            setSigningOut(true);
            await logout();
          } catch (error) {
            Alert.alert('Sign Out Failed', error?.message || 'Could not sign out. Please try again.');
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Settings" navigation={navigation} />

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(authUser?.name || 'System Admin')}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{authUser?.name || 'System Admin'}</Text>
            <Text style={styles.profileEmail}>{authUser?.email || 'admin@nust.na'}</Text>
            <Text style={styles.profileRole}>{formatLabel(primaryRole)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>System Preferences</Text>

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={20} color="#1E56A0" />
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDesc}>Show workflow alerts on this device</Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#E5E7EB', true: '#1E56A0' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="mail-outline" size={20} color="#1E56A0" />
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingLabel}>Email Alerts</Text>
                <Text style={styles.settingDesc}>Local admin preference for email alert visibility</Text>
              </View>
            </View>
            <Switch
              value={emailAlertsEnabled}
              onValueChange={setEmailAlertsEnabled}
              trackColor={{ false: '#E5E7EB', true: '#1E56A0' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="construct-outline" size={20} color="#F59E0B" />
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingLabel}>Maintenance Mode</Text>
                <Text style={styles.settingDesc}>Local-only until backend settings are added</Text>
              </View>
            </View>
            <Switch
              value={maintenanceMode}
              onValueChange={confirmMaintenanceChange}
              trackColor={{ false: '#E5E7EB', true: '#F59E0B' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>About</Text>

        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>System</Text>
            <Text style={styles.infoValue}>NUST PG Management</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Environment</Text>
            <Text style={styles.infoValue}>Development</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Actions</Text>

        <View style={styles.card}>
          <TouchableOpacity style={styles.actionRow} onPress={handleClearCache}>
            <Ionicons name="trash-outline" size={20} color="#F59E0B" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: '#F59E0B' }]}>Clear Local Cache</Text>
              <Text style={styles.settingDesc}>Reset local admin settings only</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9BA4B5" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.signOutBtn, signingOut && { opacity: 0.7 }]}
          onPress={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? (
            <ActivityIndicator color="#EF4444" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  body: { padding: 16 },
  profileCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#0D1B2A', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontWeight: '900', fontSize: 18 },
  profileName: { color: '#0D1B2A', fontSize: 18, fontWeight: '900' },
  profileEmail: { color: '#6B7280', fontSize: 13, marginTop: 2 },
  profileRole: { color: '#1E56A0', fontSize: 13, fontWeight: '700', marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: '#0D1B2A', marginBottom: 10, marginTop: 4 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 18 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingTextWrap: { flex: 1 },
  settingLabel: { fontSize: 15, fontWeight: '700', color: '#0D1B2A' },
  settingDesc: { fontSize: 12, color: '#6B7280', marginTop: 2, lineHeight: 17 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  infoLabel: { fontSize: 14, color: '#6B7280' },
  infoValue: { fontSize: 14, fontWeight: '700', color: '#0D1B2A', textAlign: 'right', flex: 1 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, marginBottom: 32, borderRadius: 14, backgroundColor: '#FFFFFF' },
  signOutText: { color: '#EF4444', fontSize: 16, fontWeight: '800' },
});
