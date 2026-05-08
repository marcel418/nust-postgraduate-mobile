import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
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
import { reviewSubmission } from '../../services/api';

export default function ReviewReportScreen({ route, navigation }) {
  // Student is passed from the dashboard when tapping View
  const { student } = route.params;

  const [comments, setComments] = useState('');
  const [signed, setSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Mock submission data for this student
  // GET /students/:id/submissions?status=In Review
  const submission = {
    id: 'SUB001',
    title: 'Mini_Thesis_Draft_3.9.pdf',
    fileSize: '32.9 MB',
  };

  const handleApprove = async () => {
    if (!signed) {
      Alert.alert(
        'Sign Required',
        'Please sign the report before approving.'
      );
      return;
    }
    setSubmitting(true);
    try {
      await reviewSubmission(submission.id, {
        status: 'Approved',
        comments,
        signed,
      });
      Alert.alert('Success', 'Report approved successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to approve. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async () => {
    if (!comments.trim()) {
      Alert.alert(
        'Comments Required',
        'Please add comments before returning.'
      );
      return;
    }
    setSubmitting(true);
    try {
      await reviewSubmission(submission.id, {
        status: 'Returned',
        comments,
        signed: false,
      });
      Alert.alert('Success', 'Report returned to student.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to return. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title={'Review Progress\nReport'} navigation={navigation} />

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

        {/* ── STUDENT INFO ── */}
        <View style={styles.card}>
          <Text style={styles.studentName}>{student.name}</Text>
          <Text style={styles.studentMeta}>
            Student No: {student.studentNumber}
          </Text>
          <Text style={styles.studentMeta}>Course: {student.course}</Text>
        </View>

        {/* ── FILE ── */}
        <View style={styles.card}>
          <View style={styles.fileRow}>
            <View style={styles.fileIcon}>
              <Ionicons name="document-text" size={20} color="#6B7280" />
            </View>
            <View style={styles.fileInfo}>
              <Text style={styles.fileName}>{submission.title}</Text>
              <Text style={styles.fileSize}>{submission.fileSize}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.openBtn}>
            <Text style={styles.openBtnText}>Open</Text>
          </TouchableOpacity>
        </View>

        {/* ── COMMENTS ── */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Comments</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Type here...."
            placeholderTextColor="#9BA4B5"
            multiline
            numberOfLines={5}
            value={comments}
            onChangeText={setComments}
            textAlignVertical="top"
          />
        </View>

        {/* ── SIGN CHECKBOX ── */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.signRow}
            onPress={() => setSigned(!signed)}
          >
            <View style={[styles.checkbox, signed && styles.checkboxChecked]}>
              {signed && (
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              )}
            </View>
            <Text style={styles.signLabel}>Sign report</Text>
          </TouchableOpacity>
        </View>

        {/* ── ACTION BUTTONS ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.approveBtn, submitting && { opacity: 0.7 }]}
            onPress={handleApprove}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.actionBtnText}>Approve</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.returnBtn, submitting && { opacity: 0.7 }]}
            onPress={handleReturn}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.actionBtnText}>Return</Text>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  body: {
    padding: 16,
    gap: 12,
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
  textArea: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#0D1B2A',
    minHeight: 120,
  },
  signRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#1E56A0',
    borderColor: '#1E56A0',
  },
  signLabel: {
    fontSize: 15,
    color: '#0D1B2A',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: '#22C55E',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  returnBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});