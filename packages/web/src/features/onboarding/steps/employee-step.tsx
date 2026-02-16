import { motion } from 'framer-motion';
import { UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const employeeSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  pin: z.string().min(4, 'PIN minimal 4 digit').max(6, 'PIN maksimal 6 digit').regex(/^\d+$/, 'PIN harus berupa angka'),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

interface EmployeeStepProps {
  onNext: (data: EmployeeFormData) => void;
  onBack: () => void;
  onSkip: () => void;
  defaultValues?: Partial<EmployeeFormData>;
}

export function EmployeeStep({ onNext, onBack, onSkip, defaultValues }: EmployeeStepProps) {
  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      email: defaultValues?.email || '',
      pin: defaultValues?.pin || '',
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="py-4"
    >
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <UserPlus className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Tambah Kasir Pertama</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tambahkan karyawan pertama Anda. Langkah ini opsional — bisa ditambahkan nanti.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onNext)} className="mx-auto max-w-md space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Karyawan *</FormLabel>
                <FormControl>
                  <Input placeholder="Contoh: Budi Santoso" {...field} />
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
                  <Input type="email" placeholder="email@contoh.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PIN Kasir *</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="4-6 digit angka"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground">
                  PIN digunakan untuk login kasir di POS terminal.
                </p>
              </FormItem>
            )}
          />

          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1">
              Kembali
            </Button>
            <Button type="submit" className="flex-1">
              Lanjut
            </Button>
          </div>

          <Button type="button" variant="ghost" onClick={onSkip} className="w-full">
            Lewati — tambah nanti
          </Button>
        </form>
      </Form>
    </motion.div>
  );
}
