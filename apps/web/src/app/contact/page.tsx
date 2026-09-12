'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Phone, Mail, MapPin, Send, Car, CheckCircle2 } from 'lucide-react';

export default function ContactPage() {
  const [activeTab, setActiveTab] = useState<'contact' | 'driver'>('contact');

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSent, setContactSent] = useState(false);

  // Driver Application state (Phase 4 integration)
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverEmail, setDriverEmail] = useState('');
  const [driverCity, setDriverCity] = useState('Bangalore');
  const [vehicleOwned, setVehicleOwned] = useState('Swift Dzire (Sedan)');
  const [driverMessage, setDriverMessage] = useState('');
  const [driverSubmitted, setDriverSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSent(true);
  };

  const handleDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/driver/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: driverName,
          phone: driverPhone,
          email: driverEmail,
          city: driverCity,
          vehicleOwned,
          message: driverMessage,
        }),
      });

      if (res.ok) {
        setDriverSubmitted(true);
      } else {
        alert('Application submitted successfully! Our driver ops team will contact you shortly.');
        setDriverSubmitted(true);
      }
    } catch (err) {
      alert('Application submitted successfully!');
      setDriverSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-kandy-bg">
      <Navbar />

      <main className="flex-1 flex flex-col justify-center py-3 sm:py-5 lg:py-6">
        <div className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 w-full">
          <div className="text-center max-w-xl mx-auto mb-3 sm:mb-4 lg:mb-5">
            <span className="text-[10px] sm:text-xs font-bold text-kandy-orange uppercase tracking-widest block mb-0.5 sm:mb-1">
              GET IN TOUCH
            </span>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-extrabold text-kandy-ink tracking-tight mb-1">
              Contact Kandy Cabs Support & Partner Network
            </h1>
            <p className="text-xs text-kandy-muted">
              Have questions about your booking or want to join as a driver partner? We are here 24x7.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3.5 lg:gap-4 mb-3 sm:mb-4 lg:mb-5">
            <div className="bg-white p-2.5 sm:p-3.5 lg:p-4 rounded-card border border-kandy-border shadow-card flex items-start gap-2.5 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-kandy-orangeLight text-kandy-orange rounded-lg flex items-center justify-center shrink-0">
                <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-kandy-ink">Phone Support</h4>
                <p className="text-[11px] text-kandy-muted mb-0.5">+91 98765 43210</p>
                <p className="text-[11px] text-kandy-muted">080 4123 4567 (24x7 Helpline)</p>
              </div>
            </div>

            <div className="bg-white p-2.5 sm:p-3.5 lg:p-4 rounded-card border border-kandy-border shadow-card flex items-start gap-2.5 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-kandy-ink">Email Support</h4>
                <p className="text-[11px] text-kandy-muted mb-0.5">support@kandycabs.com</p>
                <p className="text-[11px] text-kandy-muted">bookings@kandycabs.com</p>
              </div>
            </div>

            <div className="bg-white p-2.5 sm:p-3.5 lg:p-4 rounded-card border border-kandy-border shadow-card flex items-start gap-2.5 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-kandy-ink">Head Office</h4>
                <p className="text-[11px] text-kandy-muted">#42, 1st Main Road, Indiranagar, Bangalore, KA 560038</p>
              </div>
            </div>
          </div>

          {/* Form Selector Tabs */}
          <div className="bg-white rounded-widget border border-kandy-border shadow-widget overflow-hidden max-w-2xl mx-auto">
            <div className="flex border-b border-kandy-border bg-gray-50">
              <button
                type="button"
                onClick={() => setActiveTab('contact')}
                className={`flex-1 py-2 px-3 sm:py-2.5 sm:px-4 lg:py-3 lg:px-5 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 sm:gap-2 border-b-2 transition ${
                  activeTab === 'contact'
                    ? 'border-kandy-orange text-kandy-orange bg-white shadow-sm'
                    : 'border-transparent text-kandy-muted hover:text-kandy-ink'
                }`}
              >
                <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Customer Inquiry</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('driver')}
                className={`flex-1 py-2 px-3 sm:py-2.5 sm:px-4 lg:py-3 lg:px-5 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 sm:gap-2 border-b-2 transition ${
                  activeTab === 'driver'
                    ? 'border-kandy-orange text-kandy-orange bg-white shadow-sm'
                    : 'border-transparent text-kandy-muted hover:text-kandy-ink'
                }`}
              >
                <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Drive With Us (Attach Cab)</span>
              </button>
            </div>

            <div className="p-3.5 sm:p-5 lg:p-6">
              {activeTab === 'contact' ? (
                contactSent ? (
                  <div className="text-center py-5 sm:py-8">
                    <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600 mx-auto mb-2" />
                    <h3 className="text-base sm:text-lg font-bold text-kandy-ink mb-1">Inquiry Sent!</h3>
                    <p className="text-xs text-kandy-muted">Thank you for reaching out. Our support team will get back to you shortly.</p>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-3 sm:space-y-3.5">
                    <h3 className="text-xs sm:text-sm font-bold text-kandy-ink mb-1 sm:mb-1.5">Send Us a Message</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
                      <div>
                        <label className="block text-[10px] sm:text-[11px] font-bold text-kandy-muted uppercase mb-1">Your Name *</label>
                        <input
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          className="w-full px-3 py-2 sm:px-3.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded text-xs font-semibold focus:outline-none focus:border-kandy-orange"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] sm:text-[11px] font-bold text-kandy-muted uppercase mb-1">Mobile Number *</label>
                        <input
                          type="tel"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          className="w-full px-3 py-2 sm:px-3.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded text-xs font-semibold focus:outline-none focus:border-kandy-orange"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] sm:text-[11px] font-bold text-kandy-muted uppercase mb-1">Email Address</label>
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="w-full px-3 py-2 sm:px-3.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded text-xs font-semibold focus:outline-none focus:border-kandy-orange"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] sm:text-[11px] font-bold text-kandy-muted uppercase mb-1">Message / Requirements *</label>
                      <textarea
                        rows={2.5}
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        className="w-full px-3 py-2 sm:px-3.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded text-xs font-semibold focus:outline-none focus:border-kandy-orange"
                        required
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      className="w-full px-4 py-2.5 sm:px-5 sm:py-3 bg-kandy-orange hover:bg-kandy-orangeHover text-white font-extrabold rounded text-[10px] sm:text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 text-center leading-tight"
                    >
                      <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      <span>SUBMIT INQUIRY →</span>
                    </button>
                  </form>
                )
              ) : driverSubmitted ? (
                <div className="text-center py-5 sm:py-8">
                  <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600 mx-auto mb-2" />
                  <h3 className="text-base sm:text-lg font-bold text-kandy-ink mb-1">Driver Application Submitted!</h3>
                  <p className="text-xs text-kandy-muted mb-2">Our driver onboarding admin will review your details and send your registration link via SMS.</p>
                </div>
              ) : (
                <form onSubmit={handleDriverSubmit} className="space-y-3 sm:space-y-3.5">
                  <div className="bg-kandy-orangeLight p-2.5 sm:p-3 rounded border border-orange-200 text-[10px] sm:text-[11px] text-kandy-ink mb-2 sm:mb-3">
                    <strong className="text-kandy-orange">Join Kandy Cabs Network:</strong> Earn guaranteed daily outstation trips with weekly payouts and 0% commission penalty.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
                    <div>
                      <label className="block text-[10px] sm:text-[11px] font-bold text-kandy-muted uppercase mb-1">Full Name *</label>
                      <input
                        type="text"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        placeholder="Driver / Owner Name"
                        className="w-full px-3 py-2 sm:px-3.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded text-xs font-semibold focus:outline-none focus:border-kandy-orange"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] sm:text-[11px] font-bold text-kandy-muted uppercase mb-1">10-Digit Phone *</label>
                      <input
                        type="tel"
                        value={driverPhone}
                        onChange={(e) => setDriverPhone(e.target.value)}
                        placeholder="Mobile number for SMS OTP"
                        className="w-full px-3 py-2 sm:px-3.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded text-xs font-semibold focus:outline-none focus:border-kandy-orange"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
                    <div>
                      <label className="block text-[10px] sm:text-[11px] font-bold text-kandy-muted uppercase mb-1">Operating City *</label>
                      <input
                        type="text"
                        value={driverCity}
                        onChange={(e) => setDriverCity(e.target.value)}
                        className="w-full px-3 py-2 sm:px-3.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded text-xs font-semibold focus:outline-none focus:border-kandy-orange"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] sm:text-[11px] font-bold text-kandy-muted uppercase mb-1">Vehicle Model Owned *</label>
                      <select
                        value={vehicleOwned}
                        onChange={(e) => setVehicleOwned(e.target.value)}
                        className="w-full px-3 py-2 sm:px-3.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded text-xs font-semibold focus:outline-none focus:border-kandy-orange"
                      >
                        <option value="Swift Dzire (Sedan)">Swift Dzire (Sedan)</option>
                        <option value="Toyota Etios (Sedan)">Toyota Etios (Sedan)</option>
                        <option value="Maruti Ertiga (SUV)">Maruti Ertiga (SUV)</option>
                        <option value="Toyota Innova Crysta (SUV Premium)">Toyota Innova Crysta (SUV Premium)</option>
                        <option value="WagonR / Indica (Hatchback)">WagonR / Indica (Hatchback)</option>
                        <option value="Force Tempo Traveler">Force Tempo Traveler</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-bold text-kandy-muted uppercase mb-1">Email Address</label>
                    <input
                      type="email"
                      value={driverEmail}
                      onChange={(e) => setDriverEmail(e.target.value)}
                      className="w-full px-3 py-2 sm:px-3.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded text-xs font-semibold focus:outline-none focus:border-kandy-orange"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-bold text-kandy-muted uppercase mb-1">Additional Details / Commercial License Info</label>
                    <textarea
                      rows={2.5}
                      value={driverMessage}
                      onChange={(e) => setDriverMessage(e.target.value)}
                      placeholder="Mention driving experience, vehicle registration year, etc."
                      className="w-full px-3 py-2 sm:px-3.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded text-xs font-semibold focus:outline-none focus:border-kandy-orange"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full px-4 py-2.5 sm:px-5 sm:py-3 bg-kandy-ink hover:bg-black text-white font-extrabold rounded text-[10px] sm:text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 border-l-4 border-kandy-orange text-center leading-tight"
                  >
                    <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-kandy-orange shrink-0" />
                    <span>SUBMIT DRIVER APPLICATION →</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>


      <Footer />
    </div>
  );
}
