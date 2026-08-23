import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { themeColors } from '../utils/theme';
import { safeGoBack } from '../utils/navigation';

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
const getKeyboardOffset = (embedded) => {
  if (Platform.OS !== 'ios') return 0;
  return embedded ? 8 : 0;
};

const assistantPalette = {
  screen: '#F7F8F5',
  header: '#002F05',
  card: '#FFFFFF',
  primary: '#007A18',
  userBubble: '#007A18',
  userBubbleGradient: ['#003D07', '#007A18', '#00D084'],
  assistantBubble: '#FFFFFF',
  input: '#FFFFFF',
  text: '#17221C',
  secondaryText: '#5E6D64',
  mutedText: '#89958E',
  inverseText: '#FFFFFF',
  border: '#DEE4DE',
  borderStrong: '#C7D1C9',
  softGreen: '#D9FBEA',
  softGreenLight: '#EFFDF5',
};

const ChatbotScreen = ({ navigation, embedded = false, onClose }) => {
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={getKeyboardOffset(embedded)}
    >
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <Ionicons name="chatbox" size={23} color={assistantPalette.primary || '#007A18'} />
          <Text style={styles.headerTitle}>{embedded ? 'VIMS Assistant' : 'VIMS AI Assistant'}</Text>
        </View>
        <TouchableOpacity style={styles.headerActionButton} onPress={embedded ? onClose : () => safeGoBack(navigation)}>
          <Ionicons name={embedded ? 'close' : 'arrow-back'} size={25} color={assistantPalette.secondaryText} />
        </TouchableOpacity>
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

      <ScrollView
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && <Text style={styles.empty}>Ask about VIMS workflows, lot recommendations, pricing, and availability.</Text>}
        {messages.map((m, idx) => (
          m.role === 'user' ? (
            <LinearGradient
              key={idx}
              colors={assistantPalette.userBubbleGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.bubble, styles.userBubble]}
            >
              <Text style={styles.userBubbleText}>{m.content}</Text>
            </LinearGradient>
          ) : (
            <View key={idx} style={[styles.bubble, styles.assistantBubble]}>
              <Text style={styles.assistantBubbleText}>{m.content}</Text>
            </View>
          )
        ))}
      </ScrollView>

      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Type your question..."
          placeholderTextColor={assistantPalette.mutedText}
          selectionColor={assistantPalette.userBubble}
          cursorColor={assistantPalette.userBubble}
          keyboardAppearance="light"
          multiline
        />
        <TouchableOpacity style={styles.sendBtnTouch} onPress={() => sendMessage()} disabled={loading}>
          <LinearGradient
            colors={assistantPalette.userBubbleGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="send" size={16} color="#fff" /><Text style={styles.sendBtnText}>Send</Text></>}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: assistantPalette.screen },
  header: {
    paddingTop: 42,
    paddingHorizontal: 18,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: assistantPalette.card,
    borderBottomWidth: 1,
    borderBottomColor: assistantPalette.border,
  },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 19, fontWeight: '900', color: assistantPalette.text },
  headerActionButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  messages: { flex: 1 },
  messagesContent: { padding: 12, flexGrow: 1 },
  empty: { color: assistantPalette.secondaryText, textAlign: 'center', marginTop: 20 },
  bubble: { padding: 10, borderRadius: 12, marginBottom: 10, maxWidth: '88%' },
  userBubble: { alignSelf: 'flex-end' },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: assistantPalette.assistantBubble, borderWidth: 1, borderColor: assistantPalette.border },
  userBubbleText: { color: assistantPalette.inverseText, fontSize: 14, lineHeight: 20 },
  assistantBubbleText: { color: assistantPalette.text, fontSize: 14, lineHeight: 20 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: assistantPalette.border,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 14 : 10,
    backgroundColor: assistantPalette.card
  },
  suggestionsContainer: {
    paddingTop: 13,
    paddingBottom: 8,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: assistantPalette.border,
    backgroundColor: assistantPalette.card,
  },
  suggestionsTitle: {
    color: assistantPalette.secondaryText,
    fontWeight: '800',
    marginBottom: 9,
    fontSize: 13,
  },
  suggestionsRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  suggestionPill: {
    backgroundColor: assistantPalette.softGreenLight,
    borderRadius: 18,
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginRight: 10,
  },
  suggestionText: {
    color: assistantPalette.primary,
    fontSize: 13,
    fontWeight: '900'
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: assistantPalette.borderStrong,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: assistantPalette.input,
    color: assistantPalette.text
  },
  sendBtnTouch: {
    marginLeft: 8,
    minWidth: 72,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  sendBtn: {
    flex: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 12
  },
  sendBtnDisabled: { opacity: 0.78 },
  sendBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' }
});

export default ChatbotScreen;
