import React, { useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Modal, ScrollView, SafeAreaView, Dimensions,
} from 'react-native';
import ImageViewerModal from './ImageViewerModal';

const { width } = Dimensions.get('window');

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  pending:  { color: '#ff9500', bg: '#fff8f0', label: 'Pending' },
  found:    { color: '#34c759', bg: '#f0fff4', label: 'Found' },
  claimed:  { color: '#007aff', bg: '#f0f6ff', label: 'Claimed' },
  released: { color: '#8e8e93', bg: '#f2f2f7', label: 'Released' },
};

type Item = {
  id: string;
  type: 'lost' | 'found';
  category: string;
  description: string;
  location: string;
  status: string;
  date_reported: string;
  photo_urls?: string[];
};

type Props = { item: Item; navigation?: any };

export default function ItemCard({ item, navigation }: Props) {
  const [viewerOpen, setViewerOpen]   = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [detailOpen, setDetailOpen]   = useState(false);

  const status  = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
  const photos  = item.photo_urls ?? [];
  const visible = photos.slice(0, 3);

  const openViewer = (i: number) => { setViewerIndex(i); setViewerOpen(true); };

  const handleClaim = () => {
    setDetailOpen(false);
    navigation?.navigate('Claims', { itemId: item.id });
  };

  return (
    <>
      <TouchableOpacity activeOpacity={0.95} onPress={() => setDetailOpen(true)}>
        <View style={s.card}>
          {photos.length > 0 && (
            <View style={s.photoRow}>
              <TouchableOpacity style={s.thumbLarge} onPress={() => openViewer(0)} activeOpacity={0.9}>
                <Image source={{ uri: visible[0] }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              </TouchableOpacity>
              {visible.length > 1 && (
                <View style={s.thumbCol}>
                  {visible.slice(1).map((uri, i) => {
                    const realIndex = i + 1;
                    const isLast    = realIndex === 2 && photos.length > 3;
                    return (
                      <TouchableOpacity key={realIndex} style={s.thumbSmall} onPress={() => openViewer(realIndex)} activeOpacity={0.9}>
                        <Image source={{ uri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                        {isLast && (
                          <View style={s.moreOverlay}>
                            <Text style={s.moreText}>+{photos.length - 3}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          <View style={s.content}>
            <View style={s.row}>
              <View style={[s.typeBadge, { backgroundColor: item.type === 'lost' ? '#fff0f0' : '#f0fff4' }]}>
                <Text style={[s.typeText, { color: item.type === 'lost' ? '#ff3b30' : '#34c759' }]}>
                  {item.type === 'lost' ? '🔍 Lost' : '📦 Found'}
                </Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: status.bg }]}>
                <Text style={[s.statusText, { color: status.color }]}>{status.label}</Text>
              </View>
            </View>
            <Text style={s.description} numberOfLines={2}>{item.description}</Text>
            <View style={s.metaRow}>
              <Text style={s.meta}>📁 {item.category}</Text>
              <Text style={s.meta}>📍 {item.location}</Text>
            </View>
            <Text style={s.date}>📅 {item.date_reported}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* ── Detail Modal ── */}
      <Modal visible={detailOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDetailOpen(false)}>
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Item Details</Text>
            <TouchableOpacity onPress={() => setDetailOpen(false)} style={s.closeBtn}>
              <Text style={s.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Photos */}
            {photos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.photoStrip} contentContainerStyle={{ gap: 8 }}>
                {photos.map((uri, i) => (
                  <TouchableOpacity key={i} onPress={() => { setDetailOpen(false); setTimeout(() => { setViewerIndex(i); setViewerOpen(true); }, 300); }}>
                    <Image source={{ uri }} style={s.stripPhoto} resizeMode="cover" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Badges */}
            <View style={[s.row, { marginBottom: 16 }]}>
              <View style={[s.typeBadge, { backgroundColor: item.type === 'lost' ? '#fff0f0' : '#f0fff4' }]}>
                <Text style={[s.typeText, { color: item.type === 'lost' ? '#ff3b30' : '#34c759' }]}>
                  {item.type === 'lost' ? '🔍 Lost' : '📦 Found'}
                </Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: status.bg }]}>
                <Text style={[s.statusText, { color: status.color }]}>{status.label}</Text>
              </View>
            </View>

            {/* Details */}
            <View style={s.detailCard}>
              <DetailRow label="Description" value={item.description} />
              <DetailRow label="Category"    value={item.category} />
              <DetailRow label="Location"    value={item.location} />
              <DetailRow label="Date"        value={item.date_reported} last />
            </View>

            {/* Claim Button */}
            {item.status === 'pending' && (
              <TouchableOpacity style={s.claimBtn} onPress={handleClaim} activeOpacity={0.85}>
                <Text style={s.claimBtnText}>Claim This Item</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 32 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <ImageViewerModal
        visible={viewerOpen}
        images={photos}
        initialIndex={viewerIndex}
        onClose={() => setViewerOpen(false)}
      />
    </>
  );
}

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[dr.row, !last && dr.border]}>
      <Text style={dr.label}>{label}</Text>
      <Text style={dr.value}>{value}</Text>
    </View>
  );
}

const dr = StyleSheet.create({
  row:   { paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  border:{ borderBottomWidth: 1, borderBottomColor: '#f2f2f7' },
  label: { fontSize: 13, color: '#8e8e93', fontWeight: '600', width: 100 },
  value: { fontSize: 14, color: '#1c1c1e', flex: 1, textAlign: 'right', lineHeight: 20 },
});

const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 20, marginBottom: 14,
    overflow: 'hidden', borderWidth: 1, borderColor: '#f2f2f7',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  photoRow:    { flexDirection: 'row', height: 200 },
  thumbLarge:  { flex: 1 },
  thumbCol:    { width: 100, flexDirection: 'column' },
  thumbSmall:  { flex: 1, marginLeft: 2, marginBottom: 2 },
  moreOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  moreText:    { color: '#fff', fontSize: 18, fontWeight: '700' },
  content:     { padding: 16 },
  row:         { flexDirection: 'row', gap: 8, marginBottom: 10 },
  typeBadge:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  typeText:    { fontSize: 12, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText:  { fontSize: 12, fontWeight: '600' },
  description: { fontSize: 15, fontWeight: '600', color: '#1c1c1e', marginBottom: 8, lineHeight: 22 },
  metaRow:     { flexDirection: 'row', gap: 16, marginBottom: 4 },
  meta:        { fontSize: 12, color: '#8e8e93' },
  date:        { fontSize: 12, color: '#c7c7cc' },

  // modal
  modal:        { flex: 1, backgroundColor: '#f2f2f7' },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f2f2f7' },
  modalTitle:   { fontSize: 17, fontWeight: '700', color: '#1c1c1e' },
  closeBtn:     { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f2f2f7', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 13, color: '#8e8e93', fontWeight: '600' },
  modalScroll:  { padding: 20 },
  photoStrip:   { marginBottom: 20 },
  stripPhoto:   { width: width * 0.7, height: 220, borderRadius: 16 },
  detailCard:   { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, marginBottom: 20, borderWidth: 1, borderColor: '#f2f2f7' },
  claimBtn:     { backgroundColor: '#1c1c1e', borderRadius: 14, padding: 16, alignItems: 'center' },
  claimBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});