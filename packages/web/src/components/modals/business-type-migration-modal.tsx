import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/lib/toast-utils';
import { handleMutationError } from '@/lib/api-error-handler';
import { useFeatureStore } from '@/stores/feature.store';
import { featuresApi } from '@/api/endpoints/features.api';
import { cn } from '@/lib/utils';
import { useCan } from '@/features/auth/use-permission';
import { ErrorState } from '@/components/shared/error-state';
import {
    CheckCircle2, Utensils, Coffee, ShoppingCart, Shirt, Hammer,
    Scissors, Warehouse, Settings, Sparkles, ArrowRight, AlertTriangle,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
    Utensils, Coffee, ShoppingCart, Shirt, Hammer, Scissors, Warehouse, Settings,
};

const STORAGE_KEY = 'tilo_business_type_prompted';

// eslint-disable-next-line react-refresh/only-export-components
export function useBusinessTypeMigration() {
    const businessType = useFeatureStore((s) => s.businessType);
    const isLoaded = useFeatureStore((s) => s.isLoaded);
    // PUT /business/type and GET /business/types/presets are @Roles(OWNER, MANAGER)
    const canMigrate = useCan('businessType.migrate');

    const wasPrompted = () => {
        try {
            return localStorage.getItem(STORAGE_KEY) === 'true';
        } catch (error) {
            console.warn('Cannot read business-type prompt flag', error);
            return false;
        }
    };

    const setPrompted = () => {
        try {
            localStorage.setItem(STORAGE_KEY, 'true');
        } catch (error) {
            // intentionally ignored: storage unavailable only means the prompt may reappear
            console.warn('Cannot persist business-type prompt flag', error);
        }
    };

    // Show prompt if:
    // 1. Features are loaded
    // 2. Business type is 'custom' or null (legacy user)
    // 3. User hasn't been prompted before
    // 4. User's role may change the business type (owner/manager)
    const shouldShowPrompt = canMigrate && isLoaded &&
        (businessType === 'custom' || businessType === null) &&
        !wasPrompted();

    return { shouldShowPrompt, setPrompted };
}

interface BusinessTypeMigrationModalProps {
    open: boolean;
    onClose: () => void;
    onComplete: () => void;
}

export function BusinessTypeMigrationModal({
    open,
    onClose,
    onComplete,
}: BusinessTypeMigrationModalProps) {
    const [selected, setSelected] = useState<string | null>(null);
    const [confirming, setConfirming] = useState(false);
    const setBusinessType = useFeatureStore((s) => s.setBusinessType);

    const { data: presetsData, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['business-type-presets'],
        queryFn: featuresApi.getTypePresets,
        enabled: open,
    });

    const migrateMutation = useMutation({
        mutationFn: (businessType: string) => featuresApi.changeBusinessType(businessType),
        onSuccess: (data) => {
            setBusinessType(data.newType);
            toast.success({
                title: 'Tipe Bisnis Diperbarui',
                description: `${data.featuresEnabled} fitur telah diaktifkan`,
            });
            onComplete();
        },
        onError: (error) => handleMutationError(error, 'Gagal memperbarui tipe bisnis'),
    });

    const handleSkip = () => {
        onComplete();
    };

    const handleSubmit = () => {
        if (!selected) return;
        if (!confirming) {
            setConfirming(true);
            return;
        }
        migrateMutation.mutate(selected);
    };

    const groupedPresets = presetsData?.grouped ?? {};

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle>Pilih Tipe Bisnis Anda</DialogTitle>
                            <DialogDescription>
                                Kami akan menyesuaikan fitur agar lebih relevan untuk bisnis Anda
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4">
                    {isError ? (
                        <ErrorState
                            title="Gagal memuat tipe bisnis"
                            error={error}
                            onRetry={() => void refetch()}
                        />
                    ) : isLoading ? (
                        <div className="grid grid-cols-2 gap-3">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <Skeleton key={i} className="h-32" />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4" role="radiogroup" aria-label="Tipe bisnis">
                            {Object.entries(groupedPresets).map(([category, presets]) => (
                                <div key={category}>
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                        {category === 'fnb' ? 'Food & Beverage' :
                                            category === 'retail' ? 'Retail' :
                                                category === 'service' ? 'Layanan' :
                                                    category === 'wholesale' ? 'Grosir' : category}
                                    </h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {presets.map((preset) => {
                                            const Icon = ICON_MAP[preset.icon] ?? Settings;
                                            const isSelected = selected === preset.code;

                                            return (
                                                <button
                                                    key={preset.code}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={isSelected}
                                                    onClick={() => {
                                                        setSelected(preset.code);
                                                        setConfirming(false);
                                                    }}
                                                    className={cn(
                                                        'relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all hover:shadow-md',
                                                        isSelected
                                                            ? 'border-primary bg-primary/5 shadow-sm'
                                                            : 'border-transparent bg-card hover:border-muted-foreground/20'
                                                    )}
                                                >
                                                    {isSelected && (
                                                        <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-primary" />
                                                    )}
                                                    <div
                                                        className={cn(
                                                            'flex h-9 w-9 items-center justify-center rounded-lg',
                                                            isSelected
                                                                ? 'bg-primary/10 text-primary'
                                                                : 'bg-muted text-muted-foreground'
                                                        )}
                                                    >
                                                        <Icon className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-semibold">{preset.label}</h4>
                                                        <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                                                            {preset.description}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {preset.examples.slice(0, 2).map((ex) => (
                                                            <Badge key={ex} variant="secondary" className="text-[10px]">
                                                                {ex}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {confirming && (
                    <div
                        role="alert"
                        className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                    >
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                        <p>
                            Mengubah tipe bisnis akan <strong>menonaktifkan produk, kategori, modifier, dan meja</strong> di
                            outlet ini, mengatur ulang fitur yang aktif, lalu memasang template tipe baru. Data lama
                            tidak dihapus permanen, tetapi tidak lagi tampil di POS. Tekan &quot;Ya, Terapkan&quot; untuk
                            melanjutkan.
                        </p>
                    </div>
                )}

                <div className="pt-4 border-t flex gap-3">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleSkip}
                        className="flex-1"
                    >
                        Lewati untuk Sekarang
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!selected || migrateMutation.isPending}
                        className="flex-1"
                    >
                        {migrateMutation.isPending ? 'Menyimpan...' : (
                            <>
                                {confirming ? 'Ya, Terapkan' : 'Terapkan'}
                                <ArrowRight className="h-4 w-4 ml-2" />
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
