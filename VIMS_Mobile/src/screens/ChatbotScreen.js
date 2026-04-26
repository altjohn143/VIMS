import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';

const ChatbotScreen = ({ navigation }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const res = await api.get('/ai/chat');
        if (res.data?.success) {
          setMessages(res.data.data.messages);
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    };
    loadMessages();
  }, []);

  const sendMessage = async () => {
    const trimmed = message.trim();
    if (!trimmed || loading) return;
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setMessage('');
    setLoading(true);
    try {
      const res = await api.post('/ai/chat', { message: trimmed });
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data?.data?.reply || 'No response.' }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Failed to get AI response. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>VIMS AI Assistant</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={styles.messages}>
        {messages.length === 0 && <Text style={styles.empty}>Ask about VIMS workflows, lot recommendations, pricing, and availability.</Text>}
        {messages.map((m, idx) => (
          <View key={idx} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
            <Text style={styles.bubbleText}>{m.content}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Type your question..."
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff'
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  messages: { flex: 1, padding: 12 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 20 },
  bubble: { padding: 10, borderRadius: 12, marginBottom: 10, maxWidth: '88%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#dcfce7' },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: '#e2e8f0' },
  bubbleText: { color: '#0f172a' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    padding: 10,
    backgroundColor: '#fff'
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff'
  },
  sendBtn: {
    marginLeft: 8,
    backgroundColor: '#166534',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  }
});

export default ChatbotScreen;
