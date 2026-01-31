import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, User, Phone, Mail, Star, Plus, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { customersApi } from '@/api/endpoints/customers.api';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Customer } from '@/types/customer.types';

interface CustomerSelectorProps {
    open: boolean;
    onClose: () => void;
    onSelect: (customer: Customer | null) => void;
    selectedCustomerId?: string;
}

export function CustomerSelector({
    open,
    onClose,
    onSelect,
    selectedCustomerId,
}: CustomerSelectorProps) {
    const [search, setSearch] = useState('');

    const { data: customers = [], isLoading } = useQuery({
        queryKey: ['customers', search],
        queryFn: () => customersApi.list({ search: search || undefined }),
        enabled: open,
    });

    const filteredCustomers = useMemo(() => {
        if (!search) return customers;
        const q = search.toLowerCase();
        return customers.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.phone?.toLowerCase().includes(q) ||
                c.email?.toLowerCase().includes(q)
        );
    }, [customers, search]);

    const handleSelect = (customer: Customer) => {
        onSelect(customer);
        onClose();
    };

    const handleClear = () => {
        onSelect(null);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        Pilih Pelanggan
                    </DialogTitle>
                    <DialogDescription>
                        Cari dan pilih pelanggan untuk transaksi ini
                    </DialogDescription>
                </DialogHeader>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari nama, telepon, atau email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                        autoFocus
                    />
                </div>

                {/* Customer List */}
                <ScrollArea className="h-[400px] -mx-6 px-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                    ) : filteredCustomers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <User className="h-12 w-12 mb-4 opacity-50" />
                            <p className="font-medium">Tidak ada pelanggan</p>
                            <p className="text-sm">
                                {search ? 'Coba kata kunci lain' : 'Belum ada data pelanggan'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredCustomers.map((customer) => (
                                <CustomerCard
                                    key={customer.id}
                                    customer={customer}
                                    isSelected={customer.id === selectedCustomerId}
                                    onSelect={() => handleSelect(customer)}
                                />
                            ))}
                        </div>
                    )}
                </ScrollArea>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t">
                    {selectedCustomerId && (
                        <Button variant="outline" onClick={handleClear} className="gap-2">
                            <X className="h-4 w-4" />
                            Hapus Pilihan
                        </Button>
                    )}
                    <Button variant="outline" className="gap-2 ml-auto">
                        <Plus className="h-4 w-4" />
                        Tambah Baru
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

interface CustomerCardProps {
    customer: Customer;
    isSelected: boolean;
    onSelect: () => void;
}

function CustomerCard({ customer, isSelected, onSelect }: CustomerCardProps) {
    const loyaltyTier = getLoyaltyTier(customer.loyaltyPoints);

    return (
        <button
            onClick={onSelect}
            className={cn(
                'w-full text-left p-4 rounded-lg border transition-all',
                'hover:border-primary hover:bg-primary/5',
                isSelected && 'border-primary bg-primary/10 ring-2 ring-primary/20'
            )}
        >
            <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center shrink-0">
                    <span className="text-lg font-semibold text-primary">
                        {customer.name.charAt(0).toUpperCase()}
                    </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className="font-semibold truncate">{customer.name}</h4>
                        {isSelected && (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        {customer.phone && (
                            <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {customer.phone}
                            </span>
                        )}
                        {customer.email && (
                            <span className="flex items-center gap-1 truncate">
                                <Mail className="h-3 w-3" />
                                {customer.email}
                            </span>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 mt-2">
                        <Badge variant={loyaltyTier.variant} className="gap-1">
                            <Star className="h-3 w-3" />
                            {customer.loyaltyPoints} pts
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                            {customer.visitCount}x kunjungan
                        </span>
                        <span className="text-xs text-muted-foreground">
                            Total: {formatCurrency(customer.totalSpent)}
                        </span>
                    </div>
                </div>
            </div>
        </button>
    );
}

function getLoyaltyTier(points: number): { name: string; variant: 'default' | 'secondary' | 'outline' } {
    if (points >= 10000) return { name: 'Gold', variant: 'default' };
    if (points >= 5000) return { name: 'Silver', variant: 'secondary' };
    return { name: 'Bronze', variant: 'outline' };
}
