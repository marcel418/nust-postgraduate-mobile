import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AppHeader from '../../components/AppHeader';
import { CURRENT_STUDENT } from '../../data/mockData';
import { getStudentSubmissions, submitProgressReport } from '../../services/api';

const getStatusColor = (status) => {
  switch (status) {
    case 'Approved': return '#22C55E';
    case 'In Review': return '#7C3AED';
    case 'Returned': return '#EF4444';
    case 'Pending': return '#F59E0B';
    default: return '#6B7280';
  }
};

const REPORTING_PERIODS = ['Today', 'This Week', 'This Month', 'Last 30 Days'];

export default function SubmissionsScreen({ navigation }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [comments, setComments] = useState('');
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      const data = await getStudentSubmissions(CURRENT_STUDENT.id);
      const sorted = data.sort(
        (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
      );
      setSubmissions(sorted);
    } catch (error) {
      console.error('Failed to load submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      const sizeMB = file.size
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : 'Unknown size';
      setSelectedFile({
        name: file.name,
        size: sizeMB,
        uri: file.uri,
        mimeType: file.mimeType,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not open file picker.');
    }
  };

  const handleSubmit = async () => {
    if (!selectedPeriod) {
      Alert.alert('Missing Field', 'Please select a reporting period.');
      return;
    }
    if (!selectedFile) {
      Alert.alert('Missing File', 'Please select a file to upload.');
      return;
    }
    setSubmitting(true);
    try {
      const newSubmission = await submitProgressReport(CURRENT_STUDENT.id, {
        title: selectedFile.name,
        fileSize: selectedFile.size,
        reportingPeriod: selectedPeriod,
        comments,
      });
      setSubmissions((prev) => [newSubmission, ...prev]);
      setSelectedPeriod('');
      setComments('');
      setSelectedFile(null);
      setUploadModalVisible(false);
      Alert.alert('Success', 'Report submitted successfully.');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
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
      <AppHeader
        title="Submissions"
        navigation={navigation}
        rightAction={
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={() => setUploadModalVisible(true)}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.uploadBtnText}>Upload</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.count}>{submissions.length} submissions</Text>

        {submissions.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.fileRow}>
              <View style={styles.fileIcon}>
                <Ionicons name="document-text" size={24} color="#1E56A0" />
              </View>
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.fileMeta}>
                  {item.fileSize} · {formatDate(item.submittedAt)}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(item.status) },
                ]}
              >
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={14} color="#6B7280" />
              <Text style={styles.detailText}>
                Period: {item.reportingPeriod}
              </Text>
            </View>

            {!!item.comments && (
              <View style={styles.detailRow}>
                <Ionicons
                  name="chatbubble-outline"
                  size={14}
                  color="#6B7280"
                />
                <Text style={styles.detailText} numberOfLines={2}>
                  {item.comments}
                </Text>
              </View>
            )}

            {!!item.supervisorComments && (
              <View style={styles.supervisorFeedback}>
                <Text style={styles.supervisorFeedbackLabel}>
                  Supervisor feedback
                </Text>
                <Text style={styles.supervisorFeedbackText}>
                  {item.supervisorComments}
                </Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* ── UPLOAD MODAL ── */}
      <Modal
        visible={uploadModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setUploadModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setUploadModalVisible(false)}>
              <Ionicons name="close" size={24} color="#0D1B2A" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Upload Progress Report</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
          >
            {/* File upload area */}
            <TouchableOpacity
              style={styles.fileUploadArea}
              onPress={handlePickFile}
            >
              {selectedFile ? (
                <View style={styles.selectedFileRow}>
                  <Ionicons
                    name="document-text"
                    size={32}
                    color="#1E56A0"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedFileName}>
                      {selectedFile.name}
                    </Text>
                    <Text style={styles.selectedFileSize}>
                      {selectedFile.size}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedFile(null)}>
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color="#EF4444"
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Ionicons
                    name="share-outline"
                    size={40}
                    color="#6B7280"
                  />
                  <Text style={styles.uploadAreaText}>
                    Tap to upload file: PDF/DOCX only
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Reporting Period */}
            <Text style={styles.fieldLabel}>Reporting Period</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setPeriodDropdownOpen(!periodDropdownOpen)}
            >
              <Text
                style={[
                  styles.dropdownText,
                  !selectedPeriod && { color: '#9BA4B5' },
                ]}
              >
                {selectedPeriod || 'Select'}
              </Text>
              <Ionicons
                name={periodDropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#6B7280"
              />
            </TouchableOpacity>

            
            {periodDropdownOpen && (
              <View style={styles.dropdownOptions}>
                {REPORTING_PERIODS.map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={styles.dropdownOption}
                    onPress={() => {
                      setSelectedPeriod(period);
                      setPeriodDropdownOpen(false);
                    }}
                  >
                    <Text style={styles.dropdownOptionText}>{period}</Text>
                    {selectedPeriod === period && (
                      <Ionicons name="checkmark" size={16} color="#1E56A0" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Comments */}
            <Text style={styles.fieldLabel}>Comments</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Type here...."
              placeholderTextColor="#9BA4B5"
              multiline
              numberOfLines={4}
              value={comments}
              onChangeText={setComments}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Submit</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
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
  uploadBtn: {
    backgroundColor: '#1E56A0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  body: {
    padding: 16,
  },
  count: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fileIcon: {
    width: 44,
    height: 44,
    backgroundColor: '#EFF6FF',
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
  fileMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  supervisorFeedback: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#22C55E',
    gap: 4,
  },
  supervisorFeedbackLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#22C55E',
    textTransform: 'uppercase',
  },
  supervisorFeedbackText: {
    fontSize: 13,
    color: '#374151',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  modalHeader: {
    backgroundColor: '#0D1B2A',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    marginLeft: 12,
  },
  modalBody: {
    padding: 16,
  },
  fileUploadArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 12,
  },
  uploadAreaText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  selectedFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  selectedFileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D1B2A',
  },
  selectedFileSize: {
    fontSize: 12,
    color: '#6B7280',
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0D1B2A',
    marginBottom: 8,
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dropdownText: {
    fontSize: 15,
    color: '#0D1B2A',
  },
  dropdownOptions: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 16,
    overflow: 'hidden',
  },
  dropdownOption: {
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownOptionText: {
    fontSize: 15,
    color: '#374151',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#0D1B2A',
    minHeight: 120,
    marginBottom: 20,
  },
  submitBtn: {
    backgroundColor: '#1E56A0',
    borderRadius: 30,
    padding: 16,
    alignItems: 'center',
    marginBottom: 32,
    marginHorizontal: 40,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});