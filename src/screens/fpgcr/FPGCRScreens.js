// src/screens/fpgcr/FPGCRScreens.js
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { getFpgcrSubmissions, submitHdcDecision, notifyParties } from '../../services/sprint2Api';

function FPGCRHeader({ title, navigation, showBack = false }) {
  return (
    <View style={s.header}>
      {showBack
        ? <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        : <Text style={s.headerTitle}>{title}</Text>}
      {showBack && <Text style={s.headerTitleCenter}>{title}</Text>}
      <View style={s.headerIcons}>
        <TouchableOpacity onPress={() => navigation.navigate('FPGCRNotifications')}>
          <Ionicons name="notifications-outline" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('FPGCRProfile')}>
          <Ionicons name="person-circle-outline" size={26} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStatusColor = (status) => ({ WITH_FPGC_R: '#F59E0B', WITH_HDC: '#7C3AED', APPROVED: '#22C55E', REJECTED: '#EF4444' }[status] || '#6B7280');
const getStatusLabel = (status) => ({ WITH_FPGC_R: 'Under Review', WITH_HDC: 'With HDC', APPROVED: 'Approved', REJECTED: 'Rejected' }[status] || status);

export function FPGCRDashboard({ navigation }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFpgcrSubmissions().then(setSubmissions).catch(console.error).finally(() => setLoading(false));
  }, []);

  const hodCount = submissions.length;
  const pendingHdc = submissions.filter(s => s.status === 'WITH_FPGC_R').length;
  const completed = submissions.filter(s => s.status === 'APPROVED').length;

  const cards = [
    { count: hodCount, label: 'HoD submissions', icon: 'documents-outline', color: '#1E56A0' },
    { count: pendingHdc, label: 'Pending HDC', icon: 'chatbubble-ellipses-outline', color: '#F59E0B' },
    { count: completed, label: 'Completed', icon: 'checkmark-circle-outline', color: '#22C55E' },
  ];

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color="#1E56A0" /></View>;

  return (
    <View style={s.container}>
      <FPGCRHeader title="Dashboard" navigation={navigation} />
      <ScrollView style={s.body} showsVerticalScrollIndicator={false}>
        {cards.map((card, i) => (
          <View key={i} style={s.statCard}>
            <View style={[s.statIconBox, { backgroundColor: card.color + '18' }]}>
              <Ionicons name={card.icon} size={28} color={card.color} />
            </View>
            <View style={s.statBody}>
              <Text style={s.statNumber}>{card.count}</Text>
              <Text style={s.statLabel}>{card.label}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('FPGCRTabs', { screen: 'FPGCRReviews' })}>
                <Text style={s.viewMore}>View More Info</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={s.sectionTitle}>Submissions to Review</Text>
        {submissions.filter(sub => sub.status === 'WITH_FPGC_R').map((item) => (
          <TouchableOpacity key={item.id} style={s.card} onPress={() => navigation.navigate('FPGCRHdcDecision', { submission: item })}>
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
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export function FPGCRReviews({ navigation }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFpgcrSubmissions().then(setSubmissions).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color="#1E56A0" /></View>;

  return (
    <View style={s.container}>
      <FPGCRHeader title="Reviews" navigation={navigation} />
      <FlatList
        data={submissions}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('FPGCRHdcDecision', { submission: item })}>
            <View style={s.cardTop}>
              <View style={s.typePill}><Text style={s.typePillText}>{item.type}</Text></View>
              <View style={[s.statusPill, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={s.statusPillText}>{getStatusLabel(item.status)}</Text>
              </View>
            </View>
            <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={s.infoText}>{item.student.name} · {item.student.course}</Text>
            {item.hodNotes && (
              <View style={s.noteRow}>
                <Ionicons name="information-circle-outline" size={14} color="#1E56A0" />
                <Text style={s.noteText}> HoD: {item.hodNotes}</Text>
              </View>
            )}
            <View style={s.cardMeta}>
              <Ionicons name="person-outline" size={13} color="#7C3AED" />
              <Text style={[s.cardMetaText, { color: '#7C3AED' }]}> Proposed: {item.proposedExternal}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

export function FPGCRHdcDecision({ route, navigation }) {
  const { submission } = route.params;
  const [decision, setDecision] = useState(null);
  const [showDecisions, setShowDecisions] = useState(false);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const decisions = ['Approve', 'Minor Revisions', 'Reject'];

  const handleNotify = async () => {
    if (!decision) return Alert.alert('Required', 'Please select a decision.');
    setLoading(true);
    try {
      await submitHdcDecision(submission.id, decision, comments);
      await notifyParties(submission.id);
      Alert.alert('Done', 'Decision recorded and all parties notified.', [
        { text: 'OK', onPress: () => navigation.navigate('FPGCRTabs', { screen: 'FPGCRHome' }) },
      ]);
    } catch { Alert.alert('Error', 'Could not record decision. Try again.'); }
    finally { setLoading(false); }
  };

  return (
    <View style={s.container}>
      <FPGCRHeader title="HDC Decision" navigation={navigation} showBack />
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <View style={s.docRow}>
            <View style={s.docIconBox}><Ionicons name="document-attach-outline" size={22} color="#1E56A0" /></View>
            <View style={s.docInfo}>
              <Text style={s.docName}>{submission.document}</Text>
              <Text style={s.docSize}>{submission.documentSize}</Text>
            </View>
            <TouchableOpacity style={s.openBtn}><Text style={s.openBtnText}>Open</Text></TouchableOpacity>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.studentName}>{submission.student.name}</Text>
          <Text style={s.infoText}>{submission.student.course}</Text>
          <Text style={s.infoText} numberOfLines={2}>{submission.title}</Text>
          {submission.hodNotes && (
            <View style={[s.noteRow, { marginTop: 8 }]}>
              <Ionicons name="information-circle-outline" size={16} color="#1E56A0" />
              <Text style={s.noteText}> HoD Notes: {submission.hodNotes}</Text>
            </View>
          )}
        </View>

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

        <View style={s.card}>
          <Text style={s.sectionTitle}>Comments</Text>
          <TextInput style={s.textArea} placeholder="Add evaluation comments..." placeholderTextColor="#9BA4B5" value={comments} onChangeText={setComments} multiline numberOfLines={4} />
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Notify Student</Text>
          <TouchableOpacity style={[s.notifyBtn, loading && { opacity: 0.6 }]} onPress={handleNotify} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.notifyBtnText}>Notify</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

export function FPGCRDecisions({ navigation }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFpgcrSubmissions().then(data => setSubmissions(data.filter(sub => sub.status === 'APPROVED'))).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color="#1E56A0" /></View>;

  return (
    <View style={s.container}>
      <FPGCRHeader title="Decisions" navigation={navigation} />
      <FlatList
        data={submissions}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardTop}>
              <View style={s.typePill}><Text style={s.typePillText}>{item.type}</Text></View>
              <View style={[s.statusPill, { backgroundColor: '#22C55E' }]}><Text style={s.statusPillText}>Approved</Text></View>
            </View>
            <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={s.infoText}>{item.student.name}</Text>
          </View>
        )}
        ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No decisions recorded yet.</Text></View>}
      />
    </View>
  );
}

export function FPGCRProfile({ navigation }) {
  const profile = { name: 'Dr. Helena Shikongo', email: 'fpgcr@nust.na', role: 'FPGC-R', department: 'Faculty Postgraduate Committee', phone: '+264 61 207 2200' };
  const initials = profile.name.split(' ').map(w => w[0]).slice(0, 2).join('');
  return (
    <View style={s.container}>
      <FPGCRHeader title="Profile" navigation={navigation} />
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

export function FPGCRNotifications({ navigation }) {
  const notifs = [
    { id: 1, message: "New submission received from HoD: Noel McBride's SOP.", read: false, date: '2026-04-28' },
    { id: 2, message: 'HDC meeting scheduled for 12 May 2026.', read: true, date: '2026-04-25' },
  ];
  return (
    <View style={s.container}>
      <FPGCRHeader title="Notifications" navigation={navigation} showBack />
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
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  typePill: { backgroundColor: '#0D1B2A', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  typePillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  statusPill: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  statusPillText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A', lineHeight: 22, marginBottom: 8 },
  infoText: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  cardMetaText: { fontSize: 13, color: '#6B7280' },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start' },
  noteText: { fontSize: 13, color: '#1E56A0', flex: 1, lineHeight: 18 },
  studentName: { fontSize: 16, fontWeight: '600', color: '#0D1B2A', marginBottom: 4 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  docIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  docSize: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  openBtn: { backgroundColor: '#1E56A0', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  openBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14 },
  dropdownText: { fontSize: 14, color: '#0D1B2A' },
  dropdownList: { marginTop: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, overflow: 'hidden' },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownItemActive: { backgroundColor: '#EFF6FF' },
  dropdownItemText: { fontSize: 14, color: '#0D1B2A' },
  textArea: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, color: '#0D1B2A', minHeight: 100, textAlignVertical: 'top' },
  notifyBtn: { backgroundColor: '#1E56A0', borderRadius: 12, padding: 15, alignItems: 'center' },
  notifyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
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