import { motion } from 'framer-motion';
import { Store } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const businessSchema = z.object({
  name: z.string().min(2, 'Nama bisnis minimal 2 karakter'),
  phone: z.string().min(10, 'Nomor telepon minimal 10 digit'),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  address: z.string().optional(),
});

type BusinessFormData = z.infer<typeof businessSchema>;

interface BusinessStepProps {
  onNext: (data: BusinessFormData) => void;
  onBack: () => void;
  onSkip: () => void;
  defaultValues?: Partial<BusinessFormData>;
}

export function BusinessStep({ onNext, onBack, onSkip, defaultValues }: BusinessStepProps) {
  const form = useForm<BusinessFormData>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      phone: defaultValues?.phone || '',
      email: defaultValues?.email || '',
      address: defaultValues?.address || '',
    },
  });

  const onSubmit = (data: BusinessFormData) => {
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
          <Store className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Setup Informasi Bisnis</h2>
        <p className="mt-2 text-muted-foreground">
          Masukkan detail bisnis Anda. Ini akan tampil di struk dan laporan.
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
                <FormLabel>Nama Bisnis *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Contoh: Warung Kopi Senja"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nomor Telepon *</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="08xx-xxxx-xxxx"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email (Opsional)</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="email@contoh.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alamat (Opsional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Alamat lengkap bisnis Anda"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
