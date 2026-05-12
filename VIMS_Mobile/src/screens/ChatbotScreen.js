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
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const suggestedQuestionsByRole = {
  resident: [
    'How do I generate a visitor pass?',
    'How can residents pay dues?',
    'Where can I check announcements?',
    'How do service requests work?',
    'Can you recommend available lots?'
  ],
  admin: [
    'How do I approve a new resident?',
    'How can I post an announcement?',
    'Where do I manage visitor access?',
    'How do I assign a service request?',
    'How can I review reported incidents?'
  ],
  security: [
    'How do I approve visitor passes?',
    'Where can I see active security requests?',
    'How do I report an incident?',
    'How do I verify visitor credentials?',
    'Where can I find patrol logs?'
  ],
  default: [
    'How do I generate a visitor pass?',
    'How can residents pay dues?',
    'Where can I check announcements?',
    'How do service requests work?',
    'Can you recommend available lots?'
  ]
};

const getSuggestedPrompts = (role) => suggestedQuestionsByRole[role] || suggestedQuestionsByRole.default;

const ChatbotScreen = ({ navigation }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const role = user?.role || 'resident';
  const suggestedPrompts = getSuggestedPrompts(role);

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

  const sendMessage = async (messageToSend) => {
    const trimmed = (messageToSend ?? message).trim();
    if (!trimmed || loading) return;
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setMessage('');
    setLoading(true);
    try {
      const res = await api.post('/ai/chat', { message: trimmed });
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data?.data?.reply || 'No response.' }]);
    } catch (error) {
      const backendError = error?.response?.data?.error || 'Failed to get AI response. Please try again.';
      setMessages((prev) => [...prev, { role: 'assistant', content: backendError }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestedPrompt = (prompt) => {
    setMessage(prompt);
    sendMessage(prompt);
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

      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsTitle}>Suggested questions for {role === 'admin' ? 'Administrator' : role === 'security' ? 'Security Officer' : 'Resident'}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsRow}>
          {suggestedPrompts.map((prompt) => (
            <TouchableOpacity key={prompt} style={styles.suggestionPill} onPress={() => handleSuggestedPrompt(prompt)}>
              <Text style={styles.suggestionText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
  suggestionsContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  suggestionsTitle: {
    color: '#0f172a',
    fontWeight: '700',
    marginBottom: 8
  },
  suggestionsRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  suggestionPill: {
    backgroundColor: '#ecfdf5',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#d1fae5'
  },
  suggestionText: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '700'
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
