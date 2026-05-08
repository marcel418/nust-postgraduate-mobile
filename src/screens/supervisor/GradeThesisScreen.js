import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import AppHeader from '../../components/AppHeader';
import { CURRENT_SUPERVISOR } from '../../data/mockData';
import { getSupervisorStudents } from '../../services/api';

export default function GradeThesisScreen({ navigation }) {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [grade, setGrade] = useState('');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Mock thesis file per student
  const thesisFile = { name: 'Mini_Thesis_Final.pdf', size: '32.9 MB' };

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const data = await getSupervisorStudents(CURRENT_SUPERVISOR.id);
      setStudents(data);
      setSelectedStudent(data[0]);
    } catch (error) {
      console.error('Failed to load students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitGrade = async () => {
    if (!grade.trim()) {
      Alert.alert('Missing Grade', 'Please enter a grade.');
      return;
    }
    const gradeNum = Number(grade);
    if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 100) {
      Alert.alert('Invalid Grade', 'Grade must be between 0 and 100.');
      return;
    }
    setSubmitting(true);
    try {
      // TODO: POST /grades { studentId, grade, comments }
      await new Promise((resolve) => setTimeout(resolve, 800));
      Alert.alert('Success', 'Grade submitted successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit grade. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E56A0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Grade Thesis" navigation={navigation} />

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

        {/* ── STUDENT INFO ── */}
        <View style={styles.card}>
          <Text style={styles.studentName}>{selectedStudent?.name}</Text>
          <Text style={styles.studentMeta}>
            Student No: {selectedStudent?.studentNumber}
          </Text>
          <Text style={styles.studentMeta}>
            Course: {selectedStudent?.course}
          </Text>
        </View>

        {/* ── THESIS FILE ── */}
        <View style={styles.card}>
          <View style={styles.fileRow}>
            <View style={styles.fileIcon}>
              <Ionicons name="document-text" size={20} color="#6B7280" />
            </View>
            <View style={styles.fileInfo}>
              <Text style={styles.fileName}>{thesisFile.name}</Text>
              <Text style={styles.fileSize}>{thesisFile.size}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.openBtn}>
            <Text style={styles.openBtnText}>Open</Text>
          </TouchableOpacity>
        </View>

        {/* ── GRADE INPUT ── */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Grade Input</Text>
          <View style={styles.gradeRow}>
            <TextInput
              style={styles.gradeInput}
              placeholder="Enter a value between 0-100"
              placeholderTextColor="#9BA4B5"
              keyboardType="numeric"
              value={grade}
              onChangeText={setGrade}
              maxLength={3}
            />
            <Text style={styles.percentSymbol}>%</Text>
          </View>
        </View>

        {/* ── COMMENTS ── */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Comments</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Add grading comments...."
            placeholderTextColor="#9BA4B5"
            multiline
            numberOfLines={4}
            value={comments}
            onChangeText={setComments}
            textAlignVertical="top"
          />
        </View>

        {/* ── SUBMIT GRADE ── */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Submit Grade</Text>
          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmitGrade}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Grade</Text>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F2F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  body: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0D1B2A',
  },
  studentMeta: {
    fontSize: 14,
    color: '#6B7280',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fileIcon: {
    width: 44,
    height: 44,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D1B2A',
  },
  fileSize: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  openBtn: {
    backgroundColor: '#1E56A0',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    alignSelf: 'flex-end',
  },
  openBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0D1B2A',
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
  },
  gradeInput: {
    flex: 1,
    fontSize: 15,
    color: '#0D1B2A',
  },
  percentSymbol: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#0D1B2A',
    minHeight: 100,
  },
  submitBtn: {
    backgroundColor: '#1E56A0',
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});