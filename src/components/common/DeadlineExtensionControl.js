import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { submissionsApi } from '../../api/submissionsApi';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateInput(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(parsed.getTime());
}

export default function DeadlineExtensionControl({
  submissionId,
  currentDeadlineText,
  onSuccess,
  buttonLabel = 'Extend Deadline',
}) {
  const [visible, setVisible] = useState(false);
  const [extendedDueDate, setExtendedDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const open = () => {
    setExtendedDueDate('');
    setVisible(true);
  };

  const close = () => {
    if (submitting) return;

    setVisible(false);
    setExtendedDueDate('');
  };

  const handleSubmit = async () => {
    const trimmed = extendedDueDate.trim();

    if (!submissionId) {
      Alert.alert('Missing submission', 'No submission selected.');
      return;
    }

    if (!isValidDateInput(trimmed)) {
      Alert.alert(
        'Invalid Date',
        'Please enter a valid date in YYYY-MM-DD format.'
      );
      return;
    }

    try {
      setSubmitting(true);

      const response = await submissionsApi.extendDeadline(submissionId, trimmed);
      const updatedSubmission = response?.data?.submission || response?.submission || null;

      if (typeof onSuccess === 'function') {
        await onSuccess(updatedSubmission);
      }

      setVisible(false);
      setExtendedDueDate('');

      Alert.alert('Success', `Deadline extended to ${trimmed}.`);
    } catch (error) {
      Alert.alert(
        'Extension Failed',
        error?.message || 'Could not extend the deadline. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.button} onPress={open} disabled={submitting}>
        <Ionicons name="time-outline" size={16} color="#1E56A0" />
        <Text style={styles.buttonText}>{buttonLabel}</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>{buttonLabel}</Text>

              <TouchableOpacity onPress={close} disabled={submitting}>
                <Ionicons name="close" size={24} color="#0D1B2A" />
              </TouchableOpacity>
            </View>

            {!!currentDeadlineText && (
              <Text style={styles.subtitle}>Current deadline: {currentDeadlineText}</Text>
            )}

            <Text style={styles.helperText}>Enter the new deadline as YYYY-MM-DD.</Text>

            <TextInput
              value={extendedDueDate}
              onChangeText={setExtendedDueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9BA4B5"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!submitting}
              style={styles.input}
            />

            <TouchableOpacity
              style={[styles.submitButton, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Save Extension</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#1E56A0',
    fontSize: 13,
    fontWeight: '800',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 27, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#0D1B2A',
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
    paddingRight: 12,
  },
  subtitle: {
    color: '#374151',
    lineHeight: 20,
    fontWeight: '600',
  },
  helperText: {
    color: '#6B7280',
    fontSize: 13,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#0D1B2A',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#1E56A0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});