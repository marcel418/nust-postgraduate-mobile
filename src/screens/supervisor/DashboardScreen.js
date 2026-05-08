import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AppHeader from '../../components/AppHeader';
import { CURRENT_SUPERVISOR } from '../../data/mockData';
import { getPendingSubmissions, getSupervisorStudents } from '../../services/api';

const getStatusColor = (status) => {
  switch (status) {
    case 'Approved': return '#22C55E';
    case 'In Progress': return '#7C3AED';
    case 'In Review': return '#7C3AED';
    case 'Pending': return '#F59E0B';
    case 'Returned': return '#EF4444';
    default: return '#6B7280';
  }
};

export default function SupervisorDashboardScreen({ navigation }) {
  const [students, setStudents] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [thesisCount, setThesisCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [studentsData, pendingData] = await Promise.all([
        getSupervisorStudents(CURRENT_SUPERVISOR.id),
        getPendingSubmissions(CURRENT_SUPERVISOR.id),
      ]);
      setStudents(studentsData);
      setPendingCount(pendingData.length);
      // Thesis to grade = approved students
      setThesisCount(
        studentsData.filter((s) => s.status === 'Approved').length
      );
    } catch (error) {
      console.error('Failed to load supervisor dashboard:', error);
    } finally {
      setLoading(false);
    }
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
      <AppHeader title={'Supervisor\nDashboard'} navigation={navigation} />

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

        {/* ── STATS ROW ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{students.length}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending{'\n'}Reviews</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{thesisCount}</Text>
            <Text style={styles.statLabel}>Thesis to{'\n'}Grade</Text>
          </View>
        </View>

        {/* ── ACTION BUTTONS ── */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Reviews')}
          >
            <Ionicons name="bar-chart-outline" size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>Review{'\n'}Reports</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('SubmitDocuments')}
          >
            <Ionicons name="document-text-outline" size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>Submit{'\n'}Thesis</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('GradeThesis')}
          >
            <Ionicons name="checkmark-outline" size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>Grade{'\n'}Thesis</Text>
          </TouchableOpacity>
        </View>

        {/* ── STUDENT LIST ── */}
        {students.map((student) => (
          <View key={student.id} style={styles.studentCard}>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{student.name}</Text>
              <Text style={styles.studentCourse}>{student.course}</Text>

              {/* Progress bar */}
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
                <Text style={styles.statusBadgeText}>{student.status}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() =>
                navigation.navigate('ReviewReport', { student })
              }
            >
              <Text style={styles.viewBtnText}>View</Text>
            </TouchableOpacity>
          </View>
        ))}

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
    gap: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0D1B2A',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#1E56A0',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
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
  studentInfo: {
    flex: 1,
    gap: 6,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0D1B2A',
  },
  studentCourse: {
    fontSize: 13,
    color: '#6B7280',
  },
  progressBarBg: {
    height: 24,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#1E56A0',
    borderRadius: 12,
    justifyContent: 'center',
    paddingRight: 8,
    minWidth: 50,
  },
  progressPill: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  viewBtn: {
    backgroundColor: '#1E56A0',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  viewBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});