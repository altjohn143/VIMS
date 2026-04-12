import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { themeColors } from '../utils/theme';

const UserDropdownMenu = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [visible, setVisible] = useState(false);

  const initials = [user?.firstName?.[0], user?.lastName?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || 'U';

  const avatarUri = user?.profilePhoto
    ? user.profilePhoto.startsWith('http')
      ? user.profilePhoto
      : `${api.defaults.baseURL?.replace(/\/api$/, '')}/uploads/profile-photos/${user.profilePhoto}`
    : null;

  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';
  const roleName = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : 'User';

  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);

  const onNavigate = (screen) => {
    closeMenu();
    if (screen) navigation.navigate(screen);
  };

  const onLogout = async () => {
    closeMenu();
    await logout();
    navigation.replace('Login');
  };

  return (
    <>
      <TouchableOpacity style={styles.userPill} onPress={openMenu} activeOpacity={0.8}>
        <View style={styles.userPillAvatar}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.userPillAvatarImage} />
          ) : (
            <Text style={styles.userPillInitials}>{initials}</Text>
          )}
        </View>
        <View style={styles.userPillText}>
          <Text style={styles.userPillName} numberOfLines={1}>{fullName}</Text>
          <Text style={styles.userPillRole}>● {roleName}</Text>
        </View>
        <Ionicons name="chevron-down" size={14} color="white" style={{ marginLeft: 4 }} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={closeMenu}>
        <TouchableWithoutFeedback onPress={closeMenu}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.dropdown}>
                <View style={styles.dropdownHeader}>
                  <View style={styles.dropdownAvatar}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.dropdownAvatarImage} />
                  ) : (
                    <Text style={styles.dropdownAvatarText}>{initials}</Text>
                  )}
                </View>
                  <View style={styles.dropdownUserInfo}>
                    <Text style={styles.dropdownName}>{fullName}</Text>
                    <Text style={styles.dropdownMeta}>{roleName}</Text>
                  </View>
                </View>

                <View style={styles.dropdownDivider} />

                <TouchableOpacity style={styles.dropdownItem} onPress={() => onNavigate('DashboardTab')} activeOpacity={0.7}>
                  <View style={[styles.dropdownItemIcon, { backgroundColor: '#f0fdf4' }]}>
                    <Ionicons name="grid-outline" size={18} color="#16a34a" />
                  </View>
                  <Text style={styles.dropdownItemText}>Dashboard</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.dropdownItem} onPress={() => onNavigate('ProfileTab')} activeOpacity={0.7}>
                  <View style={[styles.dropdownItemIcon, { backgroundColor: '#f0fdf4' }]}>
                    <Ionicons name="person-outline" size={18} color="#16a34a" />
                  </View>
                  <Text style={styles.dropdownItemText}>Profile Settings</Text>
                </TouchableOpacity>

                <View style={styles.dropdownDivider} />

                <TouchableOpacity style={styles.dropdownItem} onPress={onLogout} activeOpacity={0.7}>
                  <View style={[styles.dropdownItemIcon, { backgroundColor: '#fef2f2' }]}>
                    <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                  </View>
                  <Text style={[styles.dropdownItemText, { color: '#ef4444' }]}>Logout</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  userPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  userPillAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userPillInitials: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1a6b3c',
  },
  userPillText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
  },
  userPillName: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  userPillRole: {
    color: '#d1fae5',
    fontSize: 10,
    marginTop: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  dropdown: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dropdownAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  dropdownAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  userPillAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  dropdownAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  dropdownUserInfo: {
    flex: 1,
  },
  dropdownName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  dropdownMeta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  dropdownDivider: {
    height: 0.5,
    backgroundColor: '#e2e8f0',
    marginVertical: 10,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dropdownItemIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
});

export default UserDropdownMenu;
