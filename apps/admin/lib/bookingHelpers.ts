/**
 * Helper utilities for parsing booking details, intermediate stops, carrier, and customer notes in the Admin Panel.
 */

export interface BookingDetailsMetadata {
  intermediateStops: string[];
  specialRequirements?: string;
  notes?: string;
  passengers?: number;
  luggage?: string;
  hasCarrier: boolean;
  source?: string;
}

/**
 * Extracts intermediate drops / via stops from booking object or its tripEvents payload.
 */
export function parseIntermediateStops(booking: any): string[] {
  if (!booking) return [];

  const stops: string[] = [];

  // 1. Check if viaStops is directly an array on booking
  if (Array.isArray(booking.viaStops) && booking.viaStops.length > 0) {
    return booking.viaStops
      .map((s: any) => (typeof s === 'string' ? s : s?.label || s?.address || s?.name || ''))
      .filter((s: string) => s.trim().length > 0);
  }

  // 2. Look in tripEvents for BOOKING_CREATED or any payloadJson with stops/requirements
  const rawTexts: string[] = [];

  if (Array.isArray(booking.tripEvents)) {
    for (const evt of booking.tripEvents) {
      const payload = typeof evt.payloadJson === 'string' ? safeJsonParse(evt.payloadJson) : evt.payloadJson;
      if (payload) {
        if (Array.isArray(payload.viaStops) && payload.viaStops.length > 0) {
          return payload.viaStops
            .map((s: any) => (typeof s === 'string' ? s : s?.label || s?.address || s?.name || ''))
            .filter((s: string) => s.trim().length > 0);
        }
        if (payload.specialRequirements) rawTexts.push(String(payload.specialRequirements));
        if (payload.notes) rawTexts.push(String(payload.notes));
      }
    }
  }

  if (booking.specialRequirements) rawTexts.push(String(booking.specialRequirements));
  if (booking.notes) rawTexts.push(String(booking.notes));

  for (const text of rawTexts) {
    if (!text) continue;

    // Pattern 1: "Intermediate Stops: Stop 1 ➔ Stop 2" or "Via Stops (2): Stop 1 ➔ Stop 2" or "Via: Stop 1 ➔ Stop 2"
    const matchArrow = text.match(/(?:Intermediate Stops|Via Stops(?:\s*\(\d+\))?|Via)\s*:\s*([^|;\n]+)/i);
    if (matchArrow && matchArrow[1]) {
      const rawSegment = matchArrow[1].trim();
      const parts = rawSegment.includes('➔')
        ? rawSegment.split('➔')
        : rawSegment.includes('->')
        ? rawSegment.split('->')
        : rawSegment.split(',');

      for (const p of parts) {
        const clean = p.trim();
        if (clean && !stops.includes(clean)) {
          stops.push(clean);
        }
      }
      if (stops.length > 0) return stops;
    }
  }

  return stops;
}

/**
 * Extracts all booking metadata (passengers, luggage, carrier, notes, requirements) from tripEvents
 */
export function getBookingMetadata(booking: any): BookingDetailsMetadata {
  const intermediateStops = parseIntermediateStops(booking);
  let specialRequirements = booking?.specialRequirements;
  let notes = booking?.notes;
  let passengers = booking?.passengers;
  let luggage = booking?.luggage;
  let source = booking?.source;
  let hasCarrier = Boolean(
    booking?.requestCarrier ||
    booking?.hasCarrier ||
    booking?.roofCarrier
  );

  if (Array.isArray(booking?.tripEvents)) {
    for (const evt of booking.tripEvents) {
      const p = typeof evt.payloadJson === 'string' ? safeJsonParse(evt.payloadJson) : evt.payloadJson;
      if (p) {
        if (!hasCarrier && (p.requestCarrier === true || p.hasCarrier === true || p.roofCarrier === true)) {
          hasCarrier = true;
        }
        if (!specialRequirements && p.specialRequirements) specialRequirements = p.specialRequirements;
        if (!notes && p.notes) notes = p.notes;
        if (!passengers && p.passengers) passengers = p.passengers;
        if (!luggage && p.luggage) luggage = p.luggage;
        if (!source && p.source) source = p.source;
      }
    }
  }

  // Also check if text notes/requirements mention Roof Carrier
  const combinedText = `${specialRequirements || ''} ${notes || ''} ${luggage || ''} ${booking?.specialRequirements || ''} ${booking?.notes || ''}`;
  if (!hasCarrier && /roof\s*carrier|luggage\s*carrier|carrier\s*requested|roof\s*luggage/i.test(combinedText)) {
    hasCarrier = true;
  }

  return {
    intermediateStops,
    specialRequirements,
    notes,
    passengers,
    luggage,
    hasCarrier,
    source,
  };
}

function safeJsonParse(val: string): any {
  try {
    return JSON.parse(val);
  } catch {
    return null;
  }
}
