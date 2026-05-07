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
import { CURRENT_STUDENT } from '../../data/mockData';
import {
  getNotifications,
  getStudentFeedback,
  getStudentProfile,
  getStudentTasks,
} from '../../services/api';


const getStatusColor = (status) => {
  switch (status) {
    case 'Approved': return '#22C55E';
    case 'In Progress': return '#7C3AED';
    case 'In Review': return '#7C3AED';
    case 'Pending': return '#F59E0B';
    case 'Overdue': return '#EF4444';
    case 'Returned': return '#EF4444';
    default: return '#6B7280';
  }
};

export default function DashboardScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [profileData, feedbackData, tasksData, notificationsData] =
        await Promise.all([
          getStudentProfile(CURRENT_STUDENT.id),
          getStudentFeedback(CURRENT_STUDENT.id),
          getStudentTasks(CURRENT_STUDENT.id),
          getNotifications(CURRENT_STUDENT.id),
        ]);
      setProfile(profileData);
      setFeedback(feedbackData.slice(0, 2));
      setTasks(tasksData);
      setUnreadCount(notificationsData.filter((n) => !n.read).length);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
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
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/*Header */}
     <AppHeader title="Home" navigation={navigation} />

      <View style={styles.body}>
        {/* ── GREETING + PROGRESS CARD ── */}
        <View style={styles.card}>
          <Text style={styles.greeting}>
            Hello, {profile?.name?.split(' ')[0]} 👋
          </Text>
          <Text style={styles.subGreeting}>Your postgraduate journey</Text>

          <View style={styles.divider} />

          {/* Progress row with percentage pill inside bar */}
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>Current Progress</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${profile?.progressPercentage}%` },
              ]}
            >
              <Text style={styles.progressPill}>
                {profile?.progressPercentage}%
              </Text>
            </View>
          </View>

          {/* Proposal stage row */}
          <View style={styles.stageRow}>
            <Text style={styles.progressLabel}>Proposal Stage</Text>
            <View
              style={[
                styles.stageBadge,
                {
                  backgroundColor: getStatusColor(
                    profile?.proposalStage
                  ),
                },
              ]}
            >
              <Text style={styles.stageBadgeText}>
                {profile?.proposalStage}
              </Text>
            </View>
          </View>
        </View>

        {/* ── ACTION BUTTONS ── */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Submissions')}
          >
            <Ionicons
              name="cloud-upload-outline"
              size={28}
              color="#FFFFFF"
            />
            <Text style={styles.actionText}>Upload Report</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('FeedbackList')}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={28}
              color="#FFFFFF"
            />
            <Text style={styles.actionText}>View Feedback</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Progress')}
          >
            <Ionicons
              name="stats-chart-outline"
              size={28}
              color="#FFFFFF"
            />
            <Text style={styles.actionText}>View Progress</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Submissions')}
          >
            <Ionicons
              name="document-text-outline"
              size={28}
              color="#FFFFFF"
            />
            <Text style={styles.actionText}>Submissions</Text>
          </TouchableOpacity>
        </View>

        {/* ── RECENT FEEDBACK ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Feedback</Text>

          <View style={styles.card}>
            {feedback.map((item, index) => (
              <View key={item.id}>
                <TouchableOpacity
                  style={styles.feedbackRow}
                  onPress={() =>
                    navigation.navigate('FeedbackDetail', {
                      feedback: item,
                    })
                  }
                >
                  {/* Avatar circle */}
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {item.fromInitials}
                    </Text>
                  </View>

                  <View style={styles.feedbackContent}>
                    <View style={styles.feedbackTopRow}>
                      <Text style={styles.feedbackFrom}>
                        {item.fromName}
                        <Text style={styles.feedbackMeta}>
                          {' '}· {item.fromRole}
                        </Text>
                      </Text>
                      <Ionicons
                        name="ellipsis-vertical"
                        size={16}
                        color="#9BA4B5"
                      />
                    </View>
                    <Text style={styles.feedbackMessage} numberOfLines={1}>
                      {item.message}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Divider between items, not after last */}
                {index < feedback.length - 1 && (
                  <View style={styles.itemDivider} />
                )}
              </View>
            ))}

            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => navigation.navigate('FeedbackList')}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── UPCOMING TASKS ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Tasks</Text>

          {tasks.map((task) => (
            <View key={task.id} style={styles.taskCard}>
              <View style={styles.taskLeft}>
                <View style={styles.taskTitleRow}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <View
                    style={[
                      styles.taskBadge,
                      {
                        backgroundColor: getStatusColor(task.status),
                      },
                    ]}
                  >
                    <Text style={styles.taskBadgeText}>
                      {task.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.taskDateRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={14}
                    color="#6B7280"
                  />
                  <Text style={styles.taskDate}> {task.dueDate}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
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
  header: {
    backgroundColor: '#0D1B2A',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  body: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0D1B2A',
  },
  subGreeting: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  progressLabelRow: {
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  progressBarBg: {
    height: 28,
    backgroundColor: '#E5E7EB',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#1E56A0',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 8,
    minWidth: 50,
  },
  progressPill: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  stageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stageBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  stageBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionBtn: {
    backgroundColor: '#1E56A0',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '47%',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0D1B2A',
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E56A0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  feedbackContent: {
    flex: 1,
    gap: 4,
  },
  feedbackTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedbackFrom: {
    fontWeight: '600',
    fontSize: 14,
    color: '#0D1B2A',
  },
  feedbackMeta: {
    fontWeight: '400',
    color: '#6B7280',
    fontSize: 13,
  },
  feedbackMessage: {
    fontSize: 13,
    color: '#6B7280',
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  viewAllBtn: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 4,
  },
  viewAllText: {
    color: '#1E56A0',
    fontWeight: '600',
    fontSize: 14,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  taskLeft: {
    gap: 8,
  },
  taskTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0D1B2A',
    flex: 1,
    marginRight: 8,
  },
  taskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  taskBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  taskDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskDate: {
    fontSize: 13,
    color: '#6B7280',
  },
});