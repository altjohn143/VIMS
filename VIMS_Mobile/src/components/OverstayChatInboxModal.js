import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { themeColors } from '../utils/theme';
import VisitorOverstayChatModal from './VisitorOverstayChatModal';

export default function OverstayChatInboxModal({ visible, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visitor, setVisitor] = useState(null);
  const load = async () => {
    if (!visible) return;
    setLoading(true);
    try { const response = await api.get('/visitors/overstay-chats'); setRows(response.data?.data || []); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [visible]);
  return <>
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}><View style={styles.sheet}>
        <View style={styles.header}><View><Text style={styles.title}>Overstay messages</Text><Text style={styles.sub}>Resident and security conversations</Text></View><TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={themeColors.textPrimary} /></TouchableOpacity></View>
        {loading ? <ActivityIndicator style={{ flex: 1 }} color={themeColors.primary} /> : <FlatList data={rows} keyExtractor={(row) => row.visitor?._id} contentContainerStyle={rows.length ? undefined : styles.empty} ListEmptyComponent={<Text style={styles.emptyText}>No overstay conversations yet.</Text>} renderItem={({ item }) => <TouchableOpacity style={styles.row} onPress={() => setVisitor(item.visitor)}><View style={styles.icon}><Ionicons name="chatbubble-ellipses" size={19} color={themeColors.primary} /></View><View style={styles.rowText}><Text style={styles.name}>{item.visitor?.visitorName || 'Visitor'}</Text><Text numberOfLines={1} style={styles.preview}>{item.lastMessage?.body || 'Open conversation'}</Text></View><Ionicons name="chevron-forward" size={18} color={themeColors.textSecondary} /></TouchableOpacity>} />}
      </View></View>
    </Modal>
    <VisitorOverstayChatModal visible={Boolean(visitor)} visitor={visitor} onClose={() => { setVisitor(null); load(); }} />
  </>;
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.5)' }, sheet: { height: '72%', backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }, title: { fontSize: 21, fontWeight: '800', color: themeColors.textPrimary }, sub: { marginTop: 3, fontSize: 12, color: themeColors.textSecondary }, row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#eef2f7', paddingVertical: 12 }, icon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: themeColors.primary + '12' }, rowText: { flex: 1 }, name: { fontWeight: '800', color: themeColors.textPrimary }, preview: { color: themeColors.textSecondary, fontSize: 12, marginTop: 3 }, empty: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' }, emptyText: { color: themeColors.textSecondary },
});
