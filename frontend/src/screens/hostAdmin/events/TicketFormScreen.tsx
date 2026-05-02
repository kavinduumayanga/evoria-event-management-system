import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { HostAdminEventStackParamList } from '../../../types/navigation';
import { ScreenContainer, Input, Button, LoadingState, Card, IconButton } from '../../../components';
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
        <Input label="Ticket name *" value={name} onChangeText={setName} placeholder="General Admission" />
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

        <Input label="Unlock code (optional)" value={unlockCode} onChangeText={setUnlockCode} placeholder="VIP2026" />

        <View style={styles.segmentedControlSection}>
          <Text style={styles.label}>Ticket type</Text>
          <Card variant="raised" style={styles.segmentedControlContainer} noPadding>
            <View style={styles.segmentedInner}>
              <TouchableOpacity style={[styles.segmentButton, isFree && styles.segmentButtonSelected]} onPress={() => setIsFree(true)}>
                <Text style={[styles.segmentButtonText, isFree && styles.segmentButtonTextSelected]}>FREE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.segmentButton, !isFree && styles.segmentButtonSelected]} onPress={() => setIsFree(false)}>
                <Text style={[styles.segmentButtonText, !isFree && styles.segmentButtonTextSelected]}>PAID</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        <View style={styles.segmentedControlSection}>
          <Text style={styles.label}>Status</Text>
          <Card variant="raised" style={styles.segmentedControlContainer} noPadding>
            <View style={styles.segmentedInner}>
              <TouchableOpacity style={[styles.segmentButton, isActive && styles.segmentButtonSelected]} onPress={() => setIsActive(true)}>
                <Text style={[styles.segmentButtonText, isActive && styles.segmentButtonTextSelected]}>ACTIVE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.segmentButton, !isActive && styles.segmentButtonSelected]} onPress={() => setIsActive(false)}>
                <Text style={[styles.segmentButtonText, !isActive && styles.segmentButtonTextSelected]}>HIDDEN</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        <Text style={styles.sectionTitle}>Promo Codes</Text>
        <Card variant="raised" style={styles.promoCard} noPadding>
          <View style={styles.promoCardInner}>
            <Input
              label="Promo code"
              value={promoCodeDraft}
              onChangeText={setPromoCodeDraft}
              placeholder="EARLYBIRD"
              autoCapitalize="characters"
            />
            <View style={styles.segmentedControlSection}>
              <Text style={styles.label}>Discount type</Text>
              <Card variant="raised" style={styles.segmentedControlContainer} noPadding>
                <View style={styles.segmentedInner}>
                  <TouchableOpacity
                    style={[styles.segmentButton, promoTypeDraft === 'percentage' && styles.segmentButtonSelected]}
                    onPress={() => setPromoTypeDraft('percentage')}
                  >
                    <Text style={[styles.segmentButtonText, promoTypeDraft === 'percentage' && styles.segmentButtonTextSelected]}>PERCENTAGE</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.segmentButton, promoTypeDraft === 'fixed' && styles.segmentButtonSelected]}
                    onPress={() => setPromoTypeDraft('fixed')}
                  >
                    <Text style={[styles.segmentButtonText, promoTypeDraft === 'fixed' && styles.segmentButtonTextSelected]}>FIXED</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            </View>
            <Input
              label={promoTypeDraft === 'percentage' ? 'Value (%)' : 'Value'}
              value={promoValueDraft}
              onChangeText={setPromoValueDraft}
              placeholder={promoTypeDraft === 'percentage' ? '10' : '500'}
              keyboardType="numeric"
            />
            <View style={styles.segmentedControlSection}>
              <Text style={styles.label}>Promo status</Text>
              <Card variant="raised" style={styles.segmentedControlContainer} noPadding>
                <View style={styles.segmentedInner}>
                  <TouchableOpacity style={[styles.segmentButton, promoActiveDraft && styles.segmentButtonSelected]} onPress={() => setPromoActiveDraft(true)}>
                    <Text style={[styles.segmentButtonText, promoActiveDraft && styles.segmentButtonTextSelected]}>ACTIVE</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.segmentButton, !promoActiveDraft && styles.segmentButtonSelected]} onPress={() => setPromoActiveDraft(false)}>
                    <Text style={[styles.segmentButtonText, !promoActiveDraft && styles.segmentButtonTextSelected]}>INACTIVE</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            </View>
            <Button title="Add Promo" onPress={addPromoCode} variant="secondary" size="sm" icon={<Plus size={16} color={theme.colors.text} />} />
          </View>
        </Card>

        {promoCodes.length > 0 && (
          <ScrollView style={styles.promoList}>
            {promoCodes.map((promo) => (
              <Card key={promo.code} variant={promo.isActive ? 'raised' : 'primary'} style={styles.promoItem} noPadding>
                <View style={styles.promoItemInner}>
                  <View style={styles.promoInfo}>
                    <Text style={styles.promoCode}>{promo.code}</Text>
                    <Text style={styles.promoMeta}>
                      {promo.discountType.toUpperCase()} • {promo.value} • {promo.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </Text>
                  </View>
                  <IconButton
                    icon={<X size={16} color={theme.colors.error} />}
                    onPress={() => setPromoCodes((prev) => prev.filter((item) => item.code !== promo.code))}
                    variant="ghost"
                  />
                </View>
              </Card>
            ))}
          </ScrollView>
        )}

        <Button
          title={isEditing ? 'Save Changes' : 'Create Ticket'}
          onPress={handleSave}
          isLoading={isSaving}
          variant="primary"
          size="lg"
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
  sectionTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginTop: theme.spacing.l,
    marginBottom: theme.spacing.m,
  },
  segmentedControlSection: {
    marginBottom: theme.spacing.m,
  },
  segmentedControlContainer: {
    borderRadius: theme.borderRadius.m,
    overflow: 'hidden',
  },
  segmentedInner: {
    flexDirection: 'row',
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: theme.spacing.s,
    alignItems: 'center',
    borderRadius: theme.borderRadius.s,
  },
  segmentButtonSelected: {
    backgroundColor: theme.colors.glass,
  },
  segmentButtonText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  segmentButtonTextSelected: {
    color: theme.colors.primaryLight,
  },
  promoCard: {
    borderRadius: theme.borderRadius.l,
    overflow: 'hidden',
    marginBottom: theme.spacing.m,
  },
  promoCardInner: { padding: theme.spacing.m },
  promoList: {
    maxHeight: 220,
    marginBottom: theme.spacing.m,
  },
  promoItem: {
    borderRadius: theme.borderRadius.m,
    overflow: 'hidden',
    marginBottom: theme.spacing.s,
  },
  promoItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.m,
  },
  promoInfo: { flex: 1, marginRight: theme.spacing.s },
  promoCode: { ...theme.typography.body, color: theme.colors.text, fontWeight: '700' },
  promoMeta: { ...theme.typography.small, color: theme.colors.primaryLight, marginTop: 4 },
  saveButton: { marginTop: theme.spacing.xl, marginBottom: theme.spacing.xxl },
});
