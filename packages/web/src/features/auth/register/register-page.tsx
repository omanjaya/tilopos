import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { authApi } from '@/api/endpoints/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { useFeatureStore } from '@/stores/feature.store';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { AccountStep, type AccountData } from './steps/account-step';
import { BusinessTypeStep } from './steps/business-type-step';
import { BusinessInfoStep, type BusinessInfoData } from './steps/business-info-step';
import { SuccessStep } from './steps/success-step';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';
import type { RegisterRequest, RegisterResponse } from '@/types/register.types';

interface FormData {
  account: AccountData | null;
  businessType: string;
  businessInfo: BusinessInfoData | null;
}

const STEPS = [
  { id: 'account', label: 'Akun' },
  { id: 'business-type', label: 'Tipe Bisnis' },
  { id: 'business-info', label: 'Info Bisnis' },
  { id: 'success', label: 'Selesai' },
];

export function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    account: null,
    businessType: '',
    businessInfo: null,
  });
  const [registerResult, setRegisterResult] = useState<RegisterResponse | null>(null);

  const setAuth = useAuthStore((s) => s.setAuth);
  const setBusinessType = useFeatureStore((s) => s.setBusinessType);
  const setEnabledFeatures = useFeatureStore((s) => s.setEnabledFeatures);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: presetsData, isLoading: presetsLoading } = useQuery({
    queryKey: ['business-type-presets-public'],
    queryFn: authApi.getBusinessTypePresets,
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      // Clear all cached data from previous session
      queryClient.clear();

      setAuth(
        {
          id: data.employeeId,
          name: data.employeeName,
          email: null,
          role: data.role as 'owner',
          businessId: data.businessId,
          outletId: data.outletId,
          employeeId: data.employeeId,
          onboardingCompleted: true,
        },
        data.accessToken,
      );
      setBusinessType(data.businessType);
      setEnabledFeatures(data.enabledFeatures);
      setRegisterResult(data);
      setCurrentStep(3);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Pendaftaran gagal',
        description: error.response?.data?.message || 'Terjadi kesalahan saat mendaftar',
      });
    },
  });

  const handleAccountNext = (data: AccountData) => {
    setFormData((prev) => ({ ...prev, account: data }));
    setCurrentStep(1);
  };

  const handleBusinessTypeNext = (businessType: string) => {
    setFormData((prev) => ({ ...prev, businessType }));
    setCurrentStep(2);
  };

  const handleBusinessInfoSubmit = (data: BusinessInfoData) => {
    setFormData((prev) => ({ ...prev, businessInfo: data }));

    const account = formData.account;
    if (!account) return;

    const request: RegisterRequest = {
      ownerName: account.ownerName,
      email: account.email,
      pin: account.pin,
      confirmPin: account.confirmPin,
      phone: account.phone,
      businessType: formData.businessType,
      businessName: data.businessName,
      businessPhone: data.businessPhone,
      businessAddress: data.businessAddress,
      outletName: data.outletName,
      outletCode: data.outletCode,
      outletAddress: data.outletAddress,
      taxRate: data.taxRate,
    };

    registerMutation.mutate(request);
  };

  const businessTypeLabel =
    presetsData?.presets.find((p) => p.code === (registerResult?.businessType ?? formData.businessType))
      ?.label ?? formData.businessType;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-xl">
        <CardContent className="pt-6">
          <div className="mb-2 text-center">
            <h1 className="text-2xl font-bold">TILO</h1>
            <p className="text-xs text-muted-foreground">Daftar akun baru</p>
          </div>

          {currentStep < 3 && (
            <div className="mb-6 flex items-center justify-center gap-2">
              {STEPS.slice(0, 3).map((step, idx) => (
                <div key={step.id} className="flex items-center gap-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${idx <= currentStep
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                      }`}
                  >
                    {idx < currentStep ? '\u2713' : idx + 1}
                  </div>
                  {idx < 2 && (
                    <div
                      className={`h-0.5 w-6 ${idx < currentStep ? 'bg-primary' : 'bg-muted'
                        }`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <AccountStep
                key="account"
                defaultValues={formData.account ?? undefined}
                onNext={handleAccountNext}
              />
            )}
            {currentStep === 1 && (
              <BusinessTypeStep
                key="business-type"
                grouped={presetsData?.grouped}
                isLoading={presetsLoading}
                defaultValue={formData.businessType}
                onNext={handleBusinessTypeNext}
                onBack={() => setCurrentStep(0)}
              />
            )}
            {currentStep === 2 && (
              <BusinessInfoStep
                key="business-info"
                defaultValues={formData.businessInfo ?? undefined}
                isPending={registerMutation.isPending}
                onSubmit={handleBusinessInfoSubmit}
                onBack={() => setCurrentStep(1)}
              />
            )}
            {currentStep === 3 && registerResult && (
              <SuccessStep
                key="success"
                businessName={formData.businessInfo?.businessName ?? ''}
                businessType={businessTypeLabel}
                featuresEnabled={registerResult.featuresEnabled}
              />
            )}
          </AnimatePresence>

          {currentStep < 3 && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Sudah punya akun?{' '}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Masuk
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
