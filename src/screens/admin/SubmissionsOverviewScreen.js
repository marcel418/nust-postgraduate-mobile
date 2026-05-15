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
import { getAllSubmissions } from '../../services/api';
import { STUDENTS } from '../../data/mockData';

const getStatusColor = (status) => {
  switch (status) {
    case 'Approved': return '#22C55E';
    case 'In Review': return '#7C3AED';
    case 'Returned': return '#EF4444';
    case 'Pending': return '#F59E0B';
    default: return '#6B7280';
  }
};

export default function SubmissionsOverviewScreen({ navigation }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  const FILTERS = ['All', 'In Review', 'Approved', 'Returned'];

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      const data = await getAllSubmissions();
      setSubmissions(data);
    } catch (error) {
      console.error('Failed to load submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStudent = (studentId) =>
    STUDENTS.find((s) => s.id === studentId);

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const filteredSubmissions = filter === 'All'
    ? submissions
    : submissions.filter((s) => s.status === filter);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E56A0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Submissions" navigation={navigation} />

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

        {/* ── FILTER TABS ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
        >
          <View style={styles.filterRow}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterBtn,
                  filter === f && styles.filterBtnActive,
                ]}
                onPress={() => setFilter(f)}
              >
                <Text
                  style={[
                    styles.filterText,
                    filter === f && styles.filterTextActive,
                  ]}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.count}>
          {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? 's' : ''}
        </Text>

        {filteredSubmissions.map((item) => {
          const student = getStudent(item.studentId);
          return (
            <View key={item.id} style={styles.card}>
              {/* File row */}
              <View style={styles.fileRow}>
                <View style={styles.fileIcon}>
                  <Ionicons name="document-text" size={22} color="#1E56A0" />
                </View>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.fileMeta}>
                    {item.fileSize} · {formatDate(item.submittedAt)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(item.status) },
                  ]}
                >
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>

              {/* Student info */}
              <View style={styles.studentRow}>
                <Ionicons name="person-outline" size={14} color="#6B7280" />
                <Text style={styles.studentName}>
                  {student?.name ?? 'Unknown'}
                </Text>
                <Text style={styles.studentCourse} numberOfLines={1}>
                  · {student?.course}
                </Text>
              </View>

              {/* Period */}
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                <Text style={styles.detailText}>
                  Period: {item.reportingPeriod}
                </Text>
              </View>

              {/* Supervisor comments if any */}
              {!!item.supervisorComments && (
                <View style={styles.feedbackBox}>
                  <Text style={styles.feedbackLabel}>Supervisor feedback</Text>
                  <Text style={styles.feedbackText}>
                    {item.supervisorComments}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
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
  filterScroll: {
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterBtnActive: {
    backgroundColor: '#1E56A0',
    borderColor: '#1E56A0',
  },
  filterText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  count: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fileIcon: {
    width: 44,
    height: 44,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D1B2A',
  },
  fileMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  studentName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0D1B2A',
  },
  studentCourse: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#6B7280',
  },
  feedbackBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#22C55E',
    gap: 4,
  },
  feedbackLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#22C55E',
    textTransform: 'uppercase',
  },
  feedbackText: {
    fontSize: 13,
    color: '#374151',
  },
});