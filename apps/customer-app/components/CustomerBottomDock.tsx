import React, { memo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type TripType = 'ONEWAY' | 'ROUND' | 'LOCAL' | 'AIRPORT';

interface CustomerBottomDockProps {
  activeType: TripType;
  onSelectType: (type: TripType) => void;
}

const TABS = [
  { id: 'ONEWAY' as const, label: 'ONE WAY', icon: 'git-commit-outline' as const },
  { id: 'ROUND' as const, label: 'ROUND TRIP', icon: 'refresh-outline' as const },
  { id: 'LOCAL' as const, label: 'LOCAL', icon: 'time-outline' as const },
  { id: 'AIRPORT' as const, label: 'AIRPORT', icon: 'airplane-outline' as const },
];

export const CustomerBottomDock = memo(function CustomerBottomDock({
  activeType,
  onSelectType,
}: CustomerBottomDockProps) {
  return (
    <View style={styles.container}>
      <View style={styles.dock}>
        {TABS.map((tab) => {
          const isActive = activeType === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.dockTab, isActive && styles.dockTabActive]}
              onPress={() => onSelectType(tab.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tab.icon}
                size={19}
                color={isActive ? '#ea580c' : '#64748b'}
              />
              <Text style={[styles.dockTabLabel, isActive && styles.dockTabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingBottom: 8,
    paddingTop: 6,
    paddingHorizontal: 12,
  },
  dock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dockTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 12,
  },
  dockTabActive: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  dockTabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 3,
  },
  dockTabLabelActive: {
    color: '#ea580c',
    fontWeight: '900',
  },
});
