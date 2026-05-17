import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getExternalEvaluatorAssignments,
  getExternalEvaluatorClaims,
  getExternalEvaluatorDashboard,
  getExternalEvaluatorNotifications,
  getExternalEvaluatorProfile,
  submitExternalEvaluation,
  submitHonorariumClaim,
  updateExternalEvaluatorProfile,
} from '../../services/sprint2Api';

const colors = {
  header: '#0D1B2A',
  primary: '#1E56A0',
  background: '#F0F2F5',
  card: '#FFFFFF',
  text: '#0D1B2A',
  muted: '#6B7280',
  softBlue: '#EFF6FF',
};

function ExtHeader({ title, navigation, showBack = false }) {
  return (
    <View style={s.header}>
      {showBack ? (
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      ) : (
        <Text style={s.headerTitle}>{title}</Text>
      )}
      {showBack && <Text style={s.headerTitleCenter}>{title}</Text>}
      <View style={s.headerIcons}>
        <TouchableOpacity onPress={() => navigation.navigate('ExtNotifications')}>
          <Ionicons name="notifications-outline" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('ExtProfile')}>
          <Ionicons name="person-circle-outline" size={26} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const statusLabel = (status) => ({ PENDING: 'Pending', IN_REVIEW: 'In Review', COMPLETED: 'Completed' }[status] || status);
const statusColor = (status) => ({ PENDING: '#F59E0B', IN_REVIEW: '#7C3AED', COMPLETED: '#22C55E' }[status] || '#6B7280');

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function initials(name) {
  return name.split(' ').map((word) => word[0]).slice(0, 2).join('');
}

export function ExternalEvaluatorDashboard({ navigation }) {
  const [dashboard, setDashboard] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getExternalEvaluatorDashboard(), getExternalEvaluatorAssignments()])
      .then(([summary, data]) => {
        setDashboard(summary);
        setAssignments(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const cards = useMemo(() => ([
    { count: dashboard?.assigned ?? 0, label: 'Assigned Theses', icon: 'document-text-outline', color: colors.primary, screen: 'ExtTheses' },
    { count: dashboard?.pending ?? 0, label: 'Pending Grading', icon: 'time-outline', color: '#F59E0B', screen: 'ExtTheses' },
    { count: dashboard?.claims ?? 0, label: 'Claims', icon: 'wallet-outline', color: '#7C3AED', screen: 'ExtClaims' },
  ]), [dashboard]);

  if (loading) {
    return <View style={s.loading}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={s.container}>
      <ExtHeader title="Dashboard" navigation={navigation} />
      <ScrollView style={s.body} showsVerticalScrollIndicator={false}>
        {cards.map((card) => (
          <View key={card.label} style={s.statCard}>
            <View style={[s.statIconBox, { backgroundColor: `${card.color}18` }]}>
              <Ionicons name={card.icon} size={28} color={card.color} />
            </View>
            <View style={s.statBody}>
              <Text style={s.statNumber}>{card.count}</Text>
              <Text style={s.statLabel}>{card.label}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ExtTabs', { screen: card.screen })}>
                <Text style={s.viewMore}>View More Info</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={s.sectionTitle}>Recent Assignments</Text>
        {assignments.slice(0, 2).map((item) => (
          <TouchableOpacity key={item.id} style={s.card} onPress={() => navigation.navigate('ExtThesisDetail', { assignment: item })}>
            <View style={s.cardTop}>
              <View style={s.typePill}><Text style={s.typePillText}>{item.type}</Text></View>
              <View style={[s.statusPill, { backgroundColor: statusColor(item.status) }]}>
                <Text style={s.statusPillText}>{statusLabel(item.status)}</Text>
              </View>
            </View>
            <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
            <View style={s.cardMeta}>
              <Ionicons name="person-outline" size={13} color={colors.muted} />
              <Text style={s.cardMetaText}> {item.student.name}</Text>
              <Text style={s.cardMetaSep}>  ·  </Text>
              <Ionicons name="calendar-outline" size={13} color="#F59E0B" />
              <Text style={[s.cardMetaText, { color: '#F59E0B' }]}> Due {formatDate(item.dueDate)}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export function ExternalEvaluatorTheses({ navigation }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getExternalEvaluatorAssignments().then(setAssignments).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <View style={s.loading}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={s.container}>
      <ExtHeader title="Thesis Review" navigation={navigation} />
      <FlatList
        data={assignments}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('ExtThesisDetail', { assignment: item })}>
            <View style={s.cardTop}>
              <View style={s.typePill}><Text style={s.typePillText}>{item.type}</Text></View>
              <View style={[s.statusPill, { backgroundColor: statusColor(item.status) }]}>
                <Text style={s.statusPillText}>{statusLabel(item.status)}</Text>
              </View>
            </View>
            <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={s.infoText}>{item.student.name} · {item.student.course}</Text>
            <Text style={s.infoText}>Supervisor: {item.supervisor}</Text>
            <View style={s.cardMeta}>
              <Ionicons name="document-text-outline" size={13} color={colors.primary} />
              <Text style={[s.cardMetaText, { color: colors.primary }]}> {item.document} · {item.documentSize}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

export function ExternalEvaluatorThesisDetail({ route, navigation }) {
  const { assignment } = route.params;
  const [checklist, setChecklist] = useState({ originality: false, methodology: false, writing: false, references: false });
  const [recommendation, setRecommendation] = useState(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [comments, setComments] = useState('');
  const [grade, setGrade] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const recommendations = ['Approved', 'Minor Revisions', 'Major Revisions', 'Rejected'];
  const checklistItems = [
    { key: 'originality', label: 'Originality and relevance' },
    { key: 'methodology', label: 'Methodology strength' },
    { key: 'writing', label: 'Writing quality and structure' },
    { key: 'references', label: 'References and citations' },
  ];

  const handleSubmit = async () => {
    const numericGrade = Number(grade);
    if (!recommendation) {
      Alert.alert('Required', 'Please select a recommendation.');
      return;
    }
    if (!comments.trim()) {
      Alert.alert('Required', 'Please add comments.');
      return;
    }
    if (Number.isNaN(numericGrade) || numericGrade < 0 || numericGrade > 100) {
      Alert.alert('Invalid grade', 'Grade must be between 0 and 100.');
      return;
    }

    setSubmitting(true);
    try {
      await submitExternalEvaluation(assignment.id, { checklist, comments, grade: numericGrade, recommendation });
      Alert.alert('Submitted', 'Evaluation submitted and HOD / supervisor notified.', [
        { text: 'OK', onPress: () => navigation.navigate('ExtTabs', { screen: 'ExtHome' }) },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Could not submit the evaluation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={s.container}>
      <ExtHeader title="Grade Thesis" navigation={navigation} showBack />
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <View style={s.docRow}>
            <View style={s.docIconBox}><Ionicons name="document-attach-outline" size={22} color={colors.primary} /></View>
            <View style={s.docInfo}>
              <Text style={s.docName}>{assignment.document}</Text>
              <Text style={s.docSize}>{assignment.documentSize}</Text>
            </View>
            <TouchableOpacity style={s.openBtn}><Text style={s.openBtnText}>Open</Text></TouchableOpacity>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.studentName}>{assignment.student.name}</Text>
          <Text style={s.infoText}>{assignment.student.course}</Text>
          <Text style={s.infoText}>Supervisor: {assignment.supervisor}</Text>
          <Text style={[s.infoText, { marginTop: 4, fontStyle: 'italic' }]}>{assignment.assignmentNote}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Checklist</Text>
          {checklistItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[s.checkRow, checklist[item.key] && s.checkRowActive]}
              onPress={() => setChecklist((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
            >
              <View style={[s.checkBox, checklist[item.key] && s.checkBoxActive]}>
                {checklist[item.key] && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={[s.checkLabel, checklist[item.key] && { color: colors.text, fontWeight: '600' }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Grade Input</Text>
          <View style={s.gradeRow}>
            <TextInput
              style={s.gradeInput}
              placeholder="Enter a value between 0-100"
              placeholderTextColor="#9BA4B5"
              keyboardType="numeric"
              value={grade}
              onChangeText={setGrade}
              maxLength={3}
            />
            <Text style={s.percentSymbol}>%</Text>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Comments</Text>
          <TextInput
            style={s.textArea}
            placeholder="Add evaluation comments..."
            placeholderTextColor="#9BA4B5"
            value={comments}
            onChangeText={setComments}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Recommendation</Text>
          <TouchableOpacity style={s.dropdown} onPress={() => setShowRecommendations((value) => !value)}>
            <Text style={[s.dropdownText, !recommendation && { color: '#9BA4B5' }]}>{recommendation || 'Select'}</Text>
            <Ionicons name={showRecommendations ? 'chevron-up' : 'chevron-down'} size={18} color="#6B7280" />
          </TouchableOpacity>
          {showRecommendations && (
            <View style={s.dropdownList}>
              {recommendations.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[s.dropdownItem, recommendation === item && s.dropdownItemActive]}
                  onPress={() => {
                    setRecommendation(item);
                    setShowRecommendations(false);
                  }}
                >
                  <Text style={[s.dropdownItemText, recommendation === item && { color: colors.primary, fontWeight: '700' }]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Submit Evaluation</Text>
          <TouchableOpacity style={[s.submitBtn, submitting && { opacity: 0.7 }]} onPress={handleSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={s.submitBtnText}>Submit Evaluation</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

export function ExternalEvaluatorClaims({ navigation }) {
  const [claims, setClaims] = useState([]);
  const [profile, setProfile] = useState(null);
  const [claimAmount, setClaimAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getExternalEvaluatorClaims(), getExternalEvaluatorProfile()])
      .then(([claimData, profileData]) => {
        setClaims(claimData);
        setProfile(profileData);
        setBankName(profileData.bankName);
        setAccountNumber(profileData.bankAccount);
        setAccountHolder(profileData.bankHolder);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!claimAmount.trim() || !bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
      Alert.alert('Required', 'Please complete the claim form.');
      return;
    }
    setSubmitting(true);
    try {
      await submitHonorariumClaim({ claimAmount, bankName, accountNumber, accountHolder, comments });
      Alert.alert('Submitted', 'Honorarium claim submitted successfully.', [
        { text: 'OK', onPress: () => navigation.navigate('ExtTabs', { screen: 'ExtHome' }) },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Could not submit claim.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <View style={s.loading}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={s.container}>
      <ExtHeader title="Claim Honorarium" navigation={navigation} />
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <Text style={s.sectionTitle}>Amount Input</Text>
          <View style={s.claimRow}>
            <Text style={s.claimCurrency}>N$</Text>
            <TextInput
              style={s.claimInput}
              placeholder="Enter amount"
              placeholderTextColor="#9BA4B5"
              keyboardType="numeric"
              value={claimAmount}
              onChangeText={setClaimAmount}
            />
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Bank Details</Text>
          <TextInput style={s.fieldInput} placeholder="Bank Name" placeholderTextColor="#9BA4B5" value={bankName} onChangeText={setBankName} />
          <TextInput style={s.fieldInput} placeholder="Account Number" placeholderTextColor="#9BA4B5" value={accountNumber} onChangeText={setAccountNumber} keyboardType="numeric" />
          <TextInput style={s.fieldInput} placeholder="Account Holder" placeholderTextColor="#9BA4B5" value={accountHolder} onChangeText={setAccountHolder} />
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Upload Proof</Text>
          <TouchableOpacity style={s.uploadBox}>
            <Ionicons name="cloud-upload-outline" size={34} color={colors.text} />
            <Text style={s.uploadText}>Tap to upload file: PDF/DOCX only</Text>
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Notes</Text>
          <TextInput
            style={[s.textArea, { minHeight: 96 }]}
            placeholder="Add claim notes if needed..."
            placeholderTextColor="#9BA4B5"
            value={comments}
            onChangeText={setComments}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Submit Claim</Text>
          <TouchableOpacity style={[s.submitBtn, submitting && { opacity: 0.7 }]} onPress={handleSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={s.submitBtnText}>Submit Claim</Text>}
          </TouchableOpacity>
        </View>

        <Text style={s.sectionTitle}>Claim History</Text>
        {claims.map((item) => (
          <View key={item.id} style={s.card}>
            <Text style={s.cardTitle}>{item.thesisTitle}</Text>
            <Text style={s.infoText}>{item.amount}</Text>
            <View style={[s.statusPill, { alignSelf: 'flex-start', backgroundColor: item.status === 'Paid' ? '#22C55E' : '#F59E0B' }]}>
              <Text style={s.statusPillText}>{item.status}</Text>
            </View>
            <Text style={[s.infoText, { marginTop: 8 }]}>Submitted {formatDate(item.submittedAt)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export function ExternalEvaluatorProfile({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [expertise, setExpertise] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getExternalEvaluatorProfile()
      .then((data) => {
        setProfile(data);
        setName(data.name);
        setInstitution(data.institution);
        setExpertise(data.expertise);
        setPhone(data.phone);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateExternalEvaluatorProfile({ name, institution, expertise, phone });
      Alert.alert('Saved', 'Profile details updated successfully.');
    } catch (error) {
      Alert.alert('Error', 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return <View style={s.loading}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={s.container}>
      <ExtHeader title="Profile" navigation={navigation} />
      <View style={s.profileHero}>
        <View style={s.profileAvatar}>
          <Text style={s.profileAvatarText}>{initials(profile.name)}</Text>
        </View>
        <Text style={s.profileName}>{profile.name}</Text>
        <View style={s.rolePill}><Text style={s.rolePillText}>{profile.role}</Text></View>
      </View>

      <ScrollView contentContainerStyle={s.profileScroll} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <Text style={s.sectionTitle}>Update Profile Details</Text>
          <TextInput style={s.fieldInput} value={name} onChangeText={setName} placeholder="Name" placeholderTextColor="#9BA4B5" />
          <TextInput style={s.fieldInput} value={institution} onChangeText={setInstitution} placeholder="Institution" placeholderTextColor="#9BA4B5" />
          <TextInput style={s.fieldInput} value={expertise} onChangeText={setExpertise} placeholder="Expertise" placeholderTextColor="#9BA4B5" />
          <TextInput style={s.fieldInput} value={phone} onChangeText={setPhone} placeholder="Phone" placeholderTextColor="#9BA4B5" />
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Document Upload</Text>
          <View style={s.fileRow}>
            <View style={s.fileIcon}>
              <Ionicons name="document-text" size={20} color={colors.muted} />
            </View>
            <View style={s.fileInfo}>
              <Text style={s.fileName}>Jane_Smith_CV.pdf</Text>
              <Text style={s.fileSize}>32.9 MB</Text>
            </View>
          </View>
          <TouchableOpacity style={s.openBtn}>
            <Text style={s.openBtnText}>Update</Text>
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Save Changes</Text>
          <TouchableOpacity style={[s.submitBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={s.submitBtnText}>Save</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

export function ExternalEvaluatorNotifications({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getExternalEvaluatorNotifications().then(setNotifications).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <View style={s.loading}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={s.container}>
      <ExtHeader title="Notifications" navigation={navigation} showBack />
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <View style={[s.notifCard, !item.read && s.notifUnread]}>
            <Ionicons name={item.read ? 'mail-open-outline' : 'mail-unread-outline'} size={22} color={item.read ? colors.muted : colors.primary} />
            <View style={s.notifBody}>
              <Text style={[s.notifMessage, !item.read && { fontWeight: '600', color: colors.text }]}>{item.message}</Text>
              <Text style={s.notifTime}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  body: { padding: 16 },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 40 },
  header: { backgroundColor: colors.header, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  headerTitleCenter: { color: '#fff', fontSize: 20, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  headerIcons: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  backBtn: { paddingRight: 6 },
  statCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  statIconBox: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  statBody: { flex: 1 },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: colors.text },
  statLabel: { fontSize: 14, color: colors.muted, marginTop: 2, marginBottom: 4 },
  viewMore: { fontSize: 13, color: colors.primary, fontWeight: '500' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 10 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  typePill: { backgroundColor: colors.header, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  typePillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  statusPill: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  statusPillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.text, lineHeight: 22, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  cardMetaText: { fontSize: 13, color: colors.muted },
  cardMetaSep: { fontSize: 13, color: '#CBD5E1' },
  infoText: { fontSize: 13, color: colors.muted, marginBottom: 4 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  docIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.softBlue, justifyContent: 'center', alignItems: 'center' },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontWeight: '600', color: colors.text },
  docSize: { fontSize: 12, color: colors.muted, marginTop: 2 },
  openBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  openBtnText: { color: colors.card, fontWeight: '600', fontSize: 13 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 12 },
  checkRowActive: { backgroundColor: colors.softBlue },
  checkBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  checkBoxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkLabel: { fontSize: 14, color: colors.text, flex: 1 },
  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F9FAFB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  gradeInput: { flex: 1, fontSize: 15, color: colors.text },
  percentSymbol: { fontSize: 15, fontWeight: '600', color: colors.muted },
  textArea: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, fontSize: 14, color: colors.text, minHeight: 110 },
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14 },
  dropdownText: { fontSize: 14, color: colors.text },
  dropdownList: { marginTop: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, overflow: 'hidden' },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownItemActive: { backgroundColor: colors.softBlue },
  dropdownItemText: { fontSize: 14, color: colors.text },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 12, padding: 15, alignItems: 'center' },
  submitBtnText: { color: colors.card, fontSize: 16, fontWeight: '700' },
  claimRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 10, paddingHorizontal: 12, gap: 10 },
  claimCurrency: { fontSize: 15, fontWeight: '700', color: colors.text },
  claimInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.text },
  fieldInput: { backgroundColor: '#F9FAFB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: colors.text, marginBottom: 10 },
  uploadBox: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#CBD5E1', borderRadius: 14, paddingVertical: 28, justifyContent: 'center', alignItems: 'center', gap: 10, backgroundColor: '#FBFCFE' },
  uploadText: { fontSize: 13, color: colors.muted, textAlign: 'center' },
  profileHero: { backgroundColor: colors.header, paddingVertical: 24, alignItems: 'center' },
  profileAvatar: { width: 104, height: 104, borderRadius: 52, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  profileAvatarText: { color: '#fff', fontSize: 34, fontWeight: 'bold' },
  profileName: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  rolePill: { backgroundColor: '#EFF6FF', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  rolePillText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  profileScroll: { padding: 16, gap: 12, paddingBottom: 40 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fileIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '600', color: colors.text },
  fileSize: { fontSize: 12, color: colors.muted, marginTop: 2 },
  notifCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, flexDirection: 'row', gap: 14 },
  notifUnread: { borderLeftWidth: 4, borderLeftColor: colors.primary },
  notifBody: { flex: 1 },
  notifMessage: { fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: 6 },
  notifTime: { fontSize: 12, color: '#9BA4B5' },
  studentName: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
});