// src/screens/hod/HODAssignInternalEvaluatorScreen.js
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import HODHeader from '../../components/HODHeader';
import { assignHODEvaluator, getHODEvaluators } from '../../services/hodApi';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function CalendarPicker({ selectedDate, onSelectDate }) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const isSelected = (d) => selectedDate && d && selectedDate.getDate() === d && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  return (
    <View>
      <View style={cal.nav}>
        <TouchableOpacity onPress={prevMonth} style={cal.navBtn}><Ionicons name="chevron-back" size={20} color="#0D1B2A" /></TouchableOpacity>
        <Text style={cal.monthYear}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} style={cal.navBtn}><Ionicons name="chevron-forward" size={20} color="#0D1B2A" /></TouchableOpacity>
      </View>
      <View style={cal.dayNames}>{DAYS.map(d => <Text key={d} style={cal.dayName}>{d}</Text>)}</View>
      <View style={cal.grid}>
        {cells.map((day, i) => (
          <TouchableOpacity key={i} disabled={!day} style={[cal.cell, isSelected(day) && cal.selectedCell]} onPress={() => day && onSelectDate(new Date(year, month, day))}>
            <Text style={[cal.cellText, isSelected(day) && cal.selectedText, !day && { opacity: 0 }]}>{day || 0}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {selectedDate && <Text style={cal.selectedLabel}>Selected: {selectedDate.toLocaleDateString('en-NA', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>}
    </View>
  );
}

export function HODAssignInternalEvaluatorScreen({ route, navigation }) {
  const { submission } = route.params;
  const [evaluators, setEvaluators] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showList, setShowList] = useState(false);
  const [deadline, setDeadline] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { getHODEvaluators().then(setEvaluators).catch(console.error); }, []);

  const handleAssign = async () => {
    if (!selected) return Alert.alert('Required', 'Please select an evaluator.');
    if (!deadline) return Alert.alert('Required', 'Please select a deadline.');
    setLoading(true);
    try {
      await assignHODEvaluator(submission.id, selected.id, deadline.toISOString());
      Alert.alert('Assigned', `${selected.name} assigned successfully.`, [
        { text: 'OK', onPress: () => navigation.navigate('HODSubmissions') },
      ]);
    } catch { Alert.alert('Error', 'Could not assign evaluator. Try again.'); }
    finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <HODHeader title="Assign Internal Evaluator" navigation={navigation} showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.card}>
          <Text style={styles.studentName}>{submission.student.name}</Text>
          <Text style={styles.infoText}>Student No: {submission.student.id}</Text>
          <Text style={styles.infoText}>Course: {submission.student.course}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.docRow}>
            <View style={styles.docIconBox}><Ionicons name="document-attach-outline" size={22} color="#1E56A0" /></View>
            <View style={styles.docInfo}>
              <Text style={styles.docName}>{submission.document}</Text>
              <Text style={styles.docSize}>{submission.documentSize}</Text>
            </View>
            <TouchableOpacity style={styles.openBtn}><Text style={styles.openBtnText}>Open</Text></TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Select Evaluator</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setShowList(!showList)}>
            <Text style={[styles.dropdownText, !selected && { color: '#9BA4B5' }]}>{selected ? selected.name : 'Select a student'}</Text>
            <Ionicons name={showList ? 'chevron-up' : 'chevron-down'} size={18} color="#6B7280" />
          </TouchableOpacity>
          {showList && (
            <View style={styles.dropdownList}>
              {evaluators.map((ev) => (
                <TouchableOpacity key={ev.id} style={[styles.dropdownItem, selected?.id === ev.id && styles.dropdownItemActive]} onPress={() => { setSelected(ev); setShowList(false); }}>
                  <Text style={[styles.dropdownItemText, selected?.id === ev.id && { color: '#1E56A0', fontWeight: '700' }]}>{ev.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Select Deadline</Text>
          <CalendarPicker selectedDate={deadline} onSelectDate={setDeadline} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Assign Evaluator</Text>
          <TouchableOpacity style={[styles.assignBtn, loading && { opacity: 0.6 }]} onPress={handleAssign} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.assignBtnText}>Assign</Text>}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Propose External Evaluator ───────────────────────────────────────────────
export function HODProposeExternalScreen({ route, navigation }) {
  const { submission } = route.params;
  const [evaluators] = useState([
    { id: 401, name: 'Prof. Doe', institution: 'MIT', expertise: 'AI and Machine Learning', match: 92 },
    { id: 402, name: 'Dr. Frankenstein', institution: 'Namibia University of Science and Technology', expertise: 'Machine Learning, Energy Systems', match: 87 },
    { id: 403, name: 'Dr. Mortdecai Zhang Zu Wong', institution: 'Brown University', expertise: 'Neuroscience', match: 74 },
  ]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAssign = async () => {
    if (!selected) return Alert.alert('Required', 'Please select an evaluator to propose.');
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      Alert.alert('Forwarded to FPGC-R', `${selected.name} proposed and submission forwarded to FPGC-R.`, [
        { text: 'OK', onPress: () => navigation.navigate('HODDashboard') },
      ]);
    } catch { Alert.alert('Error', 'Could not submit. Try again.'); }
    finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <HODHeader title="Assign External Examiner" navigation={navigation} showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.card}>
          <Text style={styles.studentName}>{submission.student.name}</Text>
          <Text style={styles.infoText}>{submission.student.course}</Text>
          <Text style={[styles.infoText, { fontStyle: 'italic', marginTop: 4 }]}>"{submission.title}"</Text>
        </View>

        <Text style={styles.sectionHeader}>Proposed Evaluators</Text>

        {evaluators.map((ev) => (
          <TouchableOpacity key={ev.id} style={[styles.evalCard, selected?.id === ev.id && styles.evalCardSelected]} onPress={() => setSelected(ev)}>
            <View style={styles.evalTop}>
              <View style={styles.evalAvatar}>
                <Text style={styles.evalAvatarText}>{ev.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</Text>
              </View>
              <View style={styles.evalInfo}>
                <Text style={styles.evalName}>{ev.name}</Text>
                <Text style={styles.evalInst}>{ev.institution}</Text>
                <Text style={styles.evalExpertise}>{ev.expertise}</Text>
              </View>
              {selected?.id === ev.id && <Ionicons name="checkmark-circle" size={24} color="#1E56A0" />}
            </View>
            <View style={styles.matchRow}>
              <Text style={styles.matchLabel}>Expertise Match</Text>
              <View style={styles.matchBarBg}>
                <View style={[styles.matchBarFill, { width: `${ev.match}%` }]}>
                  <Text style={styles.matchBarText}>{ev.match}%</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Approve Examiner</Text>
          {selected && <Text style={styles.selectedLabel}>Selected: {selected.name}</Text>}
          <TouchableOpacity style={[styles.approveBtn, loading && { opacity: 0.6 }]} onPress={handleAssign} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.assignBtnText}>Assign</Text>}
          </TouchableOpacity>
        </View>

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
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#0D1B2A' },
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14 },
  dropdownText: { fontSize: 14, color: '#0D1B2A' },
  dropdownList: { marginTop: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, overflow: 'hidden' },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownItemActive: { backgroundColor: '#EFF6FF' },
  dropdownItemText: { fontSize: 14, color: '#0D1B2A' },
  assignBtn: { backgroundColor: '#1E56A0', borderRadius: 12, padding: 15, alignItems: 'center' },
  approveBtn: { backgroundColor: '#22C55E', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 8 },
  assignBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  evalCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 2, borderColor: 'transparent' },
  evalCardSelected: { borderColor: '#1E56A0' },
  evalTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
  evalAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#0D1B2A', justifyContent: 'center', alignItems: 'center' },
  evalAvatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  evalInfo: { flex: 1 },
  evalName: { fontSize: 15, fontWeight: '700', color: '#0D1B2A' },
  evalInst: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  evalExpertise: { fontSize: 12, color: '#9BA4B5', marginTop: 2 },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  matchLabel: { fontSize: 13, fontWeight: '600', color: '#0D1B2A', width: 110 },
  matchBarBg: { flex: 1, height: 22, backgroundColor: '#E5E7EB', borderRadius: 11, overflow: 'hidden' },
  matchBarFill: { height: '100%', backgroundColor: '#1E56A0', borderRadius: 11, justifyContent: 'center', minWidth: 40 },
  matchBarText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold', paddingLeft: 8 },
  selectedLabel: { fontSize: 14, color: '#1E56A0', fontWeight: '500', marginBottom: 12 },
});

const cal = StyleSheet.create({
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  navBtn: { padding: 8 },
  monthYear: { fontSize: 15, fontWeight: 'bold', color: '#0D1B2A' },
  dayNames: { flexDirection: 'row', marginBottom: 4 },
  dayName: { flex: 1, textAlign: 'center', fontSize: 12, color: '#6B7280', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 100 },
  selectedCell: { backgroundColor: '#1E56A0' },
  cellText: { fontSize: 13, color: '#0D1B2A' },
  selectedText: { color: '#FFFFFF', fontWeight: '700' },
  selectedLabel: { marginTop: 10, textAlign: 'center', fontSize: 13, color: '#1E56A0', fontWeight: '500' },
});