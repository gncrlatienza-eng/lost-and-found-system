import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AlertModal from '../components/AlertModal';
import ConfirmModal from '../components/ConfirmModal';
import StatusBadge from '../components/StatusBadge';
import ProfileHeader from '../components/ProfileHeader';

export default function ClaimScreen({ route }: any) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const [claims, setClaims]         = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [itemId, setItemId]         = useState('');
  const [proof, setProof]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert]           = useState<{ visible: boolean; title: string; message: string; type: any }>
    ({ visible: false, title: '', message: '', type: 'info' });
  const [confirm, setConfirm]       = useState<{ visible: boolean; claimId: string }>
    ({ visible: false, claimId: '' });

  useEffect(() => {
    if (route?.params?.itemId) setItemId(route.params.itemId);
  }, [route?.params?.itemId]);

  const showAlert = (title: string, message: string, type: any = 'info') =>
    setAlert({ visible: true, title, message, type });

  const fetchClaims = async () => {
    const { data } = await supabase
      .from('claims').select('*, items(description, type, category)')
      .eq('user_id', user?.id).order('created_at', { ascending: false });
    setClaims(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchClaims(); }, []);

  const validate = () => {
    if (!itemId.trim())            { showAlert('Missing Field', 'Item ID is required', 'error'); return false; }
    if (itemId.trim().length < 10) { showAlert('Invalid ID', 'Item ID looks too short', 'error'); return false; }
    if (!proof.trim())             { showAlert('Missing Field', 'Please describe your proof of ownership', 'error'); return false; }
    if (proof.trim().length < 20)  { showAlert('Too Short', 'Please provide more detail for your proof', 'warning'); return false; }
    return true;
  };

  const handleClaim = async () => {
    if (!validate()) return;
    setSubmitting(true);
    const { error } = await supabase.from('claims').insert({
      item_id: itemId.trim(), user_id: user?.id, proof_url: proof.trim(), status: 'pending',
    });
    setSubmitting(false);
    if (error) return showAlert('Error', error.message, 'error');
    showAlert('Submitted', 'Your claim is under review.', 'success');
    setItemId(''); setProof('');
    fetchClaims();
  };

  const handleWithdraw = async () => {
    await supabase.from('claims').delete().eq('id', confirm.claimId);
    setConfirm({ visible: false, claimId: '' });
    showAlert('Withdrawn', 'Your claim has been withdrawn.', 'info');
    fetchClaims();
  };

  const s = makeStyles(colors, isDark);

  return (
    <SafeAreaView style={s.safe}>
      {/* Sticky profile header */}
      <ProfileHeader title="My Claims" subtitle="Track your item claim requests" />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Form */}
        <View style={s.form}>
          <Text style={s.formTitle}>Submit a Claim</Text>

          <Text style={s.label}>Item ID</Text>
          <TextInput
            style={[s.input, itemId.length > 0 && s.inputFilled]}
            placeholder="Tap an item in the feed to auto-fill..."
            placeholderTextColor={colors.placeholder}
            value={itemId}
            onChangeText={setItemId}
            autoCapitalize="none"
          />

          <Text style={s.label}>Proof of Ownership</Text>
          <TextInput
            style={[s.input, s.textarea]}
            placeholder="Describe in detail why this item belongs to you..."
            placeholderTextColor={colors.placeholder}
            value={proof}
            onChangeText={setProof}
            multiline numberOfLines={4}
          />

          <TouchableOpacity style={s.btn} onPress={handleClaim} disabled={submitting}>
            {submitting
              ? <ActivityIndicator color={colors.card} />
              : <Text style={[s.btnText, { color: colors.card }]}>Submit Claim</Text>}
          </TouchableOpacity>
        </View>

        {/* Claims list */}
        <Text style={s.sectionLabel}>Your Claims</Text>
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
        ) : claims.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🗂️</Text>
            <Text style={[s.emptyText, { color: colors.subtext }]}>No claims yet</Text>
          </View>
        ) : (
          claims.map(c => (
            <View key={c.id} style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.cardTitle} numberOfLines={1}>{c.items?.description ?? 'Item'}</Text>
                <StatusBadge status={c.status} />
              </View>
              <Text style={s.cardCategory}>📁 {c.items?.category ?? '—'}</Text>
              <Text style={s.cardProof} numberOfLines={2}>Proof: {c.proof_url}</Text>
              <Text style={s.cardDate}>📅 {new Date(c.created_at).toLocaleDateString()}</Text>
              {c.status === 'pending' && (
                <TouchableOpacity style={s.withdrawBtn}
                  onPress={() => setConfirm({ visible: true, claimId: c.id })}>
                  <Text style={s.withdrawText}>Withdraw Claim</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}

        <View style={{ height: 48 }} />
      </ScrollView>

      <AlertModal
        visible={alert.visible} title={alert.title}
        message={alert.message} type={alert.type}
        onClose={() => setAlert({ ...alert, visible: false })}
      />
      <ConfirmModal
        visible={confirm.visible} title="Withdraw Claim"
        message="Are you sure you want to withdraw this claim?"
        confirmText="Withdraw" danger
        onConfirm={handleWithdraw}
        onCancel={() => setConfirm({ visible: false, claimId: '' })}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.bg },
  scroll:       { padding: 20, paddingTop: 8 },
  form:         { backgroundColor: colors.card, borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: colors.border },
  formTitle:    { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 16 },
  label:        { fontSize: 12, fontWeight: '600', color: colors.subtext, marginBottom: 6, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:        { backgroundColor: colors.input, borderRadius: 12, padding: 14, fontSize: 14, color: colors.text },
  inputFilled:  { backgroundColor: isDark ? '#0d1f3a' : '#f0f6ff', borderWidth: 1, borderColor: colors.info },
  textarea:     { height: 100, textAlignVertical: 'top' },
  btn:          { backgroundColor: colors.accent, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 16 },
  btnText:      { fontWeight: '700', fontSize: 15 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: colors.subtext, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  card:         { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle:    { fontSize: 15, fontWeight: '600', color: colors.text, flex: 1, marginRight: 8 },
  cardCategory: { fontSize: 12, color: colors.subtext, marginBottom: 4 },
  cardProof:    { fontSize: 13, color: colors.subtext, marginBottom: 6, lineHeight: 18 },
  cardDate:     { fontSize: 12, color: colors.placeholder },
  withdrawBtn:  { marginTop: 10, backgroundColor: isDark ? '#2b0d0d' : '#fff0f0', borderRadius: 10, padding: 10, alignItems: 'center' },
  withdrawText: { color: colors.danger, fontWeight: '600', fontSize: 13 },
  empty:        { alignItems: 'center', paddingVertical: 40 },
  emptyIcon:    { fontSize: 40, marginBottom: 10 },
  emptyText:    { fontSize: 15 },
});