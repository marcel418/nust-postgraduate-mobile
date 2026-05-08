import { Ionicons } from '@expo/vector-icons';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function FeedbackDetailScreen({ route, navigation }) {
  // route.params is how screens receive data passed during navigation
  // Like method parameters — the previous screen passes the feedback object
  const { feedback } = route.params;

  const isActionRequired = feedback.actionRequired;

  // Format the date nicely
  const formattedDate = new Date(feedback.createdAt).toLocaleDateString(
    'en-US',
    {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }
  );

  const formattedTime = new Date(feedback.createdAt).toLocaleTimeString(
    'en-US',
    { hour: '2-digit', minute: '2-digit' }
  );

  return (
    <View style={styles.container}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feedback</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* ── FROM CARD ── */}
        <View style={styles.card}>
          <View style={styles.fromRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{feedback.fromInitials}</Text>
            </View>
            <View style={styles.fromInfo}>
              <Text style={styles.fromName}>{feedback.fromName}</Text>
              <Text style={styles.fromRole}>{feedback.fromRole}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isActionRequired ? '#FEE2E2' : '#DCFCE7',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: isActionRequired ? '#EF4444' : '#22C55E' },
                ]}
              >
                {feedback.status}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.dateText}>
              {formattedDate} at {formattedTime}
            </Text>
          </View>
        </View>

        {/* ── MESSAGE CARD ── */}
        <View style={styles.card}>
          <Text style={styles.messageLabel}>Message</Text>
          <Text style={styles.messageText}>{feedback.message}</Text>
        </View>

        {/* ── ACTION REQUIRED BANNER ── */}
        {isActionRequired && (
          <View style={styles.actionBanner}>
            <Ionicons
              name="alert-circle-outline"
              size={20}
              color="#EF4444"
            />
            <Text style={styles.actionBannerText}>
              This feedback requires your attention. Please action before
              your next submission.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  header: {
    backgroundColor: '#0A1931',
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 32,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  body: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  fromRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E56A0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  fromInfo: {
    flex: 1,
  },
  fromName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0A1931',
  },
  fromRole: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: '#6B7280',
  },
  messageLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  messageText: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 24,
  },
  actionBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  actionBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#EF4444',
    lineHeight: 20,
  },
});