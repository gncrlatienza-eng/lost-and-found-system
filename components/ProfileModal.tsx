import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  Pressable, Switch,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSignOut: () => void;
};

export default function ProfileModal({ visible, onClose, onSignOut }: Props) {
  const { user, username } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();

  const displayName = username ?? user?.email ?? '';
  const initials = username
    ? username.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] ?? '?').toUpperCase();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={[s.sheet, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={e => e.stopPropagation()}>

          {/* Avatar */}
          <View style={[s.avatarRing, { borderColor: colors.border }]}>
            <View style={[s.avatar, { backgroundColor: colors.accent }]}>
              <Text style={[s.initials, { color: colors.card }]}>{initials}</Text>
            </View>
          </View>

          {/* Name & email */}
          <Text style={[s.name, { color: colors.text }]}>{displayName}</Text>
          <Text style={[s.email, { color: colors.subtext }]}>{user?.email}</Text>

          <View style={[s.divider, { backgroundColor: colors.border }]} />

          {/* Theme toggle */}
          <View style={s.row}>
            <Text style={[s.rowIcon]}>{isDark ? '🌙' : '☀️'}</Text>
            <Text style={[s.rowLabel, { color: colors.text }]}>
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#e5e5ea', true: '#4F46E5' }}
              thumbColor="#fff"
            />
          </View>

          <View style={[s.divider, { backgroundColor: colors.border }]} />

          {/* Sign out */}
          <TouchableOpacity style={[s.signOutBtn, { backgroundColor: isDark ? '#2c1a1a' : '#fff0f0' }]} onPress={onSignOut}>
            <Text style={s.signOutIcon}>🚪</Text>
            <Text style={s.signOutText}>Sign Out</Text>
          </TouchableOpacity>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 90,
    paddingRight: 16,
  },
  sheet: {
    width: 260,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    alignItems: 'center',
  },
  avatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  email: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  divider: {
    width: '100%',
    height: 1,
    marginVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 10,
  },
  rowIcon: { fontSize: 18 },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: 12,
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 4,
  },
  signOutIcon: { fontSize: 16 },
  signOutText: { color: '#ff3b30', fontWeight: '700', fontSize: 14 },
});