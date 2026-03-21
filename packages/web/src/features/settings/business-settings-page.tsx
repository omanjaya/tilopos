import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { settingsApi } from '@/api/endpoints/settings.api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InlineHelpCard, HelpSidebar } from '@/components/shared/help-sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from '@/lib/toast-utils';
import { handleMutationError } from '@/lib/api-error-handler';
import { Loader2, Save } from 'lucide-react';
import type { UpdateBusinessRequest } from '@/types/settings.types';

// Zod schema for business settings validation
const businessSettingsSchema = z.object({
  name: z.string().min(2, 'Nama bisnis minimal harus 2 karakter'),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type BusinessSettingsFormData = z.infer<typeof businessSettingsSchema>;

export function BusinessSettingsPage() {
  const queryClient = useQueryClient();

  const form = useForm<BusinessSettingsFormData>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
    },
  });

  const { data: business, isLoading } = useQuery({
    queryKey: ['business'],
    queryFn: settingsApi.getBusiness,
  });

  useEffect(() => {
    if (business) {
      form.reset({
        name: business.name ?? '',
        email: business.email ?? '',
        phone: business.phone ?? '',
        address: business.address ?? '',
      });
    }
  }, [business, form]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateBusinessRequest) => settingsApi.updateBusiness(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business'] });
      toast.success({ title: 'Pengaturan bisnis berhasil disimpan' });
    },
    onError: (error) => handleMutationError(error, 'Gagal menyimpan'),
  });

  const onSubmit = (data: BusinessSettingsFormData) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Pengaturan Bisnis" description="Kelola informasi bisnis Anda">
          <HelpSidebar page="settings" />
        </PageHeader>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Pengaturan Bisnis" description="Kelola informasi bisnis Anda">
        <HelpSidebar page="settings" />
      </PageHeader>

      <InlineHelpCard page="settings" className="mb-4" />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informasi Bisnis</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Bisnis</FormLabel>
                    <FormControl>
                      <Input placeholder="Masukkan nama bisnis" {...field} />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Masukkan email bisnis" {...field} />
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
                    <FormLabel>Telepon</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="Masukkan nomor telepon" {...field} />
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
                    <FormLabel>Alamat</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Masukkan alamat bisnis" rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-2">
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
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
