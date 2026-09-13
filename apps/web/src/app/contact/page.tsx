'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  Phone,
  Mail,
  MapPin,
  Send,
  Car,
  CheckCircle2,
  User,
  Megaphone,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

export default function ContactPage() {
  const [activeTab, setActiveTab] = useState<'contact' | 'driver'>('driver');

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSent, setContactSent] = useState(false);

  // Driver Application state
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
        setDriverSubmitted(true);
      }
    } catch (err) {
      setDriverSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-6 sm:py-10 px-3.5 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Top Title Header */}
          <div className="text-center max-w-xl mx-auto">
            <span className="text-xs font-black text-orange-500 uppercase tracking-widest block mb-1">
              GET IN TOUCH
            </span>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight mb-1.5">
              Contact Kandy Cabs Support & Partner Network
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Have questions about your booking or want to join as a driver partner? We are here 24x7.
            </p>
          </div>

          {/* 3 Contact Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-md flex items-start gap-3">
              <div className="w-9 h-9 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-slate-900">Phone Support</h4>
                <p className="text-xs font-bold text-slate-600 mb-0.5">+91 98765 43210</p>
                <p className="text-[11px] font-medium text-slate-400">080 4123 4567 (24x7 Helpline)</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-md flex items-start gap-3">
              <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-slate-900">Email Support</h4>
                <p className="text-xs font-bold text-slate-600 mb-0.5">support@kandycabs.com</p>
                <p className="text-[11px] font-medium text-slate-400">bookings@kandycabs.com</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-md flex items-start gap-3">
              <div className="w-9 h-9 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-slate-900">Head Office</h4>
                <p className="text-xs font-bold text-slate-600 mb-0.5">Bangalore, Karnataka</p>
                <p className="text-[11px] font-medium text-slate-400">#42, 1st Main Road, Indiranagar, KA 560038</p>
              </div>
            </div>
          </div>

          {/* Main Card Wrapper */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden max-w-xl mx-auto">
            {/* Top Dual Tab Switcher */}
            <div className="grid grid-cols-2 bg-slate-100/70 p-1 border-b border-slate-200/80 gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('contact')}
                className={`py-2 px-2.5 sm:py-2.5 sm:px-3.5 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition ${
                  activeTab === 'contact'
                    ? 'bg-white text-slate-900 shadow-sm border-b-2 border-orange-500'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }`}
              >
                <Mail className={`w-5 h-5 sm:w-5.5 sm:h-5.5 ${activeTab === 'contact' ? 'text-orange-500' : 'text-slate-400'}`} />
                <span>Customer Inquiry</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('driver')}
                className={`py-2 px-2.5 sm:py-2.5 sm:px-3.5 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition ${
                  activeTab === 'driver'
                    ? 'bg-white text-orange-600 shadow-sm border-b-2 border-orange-500'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }`}
              >
                <Car className={`w-5 h-5 sm:w-5.5 sm:h-5.5 ${activeTab === 'driver' ? 'text-orange-500' : 'text-slate-400'}`} />
                <span>Drive With Us</span>
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-5">
              {activeTab === 'contact' ? (
                contactSent ? (
                  <div className="text-center py-8 space-y-2">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900">Inquiry Received!</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Thank you for reaching out. Our support team will get back to you shortly on your phone/email.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    {/* Customer Info Banner */}
                    <div className="bg-orange-50/80 border border-orange-200/80 p-3.5 rounded-2xl flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-orange-600" />
                      </div>
                      <div>
                        <strong className="text-xs font-black text-orange-600 block mb-0.5">
                          24x7 Customer Support:
                        </strong>
                        <p className="text-[11px] font-medium text-slate-700 leading-snug">
                          Have questions about booking, outstation fares, or custom itineraries? Send us your message.
                        </p>
                      </div>
                    </div>

                    {/* Full Name */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                        Full Name *
                      </label>
                      <div className="relative flex items-center">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5" />
                        <input
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="Your Name"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                          required
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                        10-Digit Phone *
                      </label>
                      <div className="relative flex items-center">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5" />
                        <input
                          type="tel"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder="Mobile number for SMS response"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                          required
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                        Email Address
                      </label>
                      <div className="relative flex items-center">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5" />
                        <input
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                        />
                      </div>
                    </div>

                    {/* Message */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                        Message / Requirements *
                      </label>
                      <textarea
                        rows={3}
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        placeholder="Tell us your trip plan or query details..."
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                        required
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Submit Inquiry</span>
                    </button>
                  </form>
                )
              ) : driverSubmitted ? (
                <div className="text-center py-8 space-y-2">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">Driver Application Submitted!</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Thank you for applying. Our driver ops team will review your application and send your registration SMS shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleDriverSubmit} className="space-y-4">
                  {/* Join Kandy Cabs Network Banner */}
                  <div className="bg-orange-50/80 border border-orange-200/80 p-3.5 rounded-2xl flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                      <Megaphone className="w-4.5 h-4.5 text-orange-600" />
                    </div>
                    <div>
                      <strong className="text-xs font-black text-orange-600 block mb-0.5">
                        Join Kandy Cabs Network:
                      </strong>
                      <p className="text-[11px] font-medium text-slate-700 leading-snug">
                        Earn guaranteed daily outstation trips with weekly payouts and 0% commission penalty.
                      </p>
                    </div>
                  </div>

                  {/* Full Name */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                      Full Name *
                    </label>
                    <div className="relative flex items-center">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5" />
                      <input
                        type="text"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        placeholder="Driver / Owner Name"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                        required
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                      10-Digit Phone *
                    </label>
                    <div className="relative flex items-center">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5" />
                      <input
                        type="tel"
                        value={driverPhone}
                        onChange={(e) => setDriverPhone(e.target.value)}
                        placeholder="Mobile number for SMS OTP"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                        required
                      />
                    </div>
                  </div>

                  {/* Operating City */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                      Operating City *
                    </label>
                    <div className="relative flex items-center">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                      <select
                        value={driverCity}
                        onChange={(e) => setDriverCity(e.target.value)}
                        className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none appearance-none transition"
                      >
                        <option value="Bangalore">Bangalore</option>
                        <option value="Mysore">Mysore</option>
                        <option value="Mangalore">Mangalore</option>
                        <option value="Hubli">Hubli</option>
                        <option value="Belgaum">Belgaum</option>
                        <option value="Chennai">Chennai</option>
                        <option value="Hyderabad">Hyderabad</option>
                        <option value="Coimbatore">Coimbatore</option>
                        <option value="Hosur">Hosur</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
                    </div>
                  </div>

                  {/* Vehicle Model Owned */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                      Vehicle Model Owned *
                    </label>
                    <div className="relative flex items-center">
                      <Car className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                      <select
                        value={vehicleOwned}
                        onChange={(e) => setVehicleOwned(e.target.value)}
                        className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none appearance-none transition"
                      >
                        <option value="Swift Dzire (Sedan)">Swift Dzire (Sedan)</option>
                        <option value="Toyota Etios (Sedan)">Toyota Etios (Sedan)</option>
                        <option value="Maruti Ertiga (SUV)">Maruti Ertiga (SUV)</option>
                        <option value="Toyota Innova Crysta (SUV Premium)">Toyota Innova Crysta (SUV Premium)</option>
                        <option value="WagonR / Indica (Hatchback)">WagonR / Indica (Hatchback)</option>
                        <option value="Force Tempo Traveler">Force Tempo Traveler</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="relative flex items-center">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5" />
                      <input
                        type="email"
                        value={driverEmail}
                        onChange={(e) => setDriverEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                      Additional Details / Commercial License Info
                    </label>
                    <textarea
                      rows={2.5}
                      value={driverMessage}
                      onChange={(e) => setDriverMessage(e.target.value)}
                      placeholder="Mention driving experience, vehicle registration year, etc."
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'Submitting Application...' : 'Submit'}</span>
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

