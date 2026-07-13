'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Gamepad2, ArrowLeft, Save, IndianRupee, Users } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/providers/toast-provider';

export default function AdminRidesEditPage() {
  const { addToast } = useToast();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  // Form states
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [priceInRupees, setPriceInRupees] = React.useState('');
  const [status, setStatus] = React.useState<'open' | 'closed'>('open');
  const [selectedStaffIds, setSelectedStaffIds] = React.useState<string[]>([]);

  // Metadata/Roster loading states
  const [staffList, setStaffList] = React.useState<any[]>([]);
  const [isDataLoading, setIsDataLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (!id) return;
    async function loadData() {
      try {
        // Load ride details
        const rideRes = await fetch(`/api/rides/${id}`);
        const rideBody = await rideRes.json();

        // Load gate operators
        const staffRes = await fetch('/api/staff?role=gate');
        const staffBody = await staffRes.json();

        if (rideBody.success && staffBody.success) {
          const r = rideBody.data;
          setName(r.name);
          setDescription(r.description || '');
          setPriceInRupees((r.price / 100).toString());
          setStatus(r.status);
          setSelectedStaffIds(r.assignedStaff?.map((s: any) => s.id || s) || []);
          setStaffList(staffBody.data || []);
        } else {
          throw new Error('Failed to load ride details.');
        }
      } catch (err: any) {
        addToast({
          type: 'error',
          title: 'Data Load Failed',
          message: err.message,
        });
      } finally {
        setIsDataLoading(false);
      }
    }
    loadData();
  }, [id, addToast]);

  const handleStaffToggle = (staffId: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast({ type: 'warning', title: 'Name Required', message: 'Please enter a ride name.' });
      return;
    }
    const price = parseFloat(priceInRupees);
    if (isNaN(price) || price < 0) {
      addToast({ type: 'warning', title: 'Invalid Price', message: 'Price must be a positive number.' });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/rides/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          price: Math.round(price * 100), // convert to paise
          status,
          assignedStaff: selectedStaffIds,
        }),
      });

      const body = await res.json();
      if (res.ok && body.success) {
        addToast({
          type: 'success',
          title: 'Configurations Saved',
          message: `'${name}' parameters have been successfully updated.`,
        });
        router.push('/admin/rides');
      } else {
        throw new Error(body.error?.message || 'Failed to update ride settings.');
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error Saving Settings',
        message: err.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isDataLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" className="text-accent-500" />
      </div>
    );
  }

  const statusOptions = [
    { label: 'Open (Ready for entry)', value: 'open' },
    { label: 'Closed (Under maintenance)', value: 'closed' },
  ];

  return (
    <div className="space-y-6 flex flex-col flex-1 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/rides" passHref>
          <Button variant="secondary" size="sm" className="p-2 shrink-0">
            <ArrowLeft size={16} />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-50 flex items-center gap-2">
            <Gamepad2 className="text-accent-400" />
            <span>Edit Ride Configuration</span>
          </h1>
          <p className="mt-0.5 text-sm text-gray-400">
            Configure operations settings and staff rosters for this terminal point.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main info */}
          <div className="md:col-span-2 space-y-6">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-gray-150">Ride Details</CardTitle>
                <CardDescription className="text-gray-450">
                  Basic ride configuration settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-450 uppercase">Ride / Game Name</label>
                  <Input
                    required
                    placeholder="e.g. Giant Ferris Wheel"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-450 uppercase">Description</label>
                  <Textarea
                    placeholder="Provide ride rules or minimum height specifications..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-450 uppercase">Operation Status</label>
                    <Select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as 'open' | 'closed')}
                      options={statusOptions}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-450 uppercase">Price per Ticket (INR)</label>
                    <Input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 150.00"
                      value={priceInRupees}
                      onChange={(e) => setPriceInRupees(e.target.value)}
                      leftIcon={<IndianRupee size={15} className="text-gray-400" />}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Roster Assignment */}
          <div className="space-y-6">
            <Card className="bg-gray-900 border-gray-800 h-full flex flex-col">
              <CardHeader className="shrink-0">
                <CardTitle className="text-lg font-bold text-gray-150 flex items-center gap-2">
                  <Users size={18} className="text-accent-400" />
                  <span>Assign Staff</span>
                </CardTitle>
                <CardDescription className="text-gray-450">
                  Assign gate validators to scan ride tickets.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto max-h-[300px] space-y-3">
                {staffList.length === 0 ? (
                  <div className="text-xs text-warning-400 font-semibold py-4">
                    No active gate staff roster accounts found. Create gate staff first.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {staffList.map((staff) => (
                      <div
                        key={staff.id}
                        onClick={() => handleStaffToggle(staff.id)}
                        className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-800 hover:bg-gray-850 cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={selectedStaffIds.includes(staff.id)}
                          onChange={() => {}} // handled by click on container
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-200 truncate leading-none">{staff.name}</p>
                          <span className="text-[10px] font-semibold text-gray-400 leading-none block mt-1">
                            Ref: {staff.staffId}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-850">
          <Link href="/admin/rides" passHref>
            <Button variant="secondary" type="button" className="font-semibold">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isSaving}
            className="font-semibold flex items-center gap-2"
            leftIcon={isSaving ? <Spinner size="sm" /> : <Save size={16} />}
          >
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
