import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ALL_STATUS_VALUE } from '../../utils/statusFilters';

export default function StatusFilterDropdown({
  label = 'Status',
  value = ALL_STATUS_VALUE,
  options = [],
  onChange,
  style,
}) {
  const [open, setOpen] = useState(false);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) || options[0] || null,
    [options, value]
  );

  const handleSelect = (nextValue) => {
    if (typeof onChange === 'function') {
      onChange(nextValue);
    }

    setOpen(false);
  };

  return (
    <View style={[styles.wrapper, style]}>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen((current) => !current)} activeOpacity={0.8}>
        <View style={styles.textBlock}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{selectedOption?.label || 'All statuses'}</Text>
        </View>

        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#1E56A0" />
      </TouchableOpacity>

      {open && (
        <View style={styles.menu}>
          {options.map((option) => {
            const selected = option.value === value;

            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.option, selected && styles.optionActive]}
                onPress={() => handleSelect(option.value)}
                activeOpacity={0.75}
              >
                <Text style={[styles.optionText, selected && styles.optionTextActive]}>{option.label}</Text>
                {selected && <Ionicons name="checkmark" size={16} color="#1E56A0" />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  value: {
    color: '#0D1B2A',
    fontSize: 15,
    fontWeight: '700',
  },
  menu: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  optionActive: {
    backgroundColor: '#EFF6FF',
  },
  optionText: {
    flex: 1,
    color: '#0D1B2A',
    fontSize: 14,
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#1E56A0',
    fontWeight: '800',
  },
});