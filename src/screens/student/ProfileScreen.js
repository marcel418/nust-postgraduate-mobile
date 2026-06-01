// src/screens/student/ProfileScreen.js

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

import { submissionsApi } from '../../api/submissionsApi';
import { useAuthStore } from '../../store/authStore';
import { getInitials, getProgressPercentage, getStatusLabel, normalizeSubmission, sortNewestFirst } from './studentHelpers';

export default function StudentProfileScreen({ navigation }) {
  const logout = useAuthStore((state) => state.logout);
  const authUser = useAuthStore((state) => state.user);
  const roles = useAuthStore((state) => state.roles);

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [name, setName] = useState(authUser?.name || 'Student User');
  const [studentNumber, setStudentNumber] = useState(authUser?.student_number || authUser?.studentNumber || 'N/A');
  const [course, setCourse] = useState(authUser?.course || 'Postgraduate Programme');
  const [isEditing, setIsEditing] = useState(false);

  const getOptionalDisplayValue = (value) => {
    if (!value) return 'Not assigned';

    if (typeof value === 'string') {
      return value.trim() || 'Not assigned';
    }

    if (typeof value === 'object') {
      return value.name || 'Not assigned';
    }

    return 'Not assigned';
  };

  const loadProfileContext = useCallback(async () => {
    try {
      const response = await submissionsApi.list();
      const items = response?.data?.items || response?.items || [];
      setSubmissions(sortNewestFirst(items.map(normalizeSubmission)));
    } catch (error) {
      Alert.alert('Could not load profile data', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setName(authUser?.name || 'Student User');
    setStudentNumber(authUser?.student_number || authUser?.studentNumber || 'N/A');
    setCourse(authUser?.course || 'Postgraduate Programme');
    loadProfileContext();
  }, [authUser, loadProfileContext]);

  const latestSubmission = submissions[0] || null;
  const progressPercentage = latestSubmission ? getProgressPercentage(latestSubmission) : 0;
  const proposalStage = latestSubmission ? getStatusLabel(latestSubmission.state) : 'Not Started';

  const profile = useMemo(
    () => ({
      name,
      email: authUser?.email || 'student@nust.na',
      studentNumber,
      course,
      department: authUser?.department || null,
      supervisor: authUser?.supervisor ?? null,
      coSupervisor: authUser?.co_supervisor ?? null,
      progressPercentage,
      proposalStage,
      role: Array.isArray(roles) && roles.length > 0 ? roles[0] : 'STUDENT',
    }),
    [authUser?.co_supervisor, authUser?.department, authUser?.email, authUser?.supervisor, course, name, progressPercentage, proposalStage, roles, studentNumber]
  );

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Name cannot be empty.');
      return;
    }

    setSaving(true);

    try {
      // Profile persistence endpoint is not part of the current MVP backend yet.
      // This keeps the edited values for the active session.
      await new Promise((resolve) => setTimeout(resolve, 400));
      setIsEditing(false);
      Alert.alert('Saved', 'Profile details updated for this session.');
    } catch (error) {
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
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

  const onRefresh = () => {
    setRefreshing(true);
    loadProfileContext();
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroTitle}>Profile</Text>
            <TouchableOpacity onPress={() => navigation.navigate('NotificationsList')}>
              <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(profile.name)}</Text>
            </View>
          </View>

          <Text style={styles.heroName}>{profile.name}</Text>
          <Text style={styles.heroRole}>{profile.role}</Text>
        </View>

        <View style={styles.body}>
          {!isEditing ? (
            <>
              <View style={styles.card}>
                {[
                  { icon: 'person-outline', label: 'Full Name', value: profile.name },
                  { icon: 'mail-outline', label: 'Email', value: profile.email },
                  { icon: 'card-outline', label: 'Student Number', value: profile.studentNumber },
                  { icon: 'school-outline', label: 'Course', value: profile.course },
                  { icon: 'business-outline', label: 'Department', value: getOptionalDisplayValue(profile.department) },
                  { icon: 'person-circle-outline', label: 'Supervisor', value: getOptionalDisplayValue(profile.supervisor) },
                  { icon: 'people-outline', label: 'Co-supervisor', value: getOptionalDisplayValue(profile.coSupervisor) },
                  { icon: 'bar-chart-outline', label: 'Progress', value: `${profile.progressPercentage}%` },
                  { icon: 'flag-outline', label: 'Current Stage', value: profile.proposalStage },
                ].map((item, index, array) => (
                  <View key={item.label}>
                    <View style={styles.infoRow}>
                      <Ionicons name={item.icon} size={18} color="#6B7280" />
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>{item.label}</Text>
                        <Text style={styles.infoValue}>{item.value}</Text>
                      </View>
                    </View>
                    {index < array.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
                <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Edit Profile</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Update Profile Details</Text>

              <View style={styles.card}>
                <Text style={styles.fieldLabel}>Name</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter your name" placeholderTextColor="#9BA4B5" />

                <Text style={styles.fieldLabel}>Student Number</Text>
                <TextInput style={styles.input} value={studentNumber} onChangeText={setStudentNumber} placeholder="Enter student number" placeholderTextColor="#9BA4B5" />

                <Text style={styles.fieldLabel}>Course</Text>
                <TextInput style={styles.input} value={course} onChangeText={setCourse} placeholder="Enter your course" placeholderTextColor="#9BA4B5" />
              </View>

              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setName(profile.name);
                    setStudentNumber(profile.studentNumber);
                    setCourse(profile.course);
                    setIsEditing(false);
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.saveBtn, saving && styles.disabledButton]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}

          <TouchableOpacity style={[styles.signOutBtn, signingOut && styles.disabledButton]} onPress={handleSignOut} disabled={signingOut}>
            {signingOut ? (
              <ActivityIndicator color="#EF4444" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                <Text style={styles.signOutText}>Sign Out</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F2F5' },
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  hero: { backgroundColor: '#0D1B2A', paddingTop: 56, paddingBottom: 32, paddingHorizontal: 20, alignItems: 'center', gap: 8 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 16 },
  heroTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold' },
  avatarWrapper: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#FFFFFF', overflow: 'hidden', marginBottom: 8 },
  avatar: { width: '100%', height: '100%', backgroundColor: '#1E56A0', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 32, fontWeight: 'bold' },
  heroName: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold' },
  heroRole: { color: '#9BA4B5', fontSize: 15 },
  body: { padding: 16, gap: 16 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#0D1B2A', marginBottom: 8 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  infoValue: { fontSize: 15, color: '#0D1B2A', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 10 },
  fieldLabel: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 15, color: '#0D1B2A', marginBottom: 8 },
  editBtn: { backgroundColor: '#1E56A0', borderRadius: 12, padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  editActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#1E56A0' },
  cancelBtnText: { color: '#1E56A0', fontSize: 16, fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: '#1E56A0', borderRadius: 12, padding: 16, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, marginBottom: 32, borderRadius: 12, backgroundColor: '#FFFFFF' },
  signOutText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },
  disabledButton: { opacity: 0.7 },
});
