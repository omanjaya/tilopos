import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { MobileNavSpacer } from '@/components/shared/mobile-nav';
import { Scissors, Merge } from 'lucide-react';
import { SplitBillForm, MergeBillForm } from './components/bill-forms';

/**
 * TablesPage Mobile Version
 *
 * Mobile-optimized bill management (layout editing is desktop-only):
 * - Split / merge bill actions in bottom sheets
 */
export function TablesPage() {
  const [splitOpen, setSplitOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold">Manajemen Meja</h1>
          <p className="text-sm text-muted-foreground">Kelola tagihan meja restoran</p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="mb-4 text-sm text-muted-foreground">
          Tambah meja dan atur denah tersedia di tampilan desktop.
        </p>

        <div className="space-y-3">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Scissors className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 space-y-2">
                  <CardTitle className="text-base">Pisah Tagihan</CardTitle>
                  <CardDescription className="text-xs">
                    Bagi satu tagihan menjadi beberapa bagian untuk pembayaran terpisah
                  </CardDescription>
                  <Button size="sm" className="w-full" onClick={() => setSplitOpen(true)}>
                    Pisah Tagihan
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Merge className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 space-y-2">
                  <CardTitle className="text-base">Gabung Tagihan</CardTitle>
                  <CardDescription className="text-xs">
                    Gabungkan beberapa tagihan menjadi satu pembayaran
                  </CardDescription>
                  <Button size="sm" className="w-full" onClick={() => setMergeOpen(true)}>
                    Gabung Tagihan
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>

      <MobileNavSpacer />

      <Sheet open={splitOpen} onOpenChange={setSplitOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Pisah Tagihan</SheetTitle>
            <SheetDescription>Bagi tagihan sama rata menjadi beberapa pembayaran.</SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            {splitOpen && (
              <SplitBillForm onDone={() => setSplitOpen(false)} onCancel={() => setSplitOpen(false)} />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={mergeOpen} onOpenChange={setMergeOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Gabung Tagihan</SheetTitle>
            <SheetDescription>Gabungkan beberapa tagihan menjadi satu.</SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            {mergeOpen && (
              <MergeBillForm onDone={() => setMergeOpen(false)} onCancel={() => setMergeOpen(false)} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
