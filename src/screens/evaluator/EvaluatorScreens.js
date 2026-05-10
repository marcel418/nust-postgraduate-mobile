// src/screens/evaluator/EvaluatorScreens.js
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { getEvaluatorAssignments, submitEvaluation } from '../../services/sprint2Api';

// ─── Shared Header ────────────────────────────────────────────────────────────
function EvalHeader({ title, navigation, showBack = false }) {
  return (
    <View style={s.header}>
      {showBack
        ? <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        : <Text style={s.headerTitle}>{title}</Text>}
      {showBack && <Text style={s.headerTitleCenter}>{title}</Text>}
      <View style={s.headerIcons}>
        <TouchableOpacity onPress={() => navigation.navigate('EvalNotifications')}>
          <Ionicons name="notifications-outline" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('EvalProfile')}>
          <Ionicons name="person-circle-outline" size={26} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStatusColor = (s) => ({ PENDING: '#F59E0B', IN_PROGRESS: '#7C3AED', COMPLETED: '#22C55E' }[s] || '#6B7280');
const getStatusLabel = (s) => ({ PENDING: 'Pending', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed' }[s] || s);

// ─── Dashboard ────────────────────────────────────────────────────────────────
export function EvaluatorDashboard({ navigation }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEvaluatorAssignments().then(setAssignments).catch(console.error).finally(() => setLoading(false));
  }, []);

  const assigned = assignments.length;
  const pending = assignments.filter(a => a.status === 'PENDING').length;
  const completed = assignments.filter(a => a.status === 'COMPLETED').length;

  const cards = [
    { count: assigned, label: 'Assigned Proposals', icon: 'document-text-outline', color: '#1E56A0', screen: 'EvalEvaluations' },
    { count: pending, label: 'Pending Evaluations', icon: 'time-outline', color: '#F59E0B', screen: 'EvalEvaluations' },
    { count: completed, label: 'Completed', icon: 'checkmark-circle-outline', color: '#22C55E', screen: 'EvalEvaluations' },
  ];

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color="#1E56A0" /></View>;

  return (
    <View style={s.container}>
      <EvalHeader title="Dashboard" navigation={navigation} />
      <ScrollView style={s.body} showsVerticalScrollIndicator={false}>

        {cards.map((card, i) => (
          <View key={i} style={s.statCard}>
            <View style={[s.statIconBox, { backgroundColor: card.color + '18' }]}>
              <Ionicons name={card.icon} size={28} color={card.color} />
            </View>
            <View style={s.statBody}>
              <Text style={s.statNumber}>{card.count}</Text>
              <Text style={s.statLabel}>{card.label}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('EvalTabs', { screen: 'EvalEvaluations' })}>
                <Text style={s.viewMore}>View More Info</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={s.sectionTitle}>Recent Assignments</Text>
        {assignments.slice(0, 2).map((item) => (
          <TouchableOpacity
            key={item.id}
            style={s.card}
            onPress={() => navigation.navigate('EvalProposalDetail', { assignment: item })}
          >
            <View style={s.cardTop}>
              <View style={s.typePill}><Text style={s.typePillText}>{item.type}</Text></View>
              <View style={[s.statusPill, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={s.statusPillText}>{getStatusLabel(item.status)}</Text>
              </View>
            </View>
            <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
            <View style={s.cardMeta}>
              <Ionicons name="person-outline" size={13} color="#6B7280" />
              <Text style={s.cardMetaText}> {item.student.name}</Text>
              <Text style={s.cardMetaSep}>  ·  </Text>
              <Ionicons name="calendar-outline" size={13} color="#F59E0B" />
              <Text style={[s.cardMetaText, { color: '#F59E0B' }]}> {new Date(item.deadline).toLocaleDateString('en-NA', { day: 'numeric', month: 'short' })}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Evaluations List ─────────────────────────────────────────────────────────
export function EvaluatorEvaluations({ navigation }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEvaluatorAssignments().then(setAssignments).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color="#1E56A0" /></View>;

  return (
    <View style={s.container}>
      <EvalHeader title="Evaluations" navigation={navigation} />
      <FlatList
        data={assignments}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            onPress={() => navigation.navigate('EvalProposalDetail', { assignment: item })}
          >
            <View style={s.cardTop}>
              <View style={s.typePill}><Text style={s.typePillText}>{item.type}</Text></View>
              <View style={[s.statusPill, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={s.statusPillText}>{getStatusLabel(item.status)}</Text>
              </View>
            </View>
            <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={s.infoText}>{item.student.name} · {item.student.course}</Text>
            <View style={s.cardMeta}>
              <Ionicons name="calendar-outline" size={13} color="#F59E0B" />
              <Text style={[s.cardMetaText, { color: '#F59E0B' }]}> Deadline: {new Date(item.deadline).toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// ─── Evaluate Proposal ────────────────────────────────────────────────────────
export function EvaluatorProposalDetail({ route, navigation }) {
  const { assignment } = route.params;
  const [checklist, setChecklist] = useState({ problemClarity: false, methodology: false, feasibility: false });
  const [comments, setComments] = useState('');
  const [decision, setDecision] = useState(null);
  const [showDecisions, setShowDecisions] = useState(false);
  const [loading, setLoading] = useState(false);

  const decisions = ['Approve', 'Minor Revisions', 'Reject'];
  const checkItems = [
    { key: 'problemClarity', label: 'Problem clarity' },
    { key: 'methodology', label: 'Methodology' },
    { key: 'feasibility', label: 'Feasibility' },
  ];

  const handleSubmit = async () => {
    if (!decision) return Alert.alert('Required', 'Please select a decision.');
    if (!comments.trim()) return Alert.alert('Required', 'Please add evaluation comments.');
    setLoading(true);
    try {
      await submitEvaluation(assignment.id, { checklist, comments, decision });
      Alert.alert('Submitted', 'Your evaluation has been submitted successfully.', [
        { text: 'OK', onPress: () => navigation.navigate('EvalTabs', { screen: 'EvalHome' }) },
      ]);
    } catch { Alert.alert('Error', 'Could not submit evaluation. Try again.'); }
    finally { setLoading(false); }
  };

  return (
    <View style={s.container}>
      <EvalHeader title="Evaluate Proposal" navigation={navigation} showBack />
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Document */}
        <View style={s.card}>
          <View style={s.docRow}>
            <View style={s.docIconBox}><Ionicons name="document-attach-outline" size={22} color="#1E56A0" /></View>
            <View style={s.docInfo}>
              <Text style={s.docName}>{assignment.document}</Text>
              <Text style={s.docSize}>{assignment.documentSize}</Text>
            </View>
            <TouchableOpacity style={s.openBtn}><Text style={s.openBtnText}>Open</Text></TouchableOpacity>
          </View>
        </View>

        {/* Checklist */}
        <View style={s.card}>
          {checkItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[s.checkRow, checklist[item.key] && s.checkRowActive]}
              onPress={() => setChecklist(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
            >
              <View style={[s.checkBox, checklist[item.key] && s.checkBoxActive]}>
                {checklist[item.key] && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={[s.checkLabel, checklist[item.key] && { color: '#0D1B2A', fontWeight: '600' }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Comments */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Comments</Text>
          <TextInput
            style={s.textArea}
            placeholder="Add evaluation comments..."
            placeholderTextColor="#9BA4B5"
            value={comments}
            onChangeText={setComments}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Decision */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Select student</Text>
          <TouchableOpacity style={s.dropdown} onPress={() => setShowDecisions(!showDecisions)}>
            <Text style={[s.dropdownText, !decision && { color: '#9BA4B5' }]}>{decision || 'Select'}</Text>
            <Ionicons name={showDecisions ? 'chevron-up' : 'chevron-down'} size={18} color="#6B7280" />
          </TouchableOpacity>
          {showDecisions && (
            <View style={s.dropdownList}>
              {decisions.map((d) => (
                <TouchableOpacity key={d} style={[s.dropdownItem, decision === d && s.dropdownItemActive]} onPress={() => { setDecision(d); setShowDecisions(false); }}>
                  <Text style={[s.dropdownItemText, decision === d && { color: '#1E56A0', fontWeight: '700' }]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Submit */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Submit Evaluation</Text>
          <TouchableOpacity style={[s.submitBtn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.submitBtnText}>Submit Evaluation</Text>}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────────
export function EvaluatorProfile({ navigation }) {
  const profile = { name: 'Dr. Nakashole', email: 'eval@nust.na', role: 'Internal Evaluator', department: 'Computer Science', phone: '+264 61 207 2100' };
  const initials = profile.name.split(' ').map(w => w[0]).slice(0, 2).join('');
  return (
    <View style={s.container}>
      <EvalHeader title="Profile" navigation={navigation} />
      <View style={s.avatarSection}>
        <View style={s.avatar}><Text style={s.avatarText}>{initials}</Text></View>
        <Text style={s.profileName}>{profile.name}</Text>
        <View style={s.rolePill}><Text style={s.rolePillText}>{profile.role}</Text></View>
      </View>
      <View style={s.infoCard}>
        {[
          { icon: 'mail-outline', label: 'Email', value: profile.email },
          { icon: 'business-outline', label: 'Department', value: profile.department },
          { icon: 'call-outline', label: 'Phone', value: profile.phone },
        ].map((row, i, arr) => (
          <View key={i} style={[s.infoRow, i < arr.length - 1 && s.infoRowBorder]}>
            <Ionicons name={row.icon} size={20} color="#1E56A0" style={{ width: 28 }} />
            <View><Text style={s.infoLabel}>{row.label}</Text><Text style={s.infoValue}>{row.value}</Text></View>
          </View>
        ))}
      </View>
      <TouchableOpacity style={s.logoutBtn} onPress={() => navigation.replace('RoleSelect')}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={s.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Notifications ────────────────────────────────────────────────────────────
export function EvaluatorNotifications({ navigation }) {
  const notifs = [
    { id: 1, message: 'New proposal assigned: Noel McBride\'s SOP is ready for evaluation.', read: false, date: '2026-04-25' },
    { id: 2, message: 'Reminder: Evaluation deadline for Anna Shikongo is in 3 days.', read: true, date: '2026-04-22' },
  ];
  return (
    <View style={s.container}>
      <EvalHeader title="Notifications" navigation={navigation} showBack />
      <FlatList
        data={notifs}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <View style={[s.notifCard, !item.read && s.notifUnread]}>
            <Ionicons name={item.read ? 'mail-open-outline' : 'mail-unread-outline'} size={22} color={item.read ? '#6B7280' : '#1E56A0'} />
            <View style={s.notifBody}>
              <Text style={[s.notifMessage, !item.read && { fontWeight: '600', color: '#0D1B2A' }]}>{item.message}</Text>
              <Text style={s.notifTime}>{item.date}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F2F5' },
  header: { backgroundColor: '#0D1B2A', paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  headerTitleCenter: { color: '#fff', fontSize: 20, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  headerIcons: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  body: { padding: 16 },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 40 },
  statCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  statIconBox: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  statBody: { flex: 1 },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: '#0D1B2A' },
  statLabel: { fontSize: 14, color: '#6B7280', marginTop: 2, marginBottom: 4 },
  viewMore: { fontSize: 13, color: '#1E56A0', fontWeight: '500' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0D1B2A', marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 0 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  typePill: { backgroundColor: '#0D1B2A', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  typePillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  statusPill: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  statusPillText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A', lineHeight: 22, marginBottom: 8 },
  infoText: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  cardMeta: { flexDirection: 'row', alignItems: 'center' },
  cardMetaText: { fontSize: 13, color: '#6B7280' },
  cardMetaSep: { color: '#D1D5DB' },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  docIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  docSize: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  openBtn: { backgroundColor: '#1E56A0', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  openBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  checkRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: '#E5E7EB', gap: 12 },
  checkRowActive: { borderColor: '#22C55E', backgroundColor: '#F0FDF4' },
  checkBox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  checkBoxActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  checkLabel: { fontSize: 14, color: '#6B7280' },
  textArea: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, color: '#0D1B2A', minHeight: 100, textAlignVertical: 'top' },
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14 },
  dropdownText: { fontSize: 14, color: '#0D1B2A' },
  dropdownList: { marginTop: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, overflow: 'hidden' },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownItemActive: { backgroundColor: '#EFF6FF' },
  dropdownItemText: { fontSize: 14, color: '#0D1B2A' },
  submitBtn: { backgroundColor: '#1E56A0', borderRadius: 12, padding: 15, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1E56A0', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  profileName: { fontSize: 20, fontWeight: 'bold', color: '#0D1B2A', marginBottom: 8 },
  rolePill: { backgroundColor: '#EFF6FF', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  rolePillText: { fontSize: 13, color: '#1E56A0', fontWeight: '600' },
  infoCard: { backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16, paddingHorizontal: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoLabel: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#0D1B2A', fontWeight: '500' },
  logoutBtn: { marginHorizontal: 16, marginTop: 16, borderWidth: 1.5, borderColor: '#EF4444', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  logoutText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },
  notifCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', gap: 14 },
  notifUnread: { borderLeftWidth: 4, borderLeftColor: '#1E56A0' },
  notifBody: { flex: 1 },
  notifMessage: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 6 },
  notifTime: { fontSize: 12, color: '#9BA4B5' },
});