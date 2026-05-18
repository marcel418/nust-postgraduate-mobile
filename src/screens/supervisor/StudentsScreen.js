// src/screens/supervisor/StudentsScreen.js

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import AppHeader from '../../components/AppHeader';
import { submissionsApi } from '../../api/submissionsApi';
import {
  getInitials,
  getProgressFromState,
  getStatusColor,
  getStatusLabel,
  groupStudentsFromSubmissions,
} from './supervisorHelpers';

export default function StudentsScreen({ navigation }) {
  const [rawSubmissions, setRawSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStudents = useCallback(async () => {
    try {
      const response = await submissionsApi.list();
      const items = response?.data?.items || response?.items || [];

      setRawSubmissions(items);
    } catch (error) {
      Alert.alert(
        'Could not load students',
        error?.message || 'Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const students = useMemo(
    () => groupStudentsFromSubmissions(rawSubmissions),
    [rawSubmissions]
  );

  const refresh = () => {
    setRefreshing(true);
    loadStudents();
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
      <AppHeader title="Students" navigation={navigation} />

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        <Text style={styles.count}>
          {students.length} {students.length === 1 ? 'student' : 'students'}
        </Text>

        {students.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={48} color="#9BA4B5" />
            <Text style={styles.emptyTitle}>No students found</Text>
            <Text style={styles.emptyText}>
              Students with submissions assigned to you will appear here.
            </Text>
          </View>
        ) : (
          students.map((student) => (
            <View key={student.id || student.name} style={styles.studentCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitials(student.name)}
                </Text>
              </View>

              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentCourse} numberOfLines={1}>
                  {student.course}
                </Text>

                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${student.progressPercentage}%` },
                    ]}
                  >
                    <Text style={styles.progressPill}>
                      {student.progressPercentage}%
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(student.status) },
                  ]}
                >
                  <Text style={styles.statusBadgeText}>
                    {getStatusLabel(student.status)}
                  </Text>
                </View>

                <Text style={styles.submissionCount}>
                  {student.submissions.length} submission{student.submissions.length === 1 ? '' : 's'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.viewBtn}
                onPress={() =>
                  navigation.navigate('ReviewReport', {
                    student,
                    submission: student.latestSubmission,
                  })
                }
              >
                <Text style={styles.viewBtnText}>View</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F2F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  body: {
    padding: 16,
  },
  count: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  studentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E56A0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  studentInfo: {
    flex: 1,
    gap: 6,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0D1B2A',
  },
  studentCourse: {
    fontSize: 12,
    color: '#6B7280',
  },
  progressBarBg: {
    height: 22,
    backgroundColor: '#E5E7EB',
    borderRadius: 11,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#1E56A0',
    borderRadius: 11,
    justifyContent: 'center',
    paddingRight: 8,
    minWidth: 45,
  },
  progressPill: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  submissionCount: {
    color: '#9BA4B5',
    fontSize: 11,
    fontWeight: '600',
  },
  viewBtn: {
    backgroundColor: '#1E56A0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  viewBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    color: '#0D1B2A',
    fontSize: 17,
    fontWeight: '800',
  },
  emptyText: {
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
