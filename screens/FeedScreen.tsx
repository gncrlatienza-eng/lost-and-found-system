import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { supabase } from '../lib/supabase';
import ItemCard from '../components/ItemCard';
import ProfileHeader from '../components/ProfileHeader';
import { useTheme } from '../context/ThemeContext';

const CATEGORIES = ['All', 'Electronics', 'Bag', 'ID', 'Wallet', 'Keys', 'Clothing', 'Other'];
const TYPES = ['All', 'Lost', 'Found'];

export default function FeedScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [items, setItems]           = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState('All');
  const [type, setType]             = useState('All');

  const fetchItems = async () => {
    let query = supabase.from('items').select('*').order('created_at', { ascending: false });
    if (category !== 'All') query = query.eq('category', category);
    if (type !== 'All')     query = query.eq('type', type.toLowerCase());
    if (search)             query = query.ilike('description', `%${search}%`);
    const { data } = await query;
    setItems(data ?? []);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchItems(); }, [search, category, type]);

  const s = makeStyles(colors, isDark);

  return (
    <SafeAreaView style={s.safe}>

      {/* 👇 Profile header replaces the old plain header */}
      <ProfileHeader title="Browse Items" subtitle="DLSL Lost & Found" />

      <View style={s.searchRow}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.search}
          placeholder="Search items..."
          placeholderTextColor={colors.placeholder}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={[s.clearBtn, { color: colors.subtext }]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={s.typeRow}>
        {TYPES.map(t => (
          <TouchableOpacity
            key={t}
            style={[s.typeBtn, type === t && s.typeBtnActive]}
            onPress={() => setType(t)}
          >
            <Text style={[s.typeBtnText, type === t && s.typeBtnTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={i => i}
        showsHorizontalScrollIndicator={false}
        style={s.chipList}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.chip, category === item && s.chipActive]}
            onPress={() => setCategory(item)}
          >
            <Text style={[s.chipText, category === item && s.chipTextActive]}>{item}</Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color={colors.accent} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          renderItem={({ item }) => <ItemCard item={item} navigation={navigation} />}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchItems(); }}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyIcon}>📭</Text>
              <Text style={[s.emptyText, { color: colors.text }]}>No items found</Text>
              <Text style={[s.emptySub, { color: colors.subtext }]}>Try adjusting your filters</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safe:              { flex: 1, backgroundColor: colors.bg },
  searchRow:         { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 12, backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border },
  searchIcon:        { fontSize: 16, marginRight: 8 },
  search:            { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.text },
  clearBtn:          { fontSize: 14, padding: 4 },
  typeRow:           { flexDirection: 'row', marginHorizontal: 16, marginBottom: 10, backgroundColor: colors.pillInactive, borderRadius: 10, padding: 3 },
  typeBtn:           { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 8 },
  typeBtnActive:     { backgroundColor: colors.card, shadowColor: colors.shadow, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  typeBtnText:       { fontSize: 13, color: colors.pillInactiveText, fontWeight: '600' },
  typeBtnTextActive: { color: colors.text },
  chipList:          { flexGrow: 0, marginBottom: 8 },
  chip:              { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  chipActive:        { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText:          { fontSize: 13, color: colors.subtext, fontWeight: '500' },
  chipTextActive:    { color: colors.card },
  list:              { padding: 16 },
  empty:             { alignItems: 'center', marginTop: 80 },
  emptyIcon:         { fontSize: 48, marginBottom: 12 },
  emptyText:         { fontSize: 17, fontWeight: '600' },
  emptySub:          { fontSize: 14, marginTop: 4 },
});