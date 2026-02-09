import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { Settings2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import type { BusinessTypePresetPublic } from '@/types/register.types';

const CATEGORY_LABELS: Record<string, string> = {
    sales: 'Penjualan',
    inventory: 'Inventori',
    marketing: 'Pemasaran',
    service: 'Layanan',
    advanced: 'Lanjutan',
};

interface FeatureConfirmStepProps {
    businessType: string;
    preset: BusinessTypePresetPublic | undefined;
    allFeatures: { key: string; label: string; description: string; category: string }[];
    isLoading: boolean;
    selectedFeatures: string[];
    onFeaturesChange: (features: string[]) => void;
    onNext: () => void;
    onBack: () => void;
}

export function FeatureConfirmStep({
    businessType,
    preset,
    allFeatures,
    isLoading,
    selectedFeatures,
    onFeaturesChange,
    onNext,
    onBack,
}: FeatureConfirmStepProps) {
    const [showEditModal, setShowEditModal] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<string[]>(['sales', 'inventory']);

    const toggleCategory = (category: string) => {
        setExpandedCategories((prev) =>
            prev.includes(category)
                ? prev.filter((c) => c !== category)
                : [...prev, category]
        );
    };

    const toggleFeature = (featureKey: string) => {
        onFeaturesChange(
            selectedFeatures.includes(featureKey)
                ? selectedFeatures.filter((f) => f !== featureKey)
                : [...selectedFeatures, featureKey]
        );
    };

    // Group features by category
    const featuresByCategory = allFeatures.reduce<Record<string, typeof allFeatures>>((acc, feature) => {
        const cat = feature.category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(feature);
        return acc;
    }, {});

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="mb-6 text-center">
                    <h2 className="text-xl font-bold">Konfirmasi Fitur</h2>
                </div>
                <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
        >
            <div className="mb-6 text-center">
                <h2 className="text-xl font-bold">Konfirmasi Fitur</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Fitur berikut akan diaktifkan untuk bisnis Anda
                </p>
            </div>

            {/* Business Type Summary */}
            <Card className="mb-4">
                <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Tipe Bisnis</p>
                            <p className="font-semibold">{preset?.label ?? businessType}</p>
                        </div>
                        <Badge variant="secondary">{selectedFeatures.length} Fitur Aktif</Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Features Preview */}
            <div className="max-h-[40vh] overflow-y-auto space-y-2 mb-4 pr-1">
                {Object.entries(featuresByCategory).map(([category, features]) => {
                    const enabledInCategory = features.filter((f) =>
                        selectedFeatures.includes(f.key)
                    );
                    if (enabledInCategory.length === 0) return null;

                    return (
                        <div
                            key={category}
                            className="rounded-lg border bg-card"
                        >
                            <button
                                type="button"
                                onClick={() => toggleCategory(category)}
                                className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">
                                        {CATEGORY_LABELS[category] ?? category}
                                    </span>
                                    <Badge variant="outline" className="text-[10px]">
                                        {enabledInCategory.length}
                                    </Badge>
                                </div>
                                {expandedCategories.includes(category) ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                            </button>

                            {expandedCategories.includes(category) && (
                                <div className="px-3 pb-3 space-y-1">
                                    {enabledInCategory.map((feature) => (
                                        <div
                                            key={feature.key}
                                            className="flex items-center gap-2 text-sm py-1"
                                        >
                                            <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                            <span>{feature.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Edit Features Button */}
            <Button
                type="button"
                variant="outline"
                className="w-full mb-4"
                onClick={() => setShowEditModal(true)}
            >
                <Settings2 className="h-4 w-4 mr-2" />
                Sesuaikan Fitur
            </Button>

            {/* Navigation */}
            <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={onBack} className="flex-1">
                    Kembali
                </Button>
                <Button type="button" onClick={onNext} className="flex-1">
                    Lanjut
                </Button>
            </div>

            {/* Feature Edit Modal */}
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Sesuaikan Fitur</DialogTitle>
                        <DialogDescription>
                            Aktifkan atau nonaktifkan fitur sesuai kebutuhan bisnis Anda
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                        {/* Warning */}
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                            <p className="text-xs text-amber-800 dark:text-amber-200">
                                Anda bisa mengubah fitur kapan saja di Settings setelah selesai pendaftaran.
                            </p>
                        </div>

                        {Object.entries(featuresByCategory).map(([category, features]) => (
                            <Card key={category}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        {CATEGORY_LABELS[category] ?? category}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {features.map((feature) => (
                                        <div
                                            key={feature.key}
                                            className="flex items-center justify-between"
                                        >
                                            <div className="flex-1 pr-4">
                                                <p className="text-sm font-medium">{feature.label}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {feature.description}
                                                </p>
                                            </div>
                                            <Switch
                                                checked={selectedFeatures.includes(feature.key)}
                                                onCheckedChange={() => toggleFeature(feature.key)}
                                            />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="pt-4 border-t">
                        <Button onClick={() => setShowEditModal(false)} className="w-full">
                            Selesai ({selectedFeatures.length} fitur dipilih)
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
