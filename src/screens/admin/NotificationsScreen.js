// src/screens/admin/NotificationsScreen.js

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import AppHeader from '../../components/AppHeader';
import { api } from '../../api/http';
import { extractItems, formatDate } from './adminHelpers';

export default function AdminNotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const response = await api.get('/notifications');
      const items = extractItems(response).sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );

      setNotifications(items);
    } catch (error) {
      Alert.alert('Could not load notifications', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read_at).length,
    [notifications]
  );

  const markAsRead = async (item) => {
    if (item.read_at || processingId) return;

    try {
      setProcessingId(item.id);
      await api.post(`/notifications/${item.id}/read`);
      await load();
    } catch (error) {
      Alert.alert('Could not mark notification as read', error?.message || 'Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E56A0" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Notifications"
        navigation={navigation}
        rightAction={
          unreadCount > 0 ? (
            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>{unreadCount}</Text>
            </View>
          ) : null
        }
      />

      <ScrollView
        style={styles.body}
        contentContainerStyle={[
          styles.bodyContent,
          notifications.length === 0 && { flexGrow: 1 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={48} color="#9BA4B5" />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyText}>System and workflow alerts will appear here.</Text>
          </View>
        ) : (
          notifications.map((item) => {
            const unread = !item.read_at;
            const processing = processingId === item.id;

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.notificationCard, unread && styles.unreadCard]}
                onPress={() => markAsRead(item)}
                disabled={processing}
              >
                <View style={[styles.notifIconWrap, unread && styles.notifIconUnread]}>
                  {processing ? (
                    <ActivityIndicator size="small" color="#1E56A0" />
                  ) : (
                    <Ionicons
                      name={unread ? 'mail-unread-outline' : 'mail-open-outline'}
                      size={21}
                      color={unread ? '#1E56A0' : '#6B7280'}
                    />
                  )}
                </View>

                <View style={styles.notifContent}>
                  <Text style={[styles.notifTitle, unread && styles.notifTitleUnread]}>
                    {item.title || 'Notification'}
                  </Text>
                  <Text style={[styles.notifMessage, unread && { color: '#0D1B2A' }]}> 
                    {item.message || 'No message provided.'}
                  </Text>
                  <Text style={styles.notifTime}>{formatDate(item.created_at, true)}</Text>
                </View>

                {unread && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F2F5', gap: 10 },
  loadingText: { color: '#6B7280', fontSize: 14 },
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  counterBadge: { minWidth: 34, height: 34, borderRadius: 17, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  counterText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  body: { flex: 1, paddingHorizontal: 16 },
  bodyContent: { paddingTop: 16, paddingBottom: 32 },
  notificationCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  unreadCard: { borderLeftWidth: 4, borderLeftColor: '#1E56A0' },
  notifIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  notifIconUnread: { backgroundColor: '#EFF6FF' },
  notifContent: { flex: 1, gap: 4 },
  notifTitle: { fontSize: 14, color: '#0D1B2A', fontWeight: '700' },
  notifTitleUnread: { fontWeight: '900' },
  notifMessage: { fontSize: 13, color: '#6B7280', lineHeight: 19 },
  notifTime: { fontSize: 12, color: '#9BA4B5', marginTop: 2 },
  unreadDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#1E56A0', marginTop: 6 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, color: '#0D1B2A', fontWeight: '800' },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
});
