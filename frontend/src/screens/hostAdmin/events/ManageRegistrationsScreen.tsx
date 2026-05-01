import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HostAdminEventStackParamList } from '../../../types/navigation';
import { Booking } from '../../../types';
import { EmptyState, ErrorState, LoadingState, NeonCard, ScreenContainer } from '../../../components';
import { theme } from '../../../constants/theme';
import { RegistrationService } from '../../../api/services';
import { ArrowLeft, Check, X } from 'lucide-react-native';

type ManageRegistrationsNavigationProp = NativeStackNavigationProp<HostAdminEventStackParamList, 'ManageRegistrations'>;
type ManageRegistrationsRouteProp = RouteProp<HostAdminEventStackParamList, 'ManageRegistrations'>;

interface Props {
  navigation: ManageRegistrationsNavigationProp;
  route: ManageRegistrationsRouteProp;
}

export const ManageRegistrationsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId } = route.params;

  const [registrations, setRegistrations] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRegistrations = async () => {
    try {
      setError(null);
      const response = await RegistrationService.getEventRegistrations(eventId);
      setRegistrations(response.data.registrations);
    } catch (err) {
      console.error(err);
      setError('Failed to load event registrations');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRegistrations();
    }, [eventId]),
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchRegistrations();
  }, [eventId]);

  const getApprovalColor = (status: Booking['approvalStatus']) => {
    switch (status) {
      case 'approved':
        return theme.colors.success;
      case 'pending':
        return theme.colors.warning;
      case 'rejected':
        return theme.colors.error;
      default:
        return theme.colors.textMuted;
    }
  };

  const handleDecision = (registration: Booking, action: 'approve' | 'reject') => {
    const isApprove = action === 'approve';
    const title = isApprove ? 'Approve Registration' : 'Reject Registration';
    const message = isApprove ? 'Approve this attendee registration?' : 'Reject this attendee registration?';

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: isApprove ? 'Approve' : 'Reject',
        style: isApprove ? 'default' : 'destructive',
        onPress: async () => {
          try {
            const response = isApprove
              ? await RegistrationService.approveRegistration(registration.id)
              : await RegistrationService.rejectRegistration(registration.id);

            const updatedRegistration: Booking = response.data.registration;
            setRegistrations((previous) => previous.map((item) => (item.id === registration.id ? updatedRegistration : item)));
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || `Failed to ${action} registration`);
          }
        },
      },
    ]);
  };

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchRegistrations} /></ScreenContainer>;

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Registrations</Text>
      </View>

      <FlatList
        data={registrations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        renderItem={({ item }) => (
          <NeonCard style={styles.registrationCard}>
            {(() => {
              const approvalStatus = item.approvalStatus || 'approved';
              const rsvpStatus = item.rsvpStatus || 'going';
              const registrationType = item.registrationType || (item.totalAmount > 0 ? 'paid' : 'free');
              return (
                <>
            <View style={styles.cardTopRow}>
              <Text style={styles.registrationId}>Registration #{item.id.substring(0, 8)}</Text>
              <View style={[styles.statusBadge, { borderColor: getApprovalColor(approvalStatus), backgroundColor: `${getApprovalColor(approvalStatus)}20` }]}>
                <Text style={[styles.statusText, { color: getApprovalColor(approvalStatus) }]}>
                  {approvalStatus.toUpperCase()}
                </Text>
              </View>
            </View>

            <Text style={styles.metaText}>RSVP: {rsvpStatus.replace('_', ' ').toUpperCase()}</Text>
            <Text style={styles.metaText}>Type: {registrationType.toUpperCase()}</Text>
            <Text style={styles.metaText}>Quantity: {item.quantity}</Text>

            {item.customAnswers && item.customAnswers.length > 0 && (
              <View style={styles.answersSection}>
                <Text style={styles.answersTitle}>Answers</Text>
                {item.customAnswers.map((answer) => (
                  <View key={`${item.id}-${answer.questionId}`} style={styles.answerRow}>
                    <Text style={styles.answerKey}>{answer.questionId}</Text>
                    <Text style={styles.answerValue}>{answer.answer}</Text>
                  </View>
                ))}
              </View>
            )}

            {approvalStatus === 'pending' && (
              <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.actionButton, styles.approveButton]} onPress={() => handleDecision(item, 'approve')}>
                  <Check size={16} color={theme.colors.success} />
                  <Text style={[styles.actionText, { color: theme.colors.success }]}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => handleDecision(item, 'reject')}>
                  <X size={16} color={theme.colors.error} />
                  <Text style={[styles.actionText, { color: theme.colors.error }]}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
                </>
              );
            })()}
          </NeonCard>
        )}
        ListEmptyComponent={
          <EmptyState title="No Registrations Yet" message="Registrations for this event will appear here." />
        }
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.m,
    paddingBottom: theme.spacing.s,
  },
  backButton: {
    marginRight: theme.spacing.m,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  listContainer: {
    padding: theme.spacing.m,
    paddingBottom: theme.spacing.xxl,
    flexGrow: 1,
  },
  registrationCard: {
    marginBottom: theme.spacing.m,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.s,
  },
  registrationId: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.s,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 4,
  },
  statusText: {
    ...theme.typography.small,
    fontWeight: '700',
  },
  metaText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  answersSection: {
    marginTop: theme.spacing.s,
    paddingTop: theme.spacing.s,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  answersTitle: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  answerRow: {
    marginBottom: theme.spacing.xs,
  },
  answerKey: {
    ...theme.typography.small,
    color: theme.colors.primaryLight,
  },
  answerValue: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.s,
    marginTop: theme.spacing.m,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.m,
    paddingVertical: theme.spacing.s,
    borderWidth: 1,
  },
  approveButton: {
    borderColor: theme.colors.success,
    backgroundColor: `${theme.colors.success}1A`,
  },
  rejectButton: {
    borderColor: theme.colors.error,
    backgroundColor: `${theme.colors.error}1A`,
  },
  actionText: {
    ...theme.typography.button,
    marginLeft: theme.spacing.xs,
  },
});
