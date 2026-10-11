import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MOBILE_SORT_OPTIONS } from '../utils/tableSort';

export default function TableSortControl({ value, onChange, options = MOBILE_SORT_OPTIONS.basic }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(([optionValue]) => optionValue === value)?.[1] || 'Newest first';

  const select = (nextValue) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Sort records</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Sort records, currently ${selectedLabel}`} activeOpacity={0.75} onPress={() => setOpen(true)} style={styles.trigger}>
        <Text style={styles.triggerText} numberOfLines={1}>{selectedLabel}</Text>
        <Ionicons name="chevron-down" size={19} color="#475569" />
      </TouchableOpacity>
      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Sort records</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close sort options" onPress={() => setOpen(false)}><Ionicons name="close" size={22} color="#334155" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map(([optionValue, optionLabel]) => {
                const selected = optionValue === value;
                return (
                  <TouchableOpacity key={optionValue} style={[styles.option, selected && styles.optionSelected]} onPress={() => select(optionValue)}>
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{optionLabel}</Text>
                    {selected && <Ionicons name="checkmark-circle" size={20} color="#007A18" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { minWidth: 180, flex: 1, marginTop: 8 },
  label: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 5 },
  trigger: { minHeight: 48, paddingHorizontal: 13, borderWidth: 1, borderColor: '#94a3b8', borderRadius: 9, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  triggerText: { flex: 1, color: '#0f172a', fontSize: 15, fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.52)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '76%', backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 28 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  sheetTitle: { color: '#0f172a', fontSize: 18, fontWeight: '800' },
  option: { minHeight: 52, paddingHorizontal: 14, marginTop: 8, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionSelected: { borderColor: '#007A18', backgroundColor: '#effcf3' },
  optionText: { color: '#334155', fontSize: 15, fontWeight: '600' },
  optionTextSelected: { color: '#006b15', fontWeight: '800' },
});
