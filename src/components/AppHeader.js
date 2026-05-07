import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CURRENT_STUDENT } from '../data/mockData';
import { getNotifications } from '../services/api';


export default function AppHeader({ title, navigation, rightAction = null }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotificationCount();
  }, []);

  const loadNotificationCount = async () => {
    try {
      const data = await getNotifications(CURRENT_STUDENT.id);
      setUnreadCount(data.filter((n) => !n.read).length);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerIcons}>
        {/* If a custom right action is passed, show it */}
        {rightAction && rightAction}
        <TouchableOpacity
          onPress={() => navigation.navigate('NotificationsList')}
          style={styles.iconBtn}
        >
          <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
          {!!unreadCount && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          style={styles.iconBtn}
        >
          <Ionicons name="person-circle-outline" size={26} color="#FFFFFF" />
        </TouchableOpacity>
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
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});