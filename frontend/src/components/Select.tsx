import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, FlatList, TouchableOpacity } from 'react-native';
import { theme } from '../constants/theme';
import { ChevronDown, Check, X } from 'lucide-react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { ScreenContainer } from './ScreenContainer';
import { GlassCard } from './GlassCard';
import { IconButton } from './IconButton';

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  label?: string;
  value: string;
  options: SelectOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
  error?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  value,
  options,
  onSelect,
  placeholder = 'Select an option',
  error
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <AnimatedPressable 
        style={[styles.trigger, error ? styles.triggerError : null]} 
        onPress={() => setModalVisible(true)}
      >
        <Text style={[styles.triggerText, !selectedOption && styles.placeholder]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <ChevronDown size={20} color={theme.colors.textMuted} />
      </AnimatedPressable>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal visible={modalVisible} transparent animationType="slide">
        <ScreenContainer style={styles.modalContainer}>
          <GlassCard variant="dark" style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label || 'Select'}</Text>
              <IconButton icon={<X size={24} color={theme.colors.text} />} onPress={() => setModalVisible(false)} />
            </View>
            
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.optionRow}
                  onPress={() => {
                    onSelect(item.value);
                    setModalVisible(false);
                  }}
                >
                  <Text style={[styles.optionText, item.value === value && styles.optionSelectedText]}>
                    {item.label}
                  </Text>
                  {item.value === value && <Check size={20} color={theme.colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </GlassCard>
        </ScreenContainer>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.m,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.text,
    marginBottom: theme.spacing.s,
    fontWeight: '600',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceLight,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.m,
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.m,
  },
  triggerError: {
    borderColor: theme.colors.error,
  },
  triggerText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  placeholder: {
    color: theme.colors.textMuted,
  },
  errorText: {
    ...theme.typography.small,
    color: theme.colors.error,
    marginTop: theme.spacing.s,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalCard: {
    maxHeight: '80%',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.m,
  },
  modalTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  optionText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  optionSelectedText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  }
});
