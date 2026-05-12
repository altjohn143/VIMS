import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
  Avatar,
  Chip,
  CircularProgress,
  Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import axios from '../config/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import villageLogo from '../assets/village-logo.png';

const themeColors = {
  primary: '#166534',
  primaryDark: '#14532d',
  primaryLight: '#22c55e',
  primarySoft: '#dcfce7',
  background: '#f3f5f7',
  cardBackground: '#ffffff',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  border: 'rgba(15, 23, 42, 0.08)'
};

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

const Chatbot = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const { getCurrentUser } = useAuth();

  const currentUser = getCurrentUser();
  const role = currentUser?.role || 'resident';
  const roleLabel = role === 'admin' ? 'Administrator' : role === 'security' ? 'Security Officer' : 'Resident';
  const suggestedPrompts = getSuggestedPrompts(role);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const res = await axios.get('/api/ai/chat');
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

    setLoading(true);
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setMessage('');

    try {
      const res = await axios.post('/api/ai/chat', { message: trimmed });
      const reply = res.data?.data?.reply || 'No response received.';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to send message');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Failed to send message. Please try again.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestedPrompt = (prompt) => {
    setMessage(prompt);
    sendMessage(prompt);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `
          radial-gradient(circle at top left, rgba(34,197,94,0.08), transparent 24%),
          radial-gradient(circle at top right, rgba(14,165,233,0.05), transparent 20%),
          ${themeColors.background}
        `,
        py: { xs: 2, md: 3 },
        '@keyframes screenFadeIn': {
          from: { opacity: 0, transform: 'translateY(14px)' },
          to: { opacity: 1, transform: 'translateY(0)' }
        },
        '@keyframes slideUpSoft': {
          from: { opacity: 0, transform: 'translateY(18px)' },
          to: { opacity: 1, transform: 'translateY(0)' }
        }
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 } }}>
        <Box mb={2}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/dashboard')}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 800,
              borderColor: 'rgba(15,23,42,0.12)',
              color: themeColors.textPrimary,
              '&:hover': {
                bgcolor: '#f1f5f9',
                borderColor: 'rgba(15,23,42,0.18)'
              }
            }}
          >
            Back to Dashboard
          </Button>
        </Box>

        <Paper
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '22px',
            minHeight: { xs: 220, md: 240 },
            backgroundColor: '#0f172a',
            border: `1px solid ${themeColors.border}`,
            boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)',
            mb: 2.25,
            animation: 'screenFadeIn 0.55s ease'
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'url("https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1600&q=80")',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />

          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(90deg, rgba(2,6,23,0.86) 0%, rgba(2,6,23,0.68) 42%, rgba(2,6,23,0.24) 72%, rgba(2,6,23,0.10) 100%)'
            }}
          />

          <Box
            sx={{
              position: 'relative',
              zIndex: 1,
              minHeight: { xs: 220, md: 240 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 3,
              p: { xs: 2.5, md: 3.5 },
              color: 'white'
            }}
          >
            <Box sx={{ maxWidth: 720 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4, mb: 2 }}>
                <Box
                  component="img"
                  src={villageLogo}
                  alt="Westville Logo"
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: '16px',
                    objectFit: 'cover',
                    border: '1px solid rgba(255,255,255,0.25)',
                    boxShadow: '0 10px 24px rgba(0,0,0,0.3)'
                  }}
                />

                <Box>
                  <Typography
                    sx={{
                      fontSize: '0.78rem',
                      fontWeight: 900,
                      letterSpacing: '0.08em',
                      color: '#4ade80',
                      textTransform: 'uppercase'
                    }}
                  >
                    Westville Community Hub
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.82rem', fontWeight: 600 }}>
                    AI-powered village support
                  </Typography>
                </Box>
              </Box>

              <Typography
                sx={{
                  fontSize: { xs: '1.85rem', md: '2.6rem' },
                  fontWeight: 950,
                  lineHeight: 1.02,
                  mb: 1
                }}
              >
                VIMS AI Assistant
              </Typography>

              <Typography
                sx={{
                  color: 'rgba(255,255,255,0.78)',
                  fontWeight: 500,
                  maxWidth: 650,
                  fontSize: { xs: '0.92rem', md: '1rem' },
                  lineHeight: 1.65
                }}
              >
                Ask about registration, visitors, payments, announcements, lot recommendations, and village workflows.
              </Typography>
            </Box>

            <Box
              sx={{
                display: { xs: 'none', md: 'grid' },
                placeItems: 'center',
                width: 132,
                height: 132,
                borderRadius: '32px',
                bgcolor: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(8px)'
              }}
            >
              <SmartToyIcon sx={{ fontSize: 62, color: '#86efac' }} />
            </Box>
          </Box>
        </Paper>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 340px' },
            gap: 2.25,
            animation: 'slideUpSoft 0.7s ease'
          }}
        >
          <Paper
            sx={{
              borderRadius: '20px',
              border: `1px solid ${themeColors.border}`,
              boxShadow: '0 12px 26px rgba(15,23,42,0.06)',
              overflow: 'hidden',
              bgcolor: themeColors.cardBackground
            }}
          >
            <Box
              sx={{
                px: 2.5,
                py: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: 'white',
                gap: 2,
                flexWrap: 'wrap'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <QuestionAnswerIcon sx={{ color: themeColors.primary }} />
                <Typography sx={{ fontSize: '1.06rem', fontWeight: 900, color: themeColors.textPrimary }}>
                  Conversation
                </Typography>
                <Chip
                  label={`${messages.length} message${messages.length === 1 ? '' : 's'}`}
                  size="small"
                  sx={{
                    bgcolor: themeColors.primarySoft,
                    color: themeColors.primary,
                    fontWeight: 800,
                    borderRadius: '999px'
                  }}
                />
              </Box>

              <Chip
                icon={<ShieldOutlinedIcon />}
                label="Secure VIMS Assistant"
                size="small"
                sx={{
                  bgcolor: '#f8fafc',
                  color: themeColors.textSecondary,
                  fontWeight: 800,
                  borderRadius: '999px',
                  border: '1px solid rgba(15,23,42,0.06)'
                }}
              />
            </Box>

            <Divider />

            <Box
              sx={{
                minHeight: 430,
                maxHeight: 540,
                overflowY: 'auto',
                p: { xs: 1.5, md: 2 },
                bgcolor: '#f8fafc'
              }}
            >
              {messages.length === 0 && (
                <Box
                  sx={{
                    minHeight: 390,
                    display: 'grid',
                    placeItems: 'center',
                    textAlign: 'center',
                    px: 2
                  }}
                >
                  <Box>
                    <Avatar
                      sx={{
                        width: 72,
                        height: 72,
                        mx: 'auto',
                        mb: 2,
                        bgcolor: themeColors.primarySoft,
                        color: themeColors.primary
                      }}
                    >
                      <AutoAwesomeIcon sx={{ fontSize: 36 }} />
                    </Avatar>
                    <Typography sx={{ fontSize: '1.15rem', fontWeight: 900, color: themeColors.textPrimary }}>
                      How can I help today?
                    </Typography>
                    <Typography sx={{ color: themeColors.textSecondary, fontWeight: 600, mt: 0.6 }}>
                      Start by typing a question below.
                    </Typography>
                  </Box>
                </Box>
              )}

              {messages.map((m, idx) => {
                const isUser = m.role === 'user';

                return (
                  <Box
                    key={idx}
                    sx={{
                      mb: 1.4,
                      display: 'flex',
                      justifyContent: isUser ? 'flex-end' : 'flex-start',
                      alignItems: 'flex-end',
                      gap: 1
                    }}
                  >
                    {!isUser && (
                      <Avatar
                        sx={{
                          width: 34,
                          height: 34,
                          bgcolor: themeColors.primary,
                          color: 'white'
                        }}
                      >
                        <SmartToyIcon sx={{ fontSize: 18 }} />
                      </Avatar>
                    )}

                    <Box
                      sx={{
                        maxWidth: { xs: '82%', md: '72%' },
                        px: 1.7,
                        py: 1.25,
                        borderRadius: isUser ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
                        background: isUser
                          ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)'
                          : '#ffffff',
                        color: themeColors.textPrimary,
                        border: isUser ? '1px solid rgba(34,197,94,0.18)' : '1px solid rgba(15,23,42,0.07)',
                        boxShadow: '0 8px 20px rgba(15,23,42,0.05)'
                      }}
                    >
                      <Typography variant="body2" sx={{ lineHeight: 1.65, fontWeight: 600, whiteSpace: 'pre-wrap' }}>
                        {m.content}
                      </Typography>
                    </Box>

                    {isUser && (
                      <Avatar
                        sx={{
                          width: 34,
                          height: 34,
                          bgcolor: '#e2e8f0',
                          color: themeColors.textPrimary
                        }}
                      >
                        <PersonIcon sx={{ fontSize: 18 }} />
                      </Avatar>
                    )}
                  </Box>
                );
              })}

              {loading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mt: 1 }}>
                  <Avatar sx={{ width: 34, height: 34, bgcolor: themeColors.primary }}>
                    <SmartToyIcon sx={{ fontSize: 18 }} />
                  </Avatar>
                  <Box
                    sx={{
                      px: 1.7,
                      py: 1.25,
                      borderRadius: '18px 18px 18px 6px',
                      bgcolor: 'white',
                      border: '1px solid rgba(15,23,42,0.07)',
                      boxShadow: '0 8px 20px rgba(15,23,42,0.05)'
                    }}
                  >
                    <CircularProgress size={18} sx={{ color: themeColors.primary }} />
                  </Box>
                </Box>
              )}
            </Box>

            <Divider />

            <Box sx={{ p: { xs: 1.5, md: 2 }, bgcolor: 'white' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '16px',
                      bgcolor: '#f8fafc',
                      fontWeight: 600,
                      '& fieldset': {
                        borderColor: 'rgba(15,23,42,0.10)'
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(22,101,52,0.34)'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: themeColors.primary
                      }
                    }
                  }}
                />

                <Button
                  variant="contained"
                  endIcon={loading ? null : <SendIcon />}
                  disabled={loading}
                  onClick={sendMessage}
                  sx={{
                    minWidth: { xs: 54, sm: 118 },
                    borderRadius: '16px',
                    textTransform: 'none',
                    fontWeight: 900,
                    bgcolor: themeColors.primary,
                    boxShadow: '0 12px 22px rgba(22,101,52,0.18)',
                    '&:hover': {
                      bgcolor: themeColors.primaryDark,
                      transform: 'translateY(-1px)'
                    },
                    '&:active': {
                      transform: 'translateY(1px) scale(0.99)'
                    },
                    transition: 'all 0.2s ease'
                  }}
                >
                  {loading ? <CircularProgress size={22} color="inherit" /> : 'Send'}
                </Button>
              </Box>
            </Box>
          </Paper>

          <Paper
            sx={{
              borderRadius: '20px',
              border: `1px solid ${themeColors.border}`,
              boxShadow: '0 12px 26px rgba(15,23,42,0.06)',
              overflow: 'hidden',
              bgcolor: 'white',
              height: 'fit-content'
            }}
          >
            <Box sx={{ px: 2.25, py: 2 }}>
              <Typography sx={{ fontSize: '1.06rem', fontWeight: 900, color: themeColors.textPrimary }}>
                Suggested Questions
              </Typography>
              <Typography sx={{ mt: 0.5, fontSize: '0.84rem', color: themeColors.textSecondary, fontWeight: 600 }}>
                Popular prompts for {roleLabel}. Tap one to send it right away.
              </Typography>
            </Box>

            <Divider />

            <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.1 }}>
              {suggestedPrompts.map((prompt) => (
                <Paper
                  key={prompt}
                  elevation={0}
                  onClick={() => handleSuggestedPrompt(prompt)}
                  sx={{
                    px: 1.5,
                    py: 1.35,
                    borderRadius: '16px',
                    border: '1px solid rgba(15,23,42,0.06)',
                    bgcolor: '#f8fafc',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      bgcolor: '#f0fdf4',
                      borderColor: 'rgba(34,197,94,0.18)',
                      boxShadow: '0 10px 20px rgba(15,23,42,0.05)'
                    }
                  }}
                >
                  <Typography sx={{ fontSize: '0.86rem', fontWeight: 800, color: themeColors.textPrimary }}>
                    {prompt}
                  </Typography>
                </Paper>
              ))}
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
};

export default Chatbot;