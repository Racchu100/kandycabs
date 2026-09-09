import { Vehicle, RouteFare, Package, Review, FAQItem } from '@/types';

export interface DetailedVehicle extends Vehicle {
  description: string;
  luggageCapacityText: string;
  idealFor: string;
  specifications: {
    engine: string;
    transmission: string;
    bootSpace: string;
    fuelType: string;
    safetyRating: string;
  };
}

export interface DetailedPackage extends Package {
  description: string;
  itinerary: {
    day: number;
    title: string;
    details: string;
  }[];
  inclusions: string[];
  exclusions: string[];
}

export const DETAILED_VEHICLES: DetailedVehicle[] = [
  {
    id: 'dzire',
    name: 'Maruti Suzuki Swift Dzire',
    category: 'Compact Sedan',
    bodyType: 'sedan',
    seats: 4,
    fuel: 'petrol',
    baseRatePerKm: 14,
    driverAllowancePerDay: 400,
    ac: true,
    luggageCount: 2,
    availableNow: true,
    rating: 4.8,
    reviewsCount: 342,
    imageSvg: 'dzire.png',
    features: ['Air Conditioning', '2 Large Bags', 'Clean Interiors', 'Bluetooth Music', 'USB Charging Port'],
    description: 'The Swift Dzire is India’s favorite sedan for outstation drops and airport transfers. Offers unmatched fuel efficiency, smooth suspension, and comfortable seating for up to 4 passengers with standard luggage.',
    luggageCapacityText: '2 Medium Suitcases + 2 Handbags',
    idealFor: 'Small families, solo travelers, executive airport drops & one-way outstation trips.',
    specifications: {
      engine: '1.2L DualJet K-Series',
      transmission: '5-Speed Manual',
      bootSpace: '378 Liters',
      fuelType: 'Petrol / CNG',
      safetyRating: '4 Stars (Global NCAP)',
    },
  },
  {
    id: 'etios',
    name: 'Toyota Etios',
    category: 'Executive Sedan',
    bodyType: 'sedan',
    seats: 4,
    fuel: 'diesel',
    baseRatePerKm: 15,
    driverAllowancePerDay: 400,
    ac: true,
    luggageCount: 3,
    availableNow: true,
    rating: 4.7,
    reviewsCount: 218,
    imageSvg: 'etios.png',
    features: ['Spacious Boot', 'Extra Rear Legroom', 'Air Conditioning', 'First Aid Kit', 'Smooth Highway Ride'],
    description: 'Renowned for its class-leading rear legroom and massive 595-liter boot space, the Toyota Etios is the preferred choice for long-distance highway travel across Karnataka and Kerala.',
    luggageCapacityText: '3 Large Suitcases + 2 Handbags',
    idealFor: 'Long-distance outstation drops, family road trips & airport pickups with heavy luggage.',
    specifications: {
      engine: '1.4L D-4D Diesel',
      transmission: '5-Speed Manual',
      bootSpace: '595 Liters',
      fuelType: 'Diesel',
      safetyRating: '4 Stars (Global NCAP)',
    },
  },
  {
    id: 'ertiga',
    name: 'Maruti Suzuki Ertiga',
    category: 'MUV / 6 Seater',
    bodyType: 'suv',
    seats: 6,
    fuel: 'petrol',
    baseRatePerKm: 18,
    driverAllowancePerDay: 500,
    ac: true,
    luggageCount: 3,
    availableNow: true,
    rating: 4.9,
    reviewsCount: 412,
    imageSvg: 'ertiga.png',
    features: ['Dual AC Blowers', 'Reclining Seats', 'USB Chargers', 'Spacious 3-Row Seating', 'Rear Parking Sensors'],
    description: 'A versatile 6-passenger MUV ideal for family outings and group pilgrimage trips to Subramanya and Dharmasthala. Features dual air-conditioning blowers for all rows.',
    luggageCapacityText: '3 Medium Suitcases + Roof Carrier Support',
    idealFor: 'Medium family groups (5-6 passengers), temple tours & weekend getaways.',
    specifications: {
      engine: '1.5L K15B Smart Hybrid',
      transmission: '5-Speed Manual',
      bootSpace: '209 Liters (Expandable)',
      fuelType: 'Petrol',
      safetyRating: '3 Stars (Global NCAP)',
    },
  },
  {
    id: 'innova-crysta',
    name: 'Toyota Innova Crysta',
    category: 'Premium MPV',
    bodyType: 'suv',
    seats: 7,
    fuel: 'diesel',
    baseRatePerKm: 23,
    driverAllowancePerDay: 500,
    ac: true,
    luggageCount: 4,
    availableNow: true,
    rating: 4.9,
    reviewsCount: 580,
    imageSvg: 'innova.png',
    features: ['Captain Seats', 'Ambient Lighting', 'High Ground Clearance', 'Premium Sound System', 'Automatic Climate Control'],
    description: 'The benchmark of luxury and highway stability. Toyota Innova Crysta offers supreme plush seating, captain chairs in the middle row, and whisper-quiet cabin insulation for long journeys.',
    luggageCapacityText: '4 Large Suitcases + Roof Luggage Carrier',
    idealFor: 'VIP travel, luxury outstation trips, Coorg hill road trips & multi-day family tours.',
    specifications: {
      engine: '2.4L GD Turbo Diesel',
      transmission: '5-Speed Manual',
      bootSpace: '300 Liters (Expandable)',
      fuelType: 'Diesel',
      safetyRating: '5 Stars (ASEAN NCAP)',
    },
  },
  {
    id: 'tempo-13',
    name: 'Force Tempo Traveller (13 Seater)',
    category: 'Mini Bus',
    bodyType: 'tempo',
    seats: 13,
    fuel: 'diesel',
    baseRatePerKm: 30,
    driverAllowancePerDay: 600,
    ac: true,
    luggageCount: 8,
    availableNow: true,
    rating: 4.8,
    reviewsCount: 124,
    imageSvg: 'tempo.png',
    features: ['1X1 Pushback Seats', 'Wide Central Aisle', 'Roof Luggage Carrier', 'High-Output AC', 'LED TV & Music System'],
    description: 'Designed for large group tours, marriage parties, and pilgrimage excursions. Features plush 1x1 recliners, ample headroom, and top-tier air conditioning.',
    luggageCapacityText: '8 Large Suitcases + Dedicated Rear Luggage Box',
    idealFor: 'Marriage parties, corporate retreats, multi-family temple circuits & group tours.',
    specifications: {
      engine: '2.6L FM2.6CR Common Rail',
      transmission: '5-Speed Heavy Duty',
      bootSpace: 'Rear Luggage Compartment',
      fuelType: 'Diesel',
      safetyRating: 'Commercial Grade Reinforced Steel',
    },
  },
];

export const DETAILED_PACKAGES: DetailedPackage[] = [
  {
    id: 'coastal-temples',
    title: 'Coastal Karnataka Temple Tour',
    duration: '2 Days / 1 Night',
    highlights: 'Mangaluru - Udupi - Murdeshwar - Kollur Mookambika',
    startingPrice: 6500,
    recommendedVehicle: 'Toyota Innova Crysta / Ertiga',
    description: 'Experience spiritual solace across coastal Karnataka. Visit world-famous shrines of Mangaluru, Sri Krishna Matha in Udupi, the giant Shiva Statue at Murdeshwar, and Kollur Mookambika Temple.',
    itinerary: [
      {
        day: 1,
        title: 'Mangaluru to Udupi & Murdeshwar',
        details: 'Pickup from Mangaluru home/hotel. Drive via Malpe Beach to Udupi Sri Krishna Matha. Evening visit to Murdeshwar Shiva temple beach. Overnight stay in Murdeshwar or Kollur.',
      },
      {
        day: 2,
        title: 'Kollur Mookambika to Mangaluru Drop',
        details: 'Morning darshan at Kollur Mookambika Temple. Scenic return drive along Maravanthe beach road. Drop back to Mangaluru residence or railway station.',
      },
    ],
    inclusions: [
      'Chauffeur-driven AC vehicle for entire itinerary',
      'Driver daily allowance & night stay allowance',
      'Fuel charges & state taxes',
      'Flexible stops for lunch & photos',
    ],
    exclusions: [
      'Hotel accommodation & meals',
      'Temple pooja tickets & entry fees',
      'Highway toll & parking charges',
    ],
  },
  {
    id: 'coorg-getaway',
    title: 'Misty Coorg Hill Retreat',
    duration: '3 Days / 2 Nights',
    highlights: 'Madikeri Fort - Raja Seat - Abbey Falls - Dubare Elephant Camp - Nisargadhama',
    startingPrice: 9800,
    recommendedVehicle: 'Swift Dzire / Toyota Etios / Innova',
    description: 'Escape to the Scotland of India. A soothing 3-day mountain journey through lush coffee plantations, waterfalls, wildlife camps, and panoramic sunset view points in Madikeri.',
    itinerary: [
      {
        day: 1,
        title: 'Mangaluru to Madikeri & Sightseeing',
        details: 'Scenic drive through Sampaje Ghat. Visit Madikeri Fort, Omkareshwara Temple, and enjoy evening sunset view at Raja’s Seat.',
      },
      {
        day: 2,
        title: 'Waterfalls & Coffee Estates',
        details: 'Visit Abbey Falls, Mandalpatti jeep trek view point, and explore sprawling private coffee estates in Coorg.',
      },
      {
        day: 3,
        title: 'Dubare Elephant Camp & Return',
        details: 'Morning river bath & feeding session at Dubare Elephant Camp. Visit Cauvery Nisargadhama island park and Golden Temple at Bylakuppe. Evening drop in Mangaluru.',
      },
    ],
    inclusions: [
      'Dedicated AC car with experienced mountain driver',
      'Fuel, driver food & stay allowance',
      'Doorstep pickup and drop in Mangaluru',
    ],
    exclusions: [
      'Resort stay & meals',
      'Jeep trek to Mandalpatti',
      'Park entry & activity tickets',
    ],
  },
  {
    id: 'bekal-kasaragod',
    title: 'Bekal Fort & North Kerala Excursion',
    duration: '1 Day Excursion',
    highlights: 'Scenic coastal drive to Bekal Fort & beach park, Ananthapura Lake Temple',
    startingPrice: 3200,
    recommendedVehicle: 'Swift Dzire / Toyota Etios',
    description: 'A delightful day-trip across the Kerala border to explore the majestic 300-year-old sea-facing Bekal Fort and historical temples of Kasaragod.',
    itinerary: [
      {
        day: 1,
        title: 'Mangaluru - Kasaragod - Bekal Fort Full Day',
        details: 'Pickup at 8:00 AM. Visit Ananthapura Lake Temple (only lake temple in Kerala). Proceed to Bekal Fort for panoramic Arabian Sea views. Relax at Bekal Beach Park. Return drop by 7:00 PM.',
      },
    ],
    inclusions: [
      'AC Sedan for 12 hours / 150 km package',
      'Kerala interstate tourist vehicle permit taxes',
      'Chauffeur charges & fuel',
    ],
    exclusions: ['Fort entry fee', 'Toll & parking fees', 'Food & beverages'],
  },
];

export const ROUTES: RouteFare[] = [
  {
    id: 'udupi',
    origin: 'Mangaluru',
    destination: 'Udupi Sri Krishna Matha',
    distanceKm: 58,
    sedanFare: 1450,
    suvFare: 1950,
    tempoFare: 3100,
    popular: true,
  },
  {
    id: 'manipal',
    origin: 'Mangaluru',
    destination: 'Manipal University Campus',
    distanceKm: 64,
    sedanFare: 1600,
    suvFare: 2150,
    tempoFare: 3400,
    popular: true,
  },
  {
    id: 'dharmasthala',
    origin: 'Mangaluru',
    destination: 'Dharmasthala Temple',
    distanceKm: 75,
    sedanFare: 1900,
    suvFare: 2550,
    tempoFare: 4000,
    popular: true,
  },
  {
    id: 'subramanya',
    origin: 'Mangaluru',
    destination: 'Kukke Subramanya Temple',
    distanceKm: 105,
    sedanFare: 2600,
    suvFare: 3500,
    tempoFare: 5400,
    popular: true,
  },
  {
    id: 'coorg',
    origin: 'Mangaluru',
    destination: 'Madikeri / Coorg',
    distanceKm: 138,
    sedanFare: 3500,
    suvFare: 4600,
    tempoFare: 7200,
    popular: true,
  },
  {
    id: 'bengaluru',
    origin: 'Mangaluru',
    destination: 'Bengaluru City / Airport',
    distanceKm: 350,
    sedanFare: 8500,
    suvFare: 11200,
    tempoFare: 16500,
    popular: true,
  },
  {
    id: 'mysuru',
    origin: 'Mangaluru',
    destination: 'Mysuru City / Palace',
    distanceKm: 255,
    sedanFare: 6200,
    suvFare: 8400,
    tempoFare: 12500,
    popular: false,
  },
  {
    id: 'goa',
    origin: 'Mangaluru',
    destination: 'Panaji / South Goa',
    distanceKm: 365,
    sedanFare: 9200,
    suvFare: 12500,
    tempoFare: 18000,
    popular: false,
  },
];

export const REVIEWS: Review[] = [
  {
    id: 'r1',
    author: 'Rajesh Bhat',
    location: 'Bengaluru',
    rating: 5,
    comment:
      'Booked Innova Crysta for a family trip to Kukke Subramanya and Dharmasthala. Driver Ramesh was extremely punctual, professional, and knowledgeable about local temple timings.',
    date: 'August 2026',
  },
  {
    id: 'r2',
    author: 'Dr. Ananya Shetty',
    location: 'Mangaluru',
    rating: 5,
    comment:
      'Regular user for Mangalore Airport drops. Clean cars, fixed upfront pricing without surprises, and courteous drivers every single time.',
    date: 'August 2026',
  },
  {
    id: 'r3',
    author: 'Sunil D’Souza',
    location: 'Udupi',
    rating: 5,
    comment:
      'Extremely smooth booking process. The fare quoted online was exactly what was charged. Highly recommended for family outstation drops.',
    date: 'July 2026',
  },
  {
    id: 'r4',
    author: 'Priya Nair',
    location: 'Kochi',
    rating: 5,
    comment:
      'We booked a 13-seater Tempo Traveller for our family marriage group from Mangaluru to Coorg. The vehicle was spotlessly clean and the driver was very patient.',
    date: 'June 2026',
  },
];

export const FAQS: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'Are there any hidden extra charges like driver night allowance?',
    answer:
      'No. The fare quoted upfront includes base kilometre fare, driver allowance, and GST. Toll charges and parking fees are charged at actuals.',
  },
  {
    id: 'faq-2',
    question: 'How do I pay for my booking?',
    answer:
      'You can pay directly to the driver via UPI (GPay, PhonePe, Paytm), cash, or online transfer after completing your ride. Advance booking is optional.',
  },
  {
    id: 'faq-3',
    question: 'Is one-way taxi booking available for outstation routes?',
    answer:
      'Yes, we specialize in one-way outstation drops from Mangaluru to Bengaluru, Mysore, Goa, Kerala, and across Karnataka without requiring round-trip return fare.',
  },
  {
    id: 'faq-4',
    question: 'Are all vehicles AC and commercial tourist permitted?',
    answer:
      'Yes, 100% of our fleet holds valid All-India Tourist Permits (Yellow Board) with working air conditioning and comprehensive insurance.',
  },
  {
    id: 'faq-5',
    question: 'What happens if my flight to Mangaluru Airport is delayed?',
    answer:
      'Our drivers track flight arrivals live. We adjust pickup times free of cost for flight delays up to 2 hours.',
  },
  {
    id: 'faq-6',
    question: 'What is the cancellation policy?',
    answer:
      'Cancellations made up to 4 hours before pickup time are 100% free with zero cancellation fee.',
  },
];
