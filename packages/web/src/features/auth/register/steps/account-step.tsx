import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';

const accountSchema = z
  .object({
    ownerName: z.string().min(2, 'Nama minimal 2 karakter').max(100),
    email: z.string().email('Email tidak valid'),
    pin: z.string().length(6, 'PIN harus 6 digit').regex(/^\d{6}$/, 'PIN harus berisi angka'),
    confirmPin: z.string().length(6, 'Konfirmasi PIN harus 6 digit'),
    phone: z.string().optional(),
  })
  .refine((data) => data.pin === data.confirmPin, {
    message: 'PIN tidak cocok',
    path: ['confirmPin'],
  });

export type AccountData = z.infer<typeof accountSchema>;

interface AccountStepProps {
  defaultValues?: Partial<AccountData>;
  onNext: (data: AccountData) => void;
}

export function AccountStep({ defaultValues, onNext }: AccountStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      ownerName: '',
      email: '',
      pin: '',
      confirmPin: '',
      phone: '',
      ...defaultValues,
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold">Buat Akun</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Masukkan informasi akun pemilik bisnis
        </p>
      </div>

      <form onSubmit={handleSubmit(onNext)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ownerName">Nama Lengkap</Label>
          <Input
            id="ownerName"
            placeholder="Nama pemilik bisnis"
            {...register('ownerName')}
            autoComplete="name"
          />
          {errors.ownerName && (
            <p className="text-xs text-destructive">{errors.ownerName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="nama@email.com"
            {...register('email')}
            autoComplete="email"
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">No. Telepon (opsional)</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="08xxxxxxxxxx"
            {...register('phone')}
            autoComplete="tel"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pin">PIN (6 digit)</Label>
            <Input
              id="pin"
              type="password"
              placeholder="------"
              maxLength={6}
              inputMode="numeric"
              {...register('pin')}
              autoComplete="new-password"
            />
            {errors.pin && (
              <p className="text-xs text-destructive">{errors.pin.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPin">Konfirmasi PIN</Label>
            <Input
              id="confirmPin"
              type="password"
              placeholder="------"
              maxLength={6}
              inputMode="numeric"
              {...register('confirmPin')}
              autoComplete="new-password"
            />
            {errors.confirmPin && (
              <p className="text-xs text-destructive">{errors.confirmPin.message}</p>
            )}
          </div>
        </div>

        <Button type="submit" className="w-full">
          Lanjut
        </Button>
      </form>
    </motion.div>
  );
}
