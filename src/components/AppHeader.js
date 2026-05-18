// src/components/AppHeader.js

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { api } from '../api/http';
import { useAuthStore } from '../store/authStore';

function getRoleNames(roles = [], user = null) {
  const rawRoles =
    Array.isArray(roles) && roles.length
      ? roles
      : Array.isArray(user?.roles)
        ? user.roles
        : user?.role
          ? [user.role]
          : [];

  return rawRoles
    .map((role) => {
      if (typeof role === 'string') return role;

      return (
        role?.code ||
        role?.name ||
        role?.slug ||
        role?.role ||
        role?.role_name ||
        ''
      );
    })
    .filter(Boolean)
    .map((role) => String(role).trim().toUpperCase().replace(/[\s-]+/g, '_'));
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

function getDefaultProfileRoute(roleNames = []) {
  if (roleNames.includes('SYSTEM_ADMIN') || roleNames.includes('ADMIN')) {
    return 'Settings';
  }

  return 'Profile';
}

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

export default function AppHeader({
  title,
  navigation,
  rightAction = null,
  showBack = false,
  hideNotifications = false,
  hideProfile = false,
  notificationRoute,
  profileRoute,
  onNotificationPress,
  onProfilePress,
  subtitle = null,
  compact = false,
}) {
  const user = useAuthStore((state) => state.user);
  const roles = useAuthStore((state) => state.roles);

  const [unreadCount, setUnreadCount] = useState(0);
  const [countLoading, setCountLoading] = useState(false);

  const roleNames = useMemo(() => getRoleNames(roles, user), [roles, user]);

  const resolvedProfileRoute =
    profileRoute || getDefaultProfileRoute(roleNames);

  const loadNotificationCount = useCallback(async () => {
    if (hideNotifications) return;

    try {
      setCountLoading(true);

      const response = await api.get('/notifications');
      const items = normaliseNotificationsResponse(response);

      setUnreadCount(getUnreadCount(items));
    } catch (error) {
      // The header should never break a screen if notifications fail.
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
    if (typeof onNotificationPress === 'function') {
      onNotificationPress();
      return;
    }

    navigateToFirstAvailable(navigation, [
      notificationRoute,
      'NotificationsList',
      'Notifications',
      'AdminNotifications',
      'HODNotifications',
      'EvalNotifications',
      'ExtNotifications',
      'FPGCRNotifications',
      'FPGCNotifications',
    ]);
  };

  const handleProfile = () => {
    if (typeof onProfilePress === 'function') {
      onProfilePress();
      return;
    }

    navigateToFirstAvailable(navigation, [
      resolvedProfileRoute,
      'Profile',
      'Settings',
      'HODProfile',
      'EvalProfile',
      'ExtProfile',
      'FPGCRProfile',
      'FPGCProfile',
    ]);
  };

  return (
    <View style={[styles.header, compact && styles.headerCompact]}>
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

        <View style={styles.titleBlock}>
          <Text
            style={[styles.headerTitle, compact && styles.headerTitleCompact]}
            numberOfLines={2}
          >
            {title}
          </Text>

          {!!subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.headerIcons}>
        {rightAction}

        {!hideNotifications && (
          <TouchableOpacity
            onPress={handleNotifications}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Open notifications"
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
            accessibilityLabel="Open profile"
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
  headerCompact: {
    paddingTop: 48,
    paddingBottom: 16,
  },
  leftSide: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitleCompact: {
    fontSize: 20,
  },
  subtitle: {
    color: '#9BA4B5',
    fontSize: 12,
    marginTop: 3,
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
