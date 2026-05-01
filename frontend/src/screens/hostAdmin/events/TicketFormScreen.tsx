import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { HostAdminEventStackParamList } from '../../../types/navigation';
import { ScreenContainer, Input, Button, LoadingState } from '../../../components';
import { theme } from '../../../constants/theme';
import { ArrowLeft, Plus, X } from 'lucide-react-native';
import { TicketService } from '../../../api/services';
import { PromoCode, TicketType } from '../../../types';

type TicketFormNavigationProp = NativeStackNavigationProp<HostAdminEventStackParamList, 'TicketForm'>;
type TicketFormRouteProp = RouteProp<HostAdminEventStackParamList, 'TicketForm'>;

interface Props {
  navigation: TicketFormNavigationProp;
  route: TicketFormRouteProp;
}

export const TicketFormScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId, ticketId } = route.params;
  const isEditing = !!ticketId;

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [currency, setCurrency] = useState('LKR');
  const [isFree, setIsFree] = useState(false);
  const [quantity, setQuantity] = useState('100');
  const [maxPerUser, setMaxPerUser] = useState('5');
  const [isActive, setIsActive] = useState(true);
  const [unlockCode, setUnlockCode] = useState('');

  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [promoCodeDraft, setPromoCodeDraft] = useState('');
  const [promoTypeDraft, setPromoTypeDraft] = useState<'percentage' | 'fixed'>('percentage');
  const [promoValueDraft, setPromoValueDraft] = useState('');
  const [promoActiveDraft, setPromoActiveDraft] = useState(true);

  useEffect(() => {
    if (isEditing) {
      fetchTicket();
    }
  }, [ticketId]);

  const fetchTicket = async () => {
    try {
      const res = await TicketService.getEventTickets(eventId);
      const ticket = res.data.tickets.find((item: TicketType) => item.id === ticketId);
      if (!ticket) {
        Alert.alert('Error', 'Ticket not found');
        navigation.goBack();
        return;
      }

      setName(ticket.name);
      setDescription(ticket.description || '');
      setPrice(ticket.price.toString());
      setCurrency(ticket.currency || 'LKR');
      setIsFree(Boolean(ticket.isFree));
      setQuantity(ticket.quantity.toString());
      setMaxPerUser(ticket.maxPerUser.toString());
      setIsActive(ticket.isActive);
      setPromoCodes(ticket.promoCodes || []);
      setUnlockCode(ticket.unlockCode || '');
    } catch (error) {
      Alert.alert('Error', 'Failed to load ticket details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const addPromoCode = () => {
    const normalizedCode = promoCodeDraft.trim().toUpperCase();
    const parsedValue = Number.parseFloat(promoValueDraft);

    if (!normalizedCode) {
      Alert.alert('Validation Error', 'Promo code cannot be empty.');
      return;
    }

    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      Alert.alert('Validation Error', 'Promo value must be a positive number or 0.');
      return;
    }

    if (promoTypeDraft === 'percentage' && parsedValue > 100) {
      Alert.alert('Validation Error', 'Percentage promo value cannot exceed 100.');
      return;
    }

    const alreadyExists = promoCodes.some((promo) => promo.code.toUpperCase() === normalizedCode);
    if (alreadyExists) {
      Alert.alert('Validation Error', 'This promo code already exists.');
      return;
    }

    setPromoCodes((previous) => [
      ...previous,
      {
        code: normalizedCode,
        discountType: promoTypeDraft,
        value: parsedValue,
        isActive: promoActiveDraft,
      },
    ]);

    setPromoCodeDraft('');
    setPromoTypeDraft('percentage');
    setPromoValueDraft('');
    setPromoActiveDraft(true);
  };

  const handleSave = async () => {
    const parsedPrice = Number.parseFloat(price);
    const parsedQuantity = Number.parseInt(quantity, 10);
    const parsedMaxPerUser = Number.parseInt(maxPerUser, 10);

    if (!name.trim()) {
      Alert.alert('Validation Error', 'Ticket name is required.');
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      Alert.alert('Validation Error', 'Price must be 0 or more.');
      return;
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      Alert.alert('Validation Error', 'Quantity must be greater than 0.');
      return;
    }

    if (!Number.isFinite(parsedMaxPerUser) || parsedMaxPerUser <= 0) {
      Alert.alert('Validation Error', 'Max per user must be greater than 0.');
      return;
    }

    try {
      setIsSaving(true);

      const payload = {
        eventId,
        name: name.trim(),
        description: description.trim() || undefined,
        price: isFree ? 0 : parsedPrice,
        currency: currency.trim().toUpperCase() || 'LKR',
        isFree,
        quantity: parsedQuantity,
        maxPerUser: parsedMaxPerUser,
        isActive,
        promoCodes,
        unlockCode: unlockCode.trim() || undefined,
      };

      if (isEditing) {
        await TicketService.updateTicket(ticketId!, payload);
      } else {
        await TicketService.createTicket(payload);
      }

      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save ticket');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LoadingState />;

  return (
    <ScreenContainer scrollable style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>{isEditing ? 'Edit Ticket' : 'Create Ticket'}</Text>
      </View>

      <View style={styles.form}>
        <Input label="Ticket Name *" value={name} onChangeText={setName} placeholder="General Admission" />
        <Input label="Description" value={description} onChangeText={setDescription} placeholder="Access to all areas" />

        <View style={styles.row}>
          <View style={styles.flexHalf}>
            <Input
              label="Price *"
              value={price}
              onChangeText={setPrice}
              placeholder="0.00"
              keyboardType="numeric"
              editable={!isFree}
            />
          </View>
          <View style={styles.flexHalf}>
            <Input label="Currency *" value={currency} onChangeText={setCurrency} placeholder="LKR" autoCapitalize="characters" />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.flexHalf}>
            <Input label="Quantity *" value={quantity} onChangeText={setQuantity} placeholder="100" keyboardType="numeric" />
          </View>
          <View style={styles.flexHalf}>
            <Input label="Max per user *" value={maxPerUser} onChangeText={setMaxPerUser} placeholder="5" keyboardType="numeric" />
          </View>
        </View>

        <Input label="Unlock Code (Optional)" value={unlockCode} onChangeText={setUnlockCode} placeholder="VIP2026" />

        <Text style={styles.label}>Ticket Type</Text>
        <View style={styles.selectorContainer}>
          <TouchableOpacity style={[styles.chip, isFree && styles.chipSelected]} onPress={() => setIsFree(true)}>
            <Text style={[styles.chipText, isFree && styles.chipTextSelected]}>FREE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.chip, !isFree && styles.chipSelected]} onPress={() => setIsFree(false)}>
            <Text style={[styles.chipText, !isFree && styles.chipTextSelected]}>PAID</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Status</Text>
        <View style={styles.selectorContainer}>
          <TouchableOpacity style={[styles.chip, isActive && styles.chipSelected]} onPress={() => setIsActive(true)}>
            <Text style={[styles.chipText, isActive && styles.chipTextSelected]}>ACTIVE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.chip, !isActive && styles.chipSelected]} onPress={() => setIsActive(false)}>
            <Text style={[styles.chipText, !isActive && styles.chipTextSelected]}>HIDDEN</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Promo Codes</Text>
        <Input
          label="Promo Code"
          value={promoCodeDraft}
          onChangeText={setPromoCodeDraft}
          placeholder="EARLYBIRD"
          autoCapitalize="characters"
        />
        <View style={styles.selectorContainer}>
          <TouchableOpacity
            style={[styles.chip, promoTypeDraft === 'percentage' && styles.chipSelected]}
            onPress={() => setPromoTypeDraft('percentage')}
          >
            <Text style={[styles.chipText, promoTypeDraft === 'percentage' && styles.chipTextSelected]}>PERCENTAGE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, promoTypeDraft === 'fixed' && styles.chipSelected]}
            onPress={() => setPromoTypeDraft('fixed')}
          >
            <Text style={[styles.chipText, promoTypeDraft === 'fixed' && styles.chipTextSelected]}>FIXED</Text>
          </TouchableOpacity>
        </View>
        <Input
          label={promoTypeDraft === 'percentage' ? 'Value (%)' : 'Value'}
          value={promoValueDraft}
          onChangeText={setPromoValueDraft}
          placeholder={promoTypeDraft === 'percentage' ? '10' : '500'}
          keyboardType="numeric"
        />
        <View style={styles.selectorContainer}>
          <TouchableOpacity style={[styles.chip, promoActiveDraft && styles.chipSelected]} onPress={() => setPromoActiveDraft(true)}>
            <Text style={[styles.chipText, promoActiveDraft && styles.chipTextSelected]}>ACTIVE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.chip, !promoActiveDraft && styles.chipSelected]} onPress={() => setPromoActiveDraft(false)}>
            <Text style={[styles.chipText, !promoActiveDraft && styles.chipTextSelected]}>INACTIVE</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={addPromoCode}>
          <Plus size={16} color={theme.colors.text} />
          <Text style={styles.addButtonText}>Add Promo</Text>
        </TouchableOpacity>

        {promoCodes.length > 0 && (
          <ScrollView style={styles.promoList}>
            {promoCodes.map((promo) => (
              <View key={promo.code} style={styles.promoItem}>
                <View style={styles.promoInfo}>
                  <Text style={styles.promoCode}>{promo.code}</Text>
                  <Text style={styles.promoMeta}>
                    {promo.discountType.toUpperCase()} • {promo.value} • {promo.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setPromoCodes((previous) => previous.filter((item) => item.code !== promo.code))}>
                  <X size={16} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        <Button
          title={isEditing ? 'Save Changes' : 'Create Ticket'}
          onPress={handleSave}
          isLoading={isSaving}
          style={styles.saveButton}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { padding: theme.spacing.m },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: theme.spacing.xl, marginBottom: theme.spacing.xl },
  backButton: { marginRight: theme.spacing.m },
  title: { ...theme.typography.h1, color: theme.colors.text },
  form: { flex: 1 },
  row: { flexDirection: 'row', gap: theme.spacing.m },
  flexHalf: { flex: 1 },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
    marginLeft: 4,
    marginTop: theme.spacing.s,
  },
  selectorContainer: { flexDirection: 'row', marginBottom: theme.spacing.m, gap: theme.spacing.s, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.s,
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipSelected: { borderColor: theme.colors.primary, backgroundColor: 'rgba(139, 92, 246, 0.1)' },
  chipText: { ...theme.typography.caption, color: theme.colors.textMuted },
  chipTextSelected: { color: theme.colors.primary, fontWeight: 'bold' },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginTop: theme.spacing.s,
    marginBottom: theme.spacing.s,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.m,
    paddingVertical: theme.spacing.s,
    marginBottom: theme.spacing.m,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  addButtonText: {
    ...theme.typography.button,
    color: theme.colors.text,
    marginLeft: theme.spacing.s,
  },
  promoList: {
    maxHeight: 180,
    marginBottom: theme.spacing.m,
  },
  promoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.m,
    padding: theme.spacing.s,
    marginBottom: theme.spacing.s,
    backgroundColor: theme.colors.surfaceLight,
  },
  promoInfo: { flex: 1, marginRight: theme.spacing.s },
  promoCode: { ...theme.typography.body, color: theme.colors.text, fontWeight: '700' },
  promoMeta: { ...theme.typography.small, color: theme.colors.textMuted, marginTop: 2 },
  saveButton: { marginTop: theme.spacing.xl, marginBottom: theme.spacing.xxl },
});
