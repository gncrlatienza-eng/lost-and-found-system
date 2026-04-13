import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ProfileModal from './ProfileModal';
import ConfirmModal from './ConfirmModal';

type Props = {
  title: string;
  subtitle?: string;
};

export default function ProfileHeader({ title, subtitle }: Props) {
  const { user, username, signOut } = useAuth();
  const { colors } = useTheme();
  const [profileVisible, setProfileVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const initials = username
    ? username.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] ?? '?').toUpperCase();

  return (
    <>
      <View style={[styles.header]}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: colors.subtext }]}>{subtitle}</Text> : null}
        </View>
        <TouchableOpacity
          style={[styles.avatar, { backgroundColor: colors.accent }]}
          onPress={() => setProfileVisible(true)}
        >
          <Text style={[styles.initials, { color: colors.card }]}>{initials}</Text>
        </TouchableOpacity>
      </View>

      <ProfileModal
        visible={profileVisible}
        onClose={() => setProfileVisible(false)}
        onSignOut={() => { setProfileVisible(false); setConfirmVisible(true); }}
      />

      <ConfirmModal
        visible={confirmVisible}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        onConfirm={() => { setConfirmVisible(false); signOut(); }}
        onCancel={() => setConfirmVisible(false)}
        danger
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
  },
  initials: { fontWeight: '700', fontSize: 15, letterSpacing: 0.5 },
});