// src/screens/hod/HODAssignEvaluatorScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { hodService } from '../../services/api/hodService';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function CalendarPicker({ selectedDate, onSelectDate }) {
  const today = new Date();
  const [month, setMonth] = useState(selectedDate ? selectedDate.getMonth() : today.getMonth());
  const [year, setYear] = useState(selectedDate ? selectedDate.getFullYear() : today.getFullYear());

  const getDaysInMonth = (m, y) => new Date(y, m + 1, 0).getDate();
  const getFirstDay = (m, y) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(month, year);
  const firstDay = getFirstDay(month, year);
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const isSelected = (day) => {
    if (!selectedDate || !day) return false;
    return selectedDate.getDate() === day &&
      selectedDate.getMonth() === month &&
      selectedDate.getFullYear() === year;
  };

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const day = i < firstDay ? null : i - firstDay + 1;
    cells.push(day > daysInMonth ? null : day);
  }

  return (
    <View style={cal.wrapper}>
      <View style={cal.navRow}>
        <TouchableOpacity onPress={prevMonth} style={cal.navBtn}>
          <Text style={cal.navArrow}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={cal.monthYear}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} style={cal.navBtn}>
          <Text style={cal.navArrow}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      <View style={cal.dayNames}>
        {DAYS.map(d => (
          <Text key={d} style={cal.dayName}>{d}</Text>
        ))}
      </View>

      <View style={cal.grid}>
        {cells.map((day, i) => (
          <TouchableOpacity
            key={i}
            style={[cal.cell, isSelected(day) && cal.selectedCell]}
            onPress={() => day && onSelectDate(new Date(year, month, day))}
            disabled={!day}
          >
            <Text style={[cal.cellText, isSelected(day) && cal.selectedText, !day && cal.emptyText]}>
              {day || ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function HODAssignEvaluatorScreen({ route, navigation }) {
  const { submission } = route.params;
  const [evaluators, setEvaluators] = useState([]);
  const [selectedEvaluator, setSelectedEvaluator] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    hodService.getEvaluators().then(setEvaluators).catch(console.error);
  }, []);

  const handleAssign = async () => {
    if (!selectedEvaluator) {
      Alert.alert('Missing Evaluator', 'Please select an internal evaluator.');
      return;
    }
    if (!selectedDate) {
      Alert.alert('Missing Deadline', 'Please select a deadline date.');
      return;
    }
    setAssigning(true);
    try {
      await hodService.assignEvaluator(submission.id, selectedEvaluator.id, selectedDate.toISOString());
      Alert.alert('Assigned', selectedEvaluator.name + ' has been assigned successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Could not assign evaluator. Please try again.');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>Assign</Text>
          <Text style={styles.headerTitle}>Internal Evaluator</Text>
        </View>
        <View style={styles.headerIcons}>
          <Text style={styles.headerIcon}>🔔</Text>
          <Text style={styles.headerIcon}>👤</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Student Info Card */}
        <View style={styles.card}>
          <Text style={styles.studentName}>{submission.student.name}</Text>
          <Text style={styles.infoText}>Student No: {submission.student.id}</Text>
          <Text style={styles.infoText}>Course: Bachelor of Computer Science: Honors</Text>
        </View>

        {/* Document Card */}
        <View style={styles.card}>
          <View style={styles.docRow}>
            <View style={styles.docIcon}>
              <Text style={styles.docIconText}>📄</Text>
            </View>
            <View style={styles.docInfo}>
              <Text style={styles.docName}>{submission.title.substring(0, 24) + '_Final.pdf'}</Text>
              <Text style={styles.docSize}>32.9 MB</Text>
            </View>
            <TouchableOpacity style={styles.openBtn}>
              <Text style={styles.openBtnText}>Open</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Select Evaluator */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Select Evaluator</Text>

          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowDropdown(!showDropdown)}
          >
            <Text style={styles.dropdownText}>
              {selectedEvaluator ? selectedEvaluator.name : 'Select a student'}
            </Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>

          {showDropdown && (
            <View style={styles.dropdownList}>
              {evaluators.map((ev) => (
                <TouchableOpacity
                  key={ev.id}
                  style={styles.dropdownItem}
                  onPress={() => { setSelectedEvaluator(ev); setShowDropdown(false); }}
                >
                  <Text style={styles.dropdownItemText}>{ev.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Calendar */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Select Deadline</Text>
          <CalendarPicker selectedDate={selectedDate} onSelectDate={setSelectedDate} />
          {selectedDate && (
            <Text style={styles.selectedDateText}>
              Selected: {selectedDate.toLocaleDateString('en-NA', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          )}
        </View>

        {/* Assign Button */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Assign Evaluator</Text>
          <TouchableOpacity
            style={[styles.assignBtn, assigning && styles.assignBtnDisabled]}
            onPress={handleAssign}
            disabled={assigning}
          >
            {assigning
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.assignBtnText}>Assign</Text>}
          </TouchableOpacity>
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
          <Text style={styles.navLabel}>Submissions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>👥</Text>
          <Text style={[styles.navLabel, styles.navActive]}>Assignments</Text>
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
    backgroundColor: '#0D1B3E',
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  backArrow: { color: '#fff', fontSize: 22, marginTop: 4 },
  headerTextBlock: { flex: 1, marginLeft: 12 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 28 },
  headerIcons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  headerIcon: { fontSize: 20 },

  content: { padding: 16, gap: 14, paddingBottom: 100 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },

  studentName: { fontSize: 16, fontWeight: '700', color: '#0D1B3E', marginBottom: 6 },
  infoText: { fontSize: 13, color: '#555', marginBottom: 3 },

  docRow: { flexDirection: 'row', alignItems: 'center' },
  docIcon: {
    width: 40, height: 40, borderRadius: 8, backgroundColor: '#F0F2F5',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  docIconText: { fontSize: 20 },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontWeight: '600', color: '#0D1B3E' },
  docSize: { fontSize: 12, color: '#888', marginTop: 2 },
  openBtn: {
    backgroundColor: '#1A73E8',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  openBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0D1B3E', marginBottom: 14 },

  dropdown: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 8,
    padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dropdownText: { fontSize: 14, color: '#333' },
  dropdownArrow: { fontSize: 12, color: '#555' },
  dropdownList: {
    marginTop: 8, borderWidth: 1, borderColor: '#EEE',
    borderRadius: 8, backgroundColor: '#FAFAFA',
  },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  dropdownItemText: { fontSize: 14, color: '#333' },

  selectedDateText: { marginTop: 10, fontSize: 13, color: '#1A73E8', fontWeight: '500', textAlign: 'center' },

  assignBtn: {
    backgroundColor: '#1A73E8',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  assignBtnDisabled: { opacity: 0.6 },
  assignBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

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

const cal = StyleSheet.create({
  wrapper: { marginTop: 4 },
  navRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  navBtn: { padding: 8 },
  navArrow: { fontSize: 16, color: '#0D1B3E', fontWeight: '700' },
  monthYear: { fontSize: 15, fontWeight: '700', color: '#0D1B3E' },
  dayNames: { flexDirection: 'row', marginBottom: 6 },
  dayName: { flex: 1, textAlign: 'center', fontSize: 12, color: '#888', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: '14.28%', aspectRatio: 1,
    justifyContent: 'center', alignItems: 'center',
    borderRadius: 100,
  },
  selectedCell: { backgroundColor: '#0D1B3E' },
  cellText: { fontSize: 13, color: '#333' },
  selectedText: { color: '#fff', fontWeight: '700' },
  emptyText: { color: 'transparent' },
});