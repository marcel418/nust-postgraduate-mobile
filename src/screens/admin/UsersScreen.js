// src/screens/admin/UsersScreen.js

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import AppHeader from '../../components/AppHeader';
import { api } from '../../api/http';
import {
  extractItems,
  formatLabel,
  getInitials,
  getPrimaryRole,
  getRoleColor,
  normalizeUser,
  ROLE_CODES,
} from './adminHelpers';

const FILTERS = ['ALL', ...ROLE_CODES];

async function fetchUsers() {
  try {
    const response = await api.get('/users');
    const items = extractItems(response).map(normalizeUser);
    if (items.length > 0) return items;
  } catch {
    // Fallback for APIs that only support role-specific user lookup.
  }

  const responses = await Promise.allSettled(
    ROLE_CODES.map((role) => api.get('/users', { params: { role } }))
  );

  const map = new Map();

  responses.forEach((result) => {
    if (result.status !== 'fulfilled') return;

    extractItems(result.value).forEach((item) => {
      const user = normalizeUser(item);
      if (user.id) map.set(user.id, user);
    });
  });

  return Array.from(map.values());
}

export default function UsersScreen({ navigation, route }) {
  const initialRole = route?.params?.role || 'ALL';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState(initialRole);
  const [search, setSearch] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [savingUser, setSavingUser] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchUsers();
      setUsers(data.sort((a, b) => String(a.name).localeCompare(String(b.name))));
    } catch (error) {
      Alert.alert('Could not load users', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const roleMatch = filter === 'ALL' || getPrimaryRole(user) === filter || user.roles?.includes(filter);
      const queryMatch =
        !query ||
        String(user.name || '').toLowerCase().includes(query) ||
        String(user.email || '').toLowerCase().includes(query) ||
        String(getPrimaryRole(user)).toLowerCase().includes(query);

      return roleMatch && queryMatch;
    });
  }, [filter, search, users]);

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditName(user?.name || '');
    setEditEmail(user?.email || '');
  };

  const handleStatusToggle = (user) => {
    const currentStatus = String(user.status || 'ACTIVE').toUpperCase();
    const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    Alert.alert(
      'Update User Status',
      `Change ${user.name} to ${formatLabel(nextStatus)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            try {
              setUpdatingUserId(user.id);
              const response = await api.patch(`/users/${user.id}/status`, { status: nextStatus });
              const updatedUser = extractItems(response)?.[0] || response?.data?.user || response?.user || null;

              if (updatedUser?.id) {
                setUsers((currentUsers) =>
                  currentUsers.map((item) =>
                    item.id === updatedUser.id ? { ...item, status: updatedUser.status } : item
                  )
                );
              } else {
                setUsers((currentUsers) =>
                  currentUsers.map((item) =>
                    item.id === user.id ? { ...item, status: nextStatus } : item
                  )
                );
              }
            } catch (error) {
              Alert.alert('Could not update user', error?.response?.data?.errors?.[0]?.message || error?.message || 'Please try again.');
            } finally {
              setUpdatingUserId(null);
            }
          },
        },
      ]
    );
  };

  const closeEditModal = () => {
    if (savingUser) return;

    setEditingUser(null);
    setEditName('');
    setEditEmail('');
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    const payload = {};
    const nextName = editName.trim();
    const nextEmail = editEmail.trim();

    if (nextName !== String(editingUser.name || '').trim()) {
      payload.name = nextName;
    }

    if (nextEmail.toLowerCase() !== String(editingUser.email || '').trim().toLowerCase()) {
      payload.email = nextEmail;
    }

    if (Object.keys(payload).length === 0) {
      Alert.alert('No changes', 'Update at least one field before saving.');
      return;
    }

    try {
      setSavingUser(true);
      const response = await api.patch(`/users/${editingUser.id}`, payload);
      const updatedUser = response?.data?.user || response?.user || response?.data || response;

      setUsers((currentUsers) =>
        currentUsers.map((item) =>
          item.id === editingUser.id
            ? {
                ...item,
                ...(updatedUser?.name !== undefined ? { name: updatedUser.name } : {}),
                ...(updatedUser?.email !== undefined ? { email: updatedUser.email } : {}),
              }
            : item
        )
      );

      Alert.alert('Success', 'User updated successfully.');
      closeEditModal();
    } catch (error) {
      Alert.alert(
        'Could not update user',
        error?.response?.data?.errors?.[0]?.message || error?.message || 'Please try again.'
      );
    } finally {
      setSavingUser(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E56A0" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Users" navigation={navigation} />

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#6B7280" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search name, email or role"
          placeholderTextColor="#9BA4B5"
          style={styles.searchInput}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#9BA4B5" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {FILTERS.map((item) => {
            const active = filter === item;
            return (
              <TouchableOpacity
                key={item}
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => setFilter(item)}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {item === 'ALL' ? 'All' : formatLabel(item)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
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
        <Text style={styles.count}>{filteredUsers.length} user{filteredUsers.length === 1 ? '' : 's'}</Text>

        {filteredUsers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={46} color="#9BA4B5" />
            <Text style={styles.emptyTitle}>No users found</Text>
            <Text style={styles.emptyText}>Try another filter or search term.</Text>
          </View>
        ) : (
          filteredUsers.map((user) => {
            const role = getPrimaryRole(user);
            const status = user.status || 'ACTIVE';
            const active = String(status).toUpperCase() === 'ACTIVE';

            return (
              <View key={user.id} style={styles.userCard}>
                <View style={[styles.avatar, { backgroundColor: getRoleColor(role) }]}>
                  <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
                </View>

                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>

                  <View style={styles.badgeRow}>
                    <View style={[styles.roleBadge, { backgroundColor: getRoleColor(role) }]}>
                      <Text style={styles.badgeText}>{formatLabel(role)}</Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.statusBadge,
                        { backgroundColor: active ? '#F0FDF4' : '#FEE2E2' },
                        updatingUserId === user.id && { opacity: 0.6 },
                      ]}
                      onPress={() => handleStatusToggle(user)}
                      disabled={updatingUserId === user.id}
                    >
                      <Text style={[styles.statusText, { color: active ? '#22C55E' : '#EF4444' }]}>
                        {formatLabel(status)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity style={styles.infoBtn} onPress={() => openEditModal(user)}>
                  <Ionicons name="create-outline" size={22} color="#1E56A0" />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={!!editingUser} transparent animationType="fade" onRequestClose={closeEditModal}>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardWrap}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Edit User</Text>
                  <Text style={styles.modalSubtitle}>{editingUser?.name || 'Selected user'}</Text>
                </View>

                <TouchableOpacity onPress={closeEditModal} disabled={savingUser} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={20} color="#0D1B2A" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
                <Text style={styles.fieldLabel}>Name</Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Full name"
                  placeholderTextColor="#9BA4B5"
                  style={styles.fieldInput}
                />

                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="Email address"
                  placeholderTextColor="#9BA4B5"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.fieldInput}
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={closeEditModal} disabled={savingUser}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveUser} disabled={savingUser}>
                  <Text style={styles.saveBtnText}>{savingUser ? 'Saving...' : 'Save Changes'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F2F5', gap: 10 },
  loadingText: { color: '#6B7280', fontSize: 14 },
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  searchWrap: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: { flex: 1, color: '#0D1B2A', fontSize: 14, paddingVertical: 2 },
  filterWrapper: { marginBottom: 4 },
  filterContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  filterPill: { backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: '#E5E7EB' },
  filterPillActive: { backgroundColor: '#1E56A0', borderColor: '#1E56A0' },
  filterText: { color: '#374151', fontWeight: '700', fontSize: 13 },
  filterTextActive: { color: '#FFFFFF' },
  body: { flex: 1, paddingHorizontal: 16 },
  bodyContent: { paddingTop: 6, paddingBottom: 32 },
  count: { color: '#6B7280', fontSize: 13, marginBottom: 10 },
  userCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  userInfo: { flex: 1, gap: 4 },
  userName: { fontSize: 15, fontWeight: '800', color: '#0D1B2A' },
  userEmail: { fontSize: 12, color: '#6B7280' },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 3 },
  roleBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '800' },
  infoBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 28, alignItems: 'center', gap: 8, marginTop: 24 },
  emptyTitle: { color: '#0D1B2A', fontSize: 17, fontWeight: '800' },
  emptyText: { color: '#6B7280', fontSize: 13, textAlign: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', padding: 16 },
  modalKeyboardWrap: { width: '100%' },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#0D1B2A' },
  modalSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  modalCloseBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  modalContent: { gap: 10, paddingBottom: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '800', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.4 },
  fieldInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: '#0D1B2A', fontSize: 14, backgroundColor: '#FFFFFF' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center', backgroundColor: '#F3F4F6' },
  cancelBtnText: { color: '#0D1B2A', fontWeight: '800', fontSize: 14 },
  saveBtn: { flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center', backgroundColor: '#1E56A0' },
  saveBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
