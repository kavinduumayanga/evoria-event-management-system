import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { HostAdminEventStackParamList } from '../../../types/navigation';
import { ScreenContainer, Input, Button, LoadingState } from '../../../components';
import { theme } from '../../../constants/theme';
import { ArrowLeft } from 'lucide-react-native';
import { TicketService } from '../../../api/services';
import { TicketType } from '../../../types';

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
  const [quantity, setQuantity] = useState('100');
  const [maxPerUser, setMaxPerUser] = useState('5');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (isEditing) {
      fetchTicket();
    }
  }, [ticketId]);

  const fetchTicket = async () => {
    try {
      // In a real app we might fetch single ticket or pass it through params.
      // Assuming we get the list and find it.
      const res = await TicketService.getEventTickets(eventId);
      const ticket = res.data.tickets.find((t: TicketType) => t.id === ticketId);
      if (ticket) {
        setName(ticket.name);
        setDescription(ticket.description || '');
        setPrice(ticket.price.toString());
        setQuantity(ticket.quantity.toString());
        setMaxPerUser(ticket.maxPerUser.toString());
        setIsActive(ticket.isActive);
      } else {
        Alert.alert('Error', 'Ticket not found');
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load ticket details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name || !price || !quantity) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      setIsSaving(true);
      const ticketData = {
        eventId,
        name,
        description,
        price: parseFloat(price),
        quantity: parseInt(quantity, 10),
        maxPerUser: parseInt(maxPerUser, 10) || 1,
        isActive
      };

      if (isEditing) {
        await TicketService.updateTicket(ticketId!, ticketData);
      } else {
        await TicketService.createTicket(ticketData);
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
          <View style={styles.flexHalf}><Input label="Price ($) *" value={price} onChangeText={setPrice} placeholder="0.00" keyboardType="numeric" /></View>
          <View style={styles.flexHalf}><Input label="Quantity *" value={quantity} onChangeText={setQuantity} placeholder="100" keyboardType="numeric" /></View>
        </View>

        <View style={styles.row}>
          <View style={styles.flexHalf}><Input label="Max per user *" value={maxPerUser} onChangeText={setMaxPerUser} placeholder="5" keyboardType="numeric" /></View>
        </View>

        <Text style={styles.label}>Status</Text>
        <View style={styles.selectorContainer}>
          <TouchableOpacity 
            style={[styles.chip, isActive && styles.chipSelected]}
            onPress={() => setIsActive(true)}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextSelected]}>ACTIVE</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.chip, !isActive && styles.chipSelected]}
            onPress={() => setIsActive(false)}
          >
            <Text style={[styles.chipText, !isActive && styles.chipTextSelected]}>HIDDEN</Text>
          </TouchableOpacity>
        </View>

        <Button title={isEditing ? 'Save Changes' : 'Create Ticket'} onPress={handleSave} isLoading={isSaving} style={styles.saveButton} />
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
  label: { ...theme.typography.caption, color: theme.colors.textMuted, marginBottom: theme.spacing.xs, marginLeft: 4, marginTop: theme.spacing.s },
  selectorContainer: { flexDirection: 'row', marginBottom: theme.spacing.m, gap: theme.spacing.s },
  chip: { paddingHorizontal: theme.spacing.m, paddingVertical: theme.spacing.s, borderRadius: theme.borderRadius.m, borderWidth: 1, borderColor: theme.colors.border },
  chipSelected: { borderColor: theme.colors.primary, backgroundColor: 'rgba(139, 92, 246, 0.1)' },
  chipText: { ...theme.typography.caption, color: theme.colors.textMuted },
  chipTextSelected: { color: theme.colors.primary, fontWeight: 'bold' },
  saveButton: { marginTop: theme.spacing.xl, marginBottom: theme.spacing.xxl },
});
