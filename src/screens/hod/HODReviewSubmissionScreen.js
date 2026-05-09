// src/screens/hod/HODReviewSubmissionScreen.js
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import HODHeader from '../../components/HODHeader';
import { submitHODDecision } from '../../services/hodApi';

export default function HODReviewSubmissionScreen({ route, navigation }) {
  const { submission } = route.params;
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const hasEval = !!submission.evaluation;

  const handleDecision = (decision) => {
    const labels = { approve: 'Approve', reject: 'Reject', return: 'Return' };
    Alert.alert(`${labels[decision]} Submission`, `Are you sure you want to ${labels[decision].toLowerCase()} this submission?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        style: decision === 'reject' ? 'destructive' : 'default',
        onPress: async () => {
          setLoading(true);
          try {
            await submitHODDecision(submission.id, decision, notes);
            if (decision === 'approve') {
              navigation.navigate('HODProposeExternal', { submission });
            } else {
              Alert.alert('Done', `Submission has been ${labels[decision].toLowerCase()}ed.`, [
                { text: 'OK', onPress: () => navigation.navigate('HODSubmissions') },
              ]);
            }
          } catch { Alert.alert('Error', 'Could not process decision.'); }
          finally { setLoading(false); }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <HODHeader title="Review Submission" navigation={navigation} showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Student Info */}
        <View style={styles.card}>
          <Text style={styles.studentName}>{submission.student.name}</Text>
          <Text style={styles.infoText}>Student No: {submission.student.id}</Text>
          <Text style={styles.infoText}>Course: {submission.student.course}</Text>
        </View>

        {/* Document */}
        <View style={styles.card}>
          <View style={styles.docRow}>
            <View style={styles.docIconBox}>
              <Ionicons name="document-attach-outline" size={24} color="#1E56A0" />
            </View>
            <View style={styles.docInfo}>
              <Text style={styles.docName}>{submission.document}</Text>
              <Text style={styles.docSize}>{submission.documentSize}</Text>
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
            <View style={styles.supervisorAvatar}>
              <Text style={styles.supervisorAvatarText}>
                {submission.supervisor.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
              </Text>
            </View>
            <Text style={styles.supervisorName}>{submission.supervisor.name} · {submission.supervisor.role}</Text>
          </View>
          <Text style={styles.supervisorMessage}>{submission.supervisorNote.message}</Text>
          <Text style={styles.timeAgo}>{submission.supervisorNote.timeAgo}</Text>
        </View>

        {/* Internal Evaluation Result */}
        {hasEval && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Internal Evaluation Result</Text>
            {submission.evaluation.checklist.map((item, i) => (
              <View key={i} style={styles.checkRow}>
                <View style={styles.checkIcon}>
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </View>
                <Text style={styles.checkLabel}>{item.label}: <Text style={styles.checkResult}>{item.result}</Text></Text>
              </View>
            ))}
            <View style={styles.decisionRow}>
              <Text style={styles.decisionLabel}>Decision</Text>
              <View style={styles.decisionBadge}>
                <Text style={styles.decisionText}>{submission.evaluation.decision}</Text>
              </View>
            </View>
          </View>
        )}

        {/* HoD Notes */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Your Notes (optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add notes before making a decision..."
            placeholderTextColor="#9BA4B5"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Assign Evaluator shortcut */}
        {!hasEval && (
          <TouchableOpacity
            style={styles.assignLink}
            onPress={() => navigation.navigate('HODAssignInternalEvaluator', { submission })}
          >
            <Ionicons name="person-add-outline" size={18} color="#1E56A0" />
            <Text style={styles.assignLinkText}>Assign Internal Evaluator first →</Text>
          </TouchableOpacity>
        )}

        {/* Action Buttons */}
        {hasEval && (
          <View style={styles.card}>
            {loading ? <ActivityIndicator size="large" color="#1E56A0" /> : (
              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#22C55E' }]} onPress={() => handleDecision('approve')}>
                  <Text style={styles.actionBtnText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EF4444' }]} onPress={() => handleDecision('reject')}>
                  <Text style={styles.actionBtnText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]} onPress={() => handleDecision('return')}>
                  <Text style={styles.actionBtnText}>Return</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16 },
  studentName: { fontSize: 16, fontWeight: '600', color: '#0D1B2A', marginBottom: 4 },
  infoText: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  docIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  docSize: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  openBtn: { backgroundColor: '#1E56A0', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  openBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0D1B2A', marginBottom: 12 },
  supervisorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  supervisorAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1E56A0', justifyContent: 'center', alignItems: 'center' },
  supervisorAvatarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
  supervisorName: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  supervisorMessage: { fontSize: 14, color: '#6B7280', lineHeight: 21, marginBottom: 6 },
  timeAgo: { fontSize: 12, color: '#9BA4B5' },
  checkRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  checkIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  checkLabel: { fontSize: 14, color: '#0D1B2A' },
  checkResult: { fontWeight: '700' },
  decisionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  decisionLabel: { fontSize: 15, fontWeight: '700', color: '#0D1B2A' },
  decisionBadge: { backgroundColor: '#F59E0B', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  decisionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  notesInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, color: '#0D1B2A', minHeight: 80, textAlignVertical: 'top' },
  assignLink: { backgroundColor: '#EFF6FF', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#BFDBFE' },
  assignLinkText: { color: '#1E56A0', fontSize: 14, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  actionBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});