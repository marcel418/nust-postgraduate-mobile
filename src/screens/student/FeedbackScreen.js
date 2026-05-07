import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AppHeader from '../../components/AppHeader';
import { CURRENT_STUDENT } from '../../data/mockData';
import { getStudentFeedback } from '../../services/api';

export default function FeedbackScreen({ navigation }) {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    try {
      const data = await getStudentFeedback(CURRENT_STUDENT.id);
      const sorted = data.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setFeedback(sorted);
    } catch (error) {
      console.error('Failed to load feedback:', error);
    } finally {
      setLoading(false);
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
      <AppHeader title="Feedback" navigation={navigation} />

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {feedback.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            onPress={() =>
              navigation.navigate('FeedbackDetail', { feedback: item })
            }
          >
            <View style={styles.topRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.fromInitials}</Text>
              </View>

              <View style={styles.nameCol}>
                <Text style={styles.fromName}>{item.fromName}</Text>
                <Text style={styles.fromRole}>
                  {item.fromRole}
                </Text>
              </View>

              <View style={styles.statusRow}>
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: item.actionRequired
                        ? '#F59E0B'
                        : '#22C55E',
                    },
                  ]}
                >
                  {item.status}
                </Text>
                {!item.actionRequired && (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color="#22C55E"
                  />
                )}
              </View>
            </View>

            {/* ── MESSAGE ── */}
            <Text style={styles.message} numberOfLines={3}>
              {item.message}
            </Text>
          </TouchableOpacity>
        ))}
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
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E56A0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  nameCol: {
    flex: 1,
    gap: 2,
  },
  fromName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0D1B2A',
  },
  fromRole: {
    fontSize: 13,
    color: '#6B7280',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  message: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
});