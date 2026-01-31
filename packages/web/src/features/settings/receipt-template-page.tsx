import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/api/endpoints/settings.api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import type { UpdateReceiptTemplateRequest } from '@/types/settings.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

export function ReceiptTemplatePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showLogo, setShowLogo] = useState(true);
  const [showAddress, setShowAddress] = useState(true);
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(true);
  const [showBarcode, setShowBarcode] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [headerText, setHeaderText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>('80mm');

  const { data: template, isLoading } = useQuery({
    queryKey: ['receiptTemplate'],
    queryFn: settingsApi.getReceiptTemplate,
  });

  useEffect(() => {
    if (template) {
      setShowLogo(template.showLogo ?? true);
      setShowAddress(template.showAddress ?? true);
      setShowTaxBreakdown(template.showTaxBreakdown ?? true);
      setShowBarcode(template.showBarcode ?? false);
      setShowQrCode(template.showQrCode ?? false);
      setHeaderText(template.headerText ?? '');
      setFooterText(template.footerText ?? '');
      setPaperSize(template.paperSize ?? '80mm');
    }
  }, [template]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateReceiptTemplateRequest) => settingsApi.updateReceiptTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receiptTemplate'] });
      toast({ title: 'Template struk berhasil disimpan' });
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
      showLogo,
      showAddress,
      showTaxBreakdown,
      showBarcode,
      showQrCode,
      headerText,
      footerText,
      paperSize,
    });
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Template Struk" description="Kustomisasi tampilan struk penjualan" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
            <CardContent><Skeleton className="h-96 w-full" /></CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Template Struk" description="Kustomisasi tampilan struk penjualan" />

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Settings Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Elemen Struk</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="showLogo">Tampilkan Logo</Label>
                  <Switch id="showLogo" checked={showLogo} onCheckedChange={setShowLogo} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label htmlFor="showAddress">Tampilkan Alamat</Label>
                  <Switch id="showAddress" checked={showAddress} onCheckedChange={setShowAddress} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label htmlFor="showTaxBreakdown">Tampilkan Rincian Pajak</Label>
                  <Switch id="showTaxBreakdown" checked={showTaxBreakdown} onCheckedChange={setShowTaxBreakdown} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label htmlFor="showBarcode">Tampilkan Barcode</Label>
                  <Switch id="showBarcode" checked={showBarcode} onCheckedChange={setShowBarcode} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label htmlFor="showQrCode">Tampilkan QR Code</Label>
                  <Switch id="showQrCode" checked={showQrCode} onCheckedChange={setShowQrCode} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Teks & Ukuran</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="headerText">Teks Header</Label>
                  <Textarea
                    id="headerText"
                    value={headerText}
                    onChange={(e) => setHeaderText(e.target.value)}
                    placeholder="Masukkan teks header struk"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="footerText">Teks Footer</Label>
                  <Textarea
                    id="footerText"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="Contoh: Terima kasih atas kunjungan Anda!"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paperSize">Ukuran Kertas</Label>
                  <Select value={paperSize} onValueChange={(v) => setPaperSize(v as '58mm' | '80mm')}>
                    <SelectTrigger id="paperSize">
                      <SelectValue placeholder="Pilih ukuran" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="58mm">58mm (Kecil)</SelectItem>
                      <SelectItem value="80mm">80mm (Standar)</SelectItem>
                    </SelectContent>
                  </Select>
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
          </div>

          {/* Preview Panel */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-lg">Pratinjau Struk</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="mx-auto rounded border bg-white p-4 text-black"
                style={{ maxWidth: paperSize === '58mm' ? '220px' : '300px', fontFamily: 'monospace' }}
              >
                {showLogo && (
                  <div className="mb-2 text-center">
                    <div className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded bg-gray-200 text-xs text-gray-500">
                      Logo
                    </div>
                  </div>
                )}

                <div className="mb-2 text-center text-sm font-bold">Nama Bisnis</div>

                {showAddress && (
                  <div className="mb-2 text-center text-xs text-gray-600">
                    Jl. Contoh No. 123, Jakarta
                  </div>
                )}

                {headerText && (
                  <div className="mb-2 text-center text-xs">{headerText}</div>
                )}

                <div className="my-2 border-t border-dashed border-gray-400" />

                <div className="mb-1 text-xs">
                  <div className="flex justify-between">
                    <span>No:</span>
                    <span>INV-001</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tanggal:</span>
                    <span>30/01/2026</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kasir:</span>
                    <span>Admin</span>
                  </div>
                </div>

                <div className="my-2 border-t border-dashed border-gray-400" />

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Nasi Goreng x1</span>
                    <span>Rp25.000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Es Teh x2</span>
                    <span>Rp16.000</span>
                  </div>
                </div>

                <div className="my-2 border-t border-dashed border-gray-400" />

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>Rp41.000</span>
                  </div>
                  {showTaxBreakdown && (
                    <>
                      <div className="flex justify-between">
                        <span>PPN (11%)</span>
                        <span>Rp4.510</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Service</span>
                        <span>Rp0</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>Rp45.510</span>
                  </div>
                </div>

                <div className="my-2 border-t border-dashed border-gray-400" />

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Tunai</span>
                    <span>Rp50.000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kembalian</span>
                    <span>Rp4.490</span>
                  </div>
                </div>

                {showBarcode && (
                  <div className="mt-3 flex justify-center">
                    <div className="h-8 w-3/4 bg-gray-200 text-center text-[8px] leading-8 text-gray-500">
                      BARCODE
                    </div>
                  </div>
                )}

                {showQrCode && (
                  <div className="mt-3 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center bg-gray-200 text-[8px] text-gray-500">
                      QR
                    </div>
                  </div>
                )}

                {footerText && (
                  <div className="mt-3 text-center text-xs text-gray-600">{footerText}</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
