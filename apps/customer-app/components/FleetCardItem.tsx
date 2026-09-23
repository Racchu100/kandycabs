import React, { memo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FleetCardItemProps {
  item: {
    id: string;
    name: string;
    models: string;
    ratePerKm: number;
    badge: string;
    badgeColor: string;
    badgeBg: string;
    image: any;
    purpose: string;
    passengers: number;
    luggage: number;
    features: string[];
  };
  onBook: (item: any) => void;
}

export const FleetCardItem = memo(function FleetCardItem({
  item,
  onBook,
}: FleetCardItemProps) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={[styles.choiceBadge, { backgroundColor: item.badgeBg }]}>
          <Ionicons name="shield-checkmark" size={12} color={item.badgeColor} />
          <Text style={[styles.choiceBadgeText, { color: item.badgeColor }]}>
            {item.badge}
          </Text>
        </View>
        <View style={styles.rateContainer}>
          <Text style={styles.rateNumber}>₹{item.ratePerKm}/km</Text>
          <View style={styles.rateTag}>
            <Text style={styles.rateTagText}>BASE OUTSTATION RATE</Text>
          </View>
        </View>
      </View>

      <View style={styles.carImageContainer}>
        <Image
          source={item.image}
          style={styles.carImage}
          resizeMode="contain"
        />
      </View>

      <View style={styles.vehicleTitleRow}>
        <View style={styles.vehicleIconBox}>
          <Ionicons name="car-outline" size={20} color="#059669" />
        </View>
        <View style={styles.vehicleTitleTextContainer}>
          <Text style={styles.vehicleName}>{item.name}</Text>
          <Text style={styles.vehicleModels}>{item.models}</Text>
        </View>
      </View>

      <View style={styles.purposePill}>
        <Text style={styles.purposePillText}>{item.purpose}</Text>
      </View>

      <View style={styles.featureList}>
        {item.features.map((feature, idx) => (
          <View key={idx} style={styles.featureItem}>
            <Ionicons name="checkmark" size={16} color="#059669" />
            <Text style={styles.featureItemText}>{feature}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.bookCarBtn}
        onPress={() => onBook(item)}
        activeOpacity={0.85}
      >
        <Text style={styles.bookCarBtnText}>Book {item.name} →</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#a7f3d0',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  choiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  choiceBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  rateContainer: {
    alignItems: 'flex-end',
  },
  rateNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  rateTag: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  rateTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#065f46',
    letterSpacing: 0.4,
  },
  carImageContainer: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  carImage: {
    width: '100%',
    height: '100%',
  },
  vehicleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  vehicleIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleTitleTextContainer: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  vehicleModels: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 1,
  },
  purposePill: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  purposePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803d',
  },
  featureList: {
    gap: 6,
    marginBottom: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  bookCarBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookCarBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
