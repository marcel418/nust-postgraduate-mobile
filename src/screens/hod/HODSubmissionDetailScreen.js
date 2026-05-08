// src/screens/hod/HODSubmissionDetailScreen.js
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { hodService } from '../../services/api/hodService';

const CHECKLIST_ITEMS = [
  { key: 'problem_clarity', label: 'Problem clarity' },
  { key: 'methodology', label: 'Methodology' },
  { key: 'feasibility', label: 'Feasibility' },
];

const DECISION_COLORS = {
  APPROVED: '#16A34A',
  MINOR_REVISIONS: '#D97706',
  REJECTED: '#DC2626',
};

export default function HODSubmissionDetailScreen({ route, navigation }) {
  const { submission } = route.params;
  const [loading, setLoading] = useState(false);

  // Mock internal evaluation result — from evaluator
  const evalResult = {
    checklist: [
      { label: 'Problem clarity', result: 'Good' },
      { label: 'Methodology', result: 'Satisfactory' },
      { label: 'Feasibility', result: 'Strong' },
    ],
    decision: 'Minor Revisions',
    supervisorNote: {
      author: 'Prof. Doe',
      role: 'Supervisor',
      message:
        'Your proposal shows strong improvement in methodology.\nConsider refining the data preprocessing section.',
      timeAgo: '3 days ago',
    },
  };

  const handleDecision = (decision) => {
    const labels = { approve: 'Approve', reject: 'Reject', return: 'Return for Revisions' };
    Alert.alert(
      labels[decision],
      `Are you sure you want to ${labels[decision].toLowerCase()} this submission?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: decision === 'reject' ? 'destructive' : 'default',
          onPress: async () => {
            setLoading(true);
            try {
              await hodService.forwardToFpgcR(submission.id, decision, '');
              Alert.alert('Done', `Submission has been ${labels[decision].toLowerCase()}d.`, [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch {
              Alert.alert('Error', 'Could not process decision. Try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>Review</Text>
          <Text style={styles.headerTitle}>Submission</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => navigation.navigate('HODNotifications')}>
            <Text style={styles.headerIcon}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('HODProfile')}>
            <Text style={styles.headerIcon}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Student Info */}
        <View style={styles.card}>
          <Text style={styles.studentName}>{submission.student.name}</Text>
          <Text style={styles.infoText}>Student No: {submission.student.id}</Text>
          <Text style={styles.infoText}>Course: Bachelor of Computer Science: Honors</Text>
        </View>

        {/* Document */}
        <View style={styles.card}>
          <View style={styles.docRow}>
            <View style={styles.docIconBox}>
              <Text style={styles.docIconText}>📄</Text>
            </View>
            <View style={styles.docInfo}>
              <Text style={styles.docName}>Mini_Thesis_Draft_3.9.pdf</Text>
              <Text style={styles.docSize}>32.9 MB</Text>
            </View>
            <TouchableOpacity style={styles.openBtn}>
              <Text style={styles.openBtnText}>Open</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Supervisor Notes */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Supervisor notes</Text>
          <View style={styles.supervisorRow}>
            <Text style={styles.supervisorAvatar}>👤</Text>
            <Text style={styles.supervisorName}>
              {evalResult.supervisorNote.author} · {evalResult.supervisorNote.role}
            </Text>
          </View>
          <Text style={styles.supervisorMessage}>{evalResult.supervisorNote.message}</Text>
          <Text style={styles.timeAgo}>{evalResult.supervisorNote.timeAgo}</Text>
        </View>

        {/* Internal Evaluation Result */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Internal Evaluation Result</Text>
          {evalResult.checklist.map((item, i) => (
            <View key={i} style={styles.checkRow}>
              <View style={styles.checkIcon}>
                <Text style={styles.checkIconText}>✓</Text>
              </View>
              <Text style={styles.checkLabel}>
                {item.label}: <Text style={styles.checkResult}>{item.result}</Text>
              </Text>
            </View>
          ))}
          <View style={styles.decisionRow}>
            <Text style={styles.decisionLabel}>Decision</Text>
            <View style={[styles.decisionBadge, { backgroundColor: '#D97706' }]}>
              <Text style={styles.decisionText}>{evalResult.decision}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionCard}>
          {loading ? (
            <ActivityIndicator size="large" color="#0D1B3E" />
          ) : (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#16A34A' }]}
                onPress={() => handleDecision('approve')}
              >
                <Text style={styles.actionBtnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#DC2626' }]}
                onPress={() => handleDecision('reject')}
              >
                <Text style={styles.actionBtnText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#D97706' }]}
                onPress={() => handleDecision('return')}
              >
                <Text style={styles.actionBtnText}>Return</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('HODDashboard')}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('HODSubmissions')}>
          <Text style={styles.navIcon}>📋</Text>
          <Text style={[styles.navLabel, styles.navActive]}>Submissions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('HODAssignments')}>
          <Text style={styles.navIcon}>👥</Text>
          <Text style={styles.navLabel}>Assignments</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('HODProfile')}>
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  header: {
    backgroundColor: '#0D1B3E', paddingTop: 52, paddingBottom: 20,
    paddingHorizontal: 20, flexDirection: 'row',
    alignItems: 'flex-start', justifyContent: 'space-between',
  },
  back: { color: '#fff', fontSize: 22, fontWeight: '600', marginTop: 4 },
  headerTextBlock: { flex: 1, marginLeft: 12 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 28 },
  headerIcons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  headerIcon: { fontSize: 20 },

  content: { padding: 16, gap: 14, paddingBottom: 100 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 18, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },

  studentName: { fontSize: 16, fontWeight: '700', color: '#0D1B3E', marginBottom: 6 },
  infoText: { fontSize: 13, color: '#555', marginBottom: 3 },

  docRow: { flexDirection: 'row', alignItems: 'center' },
  docIconBox: {
    width: 40, height: 40, borderRadius: 8, backgroundColor: '#F0F2F5',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  docIconText: { fontSize: 20 },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontWeight: '600', color: '#0D1B3E' },
  docSize: { fontSize: 12, color: '#888', marginTop: 2 },
  openBtn: { backgroundColor: '#1A73E8', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  openBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0D1B3E', marginBottom: 14 },

  supervisorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  supervisorAvatar: { fontSize: 22, marginRight: 10 },
  supervisorName: { fontSize: 14, fontWeight: '600', color: '#333' },
  supervisorMessage: { fontSize: 14, color: '#444', lineHeight: 21, marginBottom: 8 },
  timeAgo: { fontSize: 12, color: '#999' },

  checkRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 10,
    padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB',
  },
  checkIcon: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#16A34A',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  checkIconText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  checkLabel: { fontSize: 14, color: '#333' },
  checkResult: { fontWeight: '600', color: '#0D1B3E' },

  decisionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  decisionLabel: { fontSize: 15, fontWeight: '700', color: '#0D1B3E' },
  decisionBadge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  decisionText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  actionCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 18, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  bottomNav: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: '#E8E8E8',
    paddingBottom: 24, paddingTop: 10, elevation: 10,
  },
  navItem: { flex: 1, alignItems: 'center' },
  navIcon: { fontSize: 22 },
  navLabel: { fontSize: 11, color: '#888', marginTop: 3 },
  navActive: { color: '#0D1B3E', fontWeight: '600' },
});