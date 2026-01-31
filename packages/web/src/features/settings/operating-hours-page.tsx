import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/api/endpoints/settings.api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Plus, Trash2, Calendar } from 'lucide-react';
import type { DaySchedule, SpecialHour, UpdateOperatingHoursRequest } from '@/types/settings.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

const DEFAULT_SCHEDULE: DaySchedule[] = [
  { day: 'monday', dayLabel: 'Senin', isOpen: true, openTime: '08:00', closeTime: '22:00' },
  { day: 'tuesday', dayLabel: 'Selasa', isOpen: true, openTime: '08:00', closeTime: '22:00' },
  { day: 'wednesday', dayLabel: 'Rabu', isOpen: true, openTime: '08:00', closeTime: '22:00' },
  { day: 'thursday', dayLabel: 'Kamis', isOpen: true, openTime: '08:00', closeTime: '22:00' },
  { day: 'friday', dayLabel: 'Jumat', isOpen: true, openTime: '08:00', closeTime: '22:00' },
  { day: 'saturday', dayLabel: 'Sabtu', isOpen: true, openTime: '09:00', closeTime: '23:00' },
  { day: 'sunday', dayLabel: 'Minggu', isOpen: true, openTime: '09:00', closeTime: '23:00' },
];

export function OperatingHoursPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);
  const [specialHours, setSpecialHours] = useState<Omit<SpecialHour, 'id'>[]>([]);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayIsOpen, setNewHolidayIsOpen] = useState(false);
  const [newHolidayOpenTime, setNewHolidayOpenTime] = useState('09:00');
  const [newHolidayCloseTime, setNewHolidayCloseTime] = useState('17:00');

  const { data: operatingHours, isLoading } = useQuery({
    queryKey: ['operatingHours'],
    queryFn: settingsApi.getOperatingHours,
  });

  useEffect(() => {
    if (operatingHours) {
      if (Array.isArray(operatingHours.schedule) && operatingHours.schedule.length > 0) {
        setSchedule(operatingHours.schedule.map((d) => ({
          ...d,
          isOpen: d.isOpen ?? true,
        })));
      }
      setSpecialHours(
        (operatingHours.specialHours ?? []).map((h) => ({
          name: h.name,
          date: h.date,
          isOpen: h.isOpen ?? false,
          openTime: h.openTime,
          closeTime: h.closeTime,
        })),
      );
    }
  }, [operatingHours]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateOperatingHoursRequest) => settingsApi.updateOperatingHours(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operatingHours'] });
      toast({ title: 'Jam operasional berhasil disimpan' });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal menyimpan',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      schedule: schedule.map(({ day, isOpen, openTime, closeTime }) => ({
        day,
        isOpen,
        openTime,
        closeTime,
      })),
      specialHours,
    });
  };

  const handleToggleDay = (index: number) => {
    setSchedule(
      schedule.map((d, i) => (i === index ? { ...d, isOpen: !d.isOpen } : d)),
    );
  };

  const handleTimeChange = (
    index: number,
    field: 'openTime' | 'closeTime',
    value: string,
  ) => {
    setSchedule(
      schedule.map((d, i) => (i === index ? { ...d, [field]: value } : d)),
    );
  };

  const handleAddSpecialHour = () => {
    if (!newHolidayName.trim() || !newHolidayDate) return;
    setSpecialHours([
      ...specialHours,
      {
        name: newHolidayName.trim(),
        date: newHolidayDate,
        isOpen: newHolidayIsOpen,
        openTime: newHolidayIsOpen ? newHolidayOpenTime : null,
        closeTime: newHolidayIsOpen ? newHolidayCloseTime : null,
      },
    ]);
    setNewHolidayName('');
    setNewHolidayDate('');
    setNewHolidayIsOpen(false);
  };

  const handleRemoveSpecialHour = (index: number) => {
    setSpecialHours(specialHours.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Jam Operasional" description="Atur jadwal buka dan tutup outlet" />
        <Card>
          <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Jam Operasional" description="Atur jadwal buka dan tutup outlet" />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Jadwal Mingguan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {schedule.map((day, index) => (
              <div
                key={day.day}
                className="flex items-center gap-4 rounded-lg border p-3"
              >
                <div className="flex w-24 items-center gap-2">
                  <Switch
                    checked={day.isOpen}
                    onCheckedChange={() => handleToggleDay(index)}
                  />
                  <span className="text-sm font-medium">{day.dayLabel}</span>
                </div>

                {day.isOpen ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={day.openTime}
                      onChange={(e) => handleTimeChange(index, 'openTime', e.target.value)}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">sampai</span>
                    <Input
                      type="time"
                      value={day.closeTime}
                      onChange={(e) => handleTimeChange(index, 'closeTime', e.target.value)}
                      className="w-32"
                    />
                  </div>
                ) : (
                  <Badge variant="outline">Tutup</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Hari Khusus / Libur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {specialHours.length > 0 && (
              <div className="space-y-2">
                {specialHours.map((holiday, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <span className="text-sm font-medium">{holiday.name}</span>
                      <p className="text-xs text-muted-foreground">{holiday.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {holiday.isOpen ? (
                        <Badge variant="default">
                          Buka {holiday.openTime} - {holiday.closeTime}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Tutup</Badge>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleRemoveSpecialHour(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium">Tambah Hari Khusus</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="holidayName">Nama</Label>
                  <Input
                    id="holidayName"
                    value={newHolidayName}
                    onChange={(e) => setNewHolidayName(e.target.value)}
                    placeholder="Contoh: Hari Raya Idul Fitri"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="holidayDate">Tanggal</Label>
                  <Input
                    id="holidayDate"
                    type="date"
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="holidayIsOpen"
                  checked={newHolidayIsOpen}
                  onCheckedChange={setNewHolidayIsOpen}
                />
                <Label htmlFor="holidayIsOpen" className="text-sm">Buka di hari ini</Label>
              </div>
              {newHolidayIsOpen && (
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={newHolidayOpenTime}
                    onChange={(e) => setNewHolidayOpenTime(e.target.value)}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">sampai</span>
                  <Input
                    type="time"
                    value={newHolidayCloseTime}
                    onChange={(e) => setNewHolidayCloseTime(e.target.value)}
                    className="w-32"
                  />
                </div>
              )}
              <Button type="button" variant="outline" size="sm" onClick={handleAddSpecialHour}>
                <Plus className="mr-2 h-4 w-4" /> Tambah
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Simpan
          </Button>
        </div>
      </form>
    </div>
  );
}
