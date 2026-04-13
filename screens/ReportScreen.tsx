import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ProfileHeader from '../components/ProfileHeader';
import AlertModal from '../components/AlertModal';

const CATEGORIES = ['Electronics', 'Bag', 'ID', 'Wallet', 'Keys', 'Other'];
const MAX_PHOTOS = 5;
const MIN_PHOTOS = 3;

type MediaAsset = { uri: string; type: string; name: string };

async function uploadToStorage(bucket: string, path: string, uri: string, mimeType: string) {
  const base64 = await readAsStringAsync(uri, { encoding: 'base64' as any });
  const byteArray = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const { data, error } = await supabase.storage.from(bucket).upload(path, byteArray, {
    contentType: mimeType, upsert: false,
  });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return publicUrl;
}

export default function ReportScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const [type, setType]               = useState<'lost' | 'found'>('lost');
  const [category, setCategory]       = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation]       = useState('');
  const [date, setDate]               = useState('');
  const [photos, setPhotos]           = useState<MediaAsset[]>([]);
  const [video, setVideo]             = useState<MediaAsset | null>(null);
  const [loading, setLoading]         = useState(false);
  const [alert, setAlert]             = useState<{ visible: boolean; title: string; message: string; type: any }>
    ({ visible: false, title: '', message: '', type: 'info' });

  const showAlert = (title: string, message: string, type: any = 'error') =>
    setAlert({ visible: true, title, message, type });

  const pickPhotos = async () => {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (result.canceled) return;
    const assets: MediaAsset[] = result.assets.map(a => ({
      uri: a.uri, type: a.mimeType ?? 'image/jpeg',
      name: a.fileName ?? `photo_${Date.now()}.jpg`,
    }));
    setPhotos(prev => [...prev, ...assets].slice(0, MAX_PHOTOS));
  };

  const removePhoto = (idx: number) => setPhotos(prev => prev.filter((_, i) => i !== idx));

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'] as any,
      allowsMultipleSelection: false,
      videoMaxDuration: 60,
    });
    if (result.canceled) return;
    const a = result.assets[0];
    setVideo({ uri: a.uri, type: a.mimeType ?? 'video/mp4', name: a.fileName ?? `video_${Date.now()}.mp4` });
  };

  const handleSubmit = async () => {
    if (!category || !description || !location || !date)
      return showAlert('Missing Fields', 'Please fill in all fields.');
    if (photos.length < MIN_PHOTOS)
      return showAlert('Not Enough Photos', `Please add at least ${MIN_PHOTOS} photos.`);

    setLoading(true);
    try {
      const uid = user!.id;
      const ts  = Date.now();
      const photoUrls = await Promise.all(
        photos.map((p, i) => uploadToStorage('item-media', `${uid}/${ts}_photo_${i}.jpg`, p.uri, p.type))
      );
      const videoUrl = video
        ? await uploadToStorage('item-media', `${uid}/${ts}_video.mp4`, video.uri, video.type)
        : null;
      const { error } = await supabase.from('items').insert({
        user_id: uid, type, category, description,
        location, date_reported: date, status: 'pending',
        photo_urls: photoUrls, video_url: videoUrl,
      });
      if (error) throw error;
      showAlert('Success', 'Report submitted!', 'success');
      setCategory(''); setDescription(''); setLocation('');
      setDate(''); setPhotos([]); setVideo(null);
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const s = makeStyles(colors, isDark);

  return (
    <SafeAreaView style={s.safe}>
      {/* Sticky profile header */}
      <ProfileHeader title="Submit Report" subtitle="Report a lost or found item" />

      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <Text style={s.label}>Type</Text>
        <View style={s.row}>
          {(['lost', 'found'] as const).map(t => (
            <TouchableOpacity key={t} style={[s.typeBtn, type === t && s.typeBtnActive]} onPress={() => setType(t)}>
              <Text style={[s.typeBtnText, type === t && s.typeBtnTextActive]}>{t.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Category</Text>
        <View style={s.row}>
          {CATEGORIES.map(c => (
            <TouchableOpacity key={c} style={[s.chip, category === c && s.chipActive]} onPress={() => setCategory(c)}>
              <Text style={[s.chipText, category === c && s.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Description</Text>
        <TextInput
          style={[s.input, s.textarea]}
          placeholder="Describe the item..."
          placeholderTextColor={colors.placeholder}
          value={description}
          onChangeText={setDescription}
          multiline numberOfLines={4}
        />

        <Text style={s.label}>Location</Text>
        <TextInput
          style={s.input}
          placeholder="Where was it lost/found?"
          placeholderTextColor={colors.placeholder}
          value={location}
          onChangeText={setLocation}
        />

        <Text style={s.label}>Date (YYYY-MM-DD)</Text>
        <TextInput
          style={s.input}
          placeholder="2024-01-01"
          placeholderTextColor={colors.placeholder}
          value={date}
          onChangeText={setDate}
        />

        {/* Photos */}
        <View style={s.labelRow}>
          <Text style={s.label}>Photos</Text>
          <Text style={s.labelHint}>{photos.length}/{MAX_PHOTOS} · min {MIN_PHOTOS}</Text>
        </View>
        <View style={s.mediaGrid}>
          {photos.map((p, i) => (
            <View key={i} style={s.thumb}>
              <Image source={{ uri: p.uri }} style={s.thumbImg} />
              <TouchableOpacity style={s.removeBtn} onPress={() => removePhoto(i)}>
                <Ionicons name="close-circle" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          {photos.length < MAX_PHOTOS && (
            <TouchableOpacity style={s.addThumb} onPress={pickPhotos}>
              <Ionicons name="camera-outline" size={24} color={colors.placeholder} />
              <Text style={[s.addThumbText, { color: colors.placeholder }]}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Video */}
        <Text style={s.label}>
          Video <Text style={s.optional}>(optional)</Text>
        </Text>
        {video ? (
          <View style={s.videoRow}>
            <Ionicons name="videocam" size={20} color={colors.info} />
            <Text style={[s.videoName, { color: colors.text }]} numberOfLines={1}>{video.name}</Text>
            <TouchableOpacity onPress={() => setVideo(null)}>
              <Ionicons name="close-circle" size={20} color={colors.placeholder} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[s.videoBtn, { backgroundColor: isDark ? '#1a1f3a' : '#EEF2FF' }]} onPress={pickVideo}>
            <Ionicons name="videocam-outline" size={20} color={colors.info} />
            <Text style={[s.videoBtnText, { color: colors.info }]}>Select Video</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[s.btn, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
          {loading
            ? <ActivityIndicator color={colors.card} />
            : <Text style={[s.btnText, { color: colors.card }]}>Submit Report</Text>}
        </TouchableOpacity>

        <View style={{ height: 48 }} />
      </ScrollView>

      <AlertModal
        visible={alert.visible} title={alert.title}
        message={alert.message} type={alert.type}
        onClose={() => setAlert({ ...alert, visible: false })}
      />
    </SafeAreaView>
  );
}

const THUMB = 80;

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safe:              { flex: 1, backgroundColor: colors.bg },
  container:         { padding: 20, paddingTop: 8 },
  label:             { fontSize: 13, fontWeight: '600', color: colors.subtext, marginBottom: 8, marginTop: 16 },
  labelRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16, marginBottom: 8 },
  labelHint:         { fontSize: 12, color: colors.placeholder },
  optional:          { fontWeight: '400', color: colors.placeholder },
  row:               { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn:           { flex: 1, padding: 12, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  typeBtnActive:     { backgroundColor: colors.tabActive, borderColor: colors.tabActive },
  typeBtnText:       { fontWeight: 'bold', color: colors.subtext },
  typeBtnTextActive: { color: '#fff' },
  chip:              { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  chipActive:        { backgroundColor: colors.tabActive, borderColor: colors.tabActive },
  chipText:          { fontSize: 13, color: colors.subtext },
  chipTextActive:    { color: '#fff', fontWeight: 'bold' },
  input:             { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.border },
  textarea:          { height: 100, textAlignVertical: 'top' },
  mediaGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumb:             { width: THUMB, height: THUMB, borderRadius: 10, overflow: 'hidden' },
  thumbImg:          { width: '100%', height: '100%' },
  removeBtn:         { position: 'absolute', top: 3, right: 3 },
  addThumb:          { width: THUMB, height: THUMB, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 4 },
  addThumbText:      { fontSize: 11 },
  videoRow:          { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  videoName:         { flex: 1, fontSize: 13 },
  videoBtn:          { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 14 },
  videoBtnText:      { fontSize: 14, fontWeight: '600' },
  btn:               { backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  btnText:           { fontWeight: 'bold', fontSize: 16 },
});