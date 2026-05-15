import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import { CURRENT_SUPERVISOR } from '../../data/mockData';
import { getSupervisorStudents } from '../../services/api';

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

export default function StudentsScreen({ navigation }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const data = await getSupervisorStudents(CURRENT_SUPERVISOR.id);
      setStudents(data);
    } catch (error) {
      console.error('Failed to load students:', error);
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
      <AppHeader title="Students" navigation={navigation} />

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.count}>{students.length} students</Text>

        {students.map((student) => (
          <View key={student.id} style={styles.studentCard}>
            {/* Avatar */}
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {student.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
              </Text>
            </View>

            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{student.name}</Text>
              <Text style={styles.studentCourse} numberOfLines={1}>
                {student.course}
              </Text>

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
    fontWeight: '600',
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
    fontWeight: '600',
    fontSize: 14,
  },
});