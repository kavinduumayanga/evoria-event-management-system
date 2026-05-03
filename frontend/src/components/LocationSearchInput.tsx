import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { theme } from '../constants/theme';
import { MapPin, Search, X } from 'lucide-react-native';
import apiClient from '../api/client';

interface LocationResult {
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  city: string;
  country: string;
}

interface LocationSearchInputProps {
  label?: string;
  placeholder?: string;
  onSelect: (location: { name: string; address: string; lat: number; lng: number; city?: string; country?: string } | null) => void;
  initialValue?: string;
}

export const LocationSearchInput: React.FC<LocationSearchInputProps> = ({ label = 'Location', placeholder = 'Search location...', onSelect, initialValue = '' }) => {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedQuery, setSelectedQuery] = useState(initialValue);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!initialValue) return;
    setQuery((previous) => (previous.trim().length === 0 ? initialValue : previous));
    setSelectedQuery((previous) => (previous.trim().length === 0 ? initialValue : previous));
  }, [initialValue]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const searchLocation = async (text: string) => {
    setQuery(text);
    setErrorMsg(null);
    const trimmed = text.trim();

    if (selectedQuery && selectedQuery.trim() !== trimmed) {
      setSelectedQuery('');
      onSelect(null);
    }

    if (trimmed.length < 3) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      requestIdRef.current += 1;
      setIsLoading(false);
      setResults([]);
      setShowDropdown(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setIsLoading(true);
      try {
        const response = await apiClient.get('/locations/search', { params: { q: trimmed } });
        const rawResults = response?.data?.data;
        const data = Array.isArray(rawResults) ? rawResults : [];
        if (requestId !== requestIdRef.current) return;
        setResults(data);
        setShowDropdown(data.length > 0);
      } catch (error: any) {
        if (requestId !== requestIdRef.current) return;
        console.warn('Error fetching location:', error);
        setErrorMsg('Could not load location suggestions.');
        setResults([]);
        setShowDropdown(false);
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    }, 280);
  };

  const handleSelect = (item: LocationResult) => {
    const selectedName = (item.name || item.displayName.split(',')[0] || '').trim();
    const selectedAddress = (item.displayName || '').trim();

    setQuery(selectedName);
    setSelectedQuery(selectedName);
    setShowDropdown(false);
    onSelect({
      name: selectedName,
      address: selectedAddress,
      lat: item.latitude,
      lng: item.longitude,
      city: item.city || '',
      country: item.country || '',
    });
  };

  const clearInput = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    requestIdRef.current += 1;
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    setSelectedQuery('');
    setErrorMsg(null);
    setIsLoading(false);
    onSelect(null);
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputContainer}>
        <Search size={18} color={theme.colors.textMuted} style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          value={query}
          onChangeText={searchLocation}
          onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
        />
        {isLoading && <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loader} />}
        {query.length > 0 && !isLoading && (
          <TouchableOpacity onPress={clearInput} style={styles.clearBtn}>
            <X size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      {showDropdown && results.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={results}
            keyExtractor={(item, index) => item.name + index}
            nestedScrollEnabled
            style={{ maxHeight: 200 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.resultItem} onPress={() => handleSelect(item)}>
                <MapPin size={16} color={theme.colors.textMuted} />
                <View style={styles.resultTextContainer}>
                  <Text style={styles.resultNameText} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.resultAddressText} numberOfLines={1}>{item.displayName}</Text>
                  <Text style={styles.resultCoordsText}>
                    {Number.isFinite(item.latitude) && Number.isFinite(item.longitude)
                      ? `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`
                      : 'Coordinates unavailable'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.m,
    zIndex: 50,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.m,
    height: 52,
    paddingHorizontal: theme.spacing.m,
  },
  icon: {
    marginRight: theme.spacing.s,
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    ...theme.typography.body,
  },
  loader: {
    marginLeft: theme.spacing.s,
  },
  clearBtn: {
    padding: theme.spacing.s,
    marginLeft: theme.spacing.xs,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
    marginLeft: 4,
  },
  dropdown: {
    position: 'absolute',
    top: 76,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  resultTextContainer: {
    marginLeft: theme.spacing.s,
    flex: 1,
  },
  resultNameText: {
    color: theme.colors.text,
    ...theme.typography.bodyMedium,
  },
  resultAddressText: {
    color: theme.colors.textMuted,
    ...theme.typography.caption,
    marginTop: 2,
  },
  resultCoordsText: {
    color: theme.colors.primaryLight,
    fontSize: 10,
    marginTop: 2,
  },
});
