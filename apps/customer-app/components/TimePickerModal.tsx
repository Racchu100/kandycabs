import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (timeString: string) => void;
  currentTime?: string;
}

const TIME_SLOTS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m of ['00', '30']) {
    const hh = String(h).padStart(2, '0');
    TIME_SLOTS.push(`${hh}:${m}`);
  }
}

export function TimePickerModal({
  visible,
  onClose,
  onSelect,
  currentTime,
}: TimePickerModalProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Pickup Time</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#1e293b" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={TIME_SLOTS}
            numColumns={4}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const isSelected = currentTime === item;
              const [hourStr, minStr] = item.split(':');
              const hourNum = parseInt(hourStr, 10);
              const ampm = hourNum >= 12 ? 'PM' : 'AM';
              const displayHour = hourNum % 12 === 0 ? 12 : hourNum % 12;

              return (
                <TouchableOpacity
                  style={[styles.timeCard, isSelected && styles.timeCardActive]}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                >
                  <Text style={[styles.timeText, isSelected && styles.textActive]}>{item}</Text>
                  <Text style={[styles.ampmText, isSelected && styles.textActive]}>
                    {displayHour}:{minStr} {ampm}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  list: {
    padding: 12,
  },
  timeCard: {
    flex: 1,
    margin: 4,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeCardActive: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  ampmText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 2,
  },
  textActive: {
    color: '#ffffff',
  },
});
