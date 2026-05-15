import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';

export default function SettingsScreen({ navigation }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear the system cache?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Success', 'Cache cleared successfully.'),
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => navigation.navigate('RoleSelect'),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Settings" navigation={navigation} />

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

        {/* ── SYSTEM SETTINGS ── */}
        <Text style={styles.sectionTitle}>System</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons
                name="notifications-outline"
                size={20}
                color="#1E56A0"
              />
              <View>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDesc}>
                  System-wide push notifications
                </Text>
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
              <View>
                <Text style={styles.settingLabel}>Email Alerts</Text>
                <Text style={styles.settingDesc}>
                  Send email notifications to users
                </Text>
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
              <View>
                <Text style={styles.settingLabel}>Maintenance Mode</Text>
                <Text style={styles.settingDesc}>
                  Disable access for all users
                </Text>
              </View>
            </View>
            <Switch
              value={maintenanceMode}
              onValueChange={(val) => {
                Alert.alert(
                  val ? 'Enable Maintenance Mode' : 'Disable Maintenance Mode',
                  val
                    ? 'This will disable access for all users.'
                    : 'This will restore access for all users.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Confirm',
                      onPress: () => setMaintenanceMode(val),
                    },
                  ]
                );
              }}
              trackColor={{ false: '#E5E7EB', true: '#F59E0B' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* ── ABOUT ── */}
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

        {/* ── ACTIONS ── */}
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleClearCache}
          >
            <Ionicons name="trash-outline" size={20} color="#F59E0B" />
            <Text style={[styles.settingLabel, { color: '#F59E0B' }]}>
              Clear Cache
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#9BA4B5" />
          </TouchableOpacity>
        </View>

        {/* ── SIGN OUT ── */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  body: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0D1B2A',
    marginBottom: 10,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0D1B2A',
  },
  settingDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0D1B2A',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    marginBottom: 32,
  },
  signOutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
});