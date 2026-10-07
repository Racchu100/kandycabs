import React, { memo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { safeNavigate } from '../lib/safeNav';

interface CustomerBottomDockProps {
  activeTab?: 'HOME' | 'BOOKINGS' | 'SUPPORT' | 'PROFILE';
  onPressProfile?: () => void;
  onPressBookings?: () => void;
}

export const CustomerBottomDock = memo(function CustomerBottomDock({
  activeTab = 'HOME',
  onPressProfile,
  onPressBookings,
}: CustomerBottomDockProps) {
  const router = useRouter();

  const handleSupport = () => {
    Alert.alert(
      'Kandy Cabs Support',
      'Need help with your booking or have questions?',
      [
        {
          text: 'Call Us (+91 99004 47660)',
          onPress: () => Linking.openURL('tel:+919900447660'),
        },
        {
          text: 'WhatsApp Support',
          onPress: () =>
            Linking.openURL('https://wa.me/919900447660?text=Hello%20Kandy%20Cabs%2C%20I%20need%20assistance.'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleBookings = () => {
    safeNavigate(() => {
      if (onPressBookings) {
        onPressBookings();
      } else {
        router.push('/my-bookings');
      }
    });
  };

  const handleHome = () => {
    safeNavigate(() => {
      router.push('/');
    });
  };

  const handleProfile = () => {
    safeNavigate(() => {
      if (onPressProfile) {
        onPressProfile();
      } else {
        router.push('/profile');
      }
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.dock}>
        {/* Home Tab */}
        <TouchableOpacity
          style={styles.dockTab}
          onPress={handleHome}
          activeOpacity={0.7}
        >
          {activeTab === 'HOME' && <View style={styles.activeTopIndicator} />}
          <Ionicons
            name={activeTab === 'HOME' ? 'home' : 'home-outline'}
            size={22}
            color={activeTab === 'HOME' ? '#ea580c' : '#64748b'}
          />
          <Text style={[styles.dockTabLabel, activeTab === 'HOME' && styles.dockTabLabelActive]}>
            Home
          </Text>
        </TouchableOpacity>

        {/* My Bookings Tab */}
        <TouchableOpacity
          style={styles.dockTab}
          onPress={handleBookings}
          activeOpacity={0.7}
        >
          {activeTab === 'BOOKINGS' && <View style={styles.activeTopIndicator} />}
          <Ionicons
            name={activeTab === 'BOOKINGS' ? 'calendar' : 'calendar-outline'}
            size={22}
            color={activeTab === 'BOOKINGS' ? '#ea580c' : '#64748b'}
          />
          <Text style={[styles.dockTabLabel, activeTab === 'BOOKINGS' && styles.dockTabLabelActive]}>
            My Bookings
          </Text>
        </TouchableOpacity>

        {/* Support Tab */}
        <TouchableOpacity
          style={styles.dockTab}
          onPress={handleSupport}
          activeOpacity={0.7}
        >
          {activeTab === 'SUPPORT' && <View style={styles.activeTopIndicator} />}
          <Ionicons
            name="headset-outline"
            size={22}
            color={activeTab === 'SUPPORT' ? '#ea580c' : '#64748b'}
          />
          <Text style={[styles.dockTabLabel, activeTab === 'SUPPORT' && styles.dockTabLabelActive]}>
            Support
          </Text>
        </TouchableOpacity>

        {/* Profile Tab */}
        <TouchableOpacity
          style={styles.dockTab}
          onPress={handleProfile}
          activeOpacity={0.7}
        >
          {activeTab === 'PROFILE' && <View style={styles.activeTopIndicator} />}
          <Ionicons
            name={activeTab === 'PROFILE' ? 'person' : 'person-outline'}
            size={22}
            color={activeTab === 'PROFILE' ? '#ea580c' : '#64748b'}
          />
          <Text style={[styles.dockTabLabel, activeTab === 'PROFILE' && styles.dockTabLabelActive]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingBottom: 16,
    paddingTop: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
  },
  dock: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  dockTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  activeTopIndicator: {
    position: 'absolute',
    top: -8,
    width: 28,
    height: 3,
    backgroundColor: '#ea580c',
    borderRadius: 2,
  },
  dockTabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 4,
  },
  dockTabLabelActive: {
    color: '#ea580c',
    fontWeight: '700',
  },
});
