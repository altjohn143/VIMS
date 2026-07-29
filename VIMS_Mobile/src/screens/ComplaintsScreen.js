import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import api from '../utils/api';
import { themeColors } from '../utils/theme';

const issueTypes = [
  'Noise complaint',
  'Neighbor concern',
  'Sanitation concern',
  'Road or common area issue',
  'Policy violation',
  'Other complaint',
];

const priorities = ['low', 'medium', 'urgent'];
const activeStatuses = ['pending', 'under-review', 'assigned', 'in-progress'];
const archiveStatuses = ['completed', 'cancelled', 'rejected'];

const statusMeta = {
  pending: { label: 'Pending', color: '#f59e0b' },
  'under-review': { label: 'Under Review', color: '#0ea5e9' },
  assigned: { label: 'Assigned', color: '#2563eb' },
  'in-progress': { label: 'In Progress', color: '#166534' },
  completed: { label: 'Resolved', color: '#10b981' },
  cancelled: { label: 'Cancelled', color: '#ef4444' },
  rejected: { label: 'Rejected', color: '#ef4444' },
};

const buildDescription = (issueType, details) => `Type: ${issueType}\n\n${details}`;

const parseDescription = (description = '') => {
  const match = description.match(/^Type:\s*(.+?)\n\n([\s\S]*)$/);
  if (!match) return { issueType: 'Other complaint', details: description };
  return { issueType: match[1], details: match[2] };
};

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const ComplaintsScreen = ({ navigation }) => {
  const [complaints, setComplaints] = useState([]);
  const [archivedComplaints, setArchivedComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    issueType: '',
    title: '',
    description: '',
    priority: 'medium',
    location: '',
  });

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const [activeRes, archivedRes] = await Promise.all([
        api.get('/service-requests/my'),
        api.get('/service-requests/my/archived', { params: { category: 'complaint' } }),
      ]);
      setComplaints((activeRes.data?.data || []).filter((item) => item.category === 'complaint'));
      setArchivedComplaints(archivedRes.data?.data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, []);

  const stats = useMemo(() => {
    const active = complaints.filter((item) => activeStatuses.includes(item.status)).length;
    const resolved = complaints.filter((item) => item.status === 'completed').length;
    return {
      total: complaints.length + archivedComplaints.length,
      active,
      resolved,
      archived: archivedComplaints.length,
    };
  }, [complaints, archivedComplaints]);

  const resetForm = () => {
    setEditingId(null);
    setForm({ issueType: '', title: '', description: '', priority: 'medium', location: '' });
  };

  const openCreate = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEdit = (complaint) => {
    const parsed = parseDescription(complaint.description);
    setEditingId(complaint._id);
    setForm({
      issueType: issueTypes.includes(parsed.issueType) ? parsed.issueType : 'Other complaint',
      title: complaint.title || '',
      description: parsed.details || '',
      priority: complaint.priority || 'medium',
      location: complaint.location || '',
    });
    setModalVisible(true);
  };

  const saveComplaint = async () => {
    if (!form.issueType || !form.title.trim() || !form.description.trim()) {
      Alert.alert('Missing details', 'Please complete the complaint type, subject, and details.');
      return;
    }

    const payload = {
      category: 'complaint',
      title: form.title.trim(),
      description: buildDescription(form.issueType, form.description.trim()),
      priority: form.priority,
      location: form.location.trim(),
    };

    try {
      const response = editingId
        ? await api.put(`/service-requests/${editingId}`, payload)
        : await api.post('/service-requests', payload);
      if (response.data?.success) {
        Alert.alert('Success', editingId ? 'Complaint updated' : 'Complaint submitted');
        setModalVisible(false);
        resetForm();
        loadComplaints();
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to save complaint');
    }
  };

  const cancelComplaint = (complaintId) => {
    Alert.alert('Cancel Complaint', 'Are you sure you want to cancel this complaint?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await api.put(`/service-requests/${complaintId}/status`, {
              status: 'cancelled',
              cancelledReason: 'Cancelled by resident',
            });
            if (response.data?.success) {
              Alert.alert('Success', 'Complaint cancelled');
              loadComplaints();
            }
          } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to cancel complaint');
          }
        },
      },
    ]);
  };

  const archiveComplaint = (complaintId) => {
    Alert.alert('Archive Complaint', 'Move this complaint to Archived Complaints?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Archive',
        onPress: async () => {
          try {
            const response = await api.put(`/service-requests/${complaintId}/archive`, {
              reason: 'Archived by resident',
            });
            if (response.data?.success) {
              Alert.alert('Success', 'Complaint archived');
              loadComplaints();
            }
          } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to archive complaint');
          }
        },
      },
    ]);
  };

  const renderComplaint = ({ item }) => {
    const meta = statusMeta[item.status] || statusMeta.pending;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardMeta}>{item.location || 'No location'} · {formatDate(item.createdAt)}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: `${meta.color}22` }]}>
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
        <Text style={styles.description}>{item.description}</Text>
        <View style={styles.actions}>
          {item.status === 'pending' && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => openEdit(item)}>
              <Ionicons name="create-outline" size={16} color="#166534" />
              <Text style={styles.secondaryBtnText}>Edit</Text>
            </TouchableOpacity>
          )}
          {activeStatuses.includes(item.status) && (
            <TouchableOpacity style={styles.dangerBtn} onPress={() => cancelComplaint(item._id)}>
              <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
              <Text style={styles.dangerBtnText}>Cancel</Text>
            </TouchableOpacity>
          )}
          {archiveStatuses.includes(item.status) && (
            <TouchableOpacity style={styles.primarySmallBtn} onPress={() => archiveComplaint(item._id)}>
              <Ionicons name="archive-outline" size={16} color="#fff" />
              <Text style={styles.primarySmallBtnText}>Archive</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderArchived = ({ item }) => {
    const meta = statusMeta[item.status] || statusMeta.pending;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardMeta}>Archived {formatDate(item.archivedAt)}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: `${meta.color}22` }]}>
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Complaints Form</Text>
        <TouchableOpacity onPress={openCreate}>
          <Ionicons name="add-circle" size={26} color="#166534" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <View style={styles.statsGrid}>
          {[
            ['Total', stats.total],
            ['Active', stats.active],
            ['Resolved', stats.resolved],
            ['Archived', stats.archived],
          ].map(([label, value]) => (
            <View key={label} style={styles.statBox}>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={openCreate}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>New Complaint</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>My Complaints</Text>
        {loading ? (
          <ActivityIndicator color="#166534" />
        ) : complaints.length === 0 ? (
          <Text style={styles.emptyText}>No complaints submitted yet.</Text>
        ) : (
          <FlatList data={complaints} keyExtractor={(item) => item._id} renderItem={renderComplaint} scrollEnabled={false} />
        )}

        <Text style={styles.sectionTitle}>Archived Complaints</Text>
        {archivedComplaints.length === 0 ? (
          <Text style={styles.emptyText}>Archived complaints will be stored here.</Text>
        ) : (
          <FlatList data={archivedComplaints} keyExtractor={(item) => item._id} renderItem={renderArchived} scrollEnabled={false} />
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{editingId ? 'Edit Complaint' : 'New Complaint'}</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={styles.form}>
            <Text style={styles.inputLabel}>Complaint Type</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={form.issueType} onValueChange={(value) => setForm((prev) => ({ ...prev, issueType: value }))}>
                <Picker.Item label="Select complaint type" value="" />
                {issueTypes.map((type) => <Picker.Item key={type} label={type} value={type} />)}
              </Picker>
            </View>

            <Text style={styles.inputLabel}>Subject</Text>
            <TextInput style={styles.input} value={form.title} onChangeText={(value) => setForm((prev) => ({ ...prev, title: value }))} />

            <Text style={styles.inputLabel}>Details</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.description}
              onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.inputLabel}>Priority</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={form.priority} onValueChange={(value) => setForm((prev) => ({ ...prev, priority: value }))}>
                {priorities.map((priority) => <Picker.Item key={priority} label={priority.toUpperCase()} value={priority} />)}
              </Picker>
            </View>

            <Text style={styles.inputLabel}>Location</Text>
            <TextInput style={styles.input} value={form.location} onChangeText={(value) => setForm((prev) => ({ ...prev, location: value }))} />

            <TouchableOpacity style={styles.primaryBtn} onPress={saveComplaint}>
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>{editingId ? 'Update Complaint' : 'Submit Complaint'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff8f3' },
  header: {
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff8f3',
    borderBottomRightRadius: 44,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  content: { flex: 1 },
  contentInner: { padding: 14, paddingBottom: 28 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statBox: { width: '48%', backgroundColor: '#fff', borderRadius: 6, padding: 16, borderLeftWidth: 4, borderLeftColor: '#166534' },
  statValue: { fontSize: 24, fontWeight: '900', color: '#166534' },
  statLabel: { color: '#64748b', fontWeight: '700', marginTop: 2 },
  primaryBtn: {
    backgroundColor: '#166534',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginTop: 18, marginBottom: 10 },
  emptyText: { color: '#64748b', textAlign: 'center', paddingVertical: 18 },
  card: { backgroundColor: '#fff', borderRadius: 6, padding: 18, borderLeftWidth: 5, borderLeftColor: '#d97706', marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  cardTitleWrap: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
  cardMeta: { color: '#64748b', fontSize: 12, marginTop: 3 },
  statusPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '900' },
  description: { color: '#334155', marginTop: 12, lineHeight: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  secondaryBtnText: { color: '#166534', fontWeight: '800' },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  dangerBtnText: { color: '#ef4444', fontWeight: '800' },
  primarySmallBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#166534', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  primarySmallBtnText: { color: '#fff', fontWeight: '800' },
  modalContainer: { flex: 1, backgroundColor: '#f8fafc' },
  form: { padding: 16, paddingBottom: 32 },
  inputLabel: { color: '#0f172a', fontWeight: '800', marginBottom: 7, marginTop: 12 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  textArea: { minHeight: 130 },
  pickerWrap: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, overflow: 'hidden' },
});

export default ComplaintsScreen;
