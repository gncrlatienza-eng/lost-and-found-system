import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = { status: string; };

const CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  pending:  { color: '#ff9500', bg: '#fff8f0', icon: '⏳' },
  found:    { color: '#34c759', bg: '#f0fff4', icon: '✅' },
  claimed:  { color: '#007aff', bg: '#f0f6ff', icon: '🔖' },
  released: { color: '#8e8e93', bg: '#f2f2f7', icon: '📤' },
  approved: { color: '#34c759', bg: '#f0fff4', icon: '✅' },
  rejected: { color: '#ff3b30', bg: '#fff0f0', icon: '❌' },
};

export default function StatusBadge({ status }: Props) {
  const c = CONFIG[status] ?? CONFIG.pending;
  return (
    <View style={[s.badge, { backgroundColor: c.bg }]}>
      <Text style={s.icon}>{c.icon}</Text>
      <Text style={[s.text, { color: c.color }]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: 'flex-start' },
  icon: { fontSize: 11 },
  text: { fontSize: 12, fontWeight: '700' },
});