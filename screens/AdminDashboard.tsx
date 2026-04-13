import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, ScrollView, RefreshControl,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import StatusBadge from '../components/StatusBadge';
import AlertModal from '../components/AlertModal';
import ConfirmModal from '../components/ConfirmModal';
import ProfileModal from '../components/ProfileModal';

type Tab = 'claims' | 'items' | 'logs' | 'report' | 'analytics';
type DateFilter = 'all' | 'day' | 'week' | 'month';

export default function AdminDashboard() {
  const { signOut, username, user } = useAuth();
  const { colors, isDark } = useTheme();

  const [tab, setTab] = useState<Tab>('claims');
  const [claims, setClaims] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [profileVisible, setProfileVisible] = useState(false);

  // Report form
  const [reportType, setReportType] = useState<'lost' | 'found'>('found');
  const [reportDesc, setReportDesc] = useState('');
  const [reportCategory, setReportCategory] = useState('');
  const [reportLocation, setReportLocation] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  const [alert, setAlert] = useState<{ visible: boolean; title: string; message: string; type: any }>
    ({ visible: false, title: '', message: '', type: 'info' });
  const [confirm, setConfirm] = useState<{ visible: boolean; action: (() => void) | null; title: string; message: string }>
    ({ visible: false, action: null, title: '', message: '' });

  const showAlert = (title: string, message: string, type: any = 'info') =>
    setAlert({ visible: true, title, message, type });
  const showConfirm = (title: string, message: string, action: () => void) =>
    setConfirm({ visible: true, title, message, action });

  // Avatar initials
  const initials = username
    ? username.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] ?? 'A').toUpperCase();

  const getFilterDate = (): string | null => {
    const now = new Date();
    if (dateFilter === 'day') now.setDate(now.getDate() - 1);
    else if (dateFilter === 'week') now.setDate(now.getDate() - 7);
    else if (dateFilter === 'month') now.setMonth(now.getMonth() - 1);
    else return null;
    return now.toISOString();
  };

  const fetchAll = async () => {
    const filterDate = getFilterDate();
    let cq = supabase.from('claims').select('*, items(description, category, type)').order('created_at', { ascending: false });
    let iq = supabase.from('items').select('*').order('created_at', { ascending: false });
    let lq = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50);
    if (filterDate) { cq = cq.gte('created_at', filterDate); iq = iq.gte('created_at', filterDate); lq = lq.gte('created_at', filterDate); }
    const [cr, ir, lr] = await Promise.all([cq, iq, lq]);
    setClaims(cr.data ?? []);
    setItems(ir.data ?? []);
    setLogs(lr.data ?? []);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchAll(); }, [dateFilter]);

  const updateClaimStatus = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase.from('claims').update({ status }).eq('id', id);
    if (error) return showAlert('Error', error.message, 'error');
    await supabase.from('audit_logs').insert({ action: `claim_${status}`, target_id: id });
    showAlert('Updated', `Claim has been ${status}.`, 'success');
    fetchAll();
  };

  const updateItemStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('items').update({ status }).eq('id', id);
    if (error) return showAlert('Error', error.message, 'error');
    await supabase.from('audit_logs').insert({ action: `item_status_${status}`, target_id: id });
    showAlert('Updated', `Item marked as ${status}.`, 'success');
    fetchAll();
  };

  const deleteItem = async (id: string) => {
    await supabase.from('claims').delete().eq('item_id', id);
    await supabase.from('items').delete().eq('id', id);
    await supabase.from('audit_logs').insert({ action: 'item_deleted', target_id: id });
    showAlert('Deleted', 'Item has been removed.', 'success');
    fetchAll();
  };

  const submitReport = async () => {
    if (!reportDesc.trim() || !reportCategory.trim() || !reportLocation.trim() || !reportDate.trim())
      return showAlert('Missing Fields', 'Please fill in all fields.', 'error');
    setReportLoading(true);
    const { error } = await supabase.from('items').insert({
      description: reportDesc.trim(),
      category: reportCategory.trim(),
      location: reportLocation.trim(),
      date_reported: reportDate.trim(),
      type: reportType,
      status: 'pending',
    });
    setReportLoading(false);
    if (error) return showAlert('Error', error.message, 'error');
    await supabase.from('audit_logs').insert({ action: 'admin_item_submitted', target_id: null });
    showAlert('Submitted', 'Item added successfully.', 'success');
    setReportDesc(''); setReportCategory(''); setReportLocation(''); setReportDate('');
    fetchAll();
  };

  // Analytics
  const lostItems = items.filter(i => i.type === 'lost').length;
  const foundItems = items.filter(i => i.type === 'found').length;
  const pendingClaims = claims.filter(c => c.status === 'pending').length;
  const approvedClaims = claims.filter(c => c.status === 'approved').length;
  const rejectedClaims = claims.filter(c => c.status === 'rejected').length;
  const categoryCount: Record<string, number> = {};
  items.forEach(i => { if (i.category) categoryCount[i.category] = (categoryCount[i.category] ?? 0) + 1; });
  const topCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'claims', label: 'Claims', icon: '📋' },
    { key: 'items', label: 'Items', icon: '📦' },
    { key: 'report', label: 'Submit', icon: '➕' },
    { key: 'analytics', label: 'Analytics', icon: '📊' },
    { key: 'logs', label: 'Logs', icon: '🗒️' },
  ];

  const DATE_FILTERS: { key: DateFilter; label: string }[] = [
    { key: 'all', label: 'All Time' },
    { key: 'day', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
  ];

  const s = makeStyles(colors, isDark);

  return (
    <SafeAreaView style={s.safe}>

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.heading}>Admin Panel</Text>
          <Text style={s.sub}>SDFO Dashboard</Text>
        </View>
        {/* Avatar button */}
        <TouchableOpacity style={s.avatarBtn} onPress={() => setProfileVisible(true)}>
          <Text style={s.avatarText}>{initials}</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.statsRow}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
        {[
          { label: 'Total Items', value: items.length, icon: '📦' },
          { label: 'Pending', value: pendingClaims, icon: '⏳' },
          { label: 'Approved', value: approvedClaims, icon: '✅' },
          { label: 'Lost', value: lostItems, icon: '🔴' },
          { label: 'Found', value: foundItems, icon: '🟢' },
        ].map(stat => (
          <View key={stat.label} style={s.statCard}>
            <Text style={s.statIcon}>{stat.icon}</Text>
            <Text style={s.statValue}>{stat.value}</Text>
            <Text style={s.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Date Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {DATE_FILTERS.map(f => (
          <TouchableOpacity key={f.key} style={[s.filterBtn, dateFilter === f.key && s.filterBtnActive]}
            onPress={() => setDateFilter(f.key)}>
            <Text style={[s.filterText, dateFilter === f.key && s.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} style={[s.tabPill, tab === t.key && s.tabPillActive]}
            onPress={() => setTab(t.key)}>
            <Text style={s.tabIcon}>{t.icon}</Text>
            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color={colors.accent} /> : (

        tab === 'analytics' ? (
          <ScrollView contentContainerStyle={s.analyticsList} showsVerticalScrollIndicator={false}>
            <Text style={s.sectionTitle}>📊 Overview</Text>
            <View style={s.analyticsGrid}>
              {[
                { label: 'Total Items', value: items.length, color: colors.text },
                { label: 'Lost Items', value: lostItems, color: colors.danger },
                { label: 'Found Items', value: foundItems, color: colors.success },
                { label: 'Pending Claims', value: pendingClaims, color: colors.warning },
                { label: 'Approved Claims', value: approvedClaims, color: colors.info },
                { label: 'Rejected Claims', value: rejectedClaims, color: colors.subtext },
              ].map(m => (
                <View key={m.label} style={[s.metricCard, { borderLeftColor: m.color }]}>
                  <Text style={[s.metricValue, { color: m.color }]}>{m.value}</Text>
                  <Text style={s.metricLabel}>{m.label}</Text>
                </View>
              ))}
            </View>

            <Text style={s.sectionTitle}>📁 Top Categories</Text>
            {topCategories.length === 0
              ? <Text style={s.empty}>No category data</Text>
              : topCategories.map(([cat, count]) => {
                  const pct = items.length > 0 ? (count / items.length) * 100 : 0;
                  return (
                    <View key={cat} style={s.catRow}>
                      <Text style={s.catName} numberOfLines={1}>{cat}</Text>
                      <View style={s.barTrack}>
                        <View style={[s.barFill, { width: `${pct}%` as any }]} />
                      </View>
                      <Text style={s.catCount}>{count}</Text>
                    </View>
                  );
                })
            }

            <Text style={s.sectionTitle}>📈 Claims Breakdown</Text>
            <View style={s.claimBreakdown}>
              {[
                { label: 'Pending', value: pendingClaims, color: colors.warning },
                { label: 'Approved', value: approvedClaims, color: colors.success },
                { label: 'Rejected', value: rejectedClaims, color: colors.danger },
              ].map(c => (
                <View key={c.label} style={s.claimBreakdownItem}>
                  <View style={[s.claimDot, { backgroundColor: c.color }]} />
                  <Text style={s.claimBreakdownLabel}>{c.label}</Text>
                  <Text style={[s.claimBreakdownValue, { color: c.color }]}>{c.value}</Text>
                </View>
              ))}
            </View>

            <Text style={s.filterNote}>
              📅 Showing: <Text style={{ fontWeight: '700', color: colors.text }}>
                {DATE_FILTERS.find(f => f.key === dateFilter)?.label}
              </Text>
            </Text>
          </ScrollView>

        ) : tab === 'report' ? (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={s.reportForm} showsVerticalScrollIndicator={false}>
              <Text style={s.sectionTitle}>➕ Submit New Item</Text>

              <Text style={s.fieldLabel}>Type</Text>
              <View style={s.typeRow}>
                {(['lost', 'found'] as const).map(t => (
                  <TouchableOpacity key={t} style={[s.typeBtn, reportType === t && s.typeBtnActive]}
                    onPress={() => setReportType(t)}>
                    <Text style={[s.typeBtnText, reportType === t && s.typeBtnTextActive]}>
                      {t === 'lost' ? '🔴 Lost' : '🟢 Found'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.fieldLabel}>Description</Text>
              <TextInput style={s.textArea} placeholder="Describe the item..."
                placeholderTextColor={colors.placeholder} value={reportDesc}
                onChangeText={setReportDesc} multiline numberOfLines={3} />

              <Text style={s.fieldLabel}>Category</Text>
              <TextInput style={s.fieldInput} placeholder="e.g. Electronics, Clothing, ID..."
                placeholderTextColor={colors.placeholder} value={reportCategory} onChangeText={setReportCategory} />

              <Text style={s.fieldLabel}>Location</Text>
              <TextInput style={s.fieldInput} placeholder="Where was it lost/found?"
                placeholderTextColor={colors.placeholder} value={reportLocation} onChangeText={setReportLocation} />

              <Text style={s.fieldLabel}>Date Reported</Text>
              <TextInput style={s.fieldInput} placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.placeholder} value={reportDate} onChangeText={setReportDate} />

              <TouchableOpacity style={s.submitBtn} onPress={submitReport} disabled={reportLoading}>
                {reportLoading ? <ActivityIndicator color={colors.card} />
                  : <Text style={s.submitBtnText}>Submit Item</Text>}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>

        ) : (
          <FlatList
            data={tab === 'claims' ? claims : tab === 'items' ? items : logs}
            keyExtractor={i => i.id}
            contentContainerStyle={s.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} />}
            ListEmptyComponent={<Text style={s.empty}>No {tab} found</Text>}
            renderItem={({ item }) => {
              if (tab === 'claims') return (
                <View style={s.card}>
                  <View style={s.cardHeader}>
                    <Text style={s.cardTitle} numberOfLines={1}>{item.items?.description ?? 'Item'}</Text>
                    <StatusBadge status={item.status} />
                  </View>
                  <Text style={s.cardMeta}>📁 {item.items?.category}  •  {item.items?.type?.toUpperCase()}</Text>
                  <Text style={s.cardProof} numberOfLines={2}>Proof: {item.proof_url}</Text>
                  <Text style={s.cardDate}>📅 {new Date(item.created_at).toLocaleDateString()}</Text>
                  {item.status === 'pending' && (
                    <View style={s.actionRow}>
                      <TouchableOpacity style={s.approveBtn} onPress={() =>
                        showConfirm('Approve Claim', 'Approve this claim?', () => updateClaimStatus(item.id, 'approved'))}>
                        <Text style={s.approveTxt}>✅ Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.rejectBtn} onPress={() =>
                        showConfirm('Reject Claim', 'Reject this claim?', () => updateClaimStatus(item.id, 'rejected'))}>
                        <Text style={s.rejectTxt}>❌ Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );

              if (tab === 'items') return (
                <View style={s.card}>
                  <View style={s.cardHeader}>
                    <Text style={s.cardTitle} numberOfLines={1}>{item.description}</Text>
                    <StatusBadge status={item.status} />
                  </View>
                  <Text style={s.cardMeta}>📁 {item.category}  •  📍 {item.location}</Text>
                  <Text style={s.cardMeta}>🔖 {item.type?.toUpperCase()}</Text>
                  <Text style={s.cardDate}>📅 {item.date_reported}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                    {['pending', 'found', 'claimed', 'released'].map(st => (
                      <TouchableOpacity key={st} style={[s.statusBtn, item.status === st && s.statusBtnActive]}
                        onPress={() => showConfirm('Update Status', `Mark item as "${st}"?`, () => updateItemStatus(item.id, st))}>
                        <Text style={[s.statusBtnText, item.status === st && s.statusBtnTextActive]}>{st}</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={s.deleteBtn} onPress={() =>
                      showConfirm('Delete Item', 'Permanently delete this item and all related claims?', () => deleteItem(item.id))}>
                      <Text style={s.deleteTxt}>🗑️ Delete</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              );

              return (
                <View style={s.logCard}>
                  <Text style={s.logAction}>{item.action}</Text>
                  <Text style={s.logDate}>{new Date(item.created_at).toLocaleString()}</Text>
                </View>
              );
            }}
          />
        )
      )}

      <ProfileModal
        visible={profileVisible}
        onClose={() => setProfileVisible(false)}
        onSignOut={() => { setProfileVisible(false); showConfirm('Sign Out', 'Are you sure you want to sign out?', signOut); }}
      />

      <AlertModal visible={alert.visible} title={alert.title} message={alert.message} type={alert.type}
        onClose={() => setAlert({ ...alert, visible: false })} />
      <ConfirmModal
        visible={confirm.visible} title={confirm.title} message={confirm.message}
        onConfirm={() => { confirm.action?.(); setConfirm({ ...confirm, visible: false }); }}
        onCancel={() => setConfirm({ ...confirm, visible: false })}
        danger
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 },
  heading: { fontSize: 28, fontWeight: '700', color: colors.text },
  sub: { fontSize: 13, color: colors.subtext, marginTop: 2 },
  avatarBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.accent,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.shadow, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },
  avatarText: { color: colors.card, fontWeight: '700', fontSize: 15, letterSpacing: 0.5 },
  statsRow: { flexGrow: 0, marginBottom: 10 },
  statCard: { backgroundColor: colors.card, borderRadius: 16, padding: 14, alignItems: 'center', minWidth: 95, borderWidth: 1, borderColor: colors.border },
  statIcon: { fontSize: 18, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 10, color: colors.subtext, marginTop: 2, textAlign: 'center' },
  filterRow: { flexGrow: 0, marginBottom: 10 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.pillInactive },
  filterBtnActive: { backgroundColor: colors.accent },
  filterText: { fontSize: 12, color: colors.pillInactiveText, fontWeight: '600' },
  filterTextActive: { color: colors.card },
  tabsScroll: { flexGrow: 0, marginBottom: 10 },
  tabPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.pillInactive },
  tabPillActive: { backgroundColor: colors.accent },
  tabIcon: { fontSize: 13 },
  tabText: { fontSize: 13, color: colors.pillInactiveText, fontWeight: '600' },
  tabTextActive: { color: colors.card },
  list: { padding: 16 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.text, flex: 1, marginRight: 8 },
  cardMeta: { fontSize: 12, color: colors.subtext, marginBottom: 2 },
  cardProof: { fontSize: 13, color: colors.subtext, lineHeight: 18, marginBottom: 4 },
  cardDate: { fontSize: 12, color: colors.placeholder },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  approveBtn: { flex: 1, backgroundColor: isDark ? '#0d2b18' : '#f0fff4', borderRadius: 10, padding: 10, alignItems: 'center' },
  approveTxt: { color: colors.success, fontWeight: '600', fontSize: 13 },
  rejectBtn: { flex: 1, backgroundColor: isDark ? '#2b0d0d' : '#fff0f0', borderRadius: 10, padding: 10, alignItems: 'center' },
  rejectTxt: { color: colors.danger, fontWeight: '600', fontSize: 13 },
  statusBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.pillInactive, marginRight: 6 },
  statusBtnActive: { backgroundColor: colors.accent },
  statusBtnText: { fontSize: 12, color: colors.pillInactiveText, fontWeight: '500' },
  statusBtnTextActive: { color: colors.card },
  deleteBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: isDark ? '#2b0d0d' : '#fff0f0', marginRight: 6 },
  deleteTxt: { fontSize: 12, color: colors.danger, fontWeight: '500' },
  logCard: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border },
  logAction: { fontSize: 13, color: colors.text, fontWeight: '500' },
  logDate: { fontSize: 11, color: colors.placeholder },
  empty: { textAlign: 'center', color: colors.subtext, marginTop: 60, fontSize: 15 },
  analyticsList: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12, marginTop: 8 },
  analyticsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  metricCard: { backgroundColor: colors.card, borderRadius: 12, padding: 14, width: '47%', borderLeftWidth: 4, borderWidth: 1, borderColor: colors.border },
  metricValue: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  metricLabel: { fontSize: 11, color: colors.subtext },
  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  catName: { fontSize: 13, color: colors.text, width: 100 },
  barTrack: { flex: 1, height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: colors.accent, borderRadius: 4 },
  catCount: { fontSize: 13, fontWeight: '700', color: colors.text, width: 24, textAlign: 'right' },
  claimBreakdown: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, gap: 12, borderWidth: 1, borderColor: colors.border },
  claimBreakdownItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  claimDot: { width: 10, height: 10, borderRadius: 5 },
  claimBreakdownLabel: { flex: 1, fontSize: 14, color: colors.text },
  claimBreakdownValue: { fontSize: 18, fontWeight: '700' },
  filterNote: { textAlign: 'center', fontSize: 12, color: colors.subtext, marginTop: 16, marginBottom: 32 },
  reportForm: { padding: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.subtext, marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border },
  textArea: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border, minHeight: 90, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: colors.pillInactive, alignItems: 'center' },
  typeBtnActive: { backgroundColor: colors.accent },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: colors.pillInactiveText },
  typeBtnTextActive: { color: colors.card },
  submitBtn: { backgroundColor: colors.accent, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 28, marginBottom: 40 },
  submitBtnText: { color: colors.card, fontWeight: '700', fontSize: 16 },
});