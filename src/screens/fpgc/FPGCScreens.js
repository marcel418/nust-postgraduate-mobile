// src/screens/fpgc/FPGCScreens.js
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { getFpgcApplications, getFpgcExternalProposals, approveFpgcExternalEvaluator } from '../../services/sprint2Api';

function FPGCHeader({ title, navigation, showBack = false }) {
  return (
    <View style={s.header}>
      {showBack
        ? <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        : <Text style={s.headerTitle}>{title}</Text>}
      {showBack && <Text style={s.headerTitleCenter}>{title}</Text>}
      <View style={s.headerIcons}>
        <TouchableOpacity onPress={() => navigation.navigate('FPGCNotifications')}>
          <Ionicons name="notifications-outline" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('FPGCProfile')}>
          <Ionicons name="person-circle-outline" size={26} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStatusColor = (s) => ({ SUBMITTED: '#F59E0B', ACCEPTED: '#22C55E', REJECTED: '#EF4444' }[s] || '#6B7280');
const getStatusLabel = (s) => ({ SUBMITTED: 'Submitted', ACCEPTED: 'Accepted', REJECTED: 'Rejected' }[s] || s);

// ─── Dashboard ────────────────────────────────────────────────────────────────
export function FPGCDashboard({ navigation }) {
  const [applications, setApplications] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getFpgcApplications(), getFpgcExternalProposals()])
      .then(([apps, props]) => { setApplications(apps); setProposals(props); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const appsCount = applications.length;
  const supervisorCount = applications.filter(a => !a.supervisor).length;
  const externalCount = proposals.length;

  const cards = [
    { count: appsCount, label: 'Applications', icon: 'document-text-outline', color: '#1E56A0', screen: 'FPGCApplications' },
    { count: supervisorCount, label: 'Assign supervisors', icon: 'person-add-outline', color: '#F59E0B', screen: 'FPGCApplications' },
    { count: externalCount, label: 'External examiners', icon: 'people-outline', color: '#7C3AED', screen: 'FPGCAssignments' },
  ];

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color="#1E56A0" /></View>;

  return (
    <View style={s.container}>
      <FPGCHeader title="Dashboard" navigation={navigation} />
      <ScrollView style={s.body} showsVerticalScrollIndicator={false}>

        {cards.map((card, i) => (
          <View key={i} style={s.statCard}>
            <View style={[s.statIconBox, { backgroundColor: card.color + '18' }]}>
              <Ionicons name={card.icon} size={28} color={card.color} />
            </View>
            <View style={s.statBody}>
              <Text style={s.statNumber}>{card.count}</Text>
              <Text style={s.statLabel}>{card.label}</Text>
              <TouchableOpacity onPress={() => navigation.navigate(card.screen)}>
                <Text style={s.viewMore}>View More Info</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={s.sectionTitle}>Recent Applications</Text>
        {applications.map((item) => (
          <View key={item.id} style={s.card}>
            <View style={s.cardTop}>
              <Text style={s.studentName}>{item.student.name}</Text>
              <View style={[s.statusPill, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={s.statusPillText}>{getStatusLabel(item.status)}</Text>
              </View>
            </View>
            <Text style={s.infoText}>{item.student.course}</Text>
            <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
            {item.supervisor
              ? <View style={s.supervisorRow}><Ionicons name="school-outline" size={14} color="#22C55E" /><Text style={[s.infoText, { color: '#22C55E', marginBottom: 0 }]}> {item.supervisor.name}</Text></View>
              : (
                <TouchableOpacity style={s.assignSuperBtn} onPress={() => navigation.navigate('FPGCTabs', { screen: 'FPGCApplications' })}>
                  <Ionicons name="person-add-outline" size={15} color="#1E56A0" />
                  <Text style={s.assignSuperText}>Assign Supervisor</Text>
                </TouchableOpacity>
              )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Applications List ────────────────────────────────────────────────────────
export function FPGCApplications({ navigation }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFpgcApplications().then(setApplications).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color="#1E56A0" /></View>;

  return (
    <View style={s.container}>
      <FPGCHeader title="Applications" navigation={navigation} />
      <FlatList
        data={applications}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardTop}>
              <Text style={s.studentName}>{item.student.name}</Text>
              <View style={[s.statusPill, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={s.statusPillText}>{getStatusLabel(item.status)}</Text>
              </View>
            </View>
            <Text style={s.infoText}>{item.student.course}</Text>
            <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
            {item.supervisor
              ? <View style={s.supervisorRow}><Ionicons name="school-outline" size={14} color="#22C55E" /><Text style={[s.infoText, { color: '#22C55E', marginBottom: 0 }]}> Supervisor: {item.supervisor.name}</Text></View>
              : (
                <TouchableOpacity
                  style={s.assignSuperBtn}
                  onPress={() => Alert.alert('Assign Supervisor', 'Supervisor assignment flow coming soon.')}
                >
                  <Ionicons name="person-add-outline" size={15} color="#1E56A0" />
                  <Text style={s.assignSuperText}>Assign Supervisor</Text>
                </TouchableOpacity>
              )}
          </View>
        )}
      />
    </View>
  );
}

// ─── Assign External Examiner ─────────────────────────────────────────────────
export function FPGCAssignments({ navigation }) {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState({});
  const [submitting, setSubmitting] = useState(null);

  useEffect(() => {
    getFpgcExternalProposals().then(setProposals).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleApprove = async (proposalId, evaluator) => {
    setSubmitting(proposalId);
    try {
      await approveFpgcExternalEvaluator(proposalId, evaluator.id);
      Alert.alert('Assigned', `${evaluator.name} has been confirmed as external examiner.`);
    } catch { Alert.alert('Error', 'Could not assign. Try again.'); }
    finally { setSubmitting(null); }
  };

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color="#1E56A0" /></View>;

  return (
    <View style={s.container}>
      <FPGCHeader title="Assignments" navigation={navigation} />
      <FlatList
        data={proposals}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={s.list}
        ListHeaderComponent={<Text style={[s.sectionTitle, { marginBottom: 4 }]}>Assign External Examiners</Text>}
        renderItem={({ item }) => (
          <View>
            {/* Student info */}
            <View style={s.card}>
              <Text style={s.studentName}>{item.student.name}</Text>
              <Text style={s.infoText}>{item.student.course}</Text>
              <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={s.proposedByText}>Proposed by: {item.proposedBy}</Text>
            </View>

            {/* Evaluator cards */}
            <Text style={[s.subTitle, { marginTop: 8 }]}>Proposed Evaluators</Text>
            {item.evaluators.map((ev) => {
              const isSelected = selected[item.id]?.id === ev.id;
              return (
                <TouchableOpacity
                  key={ev.id}
                  style={[s.evalCard, isSelected && s.evalCardSelected]}
                  onPress={() => setSelected(prev => ({ ...prev, [item.id]: ev }))}
                >
                  <View style={s.evalTop}>
                    <View style={s.evalAvatar}>
                      <Text style={s.evalAvatarText}>{ev.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</Text>
                    </View>
                    <View style={s.evalInfo}>
                      <Text style={s.evalName}>{ev.name}</Text>
                      <Text style={s.evalInst}>{ev.institution}</Text>
                      <Text style={s.evalExpertise}>{ev.expertise}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={24} color="#1E56A0" />}
                  </View>
                  <View style={s.matchRow}>
                    <Text style={s.matchLabel}>Expertise Match</Text>
                    <View style={s.matchBarBg}>
                      <View style={[s.matchBarFill, { width: `${ev.match}%` }]}>
                        <Text style={s.matchBarText}>{ev.match}%</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Approve button */}
            <View style={s.card}>
              <Text style={s.sectionTitle}>Approve Examiner</Text>
              {selected[item.id] && <Text style={s.selectedLabel}>Selected: {selected[item.id].name}</Text>}
              <TouchableOpacity
                style={[s.approveBtn, (!selected[item.id] || submitting === item.id) && { opacity: 0.6 }]}
                onPress={() => selected[item.id] && handleApprove(item.id, selected[item.id])}
                disabled={!selected[item.id] || submitting === item.id}
              >
                {submitting === item.id
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.approveBtnText}>Assign</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No external evaluator proposals yet.</Text></View>}
      />
    </View>
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────────
export function FPGCProfile({ navigation }) {
  const profile = { name: 'Prof. Amupolo', email: 'fpgc@nust.na', role: 'FPGC', department: 'Faculty Postgraduate Committee', phone: '+264 61 207 2300' };
  const initials = profile.name.split(' ').map(w => w[0]).slice(0, 2).join('');
  return (
    <View style={s.container}>
      <FPGCHeader title="Profile" navigation={navigation} />
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
export function FPGCNotifications({ navigation }) {
  const notifs = [
    { id: 1, message: 'External evaluator proposals received from HoD for Emily Carter.', read: false, date: '2026-04-29' },
    { id: 2, message: 'New PG application received from Martha Stewart.', read: true, date: '2026-04-26' },
  ];
  return (
    <View style={s.container}>
      <FPGCHeader title="Notifications" navigation={navigation} showBack />
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
  statCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  statIconBox: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  statBody: { flex: 1 },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: '#0D1B2A' },
  statLabel: { fontSize: 14, color: '#6B7280', marginTop: 2, marginBottom: 4 },
  viewMore: { fontSize: 13, color: '#1E56A0', fontWeight: '500' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0D1B2A', marginBottom: 10 },
  subTitle: { fontSize: 15, fontWeight: '700', color: '#0D1B2A', marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  studentName: { fontSize: 16, fontWeight: '600', color: '#0D1B2A' },
  statusPill: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  statusPillText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  infoText: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  cardTitle: { fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 8 },
  supervisorRow: { flexDirection: 'row', alignItems: 'center' },
  assignSuperBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EFF6FF', borderRadius: 10, padding: 10, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#BFDBFE' },
  assignSuperText: { color: '#1E56A0', fontSize: 13, fontWeight: '600' },
  proposedByText: { fontSize: 12, color: '#7C3AED', marginTop: 4 },
  evalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 2, borderColor: 'transparent', marginBottom: 8 },
  evalCardSelected: { borderColor: '#1E56A0' },
  evalTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  evalAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#0D1B2A', justifyContent: 'center', alignItems: 'center' },
  evalAvatarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  evalInfo: { flex: 1 },
  evalName: { fontSize: 15, fontWeight: '700', color: '#0D1B2A' },
  evalInst: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  evalExpertise: { fontSize: 12, color: '#9BA4B5', marginTop: 2 },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  matchLabel: { fontSize: 13, fontWeight: '600', color: '#0D1B2A', width: 110 },
  matchBarBg: { flex: 1, height: 22, backgroundColor: '#E5E7EB', borderRadius: 11, overflow: 'hidden' },
  matchBarFill: { height: '100%', backgroundColor: '#1E56A0', borderRadius: 11, justifyContent: 'center', minWidth: 40 },
  matchBarText: { color: '#fff', fontSize: 11, fontWeight: 'bold', paddingLeft: 8 },
  selectedLabel: { fontSize: 14, color: '#1E56A0', fontWeight: '500', marginBottom: 12 },
  approveBtn: { backgroundColor: '#22C55E', borderRadius: 12, padding: 15, alignItems: 'center' },
  approveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 15, color: '#6B7280' },
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