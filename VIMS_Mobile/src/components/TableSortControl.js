import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MOBILE_SORT_OPTIONS } from '../utils/tableSort';

export default function TableSortControl({ value, onChange, options = MOBILE_SORT_OPTIONS.basic }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Sort records</Text>
      <View style={styles.pickerWrap}>
        <Picker selectedValue={value} onValueChange={onChange} style={styles.picker}>
          {options.map(([optionValue, label]) => <Picker.Item key={optionValue} value={optionValue} label={label} />)}
        </Picker>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { minWidth: 180, flex: 1 },
  label: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 3 },
  pickerWrap: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, overflow: 'hidden', backgroundColor: '#fff' },
  picker: { height: 44, color: '#0f172a' },
});
