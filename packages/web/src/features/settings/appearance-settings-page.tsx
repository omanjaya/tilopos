import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/api/endpoints/settings.api';
import { useUIStore } from '@/stores/ui.store';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { BRAND_PRESETS, DEFAULT_BRAND_COLOR, isValidHex, applyBrandTheme } from '@/lib/color-utils';
import { cn } from '@/lib/utils';
import { Check, Loader2, Save, Palette, RotateCcw } from 'lucide-react';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

export function AppearanceSettingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const theme = useUIStore((s) => s.theme);
  const setBrandColor = useUIStore((s) => s.setBrandColor);
  const currentBrandColor = useUIStore((s) => s.brandColor);

  const [selectedColor, setSelectedColor] = useState(currentBrandColor ?? DEFAULT_BRAND_COLOR);
  const [customHex, setCustomHex] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const { data: business } = useQuery({
    queryKey: ['business'],
    queryFn: settingsApi.getBusiness,
  });

  // Sync from server settings on load
  useEffect(() => {
    if (business?.settings && typeof business.settings === 'object') {
      const serverColor = (business.settings as Record<string, unknown>).brandColor as string | undefined;
      if (serverColor && isValidHex(serverColor)) {
        setSelectedColor(serverColor);
        const isPreset = BRAND_PRESETS.some((p) => p.hex === serverColor);
        if (!isPreset) {
          setIsCustom(true);
          setCustomHex(serverColor);
        }
      }
    }
  }, [business]);

  const updateMutation = useMutation({
    mutationFn: (color: string) =>
      settingsApi.updateBusiness({
        settings: { ...(business?.settings as Record<string, unknown> ?? {}), brandColor: color },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business'] });
      toast({ title: 'Warna brand berhasil disimpan' });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal menyimpan',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const handleSelectPreset = (hex: string) => {
    setSelectedColor(hex);
    setIsCustom(false);
    setCustomHex('');
    // Live preview
    setBrandColor(hex);
    applyBrandTheme(hex, theme === 'dark');
  };

  const handleCustomHexChange = (value: string) => {
    let hex = value;
    if (!hex.startsWith('#')) hex = '#' + hex;
    setCustomHex(hex);
    if (isValidHex(hex)) {
      setSelectedColor(hex);
      setIsCustom(true);
      // Live preview
      setBrandColor(hex);
      applyBrandTheme(hex, theme === 'dark');
    }
  };

  const handleSave = () => {
    if (!isValidHex(selectedColor)) {
      toast({ variant: 'destructive', title: 'Warna tidak valid' });
      return;
    }
    setBrandColor(selectedColor);
    updateMutation.mutate(selectedColor);
  };

  const handleReset = () => {
    setSelectedColor(DEFAULT_BRAND_COLOR);
    setIsCustom(false);
    setCustomHex('');
    setBrandColor(null);
  };

  return (
    <div>
      <PageHeader title="Tampilan" description="Sesuaikan warna brand dan tampilan aplikasi" />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Color Picker */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palette className="h-5 w-5" />
                Warna Brand
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Presets grid */}
              <div>
                <Label className="text-sm font-medium">Pilih warna preset</Label>
                <div className="mt-3 grid grid-cols-4 gap-3">
                  {BRAND_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset.hex)}
                      className={cn(
                        'group relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all hover:shadow-md',
                        selectedColor === preset.hex && !isCustom
                          ? 'border-primary shadow-md'
                          : 'border-transparent hover:border-border',
                      )}
                    >
                      <div
                        className="relative h-12 w-12 rounded-full shadow-sm transition-transform group-hover:scale-110"
                        style={{ backgroundColor: preset.hex }}
                      >
                        {selectedColor === preset.hex && !isCustom && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/20">
                            <Check className="h-5 w-5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">{preset.label}</p>
                        <p className="text-[11px] text-muted-foreground">{preset.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom color */}
              <div>
                <Label className="text-sm font-medium">Atau masukkan warna custom</Label>
                <div className="mt-2 flex items-center gap-3">
                  <div
                    className="h-10 w-10 shrink-0 rounded-lg border shadow-sm"
                    style={{ backgroundColor: isCustom && isValidHex(customHex) ? customHex : selectedColor }}
                  />
                  <Input
                    value={customHex}
                    onChange={(e) => handleCustomHexChange(e.target.value)}
                    placeholder="#0284c7"
                    className="max-w-[180px] font-mono"
                  />
                  {isCustom && isValidHex(customHex) && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600">
                      <Check className="h-3 w-3" /> Valid
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Simpan
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset ke Default
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mini sidebar preview */}
              <div className="rounded-lg border overflow-hidden">
                <div className="bg-sidebar p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
                      <span className="text-[10px] font-bold text-primary-foreground">T</span>
                    </div>
                    <span className="text-xs font-bold text-sidebar-foreground">TiloPOS</span>
                  </div>
                  <div className="space-y-1">
                    <div className="rounded-md bg-sidebar-primary/15 px-2 py-1.5">
                      <span className="text-[11px] font-medium text-sidebar-primary">Dashboard</span>
                    </div>
                    <div className="rounded-md px-2 py-1.5">
                      <span className="text-[11px] text-sidebar-muted-foreground">POS Terminal</span>
                    </div>
                    <div className="rounded-md px-2 py-1.5">
                      <span className="text-[11px] text-sidebar-muted-foreground">Transaksi</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Button previews */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Tombol</p>
                <div className="flex gap-2">
                  <Button size="sm">Primary</Button>
                  <Button size="sm" variant="outline">Outline</Button>
                </div>
              </div>

              {/* Badge preview */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Indikator Aktif</p>
                <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  Item aktif
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
