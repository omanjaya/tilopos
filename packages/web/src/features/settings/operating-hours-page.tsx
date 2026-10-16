import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/api/endpoints/settings.api';
import { useUIStore } from '@/stores/ui.store';
import { PageHeader } from '@/components/shared/page-header';
import { ErrorState } from '@/components/shared/error-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/lib/toast-utils';
import { handleMutationError } from '@/lib/api-error-handler';
import { Loader2, Save } from 'lucide-react';
import type { DaySchedule, UpdateOperatingHoursRequest } from '@/types/settings.types';

const PAGE_TITLE = 'Jam Operasional';
const PAGE_DESC = 'Atur jadwal buka dan tutup outlet';

export function OperatingHoursPage() {
  const queryClient = useQueryClient();
  const outletId = useUIStore((s) => s.selectedOutletId);

  const [schedule, setSchedule] = useState<DaySchedule[]>([]);

  const {
    data: operatingHours,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['operatingHours', outletId],
    queryFn: () => settingsApi.getOperatingHours(outletId as string),
    enabled: !!outletId,
  });

  useEffect(() => {
    if (operatingHours) {
      setSchedule(operatingHours.schedule);
    }
  }, [operatingHours]);

  const updateMutation = useMutation({
    mutationFn: (vars: { outletId: string; data: UpdateOperatingHoursRequest }) =>
      settingsApi.updateOperatingHours(vars.outletId, vars.data),
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['operatingHours', vars.outletId] });
      toast.success({ title: 'Jam operasional berhasil disimpan' });
    },
    onError: (err) => handleMutationError(err, 'Gagal menyimpan'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outletId || !operatingHours) return;
    const invalid = schedule.find((d) => d.isOpen && (!d.openTime || !d.closeTime));
    if (invalid) {
      toast.error({ title: `Isi jam buka dan tutup untuk hari ${invalid.dayLabel}` });
      return;
    }
    updateMutation.mutate({
      outletId,
      data: {
        schedule: schedule.map(({ day, isOpen, openTime, closeTime }) => ({
          day,
          isOpen,
          openTime,
          closeTime,
        })),
      },
    });
  };

  const handleToggleDay = (index: number) => {
    setSchedule(schedule.map((d, i) => (i === index ? { ...d, isOpen: !d.isOpen } : d)));
  };

  const handleTimeChange = (index: number, field: 'openTime' | 'closeTime', value: string) => {
    setSchedule(schedule.map((d, i) => (i === index ? { ...d, [field]: value } : d)));
  };

  if (!outletId) {
    return (
      <div>
        <PageHeader title={PAGE_TITLE} description={PAGE_DESC} />
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Pilih outlet terlebih dahulu untuk mengatur jam operasional.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title={PAGE_TITLE} description={PAGE_DESC} />
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

  if (isError) {
    return (
      <div>
        <PageHeader title={PAGE_TITLE} description={PAGE_DESC} />
        <ErrorState
          title="Gagal memuat jam operasional"
          error={error}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={PAGE_TITLE} description={PAGE_DESC} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Jadwal Mingguan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {schedule.map((day, index) => (
              <div key={day.day} className="flex items-center gap-4 rounded-lg border p-3">
                <div className="flex w-24 items-center gap-2">
                  <Switch
                    checked={day.isOpen}
                    onCheckedChange={() => handleToggleDay(index)}
                    aria-label={`Buka hari ${day.dayLabel}`}
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
                      aria-label={`Jam buka ${day.dayLabel}`}
                      required
                    />
                    <span className="text-sm text-muted-foreground">sampai</span>
                    <Input
                      type="time"
                      value={day.closeTime}
                      onChange={(e) => handleTimeChange(index, 'closeTime', e.target.value)}
                      className="w-32"
                      aria-label={`Jam tutup ${day.dayLabel}`}
                      required
                    />
                  </div>
                ) : (
                  <Badge variant="outline">Tutup</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            aria-busy={updateMutation.isPending}
            aria-label={updateMutation.isPending ? 'Menyimpan...' : undefined}
          >
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
