import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import websocketService from '../utils/websocket';
import { themeColors } from '../utils/theme';
import { useAuth } from '../context/AuthContext';

const formatTimestamp = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
};

export default function VisitorOverstayChatModal({ visible, visitor, onClose }) {
  const { user } = useAuth();
  const listRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const visitorId = visitor?._id;
  const currentRole = user?.role;
  const securityHasStarted = messages.some((message) => message.senderRole === 'security');
  const canSend = currentRole === 'security' || securityHasStarted;

  const loadMessages = async () => {
    if (!visitorId) return;
    setLoading(true);
    try {
      const response = await api.get(`/visitors/${visitorId}/overstay-chat`);
      setMessages(response.data?.data || []);
      setError('');
    } catch (requestError) {
      setMessages([]);
      setError(requestError.response?.data?.error || 'Unable to load this conversation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) loadMessages();
  }, [visible, visitorId]);

  useEffect(() => websocketService.onDataChanged((change) => {
    if (visible && change?.resource === 'visitors') loadMessages();
  }), [visible, visitorId]);

  useEffect(() => {
    if (messages.length) setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 50);
  }, [messages.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending || !visitorId) return;
    setSending(true);
    try {
      await api.post(`/visitors/${visitorId}/overstay-chat`, { message: body });
      setDraft('');
      await loadMessages();
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to send the message.');
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isSecurity = item.senderRole === 'security';
    const isMine = item.senderRole === currentRole;
    const sender = isSecurity
      ? `Security${item.securityId?.firstName ? ` • ${item.securityId.firstName}` : ''}`
      : 'Resident';
    return (
      <View style={[styles.messageRow, isSecurity ? styles.securityRow : styles.residentRow]}>
        <View style={[styles.messageBubble, isSecurity ? styles.securityBubble : styles.residentBubble, isMine && styles.ownBubble]}>
          <Text style={[styles.sender, isSecurity ? styles.securitySender : styles.residentSender]}>{sender}</Text>
          <Text style={styles.messageText}>{item.body}</Text>
          <Text style={styles.timestamp}>{formatTimestamp(item.createdAt)}</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Overstay chat</Text>
              <Text style={styles.subtitle}>{visitor?.visitorName || 'Visitor'} • Resident and security only</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityLabel="Close overstay chat">
              <Ionicons name="close" size={23} color={themeColors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.notice}>
            <Ionicons name="alert-circle" size={18} color="#b45309" />
            <Text style={styles.noticeText}>This conversation is linked to this visitor’s overstay.</Text>
          </View>

          {loading ? <ActivityIndicator style={styles.loader} color={themeColors.primary} /> : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item._id}
              renderItem={renderMessage}
              contentContainerStyle={messages.length ? styles.messageList : styles.emptyList}
              ListEmptyComponent={<Text style={styles.emptyText}>{error || 'Security has not started this conversation yet.'}</Text>}
            />
          )}
          {!!error && messages.length > 0 && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.composer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={canSend ? 'Write a message…' : 'Waiting for security to start the chat'}
              placeholderTextColor={themeColors.textSecondary}
              style={styles.input}
              multiline
              maxLength={1500}
              editable={!sending && canSend}
            />
            <TouchableOpacity onPress={send} disabled={!draft.trim() || sending || !canSend} style={[styles.sendButton, (!draft.trim() || sending || !canSend) && styles.sendButtonDisabled]}>
              {sending ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={19} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.5)' },
  sheet: { maxHeight: '88%', minHeight: '65%', backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { color: themeColors.textPrimary, fontSize: 21, fontWeight: '800' },
  subtitle: { color: themeColors.textSecondary, fontSize: 12, marginTop: 3 },
  closeButton: { padding: 7, borderRadius: 20, backgroundColor: '#f1f5f9' },
  notice: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#fff7ed', borderRadius: 10, padding: 11, marginBottom: 12 },
  noticeText: { flex: 1, color: '#92400e', fontSize: 12, lineHeight: 17 },
  loader: { flex: 1 },
  messageList: { paddingVertical: 8, gap: 9 },
  emptyList: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { textAlign: 'center', color: themeColors.textSecondary, lineHeight: 20 },
  messageRow: { width: '100%' },
  securityRow: { alignItems: 'flex-start' },
  residentRow: { alignItems: 'flex-end' },
  messageBubble: { maxWidth: '84%', padding: 11, borderRadius: 14, borderWidth: 1 },
  securityBubble: { backgroundColor: '#fff7ed', borderColor: '#fdba74', borderTopLeftRadius: 3 },
  residentBubble: { backgroundColor: '#ecfdf5', borderColor: '#86efac', borderTopRightRadius: 3 },
  ownBubble: { shadowColor: '#0f172a', shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  sender: { fontSize: 12, fontWeight: '800', marginBottom: 4 },
  securitySender: { color: '#c2410c' },
  residentSender: { color: '#15803d' },
  messageText: { color: themeColors.textPrimary, fontSize: 14, lineHeight: 20 },
  timestamp: { color: themeColors.textSecondary, fontSize: 10, marginTop: 7 },
  errorText: { color: themeColors.error, fontSize: 12, marginBottom: 7 },
  composer: { flexDirection: 'row', gap: 9, alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 12 },
  input: { flex: 1, minHeight: 46, maxHeight: 96, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: themeColors.textPrimary, textAlignVertical: 'top' },
  sendButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColors.primary },
  sendButtonDisabled: { opacity: 0.45 },
});
