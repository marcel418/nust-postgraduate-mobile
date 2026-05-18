// src/screens/student/NotificationsScreen.js

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { notificationsApi } from '../../api/notificationsApi';
import { formatDate, formatTime } from './studentHelpers';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await notificationsApi.list();
      const items = response?.data?.items || response?.items || [];

      setNotifications(
        [...items].sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
        )
      );
    } catch (error) {
      Alert.alert('Could not load notifications', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markAsRead = async (item) => {
    if (item.read_at || item.read) return;

    try {
      await notificationsApi.markAsRead(item.id);
      await loadNotifications();
    } catch (error) {
      Alert.alert('Could not update notification', error?.message || 'Please try again.');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => {
          const unread = !(item.read_at || item.read);

          return (
            <TouchableOpacity
              style={[styles.notificationCard, unread && styles.unreadCard]}
              onPress={() => markAsRead(item)}
            >
              <View style={styles.notifIconWrap}>
                <Ionicons
                  name={unread ? 'mail-unread-outline' : 'mail-open-outline'}
                  size={20}
                  color="#1E56A0"
                />
              </View>

              <View style={styles.notifContent}>
                <Text style={[styles.notifMessage, unread && styles.unreadText]}>
                  {item.message || item.title || 'Workflow notification'}
                </Text>

                <Text style={styles.notifTime}>
                  {formatDate(item.created_at)} · {formatTime(item.created_at)}
                </Text>
              </View>

              {unread && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={48} color="#9BA4B5" />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F6F9' },
  container: { flex: 1, backgroundColor: '#F4F6F9' },
  header: { backgroundColor: '#0A1931', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 32 },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  list: { padding: 16, paddingBottom: 40 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: '#9BA4B5' },
  notificationCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  unreadCard: { borderLeftWidth: 3, borderLeftColor: '#1E56A0' },
  notifIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  notifContent: { flex: 1, gap: 4 },
  notifMessage: { fontSize: 14, color: '#0A1931', lineHeight: 20, fontWeight: '500' },
  unreadText: { fontWeight: '800' },
  notifTime: { fontSize: 12, color: '#9BA4B5' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1E56A0', marginTop: 4 },
});
