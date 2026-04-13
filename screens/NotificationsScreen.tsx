import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ProfileHeader from '../components/ProfileHeader';

type Notification = { id: string; message: string; is_read: boolean; created_at: string };

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications').select('*')
      .eq('user_id', user?.id).order('created_at', { ascending: false });
    setNotifications(data ?? []);
    setLoading(false);
    setRefreshing(false);
  };

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user?.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  useEffect(() => { fetchNotifications(); }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const s = makeStyles(colors, isDark);

  return (
    <SafeAreaView style={s.safe}>
      {/* Sticky profile header */}
      <ProfileHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
      />

      {/* Mark all read — shown inline below header */}
      {unreadCount > 0 && (
        <View style={s.markAllRow}>
          <TouchableOpacity style={s.markAllBtn} onPress={markAllRead}>
            <Text style={[s.markAllText, { color: colors.info }]}>Mark all as read</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color={colors.accent} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={i => i.id}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchNotifications(); }}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🔔</Text>
              <Text style={[s.emptyText, { color: colors.text }]}>No notifications yet</Text>
              <Text style={[s.emptySub, { color: colors.subtext }]}>
                You'll be notified when your items get updates
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.card, !item.is_read && { borderColor: colors.info, borderWidth: 1.5 }]}
              onPress={() => markRead(item.id)}
              activeOpacity={0.7}
            >
              <View style={s.cardLeft}>
                <View style={[s.dot, { backgroundColor: item.is_read ? colors.border : colors.info }]} />
              </View>
              <View style={s.cardRight}>
                <Text style={[s.message, { color: item.is_read ? colors.subtext : colors.text },
                  !item.is_read && { fontWeight: '500' }]}>
                  {item.message}
                </Text>
                <Text style={[s.time, { color: colors.placeholder }]}>
                  {new Date(item.created_at).toLocaleDateString('en-PH', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg },
  markAllRow:  { paddingHorizontal: 16, paddingBottom: 8, alignItems: 'flex-end' },
  markAllBtn:  { backgroundColor: colors.pillInactive, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  markAllText: { fontSize: 13, fontWeight: '600' },
  list:        { padding: 16 },
  card:        {
    backgroundColor: colors.card, borderRadius: 16, padding: 16,
    marginBottom: 10, flexDirection: 'row', gap: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  cardLeft:    { paddingTop: 4 },
  dot:         { width: 8, height: 8, borderRadius: 4 },
  cardRight:   { flex: 1 },
  message:     { fontSize: 14, lineHeight: 20 },
  time:        { fontSize: 12, marginTop: 6 },
  empty:       { alignItems: 'center', marginTop: 100 },
  emptyIcon:   { fontSize: 48, marginBottom: 12 },
  emptyText:   { fontSize: 17, fontWeight: '600' },
  emptySub:    { fontSize: 14, marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },
});