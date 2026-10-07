import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
  Alert,
  Image,
  ImageBackground,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  RefreshControl,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthModal } from '../components/AuthModal';
import { CustomerBottomDock } from '../components/CustomerBottomDock';
import { customerApiClient, customerTokenStorage, getDynamicBaseUrl } from '../lib/api';
import { safeNavigate } from '../lib/safeNav';

const { width, height } = Dimensions.get('window');
const isSmallScreen = height < 700;
const isMediumScreen = height >= 700 && height < 820;

const BANNER_WIDTH = width - 28;
const BANNER_HEIGHT = isSmallScreen ? 150 : isMediumScreen ? 180 : 205;
const FLEET_CARD_WIDTH = Math.min(width * 0.84, 340);
const FLEET_CARD_GAP = 12;
const FLEET_SNAP_INTERVAL = FLEET_CARD_WIDTH + FLEET_CARD_GAP;
const FLEET_IMAGE_HEIGHT = isSmallScreen ? 120 : isMediumScreen ? 140 : 155;

interface ServiceCategory {
  id: string;
  title: string;
  iconName: keyof typeof Ionicons.glyphMap;
  category: 'ONEWAY' | 'ROUND' | 'AIRPORT' | 'LOCAL' | 'CORPORATE' | 'TOUR';
}

const SERVICE_CATEGORIES: ServiceCategory[] = [
  { id: 'ONEWAY', title: 'One-Way Drop', iconName: 'car-sport', category: 'ONEWAY' },
  { id: 'ROUND', title: 'Round Trip', iconName: 'repeat', category: 'ROUND' },
  { id: 'AIRPORT', title: 'Airport Transfer', iconName: 'airplane', category: 'AIRPORT' },
  { id: 'LOCAL', title: 'Local Rental', iconName: 'time', category: 'LOCAL' },
  { id: 'CORPORATE', title: 'Corporate Travel', iconName: 'briefcase', category: 'CORPORATE' },
  { id: 'TOUR', title: 'Tour & Pilgrimage', iconName: 'business', category: 'TOUR' },
];

interface CarouselItem {
  id: string;
  badge?: string;
  tagline?: string;
  subTagline?: string;
  image: any;
  btnText: string;
  category?: 'ONEWAY' | 'ROUND' | 'AIRPORT' | 'LOCAL' | 'CORPORATE' | 'TOUR';
  bannerType?: 'APP_BANNER' | 'PROMO_GRAPHIC';
  showTextOverlay?: boolean;
  showCtaButton?: boolean;
  linkUrl?: string;
}

const CAROUSEL_DATA: CarouselItem[] = [
  {
    id: '1',
    badge: 'INTERCITY CABS',
    tagline: 'Safe • Reliable • Transparent',
    subTagline: 'ಕನ್ನಡ ನಾಡಿನ ನಂಬಿಕಸ್ಥ ಕ್ಯಾಬ್ ಸೇವೆ',
    image: require('../assets/images/banner-coastal-highway.jpg'),
    btnText: 'Book Outstation',
  },
  {
    id: '2',
    badge: 'AIRPORT TRANSFERS',
    tagline: 'Mangaluru & Bengaluru Airports',
    subTagline: 'Zero Surge • 24/7 Guaranteed Pickup',
    image: require('../assets/images/banner-airport.jpg'),
    btnText: 'Book Airport Cab',
  },
  {
    id: '3',
    badge: 'PILGRIMAGE & TOURS',
    tagline: 'Coastal Karnataka Temple Tours',
    subTagline: 'Dharmasthala • Udupi • Murudeshwar',
    image: require('../assets/images/banner-pilgrimage.jpg'),
    btnText: 'Explore Tours',
  },
];

const LOCAL_BANNER_ASSETS: Record<string, any> = {
  '/images/banner-coastal-highway.jpg': require('../assets/images/banner-coastal-highway.jpg'),
  '/images/banner-airport.jpg': require('../assets/images/banner-airport.jpg'),
  '/images/banner-pilgrimage.jpg': require('../assets/images/banner-pilgrimage.jpg'),
  'banner-coastal-highway.jpg': require('../assets/images/banner-coastal-highway.jpg'),
  'banner-airport.jpg': require('../assets/images/banner-airport.jpg'),
  'banner-pilgrimage.jpg': require('../assets/images/banner-pilgrimage.jpg'),
  'banner-1': require('../assets/images/banner-coastal-highway.jpg'),
  'banner-2': require('../assets/images/banner-airport.jpg'),
  'banner-3': require('../assets/images/banner-pilgrimage.jpg'),
  '1': require('../assets/images/banner-coastal-highway.jpg'),
  '2': require('../assets/images/banner-airport.jpg'),
  '3': require('../assets/images/banner-pilgrimage.jpg'),
};

function resolveBannerImage(image: any, fallbackId?: string): any {
  // 1. If it's a number (React Native bundled require asset), return immediately
  if (typeof image === 'number') {
    return image;
  }

  // 2. Extract string if wrapped in { uri: ... }
  let str = '';
  if (typeof image === 'string') {
    str = image;
  } else if (typeof image === 'object' && image?.uri) {
    str = image.uri;
  }

  if (str) {
    const cleaned = str.toLowerCase().trim();

    // Check pre-bundled local asset dictionary
    if (LOCAL_BANNER_ASSETS[str]) return LOCAL_BANNER_ASSETS[str];
    if (LOCAL_BANNER_ASSETS[cleaned]) return LOCAL_BANNER_ASSETS[cleaned];

    if (cleaned.includes('highway') || cleaned.includes('coastal') || cleaned.includes('intercity')) {
      return LOCAL_BANNER_ASSETS['banner-coastal-highway.jpg'];
    }
    if (cleaned.includes('airport') || cleaned.includes('mangaluru') || cleaned.includes('bengaluru')) {
      return LOCAL_BANNER_ASSETS['banner-airport.jpg'];
    }
    if (cleaned.includes('pilgrim') || cleaned.includes('temple') || cleaned.includes('dharmasthala')) {
      return LOCAL_BANNER_ASSETS['banner-pilgrimage.jpg'];
    }

    // Base64 upload from Admin
    if (str.startsWith('data:image/')) {
      return { uri: str };
    }

    // Full remote public URL
    if (str.startsWith('http://') || str.startsWith('https://')) {
      // If localhost was passed on mobile, rewrite localhost to LAN IP host
      if (str.includes('localhost') || str.includes('127.0.0.1')) {
        const baseUrl = getDynamicBaseUrl().replace(/\/+$/, '');
        const pathPart = str.replace(/^https?:\/\/[^/]+/, '');
        return { uri: `${baseUrl}${pathPart}` };
      }
      return { uri: str };
    }

    // Relative path like /images/foo.jpg
    if (str.startsWith('/')) {
      const baseUrl = getDynamicBaseUrl().replace(/\/+$/, '');
      return { uri: `${baseUrl}${str}` };
    }

    return { uri: str };
  }

  // 3. Fallback based on fallbackId
  if (fallbackId && LOCAL_BANNER_ASSETS[fallbackId]) {
    return LOCAL_BANNER_ASSETS[fallbackId];
  }

  return require('../assets/images/banner-pilgrimage.jpg');
}

interface VehicleFleetItem {
  id: string;
  name: string;
  models: string;
  pax: string;
  bags: string;
  pricePerKm: string;
  image: any;
}

const VEHICLE_FLEET: VehicleFleetItem[] = [
  {
    id: 'sedan',
    name: 'Sedan',
    models: 'Toyota Etios / Dzire',
    pax: '4 Pax',
    bags: '2 Bags',
    pricePerKm: 'From ₹12/km',
    image: require('../assets/images/vehicle-sedan.jpg'),
  },
  {
    id: 'prem-sedan',
    name: 'Premium Sedan',
    models: 'Corolla / Honda City',
    pax: '4 Pax',
    bags: '3 Bags',
    pricePerKm: 'From ₹15/km',
    image: require('../assets/images/vehicle-premium-sedan.jpg'),
  },
  {
    id: 'suv',
    name: 'SUV',
    models: 'Toyota Innova Crysta',
    pax: '6 Pax',
    bags: '4 Bags',
    pricePerKm: 'From ₹18/km',
    image: require('../assets/images/vehicle-suv.jpg'),
  },
  {
    id: 'prem-suv',
    name: 'Premium SUV',
    models: 'Innova Hycross Hybrid',
    pax: '7 Pax',
    bags: '5 Bags',
    pricePerKm: 'From ₹22/km',
    image: require('../assets/images/vehicle-premium-suv.jpg'),
  },
  {
    id: '6-seater',
    name: '6-Seater MPV',
    models: 'Maruti Suzuki Ertiga',
    pax: '6 Pax',
    bags: '3 Bags',
    pricePerKm: 'From ₹16/km',
    image: require('../assets/images/vehicle-6-seater.jpg'),
  },
  {
    id: '7-seater',
    name: '7-Seater MPV',
    models: 'Kia Carens Luxury',
    pax: '7 Pax',
    bags: '4 Bags',
    pricePerKm: 'From ₹19/km',
    image: require('../assets/images/vehicle-7-seater.jpg'),
  },
  {
    id: 'tempo',
    name: 'Tempo Traveller',
    models: 'Force 12/17 Seater AC',
    pax: '12+ Pax',
    bags: '10 Bags',
    pricePerKm: 'From ₹26/km',
    image: require('../assets/images/vehicle-tempo-traveller.jpg'),
  },
  {
    id: 'urbania',
    name: 'Force Urbania',
    models: 'Urbania Luxury (10/13/17 Seater)',
    pax: '10-17 Pax',
    bags: '10 Bags',
    pricePerKm: 'From ₹32/km',
    image: require('../assets/images/vehicle-urbania.jpg'),
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  const [carouselList, setCarouselList] = useState<CarouselItem[]>(CAROUSEL_DATA);
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const carouselRef = useRef<FlatList>(null);

  const fleetRef = useRef<FlatList>(null);
  const isFleetInteractingRef = useRef(false);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(customerTokenStorage.getUser());
  const [userName, setUserName] = useState<string>(customerTokenStorage.getUser()?.fullName || '');
  const [userPhone, setUserPhone] = useState<string>(customerTokenStorage.getUser()?.phone || '');

  const [refreshing, setRefreshing] = useState(false);

  // Load dynamic promotional banners from Admin / Backend
  const loadDynamicBanners = useCallback(async () => {
    try {
      let bannersData: any[] = [];
      const endpoints = [
        () => customerApiClient.fetch('/api/banners'),
        () => fetch(`${getDynamicBaseUrl().replace(/\/+$/, '')}/api/banners`).then((r) => r.json()),
        () => fetch('http://10.73.0.146:3000/api/banners').then((r) => r.json()),
        () => fetch('http://localhost:3000/api/banners').then((r) => r.json()),
        () => fetch('http://10.0.2.2:3000/api/banners').then((r) => r.json()),
      ];

      for (const fn of endpoints) {
        try {
          const res = await fn();
          if (res && Array.isArray(res.banners) && res.banners.length > 0) {
            bannersData = res.banners;
            break;
          }
        } catch {
          // try next candidate
        }
      }

      if (bannersData.length > 0) {
        const active = bannersData
          .filter((b: any) => b.isActive)
          .map((b: any) => ({
            id: b.id,
            badge: b.badge || '',
            tagline: b.tagline || '',
            subTagline: b.subTagline || '',
            image: b.image,
            btnText: b.btnText || '',
            category: b.category,
            bannerType: b.bannerType || (b.tagline ? 'APP_BANNER' : 'PROMO_GRAPHIC'),
            showTextOverlay:
              b.showTextOverlay !== undefined
                ? b.showTextOverlay
                : b.bannerType !== 'PROMO_GRAPHIC' && Boolean(b.tagline),
            showCtaButton:
              b.showCtaButton !== undefined
                ? b.showCtaButton
                : Boolean(b.btnText && b.btnText.trim()),
            linkUrl: (b.linkUrl || '').trim(),
          }));

        if (active.length > 0) {
          setCarouselList(active);
        }
      }
    } catch {
      // Fallback to default CAROUSEL_DATA
    }
  }, []);

  useEffect(() => {
    loadDynamicBanners();
    const interval = setInterval(loadDynamicBanners, 8000);
    return () => clearInterval(interval);
  }, [loadDynamicBanners]);

  useFocusEffect(
    useCallback(() => {
      loadDynamicBanners();
    }, [loadDynamicBanners])
  );

  // Dynamic greeting based on time of day
  const greeting = (() => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good Morning';
    if (hours < 17) return 'Good Afternoon';
    return 'Good Evening';
  })();

  // Sync auth state & load user profile
  const syncAuth = useCallback(async () => {
    const cached = customerTokenStorage.getUser();
    if (cached) {
      setCurrentUser(cached);
      setUserName(cached.fullName || 'Valued Customer');
      setUserPhone(cached.phone || '');
    }

    const token = customerTokenStorage.getToken();
    if (token) {
      try {
        const res = await customerApiClient.fetch('/api/auth/me');
        const cleanName = (res.user.fullName === 'Kandy Customer' ? '' : (res.user.fullName || '')).trim();
        customerTokenStorage.setUser({ ...res.user, fullName: cleanName });
        setCurrentUser({ ...res.user, fullName: cleanName });
        setUserName(cleanName);
        setUserPhone(res.user.phone || '');
      } catch {
        // ignore network error
      }
    } else if (!cached) {
      setCurrentUser(null);
      setUserName('');
      setUserPhone('');
    }
  }, []);

  useEffect(() => {
    syncAuth();
    const unsub = customerTokenStorage.subscribe(() => {
      const u = customerTokenStorage.getUser();
      setCurrentUser(u);
      setUserName(u?.fullName || '');
      setUserPhone(u?.phone || '');
    });
    return () => unsub();
  }, [syncAuth]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadDynamicBanners(), syncAuth()]);
    setRefreshing(false);
  }, [loadDynamicBanners, syncAuth]);

  // Auto-scroll Top Banner Carousel
  useEffect(() => {
    if (carouselList.length === 0) return;
    const timer = setInterval(() => {
      setActiveCarouselIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % carouselList.length;
        carouselRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        return nextIndex;
      });
    }, 4500);

    return () => clearInterval(timer);
  }, [carouselList.length]);

  // Auto-scroll Vehicle Fleet Carousel (Smooth 3s interval)
  useEffect(() => {
    let currentIdx = 0;
    const fleetTimer = setInterval(() => {
      if (!isFleetInteractingRef.current) {
        currentIdx = (currentIdx + 1) % VEHICLE_FLEET.length;
        fleetRef.current?.scrollToOffset({
          offset: currentIdx * FLEET_SNAP_INTERVAL,
          animated: true,
        });
      }
    }, 3000);

    return () => clearInterval(fleetTimer);
  }, []);

  const handleCarouselScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / BANNER_WIDTH);
    if (index >= 0 && index < carouselList.length) {
      setActiveCarouselIndex(index);
    }
  };

  const handleSelectCategory = (cat: ServiceCategory) => {
    safeNavigate(() => {
      router.push({
        pathname: '/select-trip-type',
        params: {
          selected: cat.id,
          tripType: cat.id,
        },
      });
    });
  };

  const handleBookVehicle = () => {
    safeNavigate(() => {
      router.push('/select-trip-type');
    });
  };

  const handleNotificationPress = () => {
    Alert.alert(
      'Kandy Cabs Notifications',
      '🎉 Welcome to Kandy Cabs! Book your outstation and airport rides with transparent pricing and top-rated chauffeurs.'
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: topInset }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Header */}
      <View style={styles.header}>
        {/* Left: Brand Logo */}
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />

        {/* Center: Greeting & User Name */}
        <TouchableOpacity
          style={styles.greetingContainer}
          activeOpacity={0.7}
          onPress={() => {
            safeNavigate(() => {
              if (userName || currentUser) {
                router.push('/profile');
              } else {
                setIsAuthModalOpen(true);
              }
            });
          }}
        >
          {userName ? (
            <>
              <Text style={styles.greetingSubtext}>{greeting}</Text>
              <Text style={styles.greetingName} numberOfLines={1}>
                {userName}
              </Text>
            </>
          ) : (
            <Text style={styles.greetingOnlyText}>{greeting}</Text>
          )}
        </TouchableOpacity>

        {/* Right: Notification Bell */}
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={handleNotificationPress}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications" size={20} color="#0f172a" />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.mainContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#ea580c']}
            tintColor="#ea580c"
          />
        }
      >
        {/* 1. Hero Promotional Banner Carousel */}
        <View style={styles.bannerSection}>
          <FlatList
            ref={carouselRef}
            data={carouselList}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleCarouselScroll}
            scrollEventThrottle={16}
            renderItem={({ item }) => {
              const isPosterMode = item.showTextOverlay === false;
              const shouldShowCta = item.showCtaButton !== false && Boolean(item.btnText && item.btnText.trim());

              const handleBannerPress = () => {
                if (item.linkUrl && item.linkUrl.trim()) {
                  let url = item.linkUrl.trim();
                  if (!/^https?:\/\//i.test(url) && !/^(tel|mailto|whatsapp):/i.test(url)) {
                    url = 'https://' + url;
                  }
                  Linking.openURL(url).catch((err) => {
                    console.error('Failed to open banner link URL:', err);
                    Alert.alert('Unable to open link', url);
                  });
                  return;
                }

                safeNavigate(() => {
                  if (item.category) {
                    router.push({
                      pathname: '/select-trip-type',
                      params: {
                        selected: item.category,
                        tripType: item.category,
                      },
                    });
                  } else {
                    router.push('/select-trip-type');
                  }
                });
              };

              return (
                <TouchableOpacity
                  style={styles.bannerCard}
                  activeOpacity={0.9}
                  onPress={handleBannerPress}
                >
                  <ImageBackground
                    source={resolveBannerImage(item.image, item.id)}
                    style={styles.bannerBackground}
                    imageStyle={styles.bannerImageStyle}
                    resizeMode="cover"
                  >
                    {isPosterMode ? (
                      /* Promotional Poster Mode: Clean artwork with optional floating CTA button */
                      shouldShowCta ? (
                        <View style={styles.posterCtaContainer}>
                          <View style={styles.bannerCtaBtn}>
                            <Text style={styles.bannerCtaText}>{item.btnText}</Text>
                          </View>
                        </View>
                      ) : null
                    ) : (
                      /* App Dynamic Banner: Headline, subtitle, badge and dark overlay */
                      <View style={styles.bannerOverlay}>
                        <View style={styles.bannerTextGroup}>
                          {item.badge ? (
                            <View style={styles.bannerTopBadge}>
                              <Text style={styles.bannerBadgeText}>{item.badge}</Text>
                            </View>
                          ) : null}
                          {item.tagline ? (
                            <Text style={styles.bannerTagline} numberOfLines={1}>{item.tagline}</Text>
                          ) : null}
                          {item.subTagline ? (
                            <Text style={styles.bannerSubTagline} numberOfLines={1}>{item.subTagline}</Text>
                          ) : null}
                        </View>
                        {shouldShowCta ? (
                          <View style={styles.bannerCtaRow}>
                            <View style={styles.bannerCtaBtn}>
                              <Text style={styles.bannerCtaText}>{item.btnText}</Text>
                            </View>
                          </View>
                        ) : null}
                      </View>
                    )}
                  </ImageBackground>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* 2. 6 Service Booking Options (2 Rows x 3 Columns) */}
        <View style={styles.servicesSection}>
          <View style={styles.servicesGrid}>
            {SERVICE_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.serviceCard}
                onPress={() => handleSelectCategory(cat)}
                activeOpacity={0.75}
              >
                <View style={styles.serviceIconCircle}>
                  <Ionicons name={cat.iconName} size={26} color="#ea580c" />
                </View>
                <Text style={styles.serviceCardTitle} numberOfLines={1}>
                  {cat.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 3. "CHOOSE YOUR RIDE" Auto-Sliding Fleet Carousel */}
        <View style={styles.fleetSection}>
          <View style={styles.fleetHeaderRow}>
            <Text style={styles.fleetSectionTitle}>Choose Your Ride</Text>
            <Text style={styles.fleetSectionSubtitle}>Clean, sanitized & well-maintained fleet</Text>
          </View>

          <FlatList
            ref={fleetRef}
            data={VEHICLE_FLEET}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={FLEET_SNAP_INTERVAL}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={styles.fleetListContent}
            scrollEventThrottle={16}
            onScrollBeginDrag={() => {
              isFleetInteractingRef.current = true;
            }}
            onScrollEndDrag={() => {
              setTimeout(() => {
                isFleetInteractingRef.current = false;
              }, 2500);
            }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.fleetCard}
                activeOpacity={0.85}
                onPress={handleBookVehicle}
              >
                {/* Vehicle Image with Capacity Badge */}
                <View style={styles.fleetImageContainer}>
                  <Image
                    source={item.image}
                    style={styles.fleetImage}
                    resizeMode="cover"
                  />
                  <View style={styles.fleetPaxBadge}>
                    <Ionicons name="people" size={11} color="#1e293b" style={{ marginRight: 3 }} />
                    <Text style={styles.fleetPaxText}>{item.pax}</Text>
                    <Text style={styles.fleetDotText}>•</Text>
                    <Ionicons name="bag-handle" size={11} color="#1e293b" style={{ marginRight: 3 }} />
                    <Text style={styles.fleetPaxText}>{item.bags}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* 4. Trust & Quality Strip (Bottom Last) */}
        <View style={styles.trustSection}>
          <View style={styles.trustItem}>
            <Ionicons name="shield-checkmark" size={18} color="#ea580c" />
            <Text style={styles.trustText}>Verified Chauffeurs</Text>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustItem}>
            <Ionicons name="pricetag" size={18} color="#ea580c" />
            <Text style={styles.trustText}>Transparent Fares</Text>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustItem}>
            <Ionicons name="headset" size={18} color="#ea580c" />
            <Text style={styles.trustText}>24/7 Live Support</Text>
          </View>
        </View>
      </ScrollView>

      {/* Persistent Bottom Navigation Dock */}
      <CustomerBottomDock
        activeTab="HOME"
        onPressProfile={() => {
          if (userName || currentUser) {
            router.push('/profile');
          } else {
            setIsAuthModalOpen(true);
          }
        }}
      />

      {/* Authentication Modal */}
      <AuthModal
        visible={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(userData) => {
          setIsAuthModalOpen(false);
          if (userData) {
            const cleanName = (userData.fullName === 'Kandy Customer' ? '' : (userData.fullName || '')).trim();
            setCurrentUser({ ...userData, fullName: cleanName });
            setUserName(cleanName);
            if (userData.phone) {
              setUserPhone(userData.phone);
            }
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLogo: {
    width: 102,
    height: 35,
  },
  greetingContainer: {
    flex: 1,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  greetingOnlyText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  greetingSubtext: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  greetingName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  notificationButton: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  notificationDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#ea580c',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  mainContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 72,
  },
  bannerSection: {
    marginTop: 8,
    alignItems: 'center',
  },
  bannerCard: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    marginHorizontal: 14,
    borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  bannerBackground: {
    width: '100%',
    height: '100%',
  },
  bannerImageStyle: {
    borderRadius: 18,
  },
  bannerOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingTop: 12,
    paddingLeft: 12,
    paddingRight: 8,
    paddingBottom: 8,
    justifyContent: 'space-between',
  },
  posterCtaContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 10,
  },
  bannerTextGroup: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 3,
    alignSelf: 'flex-start',
    maxWidth: '92%',
  },
  bannerTopBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ea580c',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    marginBottom: 3,
  },
  bannerBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  bannerTagline: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.1,
    lineHeight: 21,
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 4,
  },
  bannerSubTagline: {
    fontSize: 11.5,
    color: '#f8fafc',
    fontWeight: '600',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 4,
  },
  bannerCtaRow: {
    alignSelf: 'flex-end',
  },
  bannerCtaBtn: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  bannerCtaText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '700',
  },
  servicesSection: {
    paddingHorizontal: 14,
    marginTop: 10,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  serviceCard: {
    width: (width - 44) / 3,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: '#f1f5f9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  serviceIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  serviceCardTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    lineHeight: 14,
  },
  trustSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#fff7ed',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#fed7aa',
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  trustText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9a3412',
  },
  trustDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#fed7aa',
  },
  fleetSection: {
    marginTop: 16,
  },
  fleetHeaderRow: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  fleetSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  fleetSectionSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 1,
  },
  fleetListContent: {
    paddingHorizontal: 14,
    gap: FLEET_CARD_GAP,
  },
  fleetCard: {
    width: FLEET_CARD_WIDTH,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 5,
      },
      android: {
        elevation: 2.5,
      },
    }),
  },
  fleetImageContainer: {
    width: '100%',
    height: FLEET_IMAGE_HEIGHT,
    position: 'relative',
    backgroundColor: '#f8fafc',
  },
  fleetImage: {
    width: '100%',
    height: '100%',
  },
  fleetPaxBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
  },
  fleetPaxText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1e293b',
  },
  fleetDotText: {
    marginHorizontal: 4,
    fontSize: 9,
    color: '#94a3b8',
  },
});
