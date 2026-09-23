import { customerApiClient } from './api';
import { BookingStatus } from '@kandy-cabs/shared';

class CustomerLocationSharer {
  private intervalId: any = null;
  private activeBookingId: string | null = null;
  private isSharing: boolean = false;
  private currentLat: number = 12.9716;
  private currentLng: number = 77.5946;

  public startSharing(bookingId: string, status: BookingStatus, enabled: boolean = true) {
    // Only share during the "find me for pickup" window
    const isPickupWindow =
      status === BookingStatus.DRIVER_ACCEPTED || status === BookingStatus.DRIVER_EN_ROUTE;

    if (!isPickupWindow || !enabled) {
      this.stopSharing();
      return;
    }

    if (this.intervalId && this.activeBookingId === bookingId && this.isSharing) {
      return; // already active for this booking
    }

    this.stopSharing();
    this.activeBookingId = bookingId;
    this.isSharing = true;

    console.log(`📡 [Flow B] Started live customer pickup location sharing for booking: ${bookingId}`);

    // Send initial ping immediately
    this.sendPing();

    // Ping every 15 seconds during pickup window
    this.intervalId = setInterval(() => {
      this.sendPing();
    }, 15000);
  }

  public stopSharing() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.activeBookingId = null;
    this.isSharing = false;
    console.log('🛑 [Flow B] Stopped customer live location sharing.');
  }

  public async setMockLocation(lat: number, lng: number) {
    this.currentLat = lat;
    this.currentLng = lng;
    if (this.isSharing && this.activeBookingId) {
      await this.sendPing();
    }
  }

  private async sendPing() {
    if (!this.activeBookingId || !this.isSharing) return;

    try {
      // Simulate minor walking/standing drift if mock location is active
      const driftLat = (Math.random() - 0.5) * 0.0001;
      const driftLng = (Math.random() - 0.5) * 0.0001;
      const lat = this.currentLat + driftLat;
      const lng = this.currentLng + driftLng;

      const res = await customerApiClient.fetch('/api/customer/location-ping', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: this.activeBookingId,
          lat,
          lng,
        }),
      });

      if (res && res.active === false) {
        // Server indicates pickup window closed or sharing disabled
        this.stopSharing();
      }
    } catch (err) {
      console.warn('⚠️ [Flow B] Failed to send customer location ping:', err);
    }
  }
}

export const locationSharer = new CustomerLocationSharer();
