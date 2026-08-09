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
import { themeColors, radii, shadows } from '../utils/theme';

const UserDropdownMenu = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [visible, setVisible] = useState(false);

  const initials = [user?.firstName?.[0], user?.lastName?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || 'U';

  const avatarUri = user?.profilePhotoUrl
    ? user.profilePhotoUrl
    : user?.profilePhoto
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
    // Don't navigate; AppNavigator will switch to auth stack.
  };

  const roleMenuItems = user?.role === 'admin'
    ? [
        { label: 'Services', screen: 'ServicesTab', icon: 'construct-outline', color: '#2563eb', bg: '#eff6ff' },
        { label: 'Payments', screen: 'PaymentsTab', icon: 'card-outline', color: '#7c3aed', bg: '#f5f3ff' },
        { label: 'Users', screen: 'UsersTab', icon: 'people-outline', color: '#0f766e', bg: '#ecfdf5' },
      ]
    : user?.role === 'resident'
      ? [{ label: 'Profile Settings', screen: 'ProfileTab', icon: 'person-outline', color: '#16a34a', bg: '#f0fdf4' }]
      : [];

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

                {roleMenuItems.map((item) => (
                  <TouchableOpacity key={item.screen} style={styles.dropdownItem} onPress={() => onNavigate(item.screen)} activeOpacity={0.7}>
                    <View style={[styles.dropdownItemIcon, { backgroundColor: item.bg }]}>
                      <Ionicons name={item.icon} size={18} color={item.color} />
                    </View>
                    <Text style={styles.dropdownItemText}>{item.label}</Text>
                  </TouchableOpacity>
                ))}

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
    justifyContent: 'center',
    width: 54,
    height: 44,
    paddingHorizontal: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  userPillAvatar: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userPillInitials: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1a6b3c',
  },
  userPillText: {
    display: 'none',
  },
  userPillName: {
    color: 'white',
    fontSize: 11,
    fontWeight: '800',
  },
  userPillRole: {
    color: '#bbf7d0',
    fontSize: 9,
    marginTop: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: themeColors.overlay,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 76,
    paddingHorizontal: 14,
  },
  dropdown: {
    backgroundColor: 'white',
    width: 286,
    maxWidth: '92%',
    borderRadius: radii.lg,
    paddingVertical: 12,
    paddingHorizontal: 12,
    ...shadows.large,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 6,
  },
  dropdownAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: themeColors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  dropdownAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: themeColors.primary,
  },
  userPillAvatarImage: {
    width: 34,
    height: 34,
    borderRadius: 12,
  },
  dropdownAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 14,
  },
  dropdownUserInfo: {
    flex: 1,
  },
  dropdownName: {
    fontSize: 15,
    fontWeight: '800',
    color: themeColors.textPrimary,
  },
  dropdownMeta: {
    fontSize: 11,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  dropdownDivider: {
    height: 0.5,
    backgroundColor: themeColors.border,
    marginVertical: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: radii.sm,
  },
  dropdownItemIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
});

export default UserDropdownMenu;
