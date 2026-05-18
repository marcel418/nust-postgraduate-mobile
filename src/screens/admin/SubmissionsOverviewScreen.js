// src/screens/admin/SubmissionsOverviewScreen.js

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { documentsApi } from '../../api/documentsApi';
import {
  extractItems,
  formatDate,
  formatLabel,
  getStatusColor,
  getStatusLabel,
  normalizeSubmission,
} from './adminHelpers';

const FILTERS = [
  { label: 'All', value: 'ALL' },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Supervisor Approved', value: 'APPROVED_BY_SUPERVISOR' },
  { label: 'Internal Eval', value: 'UNDER_INTERNAL_EVAL' },
  { label: 'FPGC-R', value: 'FORWARDED_TO_FPGCR' },
  { label: 'FPGC', value: 'FORWARDED_TO_FPGC' },
  { label: 'External', value: 'EXTERNAL_EVAL_ASSIGNED' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
];

export default function SubmissionsOverviewScreen({ navigation, route }) {
  const initialStatus = route?.params?.status || 'ALL';

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState(initialStatus);
  const [search, setSearch] = useState('');
  const [openingId, setOpeningId] = useState(null);

  const load = useCallback(async () => {
    try {
      const response = await api.get('/submissions');
      const items = extractItems(response)
        .map(normalizeSubmission)
        .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

      setSubmissions(items);
    } catch (error) {
      Alert.alert('Could not load submissions', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredSubmissions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return submissions.filter((item) => {
      const statusMatch =
        filter === 'ALL' ||
        item.status === filter ||
        (filter === 'PENDING' &&
          !['APPROVED', 'REJECTED', 'DRAFT'].includes(item.status));

      const queryMatch =
        !query ||
        String(item.title || '').toLowerCase().includes(query) ||
        String(item.document || '').toLowerCase().includes(query) ||
        String(item.student?.name || '').toLowerCase().includes(query) ||
        String(item.typeLabel || '').toLowerCase().includes(query);

      return statusMatch && queryMatch;
    });
  }, [filter, search, submissions]);

  const handleOpenDocument = async (item) => {
    if (!item.documentId) {
      Alert.alert('No Document', 'This submission does not have a linked uploaded document.');
      return;
    }

    try {
      setOpeningId(item.id);
      await documentsApi.openDocument(item.documentId, item.document);
    } catch (error) {
      Alert.alert('Could not open document', error?.message || 'Please try again.');
    } finally {
      setOpeningId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E56A0" />
        <Text style={styles.loadingText}>Loading submissions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Submissions" navigation={navigation} />

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#6B7280" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search title, file, student or type"
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
            const active = filter === item.value;
            return (
              <TouchableOpacity
                key={item.value}
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => setFilter(item.value)}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
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
        <Text style={styles.count}>
          {filteredSubmissions.length} submission{filteredSubmissions.length === 1 ? '' : 's'}
        </Text>

        {filteredSubmissions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="folder-open-outline" size={48} color="#9BA4B5" />
            <Text style={styles.emptyTitle}>No submissions found</Text>
            <Text style={styles.emptyText}>Try another status filter or search term.</Text>
          </View>
        ) : (
          filteredSubmissions.map((item) => {
            const opening = openingId === item.id;
            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.fileRow}>
                  <View style={styles.fileIcon}>
                    <Ionicons name="document-text" size={22} color="#1E56A0" />
                  </View>

                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>{item.document}</Text>
                    <Text style={styles.fileMeta}>
                      {item.documentSize} · {formatDate(item.updatedAt || item.createdAt)}
                    </Text>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="person-outline" size={14} color="#6B7280" />
                  <Text style={styles.detailText}>{item.student.name}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="layers-outline" size={14} color="#6B7280" />
                  <Text style={styles.detailText}>{formatLabel(item.type)}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                  <Text style={styles.detailText}>Period: {item.reportingPeriod}</Text>
                </View>

                {!!item.comments && (
                  <View style={styles.feedbackBox}>
                    <Text style={styles.feedbackLabel}>Submission comments</Text>
                    <Text style={styles.feedbackText}>{item.comments}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.openDocumentBtn, (!item.documentId || opening) && { opacity: 0.65 }]}
                  onPress={() => handleOpenDocument(item)}
                  disabled={!item.documentId || opening}
                >
                  {opening ? (
                    <ActivityIndicator size="small" color="#1E56A0" />
                  ) : (
                    <Ionicons name="open-outline" size={16} color="#1E56A0" />
                  )}
                  <Text style={styles.openDocumentText}>{item.documentId ? 'Open Uploaded File' : 'No File Linked'}</Text>
                </TouchableOpacity>
              </View>
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
  searchWrap: { backgroundColor: '#FFFFFF', margin: 16, marginBottom: 10, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, color: '#0D1B2A', fontSize: 14, paddingVertical: 2 },
  filterWrapper: { marginBottom: 4 },
  filterContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  filterPill: { backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: '#E5E7EB' },
  filterPillActive: { backgroundColor: '#1E56A0', borderColor: '#1E56A0' },
  filterText: { color: '#374151', fontWeight: '700', fontSize: 13 },
  filterTextActive: { color: '#FFFFFF' },
  body: { flex: 1, paddingHorizontal: 16 },
  bodyContent: { paddingTop: 6, paddingBottom: 32 },
  count: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, gap: 10 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fileIcon: { width: 44, height: 44, backgroundColor: '#EFF6FF', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '800', color: '#0D1B2A' },
  fileMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, maxWidth: 125 },
  statusText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 13, color: '#6B7280', flex: 1 },
  feedbackBox: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10, gap: 4 },
  feedbackLabel: { fontSize: 11, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase' },
  feedbackText: { fontSize: 13, color: '#374151', lineHeight: 19 },
  openDocumentBtn: { backgroundColor: '#EFF6FF', borderRadius: 10, paddingVertical: 11, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#BFDBFE' },
  openDocumentText: { color: '#1E56A0', fontSize: 13, fontWeight: '800' },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 28, alignItems: 'center', gap: 8, marginTop: 24 },
  emptyTitle: { color: '#0D1B2A', fontSize: 17, fontWeight: '800' },
  emptyText: { color: '#6B7280', fontSize: 13, textAlign: 'center' },
});
