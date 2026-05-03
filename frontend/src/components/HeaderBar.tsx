import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ViewStyle, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Share, Map, Search } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

interface HeaderBarProps {
  variant?: 'discover' | 'event' | 'back';
  title?: string;
  profileImageUrl?: string;
  style?: ViewStyle;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  transparent?: boolean;
  onSearchChange?: (text: string) => void;
  onShare?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  variant = 'back',
  title,
  profileImageUrl,
  style,
  onBack,
  rightAction,
  transparent = false,
  onSearchChange,
  onShare,
}) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [isSearchActive, setIsSearchActive] = useState(false);

  const handleBack = () => {
    if (onBack) onBack();
    else navigation.goBack();
  };

  return (
    <View style={[
      styles.container, 
      { paddingTop: Math.max(insets.top, 16) }, 
      transparent ? styles.transparent : styles.solid,
      style
    ]}>
      {variant === 'discover' ? (
        <>
          <View style={styles.leftSection}>
            <Image source={require('../../assets/icon.png')} style={styles.avatar} />
            {!isSearchActive && <Text style={styles.titleDiscover}>Discovery</Text>}
            {isSearchActive && onSearchChange && (
              <TextInput
                style={styles.searchInput}
                placeholder="Search events..."
                placeholderTextColor="#A3A3A3"
                autoFocus
                onChangeText={onSearchChange}
              />
            )}
          </View>
          <View style={styles.rightSection}>
            <TouchableOpacity style={styles.iconButton}>
              <Map color="#FFFFFF" size={20} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => setIsSearchActive(!isSearchActive)}>
              <Search color="#FFFFFF" size={20} />
            </TouchableOpacity>
          </View>
        </>
      ) : variant === 'event' ? (
        <>
          <TouchableOpacity style={styles.circleButton} onPress={handleBack}>
            <ChevronLeft color="#FFFFFF" size={24} />
          </TouchableOpacity>
          <View style={styles.flex1} />
          <TouchableOpacity style={styles.circleButton} onPress={onShare}>
            <Share color="#FFFFFF" size={20} />
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TouchableOpacity style={styles.circleButton} onPress={handleBack}>
            <ChevronLeft color="#FFFFFF" size={24} />
          </TouchableOpacity>
          {title && <Text style={styles.titleStandard}>{title}</Text>}
          <View style={styles.rightActionContainer}>
            {rightAction}
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    zIndex: 100,
  },
  transparent: {
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  solid: {
    backgroundColor: '#000000',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  placeholderAvatar: {
    backgroundColor: '#333',
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: 'rgba(30,30,30,0.8)',
    borderRadius: 20,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 16,
  },
  titleDiscover: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30,30,30,0.8)',
    borderRadius: 20,
    paddingHorizontal: 8,
    height: 40,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(30,30,30,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex1: {
    flex: 1,
  },
  titleStandard: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  rightActionContainer: {
    width: 40,
    alignItems: 'flex-end',
  },
});
