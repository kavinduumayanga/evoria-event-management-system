import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Search, MapPin, Compass } from 'lucide-react-native';
import { AttendeeHomeStackParamList } from '../../types/navigation';
import { Event } from '../../types';
import { ScreenContainer, EventCard, LoadingState, EmptyState, ErrorState, Input, CategoryChip } from '../../components';
import { theme } from '../../constants/theme';
import { EventService } from '../../api/services';
import { resolveImageUrl } from '../../utils/imageUrl';

type Nav = NativeStackNavigationProp<AttendeeHomeStackParamList, 'EventList'>;
interface Props { navigation: Nav; }

const { width } = Dimensions.get('window');
const CITY_W = width * 0.4;

const CATEGORIES = [
  { emoji: '💻', label: 'Tech' },
  { emoji: '🤖', label: 'AI' },
  { emoji: '🌍', label: 'Climate' },
  { emoji: '💪', label: 'Fitness' },
  { emoji: '🍔', label: 'Food & Drink' },
  { emoji: '🎨', label: 'Arts & Culture' },
  { emoji: '🧘', label: 'Wellness' },
  { emoji: '🎵', label: 'Music' },
  { emoji: '📚', label: 'Education' },
];

export const EventListScreen: React.FC<Props> = ({ navigation }) => {
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 400); return () => clearTimeout(t); }, [searchQuery]);

  const fetchEvents = useCallback(async () => {
    try {
      setError(null);
      const [searchRes, trendingRes] = await Promise.all([
        EventService.searchEvents({ q: debouncedSearch || undefined, category: activeCategory || undefined }),
        EventService.getTrendingEvents(6),
      ]);
      setAllEvents(searchRes.data.events || []);
      setFeaturedEvents(trendingRes.data.events || []);
    } catch { setError('Failed to load events'); }
    finally { setIsLoading(false); setIsRefreshing(false); }
  }, [debouncedSearch, activeCategory]);

  useFocusEffect(useCallback(() => { fetchEvents(); }, [fetchEvents]));
  const onRefresh = useCallback(() => { setIsRefreshing(true); fetchEvents(); }, [fetchEvents]);
  const navToEvent = (e: Event) => navigation.navigate('EventDetails', { eventId: e.id, publicSlug: e.publicSlug });

  // Extract unique cities
  const cities = React.useMemo(() => {
    const m = new Map<string, Event>();
    [...featuredEvents, ...allEvents].forEach(e => { if (e.city && !m.has(e.city)) m.set(e.city, e); });
    return Array.from(m.entries()).slice(0, 6);
  }, [featuredEvents, allEvents]);

  const isSearching = debouncedSearch.length > 0 || activeCategory !== null;

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchEvents} /></ScreenContainer>;

  return (
    <ScreenContainer>
      <FlatList
        data={allEvents}
        keyExtractor={(i) => i.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={st.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        ListHeaderComponent={
          <>
            {/* ── PAGE HEADER (Luma ref: avatar + Discover + icons) ── */}
            <View style={st.pageHdr}>
              <View style={st.avatar}>
                <Text style={st.avatarTxt}>E</Text>
              </View>
              <Text style={st.pageTitle}>Discover</Text>
              <View style={st.hdrIcons}>
                <TouchableOpacity style={st.hdrIcon}><MapPin size={20} color={theme.colors.text} /></TouchableOpacity>
                <TouchableOpacity style={st.hdrIcon}><Search size={20} color={theme.colors.text} /></TouchableOpacity>
              </View>
            </View>

            {/* ── SEARCH ── */}
            <View style={st.searchWrap}>
              <Input placeholder="Search events..." value={searchQuery} onChangeText={setSearchQuery} leftIcon={<Search size={18} color={theme.colors.textMuted} />} containerStyle={st.searchBox} />
            </View>

            {/* ── BROWSE BY CATEGORY (Luma ref: horizontal chips) ── */}
            <Text style={st.sectionTitle}>Browse by Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chipRow} style={st.chipScroll}>
              {CATEGORIES.map((c) => (
                <CategoryChip key={c.label} emoji={c.emoji} label={c.label} isActive={activeCategory === c.label} onPress={() => setActiveCategory(activeCategory === c.label ? null : c.label)} />
              ))}
            </ScrollView>

            {/* ── CITIES (Luma ref: "Cities >" + horizontal image cards) ── */}
            {!isSearching && cities.length > 0 && (
              <>
                <View style={st.citiesHdr}>
                  <Text style={st.sectionTitle}>Cities</Text>
                  <Text style={st.chevron}>›</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.citiesRow}>
                  {cities.map(([name, ev]) => {
                    const img = resolveImageUrl(ev.coverImage);
                    return (
                      <TouchableOpacity key={name} style={st.cityCard} onPress={() => navToEvent(ev)} activeOpacity={0.8}>
                        {img ? <Image source={{ uri: img }} style={st.cityImg} /> : <View style={[st.cityImg, st.cityImgEmpty]}><MapPin size={24} color={theme.colors.textMuted} /></View>}
                        <View style={st.cityOverlay}><Text style={st.cityName}>{name}</Text></View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {/* ── FEATURED CALENDARS (Luma ref: list with square avatars) ── */}
            {!isSearching && featuredEvents.length > 0 && (
              <>
                <Text style={[st.sectionTitle, { marginTop: 24 }]}>Featured Events</Text>
                {featuredEvents.slice(0, 5).map((ev) => (
                  <TouchableOpacity key={ev.id} style={st.calItem} onPress={() => navToEvent(ev)} activeOpacity={0.7}>
                    <View style={st.calAvatar}>
                      {resolveImageUrl(ev.coverImage) ? (
                        <Image source={{ uri: resolveImageUrl(ev.coverImage)! }} style={st.calAvatarImg} />
                      ) : (
                        <Text style={st.calAvatarTxt}>{ev.title.charAt(0)}</Text>
                      )}
                    </View>
                    <View style={st.calInfo}>
                      <Text style={st.calTitle} numberOfLines={1}>{ev.title}</Text>
                      <Text style={st.calDesc} numberOfLines={2}>{ev.description}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            <Text style={[st.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>{isSearching ? 'Results' : 'All Events'}</Text>
          </>
        }
        renderItem={({ item }) => <EventCard event={item} variant="list" onPress={() => navToEvent(item)} />}
        ListEmptyComponent={<EmptyState icon={<Compass size={48} color={theme.colors.textMuted} />} title={isSearching ? 'No results' : 'No events yet'} message="Check back soon" />}
      />
    </ScreenContainer>
  );
};

const st = StyleSheet.create({
  listContent: { paddingHorizontal: 16, paddingBottom: 100, flexGrow: 1 },

  // Page header — exact Luma match
  pageHdr: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, marginBottom: 20, gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(139,92,246,0.15)', borderWidth: 1.5, borderColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
  pageTitle: { fontSize: 26, fontWeight: '700', color: '#F5F5F0', flex: 1 },
  hdrIcons: { flexDirection: 'row', gap: 6 },
  hdrIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

  // Search
  searchWrap: { marginBottom: 20 },
  searchBox: { marginBottom: 0 },

  // Sections
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#F5F5F0', marginBottom: 12 },

  // Category chips
  chipScroll: { marginBottom: 24 },
  chipRow: { gap: 8 },

  // Cities
  citiesHdr: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  chevron: { fontSize: 22, color: theme.colors.textSecondary },
  citiesRow: { gap: 12, marginBottom: 24 },
  cityCard: { width: CITY_W, height: CITY_W * 1.15, borderRadius: 16, overflow: 'hidden', backgroundColor: '#1C1A17' },
  cityImg: { width: '100%', height: '100%' },
  cityImgEmpty: { backgroundColor: '#262320', justifyContent: 'center', alignItems: 'center' },
  cityOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: 12, backgroundColor: 'rgba(0,0,0,0.3)' },
  cityName: { fontSize: 16, fontWeight: '600', color: '#fff', textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },

  // Featured calendars — exact Luma list style
  calItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 14 },
  calAvatar: { width: 46, height: 46, borderRadius: 10, backgroundColor: '#262320', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  calAvatarImg: { width: 46, height: 46, borderRadius: 10 },
  calAvatarTxt: { fontSize: 18, fontWeight: '700', color: theme.colors.primary },
  calInfo: { flex: 1, gap: 2 },
  calTitle: { fontSize: 15, fontWeight: '600', color: '#F5F5F0' },
  calDesc: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },
});
