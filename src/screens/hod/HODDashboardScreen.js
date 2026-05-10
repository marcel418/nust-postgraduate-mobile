// src/screens/hod/HODDashboardScreen.js
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import HODHeader from '../../components/HODHeader';
import { getHODSubmissions } from '../../services/hodApi';

export default function HODDashboardScreen({ navigation }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const data = await getHODSubmissions();
      setSubmissions(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const newCount = submissions.filter((s) => s.status === 'WITH_HOD').length;
  const assignCount = submissions.filter((s) => s.status === 'WITH_HOD').length;
  const pendingCount = submissions.filter((s) => s.status === 'UNDER_INTERNAL_EVAL').length;

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#1E56A0" /></View>;
  }

  return (
    <View style={styles.container}>
      <HODHeader title="Dashboard" navigation={navigation} />
      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{newCount}</Text>
            <Text style={styles.statLabel}>New{'\n'}Submissions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{assignCount}</Text>
            <Text style={styles.statLabel}>Assign{'\n'}Evaluators</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending{'\n'}Approvals</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('HODTabs', { screen: 'HODSubmissions' })}>
            <Ionicons name="document-text-outline" size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>Review{'\n'}Submissions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('HODTabs', { screen: 'HODAssignments' })}>
            <Ionicons name="person-add-outline" size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>Assign{'\n'}Evaluators</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('HODNotifications')}>
            <Ionicons name="notifications-outline" size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>View{'\n'}Alerts</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Submissions */}
        <Text style={styles.sectionTitle}>Recent Submissions</Text>
        {submissions.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.submissionCard}
            onPress={() => navigation.navigate('HODReviewSubmission', { submission: item })}
          >
            <View style={styles.submissionInfo}>
              <Text style={styles.studentName}>{item.student.name}</Text>
              <Text style={styles.submissionCourse}>{item.student.course}</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: getStatusWidth(item.status) }]}>
                  <Text style={styles.progressPill}>{getStatusLabel(item.status)}</Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusBadgeText}>{getStatusLabel(item.status)}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => navigation.navigate('HODReviewSubmission', { submission: item })}
            >
              <Text style={styles.viewBtnText}>View</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

      </ScrollView>
    </View>
  );
}

const getStatusColor = (status) => {
  switch (status) {
    case 'WITH_HOD': return '#F59E0B';
    case 'UNDER_INTERNAL_EVAL': return '#7C3AED';
    case 'APPROVED': return '#22C55E';
    case 'REJECTED': return '#EF4444';
    default: return '#6B7280';
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'WITH_HOD': return 'Awaiting Action';
    case 'UNDER_INTERNAL_EVAL': return 'Under Review';
    case 'APPROVED': return 'Approved';
    case 'REJECTED': return 'Rejected';
    default: return status;
  }
};

const getStatusWidth = (status) => {
  switch (status) {
    case 'WITH_HOD': return '30%';
    case 'UNDER_INTERNAL_EVAL': return '60%';
    case 'APPROVED': return '100%';
    default: return '20%';
  }
};

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F2F5' },
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  body: { padding: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#EFF6FF', borderRadius: 16, padding: 14, alignItems: 'center', gap: 4 },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#0D1B2A' },
  statLabel: { fontSize: 12, color: '#6B7280', textAlign: 'center' },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  actionBtn: { flex: 1, backgroundColor: '#1E56A0', borderRadius: 16, padding: 16, alignItems: 'center', gap: 8 },
  actionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0D1B2A', marginBottom: 10 },
  submissionCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  submissionInfo: { flex: 1, gap: 6 },
  studentName: { fontSize: 16, fontWeight: '600', color: '#0D1B2A' },
  submissionCourse: { fontSize: 13, color: '#6B7280' },
  progressBarBg: { height: 24, backgroundColor: '#E5E7EB', borderRadius: 12, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#1E56A0', borderRadius: 12, justifyContent: 'center', paddingRight: 8, minWidth: 50 },
  progressPill: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold', textAlign: 'right' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  statusBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  viewBtn: { backgroundColor: '#1E56A0', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  viewBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});