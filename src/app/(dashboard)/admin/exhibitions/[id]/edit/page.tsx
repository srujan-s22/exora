'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Calendar, MapPin, Ticket, Users, ArrowLeft, Plus, Trash2, Shield } from 'lucide-react';
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
import { hasAdminPermission } from '@/lib/utils/permission-helpers';
import type { Exhibition } from '@/types/exhibition.types';
import { ExhibitionLocationPicker, type SelectedExhibitionLocation } from '@/components/shared/exhibition-location-picker';

interface StaffOption {
  id: string;
  staffId: string;
  name: string;
  role: 'counter' | 'gate';
}

export default function EditExhibitionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { addToast } = useToast();
  const { user } = useAuth();
  const canManageLifecycle = hasAdminPermission(user, 'canManageExhibitions');

  // Loading states
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isStaffLoading, setIsStaffLoading] = React.useState(true);

  // Available staff loaded from API
  const [counterStaffOptions, setCounterStaffOptions] = React.useState<StaffOption[]>([]);
  const [gateStaffOptions, setGateStaffOptions] = React.useState<StaffOption[]>([]);

  // Form Fields
  const [name, setName] = React.useState('');
  const [category, setCategory] = React.useState('general');
  const [description, setDescription] = React.useState('');
  const [hasExistingLocation, setHasExistingLocation] = React.useState(false);
  const [location, setLocation] = React.useState<SelectedExhibitionLocation | null>(null);
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [capacity, setCapacity] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [status, setStatus] = React.useState('');

  // Ticket Types list
  const [ticketTypes, setTicketTypes] = React.useState<Array<{ name: string; price: string; maxQuantity: string }>>([]);

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

  // Exhibition status options
  const statusOptions = [
    { label: 'Draft', value: 'draft' },
    { label: 'Upcoming', value: 'upcoming' },
    { label: 'Active', value: 'active' },
    { label: 'Paused', value: 'paused' },
    { label: 'Completed', value: 'completed' },
    { label: 'Closed', value: 'closed' },
  ];

  // Helper: Format ISO date string into datetime-local format: YYYY-MM-DDTHH:MM
  const formatDatetimeLocal = (dateString: Date | string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISODate = new Date(date.getTime() - tzOffset).toISOString();
    return localISODate.slice(0, 16);
  };

  // Fetch available staff roster on mount
  React.useEffect(() => {
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
      } catch (err) {
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

  // Load existing exhibition values
  React.useEffect(() => {
    async function loadExhibition() {
      if (!id) return;
      try {
        const res = await fetch(`/api/exhibitions/${id}`);
        if (!res.ok) throw new Error('Failed to load exhibition data');
        
        const body = await res.json();
        if (body.success) {
          const exh = body.data as Exhibition;
          setName(exh.name);
          setCategory(exh.category || 'general');
          setDescription(exh.description || '');
          if (exh.location) {
            setHasExistingLocation(true);
            setLocation({
              placeId: exh.location.placeId,
              venueName: exh.location.venueName || '',
              address: exh.location.address || '',
              city: exh.location.city || '',
              state: exh.location.state || '',
              country: exh.location.country || '',
              postalCode: exh.location.postalCode || '',
              latitude: exh.location.latitude,
              longitude: exh.location.longitude,
            });
          } else {
            setHasExistingLocation(false);
            setLocation(null);
          }
          setStartDate(formatDatetimeLocal(exh.startDate));
          setEndDate(formatDatetimeLocal(exh.endDate));
          setCapacity(exh.capacity ? exh.capacity.toString() : '');
          setNotes(exh.notes || '');
          setStatus(exh.status);

          // Map ticket types prices from paise to Rupees
          const mappedTickets = exh.ticketTypes.map((t) => ({
            name: t.name,
            price: (t.price / 100).toString(),
            maxQuantity: t.maxQuantity ? t.maxQuantity.toString() : '',
          }));
          setTicketTypes(mappedTickets);

          // Map populated/unpopulated staff IDs into checkboxes
          const assignedIds: string[] = (exh as any).assignedStaffIds?.map((st: any) => 
            typeof st === 'object' ? st.id : st
          ) || [];
          
          const staffMap: Record<string, boolean> = {};
          assignedIds.forEach((sid) => {
            staffMap[sid] = true;
          });
          setSelectedStaff(staffMap);
        }
      } catch (err: any) {
        addToast({
          type: 'error',
          title: 'Load failed',
          message: err.message || 'Exhibition configuration details could not be resolved.',
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadExhibition();
  }, [id, addToast]);

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

    // If exhibition already had a configured location, require a valid location on update
    if (hasExistingLocation && !location) {
      newErrors.location = 'This exhibition requires a location. Please select one from the suggestions.';
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

      const payload: Record<string, any> = {
        name: name.trim(),
        category,
        description: description.trim() || undefined,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        ticketTypes: mappedTicketTypes,
        entryFee: primaryFee,
        capacity: capacity ? parseInt(capacity, 10) : 0,
        assignedStaffIds,
        status,
        notes: notes.trim() || undefined,
      };

      if (location) {
        payload.venue = location.venueName;
        payload.address = location.address;
        payload.location = {
          venueName: location.venueName,
          address: location.address,
          city: location.city,
          state: location.state,
          country: location.country,
          postalCode: location.postalCode,
          latitude: location.latitude,
          longitude: location.longitude,
          placeId: location.placeId,
        };
      }

      const res = await fetch(`/api/exhibitions/${id}`, {
        method: 'PATCH',
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
        throw new Error(body.error?.message || 'Failed to update exhibition');
      }

      addToast({
        type: 'success',
        title: 'Exhibition updated',
        message: `${name} details have been successfully modified.`,
      });
      router.push(`/admin/exhibitions/${id}`);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Update failed',
        message: err.message || 'An error occurred during submission.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner size="lg" className="text-accent-500" />
      </div>
    );
  }

  if (!canManageLifecycle) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-20 text-center space-y-4">
        <Shield className="w-12 h-12 text-error" />
        <h3 className="text-lg font-bold text-gray-200">Access Denied</h3>
        <p className="text-xs text-gray-400 max-w-md">
          You do not have the <strong>Manage Exhibition Lifecycle</strong> permission required to edit exhibition setup.
        </p>
        <Link href={`/admin/exhibitions/${id}`} passHref>
          <Button variant="secondary" className="text-xs font-semibold">
            Return to Exhibition Details
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Breadcrumb Nav */}
      <div className="flex items-center gap-3">
        <Link href={`/admin/exhibitions/${id}`} passHref>
          <Button variant="secondary" className="h-9 px-3 flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200">
            <ArrowLeft size={14} />
            <span>Cancel</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-50">Edit Exhibition Setup</h1>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Exhibition Name"
                  placeholder="e.g. National Art & Sculpture Biennale 2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={errors.name}
                  disabled={isSubmitting}
                  required
                />
              </div>
              <Select
                label="Operation Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={statusOptions}
                disabled={isSubmitting}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <Select
                label="Category / Type"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={categories}
                disabled={isSubmitting}
              />
              <Input
                label="Maximum Cap (Capacity)"
                placeholder="e.g. 5000 (leave blank or 0 for unlimited)"
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
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

        {/* Step 2: Date & Timeframe Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar size={18} className="text-accent-400" />
              <span>Timeframe & Schedule</span>
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
              required={hasExistingLocation}
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
              <Link href={`/admin/exhibitions/${id}`} passHref>
                <Button variant="secondary" type="button" disabled={isSubmitting}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" isLoading={isSubmitting} className="font-semibold">
                Save & Update Configuration
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
