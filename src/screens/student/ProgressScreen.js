import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import AppHeader from '../../components/AppHeader';
import { CURRENT_STUDENT } from '../../data/mockData';
import { getStudentMilestones } from '../../services/api';

const getStatusColor = (status) => {
  switch (status) {
    case 'Completed': return '#22C55E';
    case 'In Progress': return '#7C3AED';
    case 'Pending': return '#F59E0B';
    default: return '#6B7280';
  }
};

export default function ProgressScreen({ navigation }) {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMilestones();
  }, []);

  const loadMilestones = async () => {
    try {
      const data = await getStudentMilestones(CURRENT_STUDENT.id);
      setMilestones(data);
    } catch (error) {
      console.error('Failed to load milestones:', error);
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
      {/* ── HEADER ── */}
      <AppHeader title="Progress Timeline" navigation={navigation} />

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {milestones.map((milestone, index) => {
            const isLast = index === milestones.length - 1;
            const color = getStatusColor(milestone.status);

            return (
              <View key={milestone.id} style={styles.milestoneRow}>

                {/* Left — dot + line */}
                <View style={styles.leftCol}>
                  <View
                    style={[styles.dot, { backgroundColor: color }]}
                  />
                  {/* Connecting line — hidden on last item */}
                  {!isLast && <View style={styles.line} />}
                </View>

                {/* Right — content */}
                <View
                  style={[
                    styles.milestoneContent,
                    !isLast && styles.milestoneContentSpaced,
                  ]}
                >
                  <View style={styles.milestoneTextCol}>
                    <Text style={styles.milestoneTitle}>
                      {milestone.title}
                    </Text>
                    <Text style={styles.milestoneDate}>
                      {milestone.date ?? '--'}
                    </Text>
                  </View>
                  <Text
                    style={[styles.statusText, { color }]}
                  >
                    {milestone.status}
                  </Text>
                </View>

              </View>
            );
          })}
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
  header: {
    backgroundColor: '#0D1B2A',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    position: 'relative',
  },
  body: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  milestoneRow: {
    flexDirection: 'row',
    gap: 16,
  },
  leftCol: {
    alignItems: 'center',
    width: 14,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  milestoneContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  milestoneContentSpaced: {
    paddingBottom: 24,
  },
  milestoneTextCol: {
    gap: 4,
  },
  milestoneTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0D1B2A',
  },
  milestoneDate: {
    fontSize: 13,
    color: '#6B7280',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
});