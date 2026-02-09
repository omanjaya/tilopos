import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const businessInfoSchema = z.object({
  businessName: z.string().min(2, 'Nama bisnis minimal 2 karakter').max(255),
  businessPhone: z.string().optional(),
  businessAddress: z.string().optional(),
  outletName: z.string().min(2, 'Nama outlet minimal 2 karakter').max(255),
  outletCode: z.string().optional(),
  outletAddress: z.string().optional(),
  taxRate: z.coerce.number().min(0).max(100).default(11),
});

export type BusinessInfoData = z.infer<typeof businessInfoSchema>;

interface BusinessInfoStepProps {
  defaultValues?: Partial<BusinessInfoData>;
  isPending: boolean;
  onSubmit: (data: BusinessInfoData) => void;
  onBack: () => void;
}

export function BusinessInfoStep({ defaultValues, isPending, onSubmit, onBack }: BusinessInfoStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BusinessInfoData>({
    resolver: zodResolver(businessInfoSchema),
    defaultValues: {
      businessName: '',
      businessPhone: '',
      businessAddress: '',
      outletName: 'Outlet Utama',
      outletCode: '',
      outletAddress: '',
      taxRate: 11,
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
        <h2 className="text-xl font-bold">Informasi Bisnis</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Lengkapi data bisnis dan outlet pertama Anda
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">Data Bisnis</h3>

          <div className="space-y-2">
            <Label htmlFor="businessName">Nama Bisnis</Label>
            <Input
              id="businessName"
              placeholder="Nama bisnis Anda"
              {...register('businessName')}
            />
            {errors.businessName && (
              <p className="text-xs text-destructive">{errors.businessName.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessPhone">Telepon Bisnis (opsional)</Label>
              <Input
                id="businessPhone"
                type="tel"
                placeholder="08xxxxxxxxxx"
                {...register('businessPhone')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxRate">Pajak (%)</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('taxRate', { valueAsNumber: true })}
              />
              {errors.taxRate && (
                <p className="text-xs text-destructive">{errors.taxRate.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessAddress">Alamat Bisnis (opsional)</Label>
            <Input
              id="businessAddress"
              placeholder="Alamat lengkap"
              {...register('businessAddress')}
            />
          </div>
        </div>

        <div className="border-t pt-4 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">Outlet Pertama</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="outletName">Nama Outlet</Label>
              <Input
                id="outletName"
                placeholder="Outlet Utama"
                {...register('outletName')}
              />
              {errors.outletName && (
                <p className="text-xs text-destructive">{errors.outletName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="outletCode">Kode Outlet (opsional)</Label>
              <Input
                id="outletCode"
                placeholder="OTL-001"
                {...register('outletCode')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="outletAddress">Alamat Outlet (opsional)</Label>
            <Input
              id="outletAddress"
              placeholder="Alamat outlet"
              {...register('outletAddress')}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onBack} disabled={isPending} className="flex-1">
            Kembali
          </Button>
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Daftar Sekarang
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
