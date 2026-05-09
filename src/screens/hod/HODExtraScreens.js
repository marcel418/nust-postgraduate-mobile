// src/screens/hod/HODSubmissionsScreen.js
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import HODHeader from '../../components/HODHeader';
import { getHODSubmissions } from '../../services/hodApi';

const getStatusColor = (s) => ({ WITH_HOD: '#F59E0B', UNDER_INTERNAL_EVAL: '#7C3AED', APPROVED: '#22C55E', REJECTED: '#EF4444' }[s] || '#6B7280');
const getStatusLabel = (s) => ({ WITH_HOD: 'Awaiting Action', UNDER_INTERNAL_EVAL: 'Under Review', APPROVED: 'Approved', REJECTED: 'Rejected' }[s] || s);

export function HODSubmissionsScreen({ navigation, route }) {
  const filter = route?.params?.filter || null;
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await getHODSubmissions();
      setSubmissions(filter ? data.filter((s) => s.status === filter) : data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color="#1E56A0" /></View>;

  return (
    <View style={s.container}>
      <HODHeader title="Submissions" navigation={navigation} />
      <FlatList
        data={submissions}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('HODReviewSubmission', { submission: item })}>
            <View style={s.cardTop}>
              <View style={s.typePill}><Text style={s.typePillText}>{item.type}</Text></View>
              <View style={[s.statusPill, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={s.statusPillText}>{getStatusLabel(item.status)}</Text>
              </View>
            </View>
            <Text style={s.title} numberOfLines={2}>{item.title}</Text>
            <View style={s.meta}>
              <View style={s.metaRow}><Ionicons name="person-outline" size={14} color="#6B7280" /><Text style={s.metaText}> {item.student.name}</Text></View>
              <View style={s.metaRow}><Ionicons name="school-outline" size={14} color="#6B7280" /><Text style={s.metaText}> {item.supervisor.name}</Text></View>
              <View style={s.metaRow}><Ionicons name="calendar-outline" size={14} color="#F59E0B" /><Text style={[s.metaText, { color: '#F59E0B' }]}> {new Date(item.deadline).toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' })}</Text></View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No submissions found.</Text></View>}
      />
    </View>
  );
}

// ─── Assignments Screen ───────────────────────────────────────────────────────
export function HODAssignmentsScreen({ navigation }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHODSubmissions()
      .then((data) => setSubmissions(data.filter((s) => s.status === 'WITH_HOD')))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color="#1E56A0" /></View>;

  return (
    <View style={s.container}>
      <HODHeader title="Assignments" navigation={navigation} />
      <FlatList
        data={submissions}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.studentName}>{item.student.name}</Text>
            <Text style={s.infoText}>Student No: {item.student.id}</Text>
            <Text style={s.infoText}>Course: {item.student.course}</Text>
            <View style={s.divider} />
            <View style={s.docRow}>
              <View style={s.docIconBox}><Ionicons name="document-attach-outline" size={22} color="#1E56A0" /></View>
              <View style={s.docInfo}>
                <Text style={s.docName}>{item.document}</Text>
                <Text style={s.docSize}>{item.documentSize}</Text>
              </View>
              <TouchableOpacity style={s.openBtn}><Text style={s.openBtnText}>Open</Text></TouchableOpacity>
            </View>
            <View style={s.divider} />
            <TouchableOpacity
              style={s.assignBtn}
              onPress={() => navigation.navigate('HODAssignInternalEvaluator', { submission: item })}
            >
              <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
              <Text style={s.assignBtnText}>Assign Internal Evaluator</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#22C55E" />
            <Text style={s.emptyText}>All submissions have evaluators assigned.</Text>
          </View>
        }
      />
    </View>
  );
}

// ─── Notifications Screen ─────────────────────────────────────────────────────
export function HODNotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([
    { id: 1, message: 'Internal evaluator signed off on Selma Iipinge\'s SOP.', read: false, createdAt: '2026-04-25T08:00:00Z' },
    { id: 2, message: 'New submission received from Prof. Doe for Noel McBride.', read: false, createdAt: '2026-04-20T09:05:00Z' },
    { id: 3, message: 'Anna Shikongo\'s thesis forwarded to FPGC-R.', read: true, createdAt: '2026-04-18T14:35:00Z' },
  ]);

  return (
    <View style={s.container}>
      <HODHeader title="Notifications" navigation={navigation} showBack />
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <View style={[s.notifCard, !item.read && s.notifUnread]}>
            <Ionicons name={item.read ? 'mail-open-outline' : 'mail-unread-outline'} size={22} color={item.read ? '#6B7280' : '#1E56A0'} />
            <View style={s.notifBody}>
              <Text style={[s.notifMessage, !item.read && { fontWeight: '600', color: '#0D1B2A' }]}>{item.message}</Text>
              <Text style={s.notifTime}>{new Date(item.createdAt).toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

// ─── Profile Screen ───────────────────────────────────────────────────────────
export function HODProfileScreen({ navigation }) {
  const profile = { name: 'Prof. Ndapewa Iyambo', email: 'hod@nust.na', role: 'Head of Department', department: 'Software Engineering', phone: '+264 61 207 2000' };
  const initials = profile.name.split(' ').map(w => w[0]).slice(0, 2).join('');

  return (
    <View style={s.container}>
      <HODHeader title="Profile" navigation={navigation} />
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
            <View>
              <Text style={s.infoLabel}>{row.label}</Text>
              <Text style={s.infoValue}>{row.value}</Text>
            </View>
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

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F2F5' },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  typePill: { backgroundColor: '#0D1B2A', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  typePillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  statusPill: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  statusPillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  title: { fontSize: 15, fontWeight: '600', color: '#0D1B2A', lineHeight: 22, marginBottom: 10 },
  meta: { gap: 5 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 13, color: '#6B7280' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, color: '#6B7280', textAlign: 'center' },
  studentName: { fontSize: 16, fontWeight: '600', color: '#0D1B2A', marginBottom: 4 },
  infoText: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  docIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  docSize: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  openBtn: { backgroundColor: '#1E56A0', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  openBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  assignBtn: { backgroundColor: '#1E56A0', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  assignBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  notifCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, flexDirection: 'row', gap: 14 },
  notifUnread: { borderLeftWidth: 4, borderLeftColor: '#1E56A0' },
  notifBody: { flex: 1 },
  notifMessage: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 6 },
  notifTime: { fontSize: 12, color: '#9BA4B5' },
  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1E56A0', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold' },
  profileName: { fontSize: 20, fontWeight: 'bold', color: '#0D1B2A', marginBottom: 8 },
  rolePill: { backgroundColor: '#EFF6FF', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  rolePillText: { fontSize: 13, color: '#1E56A0', fontWeight: '600' },
  infoCard: { backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 16, paddingHorizontal: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoLabel: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#0D1B2A', fontWeight: '500' },
  logoutBtn: { marginHorizontal: 16, marginTop: 16, borderWidth: 1.5, borderColor: '#EF4444', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  logoutText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },
});