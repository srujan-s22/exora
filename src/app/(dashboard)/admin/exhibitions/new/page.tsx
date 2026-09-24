'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, Ticket, Shield, Users, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/providers/toast-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { ExhibitionLocationPicker, type SelectedExhibitionLocation } from '@/components/shared/exhibition-location-picker';

interface StaffOption {
  id: string;
  staffId: string;
  name: string;
  role: 'counter' | 'gate';
}

export default function NewExhibitionPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { user, isSuperAdmin, hasPermission, isLoading: authLoading } = useAuth();

  React.useEffect(() => {
    if (!authLoading && user) {
      if (!isSuperAdmin && !hasPermission('canCreateExhibitions')) {
        router.push('/unauthorized');
      }
    }
  }, [user, authLoading, isSuperAdmin, hasPermission, router]);

  // Loading states
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isStaffLoading, setIsStaffLoading] = React.useState(true);

  // Available staff loaded from API
  const [counterStaffOptions, setCounterStaffOptions] = React.useState<StaffOption[]>([]);
  const [gateStaffOptions, setGateStaffOptions] = React.useState<StaffOption[]>([]);

  // Form Fields
  const [name, setName] = React.useState('');
  const [category, setCategory] = React.useState('general');
  const [description, setDescription] = React.useState('');
  const [location, setLocation] = React.useState<SelectedExhibitionLocation | null>(null);
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [capacity, setCapacity] = React.useState('');
  const [notes, setNotes] = React.useState('');

  // Ticket Types list
  const [ticketTypes, setTicketTypes] = React.useState<Array<{ name: string; price: string; maxQuantity: string }>>([
    { name: 'General Admission', price: '100', maxQuantity: '' }
  ]);

  // Selected Staff check state
  const [selectedStaff, setSelectedStaff] = React.useState<Record<string, boolean>>({});

  // Field Validation Errors
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Categories config list
  const categories = [
    { label: 'General Exhibition', value: 'general' },
    { label: 'Art & Sculpture', value: 'art' },
    { label: 'Technology & AI', value: 'tech' },
    { label: 'Books & Literary', value: 'books' },
    { label: 'Food & Culinary', value: 'food' },
    { label: 'Trade & Commerce', value: 'trade' },
    { label: 'Cultural & Carnival', value: 'cultural' },
  ];

  // Fetch available staff roster on mount
  React.useEffect(() => {
    if (authLoading || (!isSuperAdmin && !hasPermission('canCreateExhibitions'))) {
      return;
    }
    async function loadStaff() {
      try {
        const res = await fetch('/api/staff');
        if (!res.ok) throw new Error('Failed to load staff list');
        
        const body = await res.json();
        if (body.success && Array.isArray(body.data)) {
          const list = body.data as any[];
          const counters = list
            .filter((u) => u.role === 'counter')
            .map((u) => ({ id: u.id, staffId: u.staffId, name: u.name, role: u.role as 'counter' }));
          
          const gates = list
            .filter((u) => u.role === 'gate')
            .map((u) => ({ id: u.id, staffId: u.staffId, name: u.name, role: u.role as 'gate' }));
          
          setCounterStaffOptions(counters);
          setGateStaffOptions(gates);
        }
      } catch (err: any) {
        addToast({
          type: 'error',
          title: 'Staff fetch failure',
          message: 'Could not load available staff roster for assignments.',
        });
      } finally {
        setIsStaffLoading(false);
      }
    }
    loadStaff();
  }, [addToast]);

  const handleAddTicketType = () => {
    setTicketTypes([...ticketTypes, { name: '', price: '', maxQuantity: '' }]);
  };

  const handleRemoveTicketType = (index: number) => {
    if (ticketTypes.length === 1) return;
    setTicketTypes(ticketTypes.filter((_, i) => i !== index));
  };

  const handleTicketTypeChange = (index: number, field: string, value: string) => {
    const updated = [...ticketTypes];
    updated[index] = { ...updated[index], [field]: value };
    setTicketTypes(updated);
  };

  const handleStaffToggle = (staffId: string) => {
    setSelectedStaff((prev) => ({ ...prev, [staffId]: !prev[staffId] }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Exhibition name is required';
    if (!startDate) newErrors.startDate = 'Start date is required';
    if (!endDate) newErrors.endDate = 'End date is required';

    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      newErrors.endDate = 'End date must be after the start date';
    }

    // Validate location selection
    if (!location) {
      newErrors.location = 'Please select a location from the suggestions.';
    }

    // Validate ticket types
    ticketTypes.forEach((t, index) => {
      if (!t.name.trim()) {
        newErrors[`ticketType-${index}-name`] = 'Ticket name is required';
      }
      if (!t.price || isNaN(parseFloat(t.price)) || parseFloat(t.price) < 0) {
        newErrors[`ticketType-${index}-price`] = 'Price must be non-negative';
      }
      if (t.maxQuantity && (isNaN(parseInt(t.maxQuantity)) || parseInt(t.maxQuantity) <= 0)) {
        newErrors[`ticketType-${index}-maxQuantity`] = 'Quantity must be positive';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      addToast({
        type: 'error',
        title: 'Validation failed',
        message: 'Please resolve errors on the form fields.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Map ticket prices into paise
      const mappedTicketTypes = ticketTypes.map((t) => ({
        name: t.name.trim(),
        price: Math.round(parseFloat(t.price) * 100),
        maxQuantity: t.maxQuantity ? parseInt(t.maxQuantity, 10) : undefined,
      }));

      // Gather checked staff IDs
      const assignedStaffIds = Object.keys(selectedStaff).filter((sid) => selectedStaff[sid]);

      // Calculate entryFee as standard ticket fee (e.g. price of first ticket type)
      const primaryFee = mappedTicketTypes.length > 0 ? mappedTicketTypes[0].price : 0;

      const payload = {
        name: name.trim(),
        category,
        description: description.trim() || undefined,
        venue: location?.venueName || '',
        address: location?.address || '',
        location: location
          ? {
              venueName: location.venueName,
              address: location.address,
              city: location.city,
              state: location.state,
              country: location.country,
              postalCode: location.postalCode,
              latitude: location.latitude,
              longitude: location.longitude,
              placeId: location.placeId,
            }
          : undefined,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        ticketTypes: mappedTicketTypes,
        entryFee: primaryFee,
        capacity: capacity ? parseInt(capacity, 10) : 0,
        assignedStaffIds,
        notes: notes.trim() || undefined,
      };

      const res = await fetch('/api/exhibitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (!res.ok) {
        if (body.error?.details) {
          const apiFieldErrors: Record<string, string> = {};
          for (const [key, msgs] of Object.entries(body.error.details)) {
            const shortKey = key.replace('location.', '');
            apiFieldErrors[shortKey] = Array.isArray(msgs) ? msgs[0] : String(msgs);
          }
          setErrors(apiFieldErrors);
        }
        throw new Error(body.error?.message || 'Failed to create exhibition');
      }

      addToast({
        type: 'success',
        title: 'Exhibition created',
        message: `${name} has been successfully scheduled.`,
      });
      router.push('/admin/exhibitions');
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Save failed',
        message: err.message || 'An error occurred during submission.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || (!isSuperAdmin && !hasPermission('canCreateExhibitions'))) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" className="text-accent-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Breadcrumb Nav */}
      <div className="flex items-center gap-3">
        <Link href="/admin/exhibitions" passHref>
          <Button variant="secondary" className="h-9 px-3 flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200">
            <ArrowLeft size={14} />
            <span>Back to list</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-50">Create Exhibition</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Basic Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar size={18} className="text-accent-400" />
              <span>Event Details & Scope</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Exhibition Name"
                placeholder="e.g. National Art & Sculpture Biennale 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
                disabled={isSubmitting}
                required
              />
              <Select
                label="Category / Type"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={categories}
                disabled={isSubmitting}
              />
            </div>
            <Textarea
              label="Description"
              placeholder="Provide a brief summary of the exhibition details, target audience, and features..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Step 2: Timeframe & Capacity Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar size={18} className="text-accent-400" />
              <span>Timeframe & Capacity Setup</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Start Date & Time"
                type="text"
                placeholder="YYYY-MM-DDTHH:MM (e.g. 2026-06-01T10:00)"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                error={errors.startDate}
                disabled={isSubmitting}
                required
              />
              <Input
                label="End Date & Time"
                type="text"
                placeholder="YYYY-MM-DDTHH:MM (e.g. 2026-06-10T18:00)"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                error={errors.endDate}
                disabled={isSubmitting}
                required
              />
            </div>
            <Input
              label="Maximum Cap (Visitors Capacity)"
              placeholder="e.g. 5000 (leave blank or 0 for unlimited)"
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              disabled={isSubmitting}
            />
          </CardContent>
        </Card>

        {/* Step 3: Venue & Location Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin size={18} className="text-accent-400" />
              <span>Venue & Location</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ExhibitionLocationPicker
              value={location}
              onChange={(loc) => {
                setLocation(loc);
                if (errors.location) {
                  setErrors((prev) => {
                    const copy = { ...prev };
                    delete copy.location;
                    return copy;
                  });
                }
              }}
              error={errors.location}
              disabled={isSubmitting}
              required
            />
          </CardContent>
        </Card>

        {/* Step 3: Ticket Pricing Configuration Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-gray-800/40 p-6">
            <CardTitle className="flex items-center gap-2 text-base">
              <Ticket size={18} className="text-accent-400" />
              <span>Ticket Type Pricing (INR)</span>
            </CardTitle>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddTicketType}
              className="text-xs font-semibold flex items-center gap-1 shrink-0"
              disabled={isSubmitting}
            >
              <Plus size={14} />
              <span>Add Class</span>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {ticketTypes.map((t, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end border-b border-gray-800/20 pb-4 last:border-0 last:pb-0">
                <div className="md:col-span-5">
                  <Input
                    label={index === 0 ? "Ticket Class Name" : undefined}
                    placeholder="e.g. Standard Entry, VIP Access, Kid Pass"
                    value={t.name}
                    onChange={(e) => handleTicketTypeChange(index, 'name', e.target.value)}
                    error={errors[`ticketType-${index}-name`]}
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <div className="md:col-span-3">
                  <Input
                    label={index === 0 ? "Price (₹)" : undefined}
                    placeholder="e.g. 150"
                    type="number"
                    step="0.01"
                    value={t.price}
                    onChange={(e) => handleTicketTypeChange(index, 'price', e.target.value)}
                    error={errors[`ticketType-${index}-price`]}
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <div className="md:col-span-3">
                  <Input
                    label={index === 0 ? "Quantity Cap (Optional)" : undefined}
                    placeholder="e.g. 2000"
                    type="number"
                    value={t.maxQuantity}
                    onChange={(e) => handleTicketTypeChange(index, 'maxQuantity', e.target.value)}
                    error={errors[`ticketType-${index}-maxQuantity`]}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="md:col-span-1 pb-1">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemoveTicketType(index)}
                    disabled={ticketTypes.length === 1 || isSubmitting}
                    className="h-10 w-10 p-0 flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Step 4: Roster & Staff Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users size={18} className="text-accent-400" />
              <span>Assigned Operations Staff Roster</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isStaffLoading ? (
              <div className="flex justify-center py-6">
                <Spinner size="md" className="text-accent-500" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Counter Staff List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-800 pb-1.5 flex items-center justify-between">
                    <span>Counter Staff</span>
                    <span className="text-[10px] text-gray-500 font-semibold">{counterStaffOptions.length} available</span>
                  </h4>
                  {counterStaffOptions.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">No counter staff available.</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-2.5 pr-2">
                      {counterStaffOptions.map((st) => (
                        <Checkbox
                          key={st.id}
                          label={`${st.name} (${st.staffId})`}
                          checked={!!selectedStaff[st.id]}
                          onChange={() => handleStaffToggle(st.id)}
                          disabled={isSubmitting}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Gate Staff List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-800 pb-1.5 flex items-center justify-between">
                    <span>Gate Scanning Staff</span>
                    <span className="text-[10px] text-gray-500 font-semibold">{gateStaffOptions.length} available</span>
                  </h4>
                  {gateStaffOptions.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">No gate validation staff available.</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-2.5 pr-2">
                      {gateStaffOptions.map((st) => (
                        <Checkbox
                          key={st.id}
                          label={`${st.name} (${st.staffId})`}
                          checked={!!selectedStaff[st.id]}
                          onChange={() => handleStaffToggle(st.id)}
                          disabled={isSubmitting}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 5: Notes & Submit */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Textarea
              label="Operating Notes"
              placeholder="Add any internal instructions or operational notes for the counter and gate teams here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              rows={2}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-800/40">
              <Link href="/admin/exhibitions" passHref>
                <Button variant="secondary" type="button" disabled={isSubmitting}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" isLoading={isSubmitting} className="font-semibold">
                Save & Initialize Exhibition
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
