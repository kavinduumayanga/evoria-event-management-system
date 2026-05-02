import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { GlassCard } from './GlassCard';
import { AnimatedPressable } from './AnimatedPressable';
import { theme } from '../constants/theme';
import { Ticket, Calendar, MapPin } from 'lucide-react-native';
import { safeString, safeTitle, safeUpper } from '../utils/safeText';

interface TicketCardProps {
  eventName?: string;
  ticketType?: string;
  date?: string;
  location?: string;
  qrValue?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const TicketCard: React.FC<TicketCardProps> = ({ 
  eventName, ticketType, date, location, onPress, style 
}) => {
  const displayEventName = safeTitle(eventName, 'Untitled Event');
  const displayTicketType = safeUpper(ticketType, 'TICKET');
  const displayDate = safeString(date, 'Date unavailable');
  const displayLocation = safeString(location, 'Location not specified');

  const CardContent = (
    <GlassCard style={[styles.container, style]} variant="dark" animateEntrance>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ticket size={24} color={theme.colors.primaryLight} />
        </View>
        <View style={styles.ticketTypeContainer}>
          <Text style={styles.ticketTypeText}>{displayTicketType}</Text>
        </View>
      </View>

      <Text style={styles.eventName} numberOfLines={2}>{displayEventName}</Text>

      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Calendar size={14} color={theme.colors.secondary} />
          <Text style={styles.detailText}>{displayDate}</Text>
        </View>
        <View style={styles.detailRow}>
          <MapPin size={14} color={theme.colors.accent} />
          <Text style={styles.detailText}>{displayLocation}</Text>
        </View>
      </View>
      
      <View style={styles.ripLine}>
        <View style={styles.ripCircleLeft} />
        <View style={styles.ripCircleRight} />
        <View style={styles.dashedLine} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Tap to view QR code</Text>
      </View>
    </GlassCard>
  );

  if (onPress) {
    return <AnimatedPressable onPress={onPress} scaleTo={0.98}>{CardContent}</AnimatedPressable>;
  }
  return CardContent;
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.m,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.m,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketTypeContainer: {
    paddingHorizontal: theme.spacing.m,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.surfaceLight,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ticketTypeText: {
    ...theme.typography.small,
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  eventName: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.l,
  },
  detailsContainer: {
    gap: theme.spacing.s,
    marginBottom: theme.spacing.l,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginLeft: theme.spacing.s,
  },
  ripLine: {
    height: 20,
    marginHorizontal: -theme.spacing.m,
    position: 'relative',
    justifyContent: 'center',
  },
  dashedLine: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderStyle: 'dashed',
  },
  ripCircleLeft: {
    position: 'absolute',
    left: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.background,
  },
  ripCircleRight: {
    position: 'absolute',
    right: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.background,
  },
  footer: {
    marginTop: theme.spacing.s,
    alignItems: 'center',
  },
  footerText: {
    ...theme.typography.small,
    color: theme.colors.primaryLight,
  }
});
