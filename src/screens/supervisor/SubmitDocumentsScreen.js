// src/screens/supervisor/SubmitDocumentsScreen.js

import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import AppHeader from '../../components/AppHeader';
import { api } from '../../api/http';
import { submissionsApi } from '../../api/submissionsApi';
import {
  formatFileSize,
  getInitials,
  groupStudentsFromSubmissions,
} from './supervisorHelpers';

const FILE_TYPES = [
  { label: 'Statement of Purpose', value: 'PROGRESS_REPORT' },
  { label: 'Thesis', value: 'THESIS' },
];

export default function SubmitDocumentsScreen({ navigation }) {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedType, setSelectedType] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [comments, setComments] = useState('');
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStudents = useCallback(async () => {
    try {
      const response = await submissionsApi.list();
      const items = response?.data?.items || response?.items || [];

      const grouped = groupStudentsFromSubmissions(items);
      setStudents(grouped);

      if (!selectedStudent && grouped.length > 0) {
        setSelectedStudent(grouped[0]);
      }
    } catch (error) {
      Alert.alert(
        'Could not load students',
        error?.message || 'Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStudent]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const selectedTypeLabel = useMemo(
    () => FILE_TYPES.find((item) => item.value === selectedType)?.label || '',
    [selectedType]
  );

  const refresh = () => {
    setRefreshing(true);
    loadStudents();
  };

  const resetForm = () => {
    setSelectedType('');
    setSelectedFile(null);
    setComments('');
    setStudentDropdownOpen(false);
    setTypeDropdownOpen(false);
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

      const file = result.assets?.[0];

      if (!file) {
        Alert.alert('No File Selected', 'Please select a valid PDF or DOCX file.');
        return;
      }

      setSelectedFile({
        name: file.name,
        size: file.size || 0,
        sizeLabel: formatFileSize(file.size),
        uri: file.uri,
        mimeType: file.mimeType || 'application/octet-stream',
      });
    } catch (error) {
      Alert.alert('Error', 'Could not open file picker.');
    }
  };

  const uploadDocument = async () => {
    if (!selectedFile) return null;

    const formData = new FormData();

    formData.append('file', {
      uri: selectedFile.uri,
      name: selectedFile.name,
      type: selectedFile.mimeType,
    });

    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response?.data?.document || null;
  };

  const handleSubmit = async () => {
    if (!selectedStudent) {
      Alert.alert('Missing Field', 'Please select a student.');
      return;
    }

    if (!selectedType) {
      Alert.alert('Missing Field', 'Please select a file type.');
      return;
    }

    if (!selectedFile) {
      Alert.alert('Missing File', 'Please select a file to upload.');
      return;
    }

    setSubmitting(true);

    try {
      const document = await uploadDocument();

      const descriptionPayload = {
        reportingPeriod: 'Supervisor Upload',
        comments: comments.trim(),
        fileName: selectedFile.name || document?.original_filename || '',
        fileSize: selectedFile.sizeLabel || '',
        mimeType: selectedFile.mimeType || document?.mime_type || '',
        documentId: document?.id || null,
        uploadedForStudentId: selectedStudent.id || null,
        uploadedForStudentName: selectedStudent.name || '',
      };

      /*
        The current backend does not yet expose a dedicated
        "supervisor uploads document for student" endpoint.
        This creates a workflow submission using the real document upload
        endpoint and the existing submissions endpoint so the uploaded file is
        visible in the system for testing/demo purposes.
      */
      await api.post('/submissions', {
        submission_type: selectedType,
        title: selectedFile.name || selectedTypeLabel || 'Supervisor Uploaded Document',
        description: JSON.stringify(descriptionPayload),
      });

      resetForm();

      Alert.alert(
        'Success',
        'Document uploaded successfully. It has been saved to the backend document store.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Upload Failed',
        error?.message || 'Failed to submit. Please try again.'
      );
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
      <AppHeader title={'Submit\nDocuments'} navigation={navigation} />

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={20} color="#1E56A0" />
          <Text style={styles.infoBannerText}>
            Uploaded files are saved to the backend document store. A dedicated supervisor-to-student document linking endpoint can be added later.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Select student</Text>

          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => {
              setStudentDropdownOpen(!studentDropdownOpen);
              setTypeDropdownOpen(false);
            }}
            disabled={submitting}
          >
            <Text
              style={[
                styles.dropdownText,
                !selectedStudent && { color: '#9BA4B5' },
              ]}
            >
              {selectedStudent?.name || 'Select a student'}
            </Text>

            <Ionicons
              name={studentDropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>

          {studentDropdownOpen && (
            <View style={styles.dropdownOptions}>
              {students.length === 0 ? (
                <View style={styles.emptyOption}>
                  <Text style={styles.emptyOptionText}>
                    No students found from current submissions.
                  </Text>
                </View>
              ) : (
                students.map((student) => (
                  <TouchableOpacity
                    key={student.id || student.name}
                    style={styles.dropdownOption}
                    onPress={() => {
                      setSelectedStudent(student);
                      setStudentDropdownOpen(false);
                    }}
                    disabled={submitting}
                  >
                    <View style={styles.studentOptionAvatar}>
                      <Text style={styles.studentOptionAvatarText}>
                        {getInitials(student.name)}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.dropdownOptionText}>{student.name}</Text>
                      <Text style={styles.optionMeta}>{student.course}</Text>
                    </View>

                    {selectedStudent?.id === student.id && (
                      <Ionicons name="checkmark" size={16} color="#1E56A0" />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Select type</Text>

          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => {
              setTypeDropdownOpen(!typeDropdownOpen);
              setStudentDropdownOpen(false);
            }}
            disabled={submitting}
          >
            <Text
              style={[
                styles.dropdownText,
                !selectedType && { color: '#9BA4B5' },
              ]}
            >
              {selectedTypeLabel || 'Select file type'}
            </Text>

            <Ionicons
              name={typeDropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>

          {typeDropdownOpen && (
            <View style={styles.dropdownOptions}>
              {FILE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={styles.dropdownOption}
                  onPress={() => {
                    setSelectedType(type.value);
                    setTypeDropdownOpen(false);
                  }}
                  disabled={submitting}
                >
                  <Text style={styles.dropdownOptionText}>{type.label}</Text>

                  {selectedType === type.value && (
                    <Ionicons name="checkmark" size={16} color="#1E56A0" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.fileUploadArea}
          onPress={handlePickFile}
          disabled={submitting}
        >
          {selectedFile ? (
            <View style={styles.selectedFileRow}>
              <Ionicons name="document-text" size={32} color="#1E56A0" />

              <View style={{ flex: 1 }}>
                <Text style={styles.selectedFileName} numberOfLines={2}>
                  {selectedFile.name}
                </Text>
                <Text style={styles.selectedFileSize}>
                  {selectedFile.sizeLabel}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setSelectedFile(null)}
                disabled={submitting}
              >
                <Ionicons name="close-circle" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={40} color="#6B7280" />
              <Text style={styles.uploadAreaText}>
                Tap to upload file: PDF/DOCX only
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Comments</Text>

          <TextInput
            style={styles.textArea}
            placeholder="Type here..."
            placeholderTextColor="#9BA4B5"
            multiline
            numberOfLines={4}
            value={comments}
            onChangeText={setComments}
            textAlignVertical="top"
            editable={!submitting}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="send-outline" size={18} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>Submit</Text>
            </>
          )}
        </TouchableOpacity>
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
  infoBanner: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoBannerText: {
    flex: 1,
    color: '#1E56A0',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D1B2A',
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dropdownText: {
    fontSize: 15,
    color: '#0D1B2A',
    flex: 1,
  },
  dropdownOptions: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 4,
  },
  dropdownOption: {
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 10,
  },
  dropdownOptionText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '600',
  },
  optionMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  studentOptionAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1E56A0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentOptionAvatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyOption: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  emptyOptionText: {
    color: '#6B7280',
    fontSize: 13,
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
    marginBottom: 12,
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
    fontWeight: '700',
    color: '#0D1B2A',
  },
  selectedFileSize: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#0D1B2A',
    minHeight: 120,
  },
  submitBtn: {
    backgroundColor: '#1E56A0',
    borderRadius: 30,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    marginHorizontal: 40,
    flexDirection: 'row',
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.7,
  },
});
