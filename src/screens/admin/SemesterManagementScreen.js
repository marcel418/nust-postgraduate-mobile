import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import AppHeader from '../../components/AppHeader';
import { api } from '../../api/http';

function formatDate(value) {
  if (!value) return 'N/A';

  try {
    return new Date(value).toLocaleDateString('en-NA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'N/A';
  }
}

function formatInputDate(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}

export default function SemesterManagementScreen({ navigation }) {
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [label, setLabel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadSemesters = useCallback(async () => {
    try {
      const response = await api.get('/semesters');
      const items = response?.data?.items || response?.items || [];
      setSemesters(items);
    } catch (error) {
      Alert.alert('Could not load semesters', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSemesters();
  }, [loadSemesters]);

  const activeSemester = useMemo(
    () => semesters.find((semester) => semester.is_active),
    [semesters]
  );

  const resetForm = () => {
    setLabel('');
    setStartDate('');
    setEndDate('');
  };

  const validateForm = () => {
    if (!label.trim() || !startDate || !endDate) {
      Alert.alert('Missing Fields', 'Please complete all semester fields.');
      return false;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      Alert.alert('Invalid Dates', 'Please enter valid start and end dates.');
      return false;
    }

    if (start.getTime() >= end.getTime()) {
      Alert.alert('Invalid Range', 'End date must be after start date.');
      return false;
    }

    return true;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      await api.post('/semesters', {
        label: label.trim(),
        start_date: startDate,
        end_date: endDate,
      });

      resetForm();
      await loadSemesters();
      Alert.alert('Created', 'Semester created successfully.');
    } catch (error) {
      Alert.alert('Could not create semester', error?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = (semester) => {
    if (!semester?.id) return;

    Alert.alert(
      'Activate Semester',
      `Activate ${semester.label}? This will deactivate any other active semester.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
          onPress: async () => {
            try {
              setSaving(true);
              await api.patch(`/semesters/${semester.id}/activate`);
              await loadSemesters();
              Alert.alert('Activated', `${semester.label} is now active.`);
            } catch (error) {
              Alert.alert('Could not activate semester', error?.message || 'Please try again.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E56A0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Semester Management" navigation={navigation} />

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSemesters(); }} />}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Active Semester</Text>
          <Text style={styles.summaryValue}>{activeSemester?.label || 'No active semester'}</Text>
          <Text style={styles.summaryText}>
            {activeSemester
              ? `${formatDate(activeSemester.start_date)} - ${formatDate(activeSemester.end_date)}`
              : 'Activate a semester to drive submission deadlines.'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Create Semester</Text>

          <Text style={styles.fieldLabel}>Semester Label</Text>
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="Semester 1 2026"
            placeholderTextColor="#9BA4B5"
            editable={!saving}
          />

          <Text style={styles.fieldLabel}>Start Date</Text>
          <TextInput
            style={styles.input}
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9BA4B5"
            editable={!saving}
            autoCapitalize="none"
          />

          <Text style={styles.fieldLabel}>End Date</Text>
          <TextInput
            style={styles.input}
            value={endDate}
            onChangeText={setEndDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9BA4B5"
            editable={!saving}
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.primaryBtn, saving && styles.disabledBtn]}
            onPress={handleCreate}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>Create Semester</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>All Semesters</Text>

          {semesters.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={42} color="#9BA4B5" />
              <Text style={styles.emptyText}>No semesters found.</Text>
            </View>
          ) : (
            semesters.map((semester) => {
              const isActive = !!semester.is_active;

              return (
                <View key={semester.id} style={styles.semesterCard}>
                  <View style={styles.semesterTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.semesterLabel}>{semester.label}</Text>
                      <Text style={styles.semesterMeta}>
                        {formatDate(semester.start_date)} - {formatDate(semester.end_date)}
                      </Text>
                    </View>

                    <View style={[styles.badge, isActive ? styles.activeBadge : styles.inactiveBadge]}>
                      <Text style={[styles.badgeText, isActive ? styles.activeBadgeText : styles.inactiveBadgeText]}>
                        {isActive ? 'ACTIVE' : 'INACTIVE'}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.secondaryBtn, isActive && styles.disabledBtn]}
                    onPress={() => handleActivate(semester)}
                    disabled={isActive || saving}
                  >
                    <Text style={styles.secondaryBtnText}>
                      {isActive ? 'Already Active' : 'Activate'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F2F5' },
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 32 },
  summaryCard: { backgroundColor: '#0D1B2A', borderRadius: 18, padding: 18, marginBottom: 14 },
  summaryTitle: { color: '#9BA4B5', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  summaryValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  summaryText: { color: '#D1D5DB', fontSize: 13, marginTop: 6, lineHeight: 19 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 14 },
  sectionTitle: { color: '#0D1B2A', fontSize: 17, fontWeight: '800', marginBottom: 12 },
  fieldLabel: { color: '#0D1B2A', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: { backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#0D1B2A', marginBottom: 12 },
  primaryBtn: { backgroundColor: '#1E56A0', borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, marginTop: 4 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  disabledBtn: { opacity: 0.7 },
  semesterCard: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, marginBottom: 10 },
  semesterTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  semesterLabel: { color: '#0D1B2A', fontSize: 15, fontWeight: '800' },
  semesterMeta: { color: '#6B7280', fontSize: 13, marginTop: 4 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  activeBadge: { backgroundColor: '#DCFCE7' },
  inactiveBadge: { backgroundColor: '#E5E7EB' },
  badgeText: { fontSize: 11, fontWeight: '900' },
  activeBadgeText: { color: '#15803D' },
  inactiveBadgeText: { color: '#6B7280' },
  secondaryBtn: { backgroundColor: '#FFFFFF', borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderWidth: 1, borderColor: '#CBD5E1' },
  secondaryBtnText: { color: '#1E56A0', fontSize: 14, fontWeight: '800' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 10 },
  emptyText: { color: '#6B7280', fontSize: 14 },
});