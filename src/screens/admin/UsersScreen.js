import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import { getAllUsers, toggleUserStatus } from '../../services/api';

const getRoleColor = (role) => {
  switch (role) {
    case 'Student': return '#1E56A0';
    case 'Supervisor': return '#7C3AED';
    default: return '#6B7280';
  }
};

export default function UsersScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  const FILTERS = ['All', 'Student', 'Supervisor'];

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = (user) => {
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    Alert.alert(
      `${newStatus === 'Active' ? 'Activate' : 'Deactivate'} User`,
      `Are you sure you want to ${newStatus === 'Active' ? 'activate' : 'deactivate'} ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: newStatus === 'Inactive' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await toggleUserStatus(user.id, newStatus);
              setUsers((prev) =>
                prev.map((u) =>
                  u.id === user.id ? { ...u, status: newStatus } : u
                )
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to update user status.');
            }
          },
        },
      ]
    );
  };

  const filteredUsers = filter === 'All'
    ? users
    : users.filter((u) => u.role === filter);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
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
      <AppHeader title="Users" navigation={navigation} />

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

        {/* ── FILTER TABS ── */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterBtn,
                filter === f && styles.filterBtnActive,
              ]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === f && styles.filterTextActive,
                ]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.count}>{filteredUsers.length} users</Text>

        {filteredUsers.map((user) => (
          <View key={user.id} style={styles.userCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.roleBadge,
                    { backgroundColor: getRoleColor(user.role) },
                  ]}
                >
                  <Text style={styles.badgeText}>{user.role}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        user.status === 'Active' ? '#F0FDF4' : '#FEE2E2',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          user.status === 'Active' ? '#22C55E' : '#EF4444',
                      },
                    ]}
                  >
                    {user.status}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.toggleBtn,
                {
                  backgroundColor:
                    user.status === 'Active' ? '#FEE2E2' : '#F0FDF4',
                },
              ]}
              onPress={() => handleToggleStatus(user)}
            >
              <Ionicons
                name={user.status === 'Active' ? 'close-circle-outline' : 'checkmark-circle-outline'}
                size={22}
                color={user.status === 'Active' ? '#EF4444' : '#22C55E'}
              />
            </TouchableOpacity>
          </View>
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterBtnActive: {
    backgroundColor: '#1E56A0',
    borderColor: '#1E56A0',
  },
  filterText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  count: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
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
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0D1B2A',
  },
  userEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  toggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});