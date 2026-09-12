'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { TripType, VehicleCategory } from '@kandycabs/shared';
import { PricingRule, FuelType, FleetItem, PricingHistoryLog } from '@/lib/pricingTypes';
import { calculateFareSync, FareCalculationResult } from '@/lib/pricingEngine';
import {
  IndianRupee,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Calculator,
  Filter,
  Tag,
  Shield,
  Layers,
  Sparkles,
  Info,
  Car,
  Fuel,
  Copy,
  Clock,
  CheckSquare,
  Square,
  Grid,
  List,
  History,
} from 'lucide-react';

const FUEL_TYPES: { value: FuelType; label: string }[] = [
  { value: 'CNG', label: 'CNG' },
  { value: 'DIESEL', label: 'Diesel' },
  { value: 'PETROL', label: 'Petrol' },
  { value: 'ELECTRIC', label: 'Electric' },
];

export default function AdminPricingPage() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [fleets, setFleets] = useState<FleetItem[]>([]);
  const [history, setHistory] = useState<PricingHistoryLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Top Section Navigation Tabs
  const [adminSection, setAdminSection] = useState<'PRICING' | 'MATRIX' | 'FLEETS' | 'HISTORY'>('PRICING');

  // Pricing Rules Trip Tab
  const [activeTripTab, setActiveTripTab] = useState<TripType>(TripType.ONEWAY);
  
  // Filters
  const [filterFleet, setFilterFleet] = useState<string>('ALL');
  const [filterFuel, setFilterFuel] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modals
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<PricingRule> | null>(null);

  const [isFleetModalOpen, setIsFleetModalOpen] = useState(false);
  const [editingFleet, setEditingFleet] = useState<Partial<FleetItem> | null>(null);

  // Preview Calculator State
  const [calcDistance, setCalcDistance] = useState<number>(80);
  const [calcHours, setCalcHours] = useState<number>(4);
  const [calcFleetCategory, setCalcFleetCategory] = useState<VehicleCategory>(VehicleCategory.SEDAN);
  const [calcFuel, setCalcFuel] = useState<FuelType>('DIESEL');
  const [calcTripType, setCalcTripType] = useState<TripType>(TripType.ONEWAY);
  const [previewResult, setPreviewResult] = useState<FareCalculationResult | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pricingRes, fleetRes, historyRes] = await Promise.all([
        fetch('/api/admin/pricing'),
        fetch('/api/admin/fleets'),
        fetch('/api/admin/pricing/history'),
      ]);

      const pData = await pricingRes.json();
      const fData = await fleetRes.json();
      const hData = await historyRes.json();

      if (pData.rules) setRules(pData.rules);
      if (fData.fleets) setFleets(fData.fleets);
      if (hData.history) setHistory(hData.history);
    } catch (e) {
      console.error('Failed to fetch admin fleet & pricing data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Rules for List view
  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      if (r.tripType !== activeTripTab) return false;
      if (filterFleet !== 'ALL' && r.vehicleCategory !== filterFleet) return false;
      if (filterFuel !== 'ALL' && r.fuelType !== filterFuel) return false;
      if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
      return true;
    });
  }, [rules, activeTripTab, filterFleet, filterFuel, filterStatus]);

  // Recalculate Admin Preview Sandbox
  useEffect(() => {
    const matchingRule = rules.find(
      (r) =>
        r.status === 'ACTIVE' &&
        r.tripType === calcTripType &&
        r.vehicleCategory === calcFleetCategory &&
        r.fuelType === calcFuel
    ) || rules.find((r) => r.status === 'ACTIVE' && r.tripType === calcTripType);

    const result = calculateFareSync(
      {
        tripType: calcTripType,
        vehicleCategory: calcFleetCategory,
        fuelType: calcFuel,
        distanceKm: calcDistance,
        durationHours: calcHours,
      },
      matchingRule
    );
    setPreviewResult(result);
  }, [rules, calcDistance, calcHours, calcFleetCategory, calcFuel, calcTripType]);

  // Handle Fleet Fuel Enabler Toggling
  const handleToggleFleetFuel = async (fleetId: string, fuelType: FuelType, enable: boolean) => {
    try {
      const res = await fetch('/api/admin/fleets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fleetId, action: 'TOGGLE_FUEL', fuelType, enable }),
      });
      const data = await res.json();
      if (data.fleets) setFleets(data.fleets);
    } catch (e) {
      alert('Failed to update fleet fuel type.');
    }
  };

  // Rule Save
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    try {
      const isEdit = !!editingRule.id;
      const url = '/api/admin/pricing';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRule),
      });

      const data = await res.json();
      if (data.rules) {
        setRules(data.rules);
        setIsRuleModalOpen(false);
      } else if (data.error) {
        alert(`Error saving pricing rule: ${data.error}`);
      }
    } catch (e) {
      alert('Save operation failed.');
    }
  };

  // Duplicate Rule Action
  const handleDuplicateRule = async (id: string) => {
    try {
      const res = await fetch('/api/admin/pricing/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.rules) {
        setRules(data.rules);
        if (data.rule) {
          setEditingRule(data.rule);
          setIsRuleModalOpen(true);
        }
      }
    } catch (e) {
      alert('Duplicate rule failed.');
    }
  };

  // Rule Toggle Status
  const handleToggleRuleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await res.json();
      if (data.rules) setRules(data.rules);
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Rule
  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pricing rule?')) return;
    try {
      const res = await fetch(`/api/admin/pricing?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.rules) setRules(data.rules);
    } catch (e) {
      console.error(e);
    }
  };

  // Save Fleet
  const handleSaveFleet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFleet) return;

    try {
      const isEdit = !!editingFleet.id;
      const url = '/api/admin/fleets';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingFleet),
      });

      const data = await res.json();
      if (data.fleets) {
        setFleets(data.fleets);
        setIsFleetModalOpen(false);
      } else if (data.error) {
        alert(`Error saving fleet: ${data.error}`);
      }
    } catch (e) {
      alert('Fleet save failed.');
    }
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Top Header Banner */}
      <div className="bg-white p-3.5 sm:p-6 rounded-card border border-kandy-border shadow-card flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-black text-kandy-ink flex items-center gap-2">
            <IndianRupee className="w-5 h-5 sm:w-6 sm:h-6 text-kandy-orange" />
            <span>Fleet & Dynamic Pricing Management</span>
          </h1>
          <p className="text-[11px] sm:text-xs text-kandy-muted mt-1 font-semibold">
            Manage fleet vehicles, independent CNG/Diesel fuel enablers, trip pricing matrices, and real-time calculation rules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setEditingFleet({
                fleetName: '',
                displayName: '',
                description: '',
                category: VehicleCategory.SEDAN,
                passengerCapacity: 4,
                luggageCapacity: 2,
                enabledFuelTypes: ['DIESEL'],
                active: true,
                sortOrder: fleets.length + 1,
              });
              setIsFleetModalOpen(true);
            }}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-kandy-ink hover:bg-black text-white font-extrabold rounded-lg text-[10px] sm:text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-sm"
          >
            <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-kandy-orange" />
            <span>Add Fleet Vehicle</span>
          </button>

          <button
            onClick={() => {
              setEditingRule({
                tripType: activeTripTab,
                vehicleCategory: VehicleCategory.SEDAN,
                fuelType: 'DIESEL',
                includedKm: activeTripTab === TripType.ROUND ? 400 : activeTripTab === TripType.LOCAL ? 80 : 57,
                includedHours: activeTripTab === TripType.LOCAL ? 8 : 0,
                basePrice: activeTripTab === TripType.ROUND ? 4500 : activeTripTab === TripType.LOCAL ? 2200 : 1200,
                extraKmPrice: 21.25,
                extraHourPrice: 150,
                tollMode: 'EXTRA',
                parkingMode: 'EXTRA',
                nightCharge: 0,
                waitingChargePerHour: 100,
                driverAllowancePerDay: 350,
                gstPercent: 5,
                inclusions: ['Driver Allowance Included', 'Base Fare & Fuel Charges', 'AC Cab', 'GST (5%)'],
                exclusions: ['Tolls & Parking extra at actuals'],
                status: 'ACTIVE',
              });
              setIsRuleModalOpen(true);
            }}
            className="px-3 py-1.5 sm:px-5 sm:py-2.5 bg-kandy-orange hover:bg-kandy-orangeHover text-white font-extrabold rounded-lg text-[10px] sm:text-xs uppercase tracking-wider transition shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Add Pricing Rule</span>
          </button>
        </div>
      </div>

      {/* Main Section Navigation Bar */}
      <div className="bg-white p-1.5 sm:p-2 rounded-card border border-kandy-border shadow-sm flex overflow-x-auto gap-1.5 sm:gap-2">
        <button
          onClick={() => setAdminSection('PRICING')}
          className={`px-2.5 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-black uppercase rounded transition flex items-center gap-1.5 whitespace-nowrap ${
            adminSection === 'PRICING'
              ? 'bg-kandy-orange text-white shadow-sm'
              : 'text-gray-600 hover:text-kandy-ink hover:bg-gray-100'
          }`}
        >
          <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Pricing Rules ({rules.length})</span>
        </button>

        <button
          onClick={() => setAdminSection('MATRIX')}
          className={`px-2.5 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-black uppercase rounded transition flex items-center gap-1.5 whitespace-nowrap ${
            adminSection === 'MATRIX'
              ? 'bg-kandy-orange text-white shadow-sm'
              : 'text-gray-600 hover:text-kandy-ink hover:bg-gray-100'
          }`}
        >
          <Grid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Pricing Matrix</span>
        </button>

        <button
          onClick={() => setAdminSection('FLEETS')}
          className={`px-2.5 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-black uppercase rounded transition flex items-center gap-1.5 whitespace-nowrap ${
            adminSection === 'FLEETS'
              ? 'bg-kandy-orange text-white shadow-sm'
              : 'text-gray-600 hover:text-kandy-ink hover:bg-gray-100'
          }`}
        >
          <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Fleets & Fuel Enablers ({fleets.length})</span>
        </button>

        <button
          onClick={() => setAdminSection('HISTORY')}
          className={`px-2.5 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-black uppercase rounded transition flex items-center gap-1.5 whitespace-nowrap ${
            adminSection === 'HISTORY'
              ? 'bg-kandy-orange text-white shadow-sm'
              : 'text-gray-600 hover:text-kandy-ink hover:bg-gray-100'
          }`}
        >
          <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Pricing History Log</span>
        </button>
      </div>

      {/* Main Grid Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
        {/* Left 2 Cols: Selected Section Content */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-6">
          {/* SECTION 1: PRICING RULES LIST */}
          {adminSection === 'PRICING' && (
            <div className="space-y-3 sm:space-y-6">
              {/* Trip Type Tabs */}
              <div className="bg-white p-1.5 sm:p-2 rounded-card border border-kandy-border shadow-sm flex overflow-x-auto gap-1.5 sm:gap-2">
                {[
                  { type: TripType.ONEWAY, label: 'ONE WAY' },
                  { type: TripType.ROUND, label: 'ROUND TRIP' },
                  { type: TripType.LOCAL, label: 'LOCAL' },
                  { type: TripType.AIRPORT, label: 'AIRPORT TRANSFER' },
                ].map((t) => (
                  <button
                    key={t.type}
                    onClick={() => setActiveTripTab(t.type)}
                    className={`px-2.5 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-black uppercase rounded transition whitespace-nowrap ${
                      activeTripTab === t.type
                        ? 'bg-kandy-ink text-white shadow-sm'
                        : 'text-gray-600 hover:text-kandy-ink hover:bg-gray-100'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Quick Filters */}
              <div className="bg-white p-3 sm:p-4 rounded-card border border-kandy-border shadow-sm flex flex-wrap items-center justify-between gap-2.5 sm:gap-4 text-[11px] sm:text-xs font-bold text-gray-700">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-kandy-orange" />
                  <span>Filters:</span>
                </div>

                <div className="flex flex-wrap gap-4 items-center">
                  <div>
                    <label className="mr-2 text-kandy-muted uppercase">Fleet:</label>
                    <select
                      value={filterFleet}
                      onChange={(e) => setFilterFleet(e.target.value)}
                      className="px-2.5 py-1 bg-kandy-bg border border-kandy-border rounded font-semibold text-xs focus:outline-none"
                    >
                      <option value="ALL">All Fleets</option>
                      {fleets.map((f) => (
                        <option key={f.id} value={f.category}>
                          {f.displayName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mr-2 text-kandy-muted uppercase">Fuel:</label>
                    <select
                      value={filterFuel}
                      onChange={(e) => setFilterFuel(e.target.value)}
                      className="px-2.5 py-1 bg-kandy-bg border border-kandy-border rounded font-semibold text-xs focus:outline-none"
                    >
                      <option value="ALL">All Fuels</option>
                      {FUEL_TYPES.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mr-2 text-kandy-muted uppercase">Status:</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-2.5 py-1 bg-kandy-bg border border-kandy-border rounded font-semibold text-xs focus:outline-none"
                    >
                      <option value="ALL">All Status</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Rules Cards List */}
              {loading ? (
                <div className="bg-white p-4 sm:p-8 rounded-card border border-kandy-border text-center font-bold text-gray-500">
                  Loading pricing rules...
                </div>
              ) : filteredRules.length === 0 ? (
                <div className="bg-white p-4 sm:p-8 rounded-card border border-kandy-border text-center space-y-3">
                  <Info className="w-8 h-8 text-kandy-orange mx-auto" />
                  <p className="font-bold text-sm text-gray-700">
                    No rules found for {activeTripTab} matching current filters.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {filteredRules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`bg-white p-3.5 sm:p-5 rounded-card border transition shadow-sm hover:shadow-md ${
                        rule.status === 'ACTIVE'
                          ? 'border-emerald-300 border-l-4 border-l-emerald-500'
                          : 'border-gray-200 opacity-75'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4 mb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm sm:text-base font-black text-kandy-ink">
                              {rule.vehicleCategory}
                            </span>
                            <span className="bg-orange-100 text-orange-800 text-[10px] font-black px-2 py-0.5 rounded border border-orange-200 uppercase">
                              {rule.fuelType}
                            </span>
                            {rule.airportRoute && (
                              <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded border border-sky-200">
                                {rule.airportRoute}
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                                rule.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-gray-100 text-gray-700 border-gray-300'
                              }`}
                            >
                              {rule.status}
                            </span>
                          </div>
                          <div className="text-[11px] sm:text-xs text-kandy-muted font-semibold mt-0.5 sm:mt-1">
                            Rule ID: {rule.id}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <button
                            onClick={() => handleToggleRuleStatus(rule.id, rule.status)}
                            className={`px-2.5 py-1 text-[11px] sm:text-xs font-extrabold rounded border transition ${
                              rule.status === 'ACTIVE'
                                ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                            }`}
                          >
                            {rule.status === 'ACTIVE' ? 'DEACTIVATE' : 'ACTIVATE'}
                          </button>

                          <button
                            onClick={() => handleDuplicateRule(rule.id)}
                            className="p-1.5 text-gray-600 hover:text-sky-600 bg-gray-100 hover:bg-sky-50 rounded transition"
                            title="Duplicate Rule"
                          >
                            <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setEditingRule({ ...rule });
                              setIsRuleModalOpen(true);
                            }}
                            className="p-1.5 text-gray-600 hover:text-kandy-orange bg-gray-100 hover:bg-orange-50 rounded transition"
                            title="Edit Rule"
                          >
                            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 bg-gray-100 hover:bg-red-50 rounded transition"
                            title="Delete Rule"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Parameters Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 bg-kandy-bg p-2.5 sm:p-3 rounded-md text-xs border border-kandy-border mb-3 font-semibold">
                        <div>
                          <div className="text-kandy-muted text-[10px] uppercase">Base Price</div>
                          <div className="text-xs sm:text-sm font-black text-kandy-ink">₹{rule.basePrice.toLocaleString()}</div>
                        </div>

                        <div>
                          <div className="text-kandy-muted text-[10px] uppercase">Included KM</div>
                          <div className="text-xs sm:text-sm font-black text-kandy-ink">{rule.includedKm} KM</div>
                        </div>

                        <div>
                          <div className="text-kandy-muted text-[10px] uppercase">Extra KM Rate</div>
                          <div className="text-xs sm:text-sm font-black text-kandy-orange">₹{rule.extraKmPrice}/km</div>
                        </div>

                        {rule.tripType === TripType.LOCAL && (
                          <div>
                            <div className="text-kandy-muted text-[10px] uppercase">Extra Hour Price</div>
                            <div className="text-xs sm:text-sm font-black text-kandy-orange">₹{rule.extraHourPrice || 150}/hr</div>
                          </div>
                        )}

                        <div>
                          <div className="text-kandy-muted text-[10px] uppercase">Driver Allowance</div>
                          <div className="text-[11px] sm:text-xs font-bold text-gray-800">₹{rule.driverAllowancePerDay}/day</div>
                        </div>
                      </div>

                      {/* Inclusions & Exclusions */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-[11px] sm:text-xs">
                        <div>
                          <div className="font-extrabold text-emerald-800 flex items-center gap-1 mb-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Inclusions:</span>
                          </div>
                          <ul className="list-disc list-inside text-gray-600 space-y-0.5 pl-1">
                            {rule.inclusions?.slice(0, 3).map((inc, i) => (
                              <li key={i} className="truncate">{inc}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <div className="font-extrabold text-rose-800 flex items-center gap-1 mb-1">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Exclusions:</span>
                          </div>
                          <ul className="list-disc list-inside text-gray-600 space-y-0.5 pl-1">
                            {rule.exclusions?.slice(0, 3).map((exc, i) => (
                              <li key={i} className="truncate">{exc}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: PRICING MATRIX VIEW */}
          {adminSection === 'MATRIX' && (
            <div className="bg-white p-3.5 sm:p-6 rounded-card border border-kandy-border shadow-card space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between border-b border-kandy-border pb-3 flex-wrap gap-2">
                <h3 className="text-sm sm:text-base font-black text-kandy-ink flex items-center gap-2">
                  <Grid className="w-4 h-4 sm:w-5 sm:h-5 text-kandy-orange" />
                  <span>Fleet × Fuel Type Pricing Matrix ({activeTripTab})</span>
                </h3>
                
                {/* Trip Type Selector for Matrix */}
                <div className="flex gap-1 bg-kandy-bg p-1 rounded border border-kandy-border overflow-x-auto">
                  {[TripType.ONEWAY, TripType.ROUND, TripType.LOCAL, TripType.AIRPORT].map((t) => (
                    <button
                      key={t}
                      onClick={() => setActiveTripTab(t)}
                      className={`px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[11px] font-black rounded whitespace-nowrap ${
                        activeTripTab === t ? 'bg-kandy-orange text-white' : 'text-gray-600'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 font-extrabold uppercase border-b border-gray-200">
                      <th className="p-3">Fleet Vehicle</th>
                      {FUEL_TYPES.map((f) => (
                        <th key={f.value} className="p-3 text-center">
                          {f.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-medium">
                    {fleets.map((fleet) => (
                      <tr key={fleet.id} className="hover:bg-gray-50/80">
                        <td className="p-3 font-bold text-gray-900">
                          <div className="flex items-center gap-2">
                            <Car className="w-4 h-4 text-kandy-orange" />
                            <div>
                              <div>{fleet.displayName}</div>
                              <div className="text-[10px] text-gray-400 font-normal">{fleet.category}</div>
                            </div>
                          </div>
                        </td>

                        {FUEL_TYPES.map((f) => {
                          const isFuelEnabled = fleet.enabledFuelTypes.includes(f.value);
                          const matchingRule = rules.find(
                            (r) =>
                              r.tripType === activeTripTab &&
                              r.vehicleCategory === fleet.category &&
                              r.fuelType === f.value
                          );

                          return (
                            <td key={f.value} className="p-3 text-center">
                              {!isFuelEnabled ? (
                                <span className="bg-gray-100 text-gray-400 text-[10px] font-bold px-2.5 py-1 rounded border border-gray-200">
                                  DISABLED
                                </span>
                              ) : matchingRule ? (
                                <button
                                  onClick={() => {
                                    setEditingRule({ ...matchingRule });
                                    setIsRuleModalOpen(true);
                                  }}
                                  className={`w-full p-2.5 rounded border text-left cursor-pointer transition ${
                                    matchingRule.status === 'ACTIVE'
                                      ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100 text-emerald-950'
                                      : 'bg-amber-50 border-amber-200 text-amber-900'
                                  }`}
                                >
                                  <div className="font-extrabold text-xs">₹{matchingRule.basePrice.toLocaleString()}</div>
                                  <div className="text-[10px] text-gray-600">{matchingRule.includedKm} KM • ₹{matchingRule.extraKmPrice}/km</div>
                                  <div className="mt-1 flex items-center justify-between text-[9px] font-black">
                                    <span className={matchingRule.status === 'ACTIVE' ? 'text-emerald-700' : 'text-amber-700'}>
                                      {matchingRule.status}
                                    </span>
                                    <span className="underline text-sky-600">EDIT</span>
                                  </div>
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingRule({
                                      tripType: activeTripTab,
                                      vehicleCategory: fleet.category,
                                      fuelType: f.value,
                                      includedKm: 250,
                                      basePrice: 2500,
                                      extraKmPrice: 18,
                                      tollMode: 'EXTRA',
                                      parkingMode: 'EXTRA',
                                      nightCharge: 0,
                                      driverAllowancePerDay: 350,
                                      gstPercent: 5,
                                      status: 'ACTIVE',
                                    });
                                    setIsRuleModalOpen(true);
                                  }}
                                  className="w-full py-2 bg-orange-50 hover:bg-orange-100 text-kandy-orange border border-orange-200 rounded font-bold text-[10px] transition"
                                >
                                  + ADD RULE
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 3: FLEETS & FUEL ENABLERS */}
          {adminSection === 'FLEETS' && (
            <div className="bg-white p-6 rounded-card border border-kandy-border shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-kandy-border pb-3">
                <h3 className="text-base font-black text-kandy-ink flex items-center gap-2">
                  <Car className="w-5 h-5 text-kandy-orange" />
                  <span>Fleet Vehicle Categories & Independent Fuel Enablers</span>
                </h3>
                <button
                  onClick={() => {
                    setEditingFleet({
                      fleetName: '',
                      displayName: '',
                      description: '',
                      category: VehicleCategory.SEDAN,
                      passengerCapacity: 4,
                      luggageCapacity: 2,
                      enabledFuelTypes: ['DIESEL'],
                      active: true,
                      sortOrder: fleets.length + 1,
                    });
                    setIsFleetModalOpen(true);
                  }}
                  className="px-4 py-1.5 bg-kandy-orange hover:bg-orange-600 text-white font-extrabold rounded text-xs transition"
                >
                  + Add Fleet Category
                </button>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {fleets.map((fleet) => (
                  <div
                    key={fleet.id}
                    className="p-3 sm:p-4 rounded-card border border-kandy-border bg-kandy-bg/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <img
                        src={fleet.image}
                        alt={fleet.displayName}
                        className="w-16 h-12 sm:w-20 sm:h-16 object-cover rounded border border-gray-300 shrink-0"
                      />
                      <div>
                        <h4 className="text-sm sm:text-base font-black text-kandy-ink">
                          {fleet.displayName}
                        </h4>
                        <p className="text-[11px] sm:text-xs text-kandy-muted font-semibold">
                          {fleet.passengerCapacity} Seats • {fleet.luggageCapacity} Luggage • Category: {fleet.category}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-left sm:text-right w-full sm:w-auto">
                      <div className="text-xs font-bold text-gray-700 flex flex-wrap items-center gap-2 sm:gap-3">
                        <span>Enabled Fuel Types:</span>
                        {FUEL_TYPES.map((ft) => {
                          const isEnabled = fleet.enabledFuelTypes.includes(ft.value);
                          return (
                            <button
                              key={ft.value}
                              type="button"
                              onClick={() => handleToggleFleetFuel(fleet.id, ft.value, !isEnabled)}
                              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded text-[10px] font-black border transition flex items-center gap-1 cursor-pointer ${
                                isEnabled
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  : 'bg-gray-100 text-gray-400 border-gray-300'
                              }`}
                            >
                              <span>{isEnabled ? '✓' : '✕'}</span>
                              <span>{ft.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex justify-start sm:justify-end gap-2 pt-1">
                        <button
                          onClick={() => {
                            setEditingFleet({ ...fleet });
                            setIsFleetModalOpen(true);
                          }}
                          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-[11px] sm:text-xs rounded transition"
                        >
                          Edit Fleet
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 4: PRICING HISTORY LOG */}
          {adminSection === 'HISTORY' && (
            <div className="bg-white p-3.5 sm:p-6 rounded-card border border-kandy-border shadow-card space-y-3 sm:space-y-4">
              <h3 className="text-sm sm:text-base font-black text-kandy-ink flex items-center gap-2 border-b border-kandy-border pb-3">
                <History className="w-4 h-4 sm:w-5 sm:h-5 text-kandy-orange" />
                <span>Audit & Pricing Change Logs</span>
              </h3>

              {history.length === 0 ? (
                <p className="text-xs text-kandy-muted font-bold italic py-4 text-center">
                  No pricing changes recorded in audit history yet.
                </p>
              ) : (
                <div className="space-y-2.5 sm:space-y-3">
                  {history.map((log) => (
                    <div key={log.id} className="p-3 sm:p-3.5 bg-gray-50 rounded-md border border-gray-200 text-xs font-semibold space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-kandy-ink uppercase">{log.action}</span>
                          <span className="bg-orange-100 text-orange-900 font-black px-2 py-0.5 rounded text-[10px]">
                            {log.fleetName || 'Rule'} ({log.fuelType || 'Fuel'})
                          </span>
                        </div>
                        <span className="text-gray-400 text-[10px]">
                          {new Date(log.updatedAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-600">
                        Rule ID: <code className="bg-gray-200 px-1 rounded">{log.ruleId}</code> • Updated by {log.updatedByAdmin || 'Admin'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Col: Admin Preview Calculator Sandbox */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-card border border-kandy-border shadow-card p-3.5 sm:p-5 space-y-3 sm:space-y-4 sticky top-24">
            <div className="flex items-center gap-2 border-b border-kandy-border pb-3">
              <Calculator className="w-4 h-4 sm:w-5 sm:h-5 text-kandy-orange" />
              <h3 className="text-sm sm:text-base font-black text-kandy-ink uppercase tracking-wide">
                Admin Fare Sandbox
              </h3>
            </div>

            <p className="text-[11px] sm:text-xs text-kandy-muted font-semibold">
              Live preview computed via central <code className="text-kandy-orange font-bold">calculateFareSync()</code>.
            </p>

            <div className="space-y-3 text-xs font-bold">
              <div>
                <label className="block text-kandy-muted uppercase mb-1">Trip Type</label>
                <select
                  value={calcTripType}
                  onChange={(e) => setCalcTripType(e.target.value as TripType)}
                  className="w-full p-2 bg-kandy-bg border border-kandy-border rounded"
                >
                  <option value={TripType.ONEWAY}>ONE WAY</option>
                  <option value={TripType.ROUND}>ROUND TRIP</option>
                  <option value={TripType.LOCAL}>LOCAL</option>
                  <option value={TripType.AIRPORT}>AIRPORT TRANSFER</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-kandy-muted uppercase mb-1">Fleet Vehicle</label>
                  <select
                    value={calcFleetCategory}
                    onChange={(e) => setCalcFleetCategory(e.target.value as VehicleCategory)}
                    className="w-full p-2 bg-kandy-bg border border-kandy-border rounded"
                  >
                    {fleets.map((f) => (
                      <option key={f.id} value={f.category}>
                        {f.fleetName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-kandy-muted uppercase mb-1">Fuel Type</label>
                  <select
                    value={calcFuel}
                    onChange={(e) => setCalcFuel(e.target.value as FuelType)}
                    className="w-full p-2 bg-kandy-bg border border-kandy-border rounded"
                  >
                    {FUEL_TYPES.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-kandy-muted uppercase mb-1">Distance (KM)</label>
                  <input
                    type="number"
                    value={calcDistance}
                    onChange={(e) => setCalcDistance(Number(e.target.value))}
                    className="w-full p-2 bg-kandy-bg border border-kandy-border rounded"
                  />
                </div>

                {calcTripType === TripType.LOCAL && (
                  <div>
                    <label className="block text-kandy-muted uppercase mb-1">Hours</label>
                    <input
                      type="number"
                      value={calcHours}
                      onChange={(e) => setCalcHours(Number(e.target.value))}
                      className="w-full p-2 bg-kandy-bg border border-kandy-border rounded"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Fare Breakdown Box */}
            {previewResult && (
              <div className="bg-kandy-ink text-white p-4 rounded-card space-y-2 text-xs font-semibold border border-gray-800">
                <div className="text-kandy-orange font-black uppercase tracking-wider text-[11px] border-b border-gray-800 pb-2">
                  Output Itemized Breakdown
                </div>

                <div className="flex justify-between py-0.5">
                  <span className="text-gray-300">Base Price:</span>
                  <span className="font-bold">₹{previewResult.basePrice.toLocaleString()}</span>
                </div>

                <div className="flex justify-between py-0.5">
                  <span className="text-gray-300">Included KM:</span>
                  <span>{previewResult.includedKm} KM</span>
                </div>

                <div className="flex justify-between py-0.5 text-orange-400">
                  <span>Extra KM ({previewResult.extraKm} km @ ₹{previewResult.extraKmRate}):</span>
                  <span>+₹{previewResult.extraKmCharge.toLocaleString()}</span>
                </div>

                {previewResult.tripType === TripType.LOCAL && (
                  <div className="flex justify-between py-0.5 text-orange-400">
                    <span>Extra Hours ({previewResult.extraHours} hr @ ₹{previewResult.extraHourRate}):</span>
                    <span>+₹{previewResult.extraHourCharge.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between py-0.5">
                  <span className="text-gray-300">Driver Allowance:</span>
                  <span>₹{previewResult.driverAllowance.toLocaleString()}</span>
                </div>

                <div className="flex justify-between py-0.5">
                  <span className="text-gray-300">GST ({previewResult.gstPercent}%):</span>
                  <span>₹{previewResult.gstAmount.toLocaleString()}</span>
                </div>

                <div className="pt-2 border-t border-gray-800 flex justify-between items-center text-sm font-black">
                  <span>Final Total:</span>
                  <span className="text-kandy-orange text-base">₹{previewResult.finalPrice.toLocaleString()}</span>
                </div>

                <div className="bg-gray-900/90 p-2.5 rounded border border-gray-800 text-[11px] flex justify-between font-bold text-emerald-400">
                  <span>25% Advance: ₹{previewResult.advanceAmount.toLocaleString()}</span>
                  <span>75% Balance: ₹{previewResult.balanceAmount.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ADMIN PRICING FORM MODAL */}
      {isRuleModalOpen && editingRule && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-card shadow-2xl border border-kandy-border max-w-2xl w-full p-3.5 sm:p-6 space-y-3.5 sm:space-y-5 my-4 sm:my-8">
            <div className="flex items-center justify-between border-b border-kandy-border pb-3">
              <h3 className="text-lg font-black text-kandy-ink flex items-center gap-2">
                <Tag className="w-5 h-5 text-kandy-orange" />
                <span>{editingRule.id ? 'Edit Pricing Rule' : 'Create Pricing Rule'}</span>
              </h3>
              <button
                onClick={() => setIsRuleModalOpen(false)}
                className="text-gray-400 hover:text-black font-black text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4 text-xs font-bold">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-kandy-muted uppercase mb-1">Trip Type *</label>
                  <select
                    value={editingRule.tripType}
                    onChange={(e) => setEditingRule({ ...editingRule, tripType: e.target.value as TripType })}
                    className="w-full p-2.5 bg-kandy-bg border border-kandy-border rounded"
                    required
                  >
                    <option value={TripType.ONEWAY}>ONE WAY</option>
                    <option value={TripType.ROUND}>ROUND TRIP</option>
                    <option value={TripType.LOCAL}>LOCAL</option>
                    <option value={TripType.AIRPORT}>AIRPORT TRANSFER</option>
                  </select>
                </div>

                <div>
                  <label className="block text-kandy-muted uppercase mb-1">Fleet Category *</label>
                  <select
                    value={editingRule.vehicleCategory}
                    onChange={(e) => setEditingRule({ ...editingRule, vehicleCategory: e.target.value as VehicleCategory })}
                    className="w-full p-2.5 bg-kandy-bg border border-kandy-border rounded"
                    required
                  >
                    {fleets.map((f) => (
                      <option key={f.id} value={f.category}>
                        {f.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-kandy-muted uppercase mb-1">Fuel Type *</label>
                  <select
                    value={editingRule.fuelType}
                    onChange={(e) => setEditingRule({ ...editingRule, fuelType: e.target.value as FuelType })}
                    className="w-full p-2.5 bg-kandy-bg border border-kandy-border rounded"
                    required
                  >
                    {FUEL_TYPES.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {editingRule.tripType === TripType.AIRPORT && (
                <div>
                  <label className="block text-kandy-muted uppercase mb-1">Airport Route (Optional)</label>
                  <input
                    type="text"
                    value={editingRule.airportRoute || ''}
                    onChange={(e) => setEditingRule({ ...editingRule, airportRoute: e.target.value })}
                    placeholder="e.g. Mangalore Airport -> City Center"
                    className="w-full p-2.5 bg-kandy-bg border border-kandy-border rounded font-semibold"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-kandy-muted uppercase mb-1">Included KM *</label>
                  <input
                    type="number"
                    value={editingRule.includedKm}
                    onChange={(e) => setEditingRule({ ...editingRule, includedKm: Number(e.target.value) })}
                    className="w-full p-2.5 bg-kandy-bg border border-kandy-border rounded"
                    required
                  />
                </div>

                <div>
                  <label className="block text-kandy-muted uppercase mb-1">Base Price (₹) *</label>
                  <input
                    type="number"
                    value={editingRule.basePrice}
                    onChange={(e) => setEditingRule({ ...editingRule, basePrice: Number(e.target.value) })}
                    className="w-full p-2.5 bg-kandy-bg border border-kandy-border rounded"
                    required
                  />
                </div>

                <div>
                  <label className="block text-kandy-muted uppercase mb-1">Extra KM Rate (₹/km) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingRule.extraKmPrice}
                    onChange={(e) => setEditingRule({ ...editingRule, extraKmPrice: Number(e.target.value) })}
                    className="w-full p-2.5 bg-kandy-bg border border-kandy-border rounded"
                    required
                  />
                </div>
              </div>

              {editingRule.tripType === TripType.LOCAL && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-orange-50/70 p-3 rounded border border-orange-200">
                  <div>
                    <label className="block text-kandy-orange uppercase mb-1">Included Hours</label>
                    <input
                      type="number"
                      value={editingRule.includedHours || 8}
                      onChange={(e) => setEditingRule({ ...editingRule, includedHours: Number(e.target.value) })}
                      className="w-full p-2.5 bg-white border border-kandy-border rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-kandy-orange uppercase mb-1">Extra Hour Rate (₹/hr)</label>
                    <input
                      type="number"
                      value={editingRule.extraHourPrice || 150}
                      onChange={(e) => setEditingRule({ ...editingRule, extraHourPrice: Number(e.target.value) })}
                      className="w-full p-2.5 bg-white border border-kandy-border rounded"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-kandy-muted uppercase mb-1">Driver Allowance (₹/day)</label>
                  <input
                    type="number"
                    value={editingRule.driverAllowancePerDay || 350}
                    onChange={(e) => setEditingRule({ ...editingRule, driverAllowancePerDay: Number(e.target.value) })}
                    className="w-full p-2.5 bg-kandy-bg border border-kandy-border rounded"
                  />
                </div>

                <div>
                  <label className="block text-kandy-muted uppercase mb-1">GST (%)</label>
                  <input
                    type="number"
                    value={editingRule.gstPercent !== undefined ? editingRule.gstPercent : 5}
                    onChange={(e) => setEditingRule({ ...editingRule, gstPercent: Number(e.target.value) })}
                    className="w-full p-2.5 bg-kandy-bg border border-kandy-border rounded"
                  />
                </div>

                <div>
                  <label className="block text-kandy-muted uppercase mb-1">Status</label>
                  <select
                    value={editingRule.status}
                    onChange={(e) => setEditingRule({ ...editingRule, status: e.target.value as any })}
                    className="w-full p-2.5 bg-kandy-bg border border-kandy-border rounded"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-kandy-muted uppercase mb-1">Inclusions (One per line)</label>
                <textarea
                  rows={3}
                  value={Array.isArray(editingRule.inclusions) ? editingRule.inclusions.join('\n') : editingRule.inclusions || ''}
                  onChange={(e) => setEditingRule({ ...editingRule, inclusions: e.target.value as any })}
                  className="w-full p-2.5 bg-kandy-bg border border-kandy-border rounded font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-kandy-muted uppercase mb-1">Exclusions (One per line)</label>
                <textarea
                  rows={3}
                  value={Array.isArray(editingRule.exclusions) ? editingRule.exclusions.join('\n') : editingRule.exclusions || ''}
                  onChange={(e) => setEditingRule({ ...editingRule, exclusions: e.target.value as any })}
                  className="w-full p-2.5 bg-kandy-bg border border-kandy-border rounded font-mono text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-kandy-border">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-extrabold rounded uppercase text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-kandy-orange hover:bg-kandy-orangeHover text-white font-extrabold rounded uppercase text-xs transition shadow-md"
                >
                  Save Pricing Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN FLEET EDIT/CREATE MODAL */}
      {isFleetModalOpen && editingFleet && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-card shadow-2xl border border-kandy-border max-w-lg w-full p-3.5 sm:p-6 space-y-3 sm:space-y-4 my-4 sm:my-8">
            <div className="flex items-center justify-between border-b border-kandy-border pb-3">
              <h3 className="text-lg font-black text-kandy-ink flex items-center gap-2">
                <Car className="w-5 h-5 text-kandy-orange" />
                <span>{editingFleet.id ? 'Edit Fleet Category' : 'Add Fleet Category'}</span>
              </h3>
              <button
                onClick={() => setIsFleetModalOpen(false)}
                className="text-gray-400 hover:text-black font-black text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFleet} className="space-y-3 text-xs font-bold">
              <div>
                <label className="block text-kandy-muted uppercase mb-1">Fleet Name *</label>
                <input
                  type="text"
                  value={editingFleet.fleetName || ''}
                  onChange={(e) => setEditingFleet({ ...editingFleet, fleetName: e.target.value, displayName: editingFleet.displayName || e.target.value })}
                  placeholder="e.g. Innova Crysta, Kia Carens"
                  className="w-full p-2.5 bg-kandy-bg border border-kandy-border rounded"
                  required
                />
              </div>

              <div>
                <label className="block text-kandy-muted uppercase mb-1">Display Title *</label>
                <input
                  type="text"
                  value={editingFleet.displayName || ''}
                  onChange={(e) => setEditingFleet({ ...editingFleet, displayName: e.target.value })}
                  placeholder="e.g. Toyota Innova Crysta (Luxury 7 Seater)"
                  className="w-full p-2.5 bg-kandy-bg border border-kandy-border rounded"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-kandy-muted uppercase mb-1">Vehicle Category *</label>
                  <select
                    value={editingFleet.category}
                    onChange={(e) => setEditingFleet({ ...editingFleet, category: e.target.value as VehicleCategory })}
                    className="w-full p-2.5 bg-kandy-bg border border-kandy-border rounded"
                  >
                    <option value={VehicleCategory.SEDAN}>SEDAN</option>
                    <option value={VehicleCategory.HATCHBACK}>HATCHBACK</option>
                    <option value={VehicleCategory.SUV}>SUV</option>
                    <option value={VehicleCategory.SUV_PREMIUM}>SUV_PREMIUM</option>
                    <option value={VehicleCategory.TEMPO_TRAVELER}>TEMPO_TRAVELER</option>
                  </select>
                </div>

                <div>
                  <label className="block text-kandy-muted uppercase mb-1">Passenger Seats *</label>
                  <input
                    type="number"
                    value={editingFleet.passengerCapacity || 4}
                    onChange={(e) => setEditingFleet({ ...editingFleet, passengerCapacity: Number(e.target.value) })}
                    className="w-full p-2.5 bg-kandy-bg border border-kandy-border rounded"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-kandy-muted uppercase mb-1">Image URL</label>
                <input
                  type="text"
                  value={editingFleet.image || ''}
                  onChange={(e) => setEditingFleet({ ...editingFleet, image: e.target.value })}
                  placeholder="https://..."
                  className="w-full p-2.5 bg-kandy-bg border border-kandy-border rounded"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-kandy-border">
                <button
                  type="button"
                  onClick={() => setIsFleetModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-extrabold rounded uppercase text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-kandy-orange hover:bg-kandy-orangeHover text-white font-extrabold rounded uppercase text-xs transition shadow-md"
                >
                  Save Fleet Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
