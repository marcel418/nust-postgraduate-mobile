import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
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

const FILE_TYPES = ['SoP', 'Thesis'];

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

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const data = await getSupervisorStudents(CURRENT_SUPERVISOR.id);
      setStudents(data);
    } catch (error) {
      console.error('Failed to load students:', error);
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
      setSelectedFile({ name: file.name, size: sizeMB, uri: file.uri });
    } catch (error) {
      Alert.alert('Error', 'Could not open file picker.');
    }
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
      // TODO: POST /documents
      await new Promise((resolve) => setTimeout(resolve, 800));
      Alert.alert('Success', 'Document submitted successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit. Please try again.');
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

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

        {/* ── SELECT STUDENT ── */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Select student</Text>

          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => {
              setStudentDropdownOpen(!studentDropdownOpen);
              setTypeDropdownOpen(false);
            }}
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
              {students.map((student) => (
                <TouchableOpacity
                  key={student.id}
                  style={styles.dropdownOption}
                  onPress={() => {
                    setSelectedStudent(student);
                    setStudentDropdownOpen(false);
                  }}
                >
                  <Text style={styles.dropdownOptionText}>
                    {student.name}
                  </Text>
                  {selectedStudent?.id === student.id && (
                    <Ionicons name="checkmark" size={16} color="#1E56A0" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── SELECT TYPE ── */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Select type</Text>

          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => {
              setTypeDropdownOpen(!typeDropdownOpen);
              setStudentDropdownOpen(false);
            }}
          >
            <Text
              style={[
                styles.dropdownText,
                !selectedType && { color: '#9BA4B5' },
              ]}
            >
              {selectedType || 'Select file type'}
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
                  key={type}
                  style={styles.dropdownOption}
                  onPress={() => {
                    setSelectedType(type);
                    setTypeDropdownOpen(false);
                  }}
                >
                  <Text style={styles.dropdownOptionText}>{type}</Text>
                  {selectedType === type && (
                    <Ionicons name="checkmark" size={16} color="#1E56A0" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── FILE UPLOAD ── */}
        <TouchableOpacity
          style={styles.fileUploadArea}
          onPress={handlePickFile}
        >
          {selectedFile ? (
            <View style={styles.selectedFileRow}>
              <Ionicons name="document-text" size={32} color="#1E56A0" />
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedFileName}>
                  {selectedFile.name}
                </Text>
                <Text style={styles.selectedFileSize}>
                  {selectedFile.size}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedFile(null)}>
                <Ionicons name="close-circle" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Ionicons name="share-outline" size={40} color="#6B7280" />
              <Text style={styles.uploadAreaText}>
                Tap to upload file: PDF/DOCX only
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── COMMENTS ── */}
        <View style={styles.card}>
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
        </View>

        {/* ── SUBMIT ── */}
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
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
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
  },
  dropdownOptionText: {
    fontSize: 15,
    color: '#374151',
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
    fontWeight: '600',
    color: '#0D1B2A',
  },
  selectedFileSize: {
    fontSize: 12,
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