// src/components/HODHeader.js

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { api } from '../api/http';

function normaliseNotificationsResponse(response) {
  return response?.data?.items || response?.items || [];
}

function getUnreadCount(items = []) {
  return items.filter((item) => {
    if (!item) return false;

    if (typeof item.read === 'boolean') {
      return !item.read;
    }

    return !item.read_at;
  }).length;
}

function hasRoute(navigation, routeName) {
  if (!navigation || !routeName) return false;

  let cursor = navigation;

  while (cursor) {
    const routeNames = cursor.getState?.()?.routeNames || [];

    if (routeNames.includes(routeName)) {
      return true;
    }

    cursor = cursor.getParent?.();
  }

  return false;
}

function navigateToFirstAvailable(navigation, candidates = []) {
  const cleanCandidates = candidates.filter(Boolean);

  if (!navigation || cleanCandidates.length === 0) return;

  const availableRoute = cleanCandidates.find((routeName) =>
    hasRoute(navigation, routeName)
  );

  navigation.navigate(availableRoute || cleanCandidates[0]);
}

export default function HODHeader({
  title,
  navigation,
  showBack = false,
  rightAction = null,
  hideNotifications = false,
  hideProfile = false,
}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [countLoading, setCountLoading] = useState(false);

  const loadNotificationCount = useCallback(async () => {
    if (hideNotifications) return;

    try {
      setCountLoading(true);

      const response = await api.get('/notifications');
      const items = normaliseNotificationsResponse(response);

      setUnreadCount(getUnreadCount(items));
    } catch (error) {
      // Header actions should not block the HOD workflow if notifications fail.
      setUnreadCount(0);
    } finally {
      setCountLoading(false);
    }
  }, [hideNotifications]);

  useEffect(() => {
    loadNotificationCount();

    const unsubscribe = navigation?.addListener?.('focus', loadNotificationCount);

    return unsubscribe;
  }, [navigation, loadNotificationCount]);

  const handleNotifications = () => {
    navigateToFirstAvailable(navigation, [
      'HODNotifications',
      'NotificationsList',
      'Notifications',
    ]);
  };

  const handleProfile = () => {
    navigateToFirstAvailable(navigation, [
      'HODProfile',
      'Profile',
    ]);
  };

  return (
    <View style={styles.header}>
      <View style={styles.leftSide}>
        {showBack && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        <Text
          style={[styles.headerTitle, showBack && styles.headerTitleBack]}
          numberOfLines={2}
        >
          {title}
        </Text>
      </View>

      <View style={styles.headerIcons}>
        {rightAction}

        {!hideNotifications && (
          <TouchableOpacity
            onPress={handleNotifications}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Open HOD notifications"
          >
            {countLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
            )}

            {unreadCount > 0 && !countLoading && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {!hideProfile && (
          <TouchableOpacity
            onPress={handleProfile}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Open HOD profile"
          >
            <Ionicons name="person-circle-outline" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#0D1B2A',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
  },
  leftSide: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  headerTitleBack: {
    fontSize: 20,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    position: 'relative',
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0D1B2A',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
});
