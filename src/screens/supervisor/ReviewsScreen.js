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
import { CURRENT_SUPERVISOR, STUDENTS } from '../../data/mockData';
import { getPendingSubmissions } from '../../services/api';

export default function ReviewsScreen({ navigation }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingSubmissions();
  }, []);

  const loadPendingSubmissions = async () => {
    try {
      const data = await getPendingSubmissions(CURRENT_SUPERVISOR.id);
      setSubmissions(data);
    } catch (error) {
      console.error('Failed to load pending submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Find student info for a submission
  const getStudent = (studentId) => {
    return STUDENTS.find((s) => s.id === studentId);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
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
      <AppHeader title="Reviews" navigation={navigation} />

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {submissions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="checkmark-circle-outline"
              size={48}
              color="#9BA4B5"
            />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptyText}>
              No pending submissions to review.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.count}>
              {submissions.length} pending review{submissions.length !== 1 ? 's' : ''}
            </Text>

            {submissions.map((submission) => {
              const student = getStudent(submission.studentId);
              return (
                <TouchableOpacity
                  key={submission.id}
                  style={styles.card}
                  onPress={() =>
                    navigation.navigate('ReviewReport', { student })
                  }
                >
                  {/* Student avatar + info */}
                  <View style={styles.topRow}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {student?.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </Text>
                    </View>

                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{student?.name}</Text>
                      <Text style={styles.studentCourse} numberOfLines={1}>
                        {student?.course}
                      </Text>
                    </View>

                    <View style={styles.inReviewBadge}>
                      <Text style={styles.inReviewText}>In Review</Text>
                    </View>
                  </View>

                  {/* File info */}
                  <View style={styles.fileRow}>
                    <View style={styles.fileIcon}>
                      <Ionicons
                        name="document-text"
                        size={18}
                        color="#1E56A0"
                      />
                    </View>
                    <View style={styles.fileInfo}>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {submission.title}
                      </Text>
                      <Text style={styles.fileMeta}>
                        {submission.fileSize} · {formatDate(submission.submittedAt)}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#9BA4B5"
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0D1B2A',
  },
  emptyText: {
    fontSize: 14,
    color: '#9BA4B5',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E56A0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  studentInfo: {
    flex: 1,
    gap: 2,
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
  inReviewBadge: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  inReviewText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
  },
  fileIcon: {
    width: 36,
    height: 36,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0D1B2A',
  },
  fileMeta: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
});