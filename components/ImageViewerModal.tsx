import React, { useState } from 'react';
import {
  Modal, View, Image, TouchableOpacity,
  StyleSheet, FlatList, useWindowDimensions, Text
} from 'react-native';

type Props = {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
};

export default function ImageViewerModal({ visible, images, initialIndex = 0, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const [current, setCurrent] = useState(initialIndex);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={s.closeBtn} onPress={onClose}>
          <Text style={s.closeText}>✕</Text>
        </TouchableOpacity>
        <FlatList
          data={images}
          horizontal
          pagingEnabled
          initialScrollIndex={initialIndex}
          keyExtractor={(_, i) => i.toString()}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={e => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setCurrent(index);
          }}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={{ width, height: height * 0.8 }} resizeMode="contain" />
          )}
        />
        <View style={s.dots}>
          {images.map((_, i) => (
            <View key={i} style={[s.dot, current === i && s.dotActive]} />
          ))}
        </View>
        <Text style={s.counter}>{current + 1} / {images.length}</Text>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  closeBtn: {
    position: 'absolute', top: 56, right: 20, zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20,
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 16 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { backgroundColor: '#fff', width: 18 },
  counter: { color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 10, fontSize: 13 },
});