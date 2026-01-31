import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const outletSchema = z.object({
  name: z.string().min(2, 'Nama outlet minimal 2 karakter'),
  code: z.string().min(2, 'Kode outlet minimal 2 karakter').optional(),
  address: z.string().optional(),
  taxRate: z.number().min(0).max(100).default(11),
});

type OutletFormData = z.infer<typeof outletSchema>;

interface OutletStepProps {
  onNext: (data: OutletFormData) => void;
  onBack: () => void;
  onSkip: () => void;
  defaultValues?: Partial<OutletFormData>;
}

export function OutletStep({ onNext, onBack, onSkip, defaultValues }: OutletStepProps) {
  const form = useForm<OutletFormData>({
    resolver: zodResolver(outletSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      code: defaultValues?.code || '',
      address: defaultValues?.address || '',
      taxRate: defaultValues?.taxRate ?? 11,
    },
  });

  const onSubmit = (data: OutletFormData) => {
    onNext(data);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="py-8"
    >
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <MapPin className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Setup Outlet Pertama</h2>
        <p className="mt-2 text-muted-foreground">
          Buat outlet pertama Anda. Anda bisa menambahkan lebih banyak outlet nanti.
        </p>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto max-w-md space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Outlet *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Contoh: Outlet Pusat"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kode Outlet (Opsional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Contoh: HQ01"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground">
                  Kode unik untuk identifikasi outlet di laporan
                </p>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alamat Outlet (Opsional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Alamat lengkap outlet"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="taxRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pajak PPN (%) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground">
                  Default 11% sesuai PPN Indonesia. Bisa diubah nanti di pengaturan.
                </p>
              </FormItem>
            )}
          />

          {/* Info Box */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <span className="font-medium">Tips:</span> Anda bisa menambahkan
              lebih banyak outlet kapan saja melalui menu Pengaturan.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="flex-1"
            >
              Kembali
            </Button>
            <Button type="submit" className="flex-1">
              Lanjut
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={onSkip}
            className="w-full"
          >
            Lewati langkah ini
          </Button>
        </form>
      </Form>
    </motion.div>
  );
}
