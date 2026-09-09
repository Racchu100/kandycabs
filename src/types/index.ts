export type TripMode = 'oneway' | 'round' | 'local' | 'airport';

export interface Vehicle {
  id: string;
  name: string;
  category: string;
  bodyType: 'sedan' | 'suv' | 'hatchback' | 'tempo' | 'luxury';
  seats: number;
  fuel: 'petrol' | 'diesel' | 'ev';
  baseRatePerKm: number;
  driverAllowancePerDay: number;
  ac: boolean;
  luggageCount: number;
  availableNow: boolean;
  rating: number;
  reviewsCount: number;
  imageSvg: string;
  features: string[];
}

export interface RouteFare {
  id: string;
  origin: string;
  destination: string;
  distanceKm: number;
  sedanFare: number;
  suvFare: number;
  tempoFare: number;
  popular: boolean;
}

export interface Package {
  id: string;
  title: string;
  duration: string;
  highlights: string;
  startingPrice: number;
  recommendedVehicle: string;
  imageUrl?: string;
}

export interface Review {
  id: string;
  author: string;
  location: string;
  rating: number;
  comment: string;
  date: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}
