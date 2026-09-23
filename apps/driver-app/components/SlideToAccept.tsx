import React, { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  PanResponder,
  ActivityIndicator,
  Platform,
  Vibration,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SlideToAcceptProps {
  onAccept: () => void;
  isAccepting?: boolean;
  disabled?: boolean;
  title?: string;
  acceptingTitle?: string;
}

export function SlideToAccept({
  onAccept,
  isAccepting = false,
  disabled = false,
  title = 'SLIDE TO ACCEPT RIDE',
  acceptingTitle = 'ACCEPTING RIDE...',
}: SlideToAcceptProps) {
  const [trackWidth, setTrackWidth] = useState(300);
  const knobWidth = 50;
  const padding = 4;
  const maxSlide = Math.max(0, trackWidth - knobWidth - padding * 2);

  const pan = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const isAcceptedRef = useRef(false);

  // Chevron pulsing shimmer animation
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  // Reset slider if accepting finished or cancelled
  useEffect(() => {
    if (!isAccepting && isAcceptedRef.current) {
      isAcceptedRef.current = false;
      Animated.spring(pan, {
        toValue: 0,
        friction: 6,
        tension: 50,
        useNativeDriver: false,
      }).start();
    }
  }, [isAccepting, pan]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled && !isAccepting,
      onMoveShouldSetPanResponder: (_, gesture) =>
        !disabled && !isAccepting && Math.abs(gesture.dx) > 3,
      onPanResponderGrant: () => {
        pan.setOffset(0);
      },
      onPanResponderMove: (_, gesture) => {
        if (disabled || isAccepting || isAcceptedRef.current) return;
        const newX = Math.max(0, Math.min(gesture.dx, maxSlide));
        pan.setValue(newX);
      },
      onPanResponderRelease: (_, gesture) => {
        if (disabled || isAccepting || isAcceptedRef.current) return;
        const currentX = Math.max(0, gesture.dx);

        // Threshold: 65% of track width
        if (currentX >= maxSlide * 0.65) {
          isAcceptedRef.current = true;
          Animated.timing(pan, {
            toValue: maxSlide,
            duration: 120,
            useNativeDriver: false,
          }).start(() => {
            if (Platform.OS !== 'web') {
              try {
                Vibration.vibrate(40);
              } catch {}
            }
            onAccept();
          });
        } else {
          // Snap back to start
          Animated.spring(pan, {
            toValue: 0,
            friction: 7,
            tension: 60,
            useNativeDriver: false,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        if (!isAcceptedRef.current) {
          Animated.spring(pan, {
            toValue: 0,
            friction: 7,
            tension: 60,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // Fade out track text as the knob slides over it
  const textOpacity = pan.interpolate({
    inputRange: [0, Math.max(1, maxSlide * 0.6)],
    outputRange: [1, 0.05],
    extrapolate: 'clamp',
  });

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 8],
  });

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - trackWidth) > 2) {
          setTrackWidth(w);
        }
      }}
    >
      {/* Track Background */}
      <View style={[styles.track, isAccepting && styles.trackAccepting]}>
        {/* Animated Center Text & Chevrons */}
        <Animated.View style={[styles.textWrapper, { opacity: isAccepting ? 0.3 : textOpacity }]}>
          <Text style={styles.trackText}>{isAccepting ? acceptingTitle : title}</Text>
          {!isAccepting && (
            <Animated.View
              style={[
                styles.chevronsRow,
                { transform: [{ translateX: shimmerTranslate }] },
              ]}
            >
              <Ionicons name="chevron-forward" size={15} color="#ffffff" style={{ opacity: 0.5 }} />
              <Ionicons name="chevron-forward" size={15} color="#ffffff" style={{ opacity: 0.8, marginLeft: -6 }} />
              <Ionicons name="chevron-forward" size={15} color="#ffffff" style={{ marginLeft: -6 }} />
            </Animated.View>
          )}
        </Animated.View>

        {/* Sliding Knob (Incoming Call / Accept Slider Button) */}
        <Animated.View
          style={[
            styles.knob,
            {
              transform: [{ translateX: pan }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {isAccepting ? (
            <ActivityIndicator size="small" color="#059669" />
          ) : (
            <View style={styles.knobInner}>
              <Ionicons name="arrow-forward" size={24} color="#059669" />
            </View>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 4,
  },
  track: {
    height: 56,
    backgroundColor: '#059669', // Emerald Green Call Acceptance Background
    borderRadius: 28,
    padding: 3,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: '#34d399',
  },
  trackAccepting: {
    backgroundColor: '#047857',
    borderColor: '#059669',
  },
  textWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 40,
    gap: 6,
  },
  trackText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  chevronsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  knob: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  knobInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
