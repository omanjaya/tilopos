import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Search,
  User,
  Phone,
  Check,
  Loader2,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { customersApi } from '@/api/endpoints/customers.api';
import { creditApi } from '@/api/endpoints/credit.api';
import { useCartStore } from '@/stores/cart.store';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Customer } from '@/types/customer.types';

interface CreditCheckoutModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: CreditCheckoutData) => void;
  isProcessing?: boolean;
}

export interface CreditCheckoutData {
  customerId: string;
  customerName: string;
  dpAmount: number;
  dpMethod: string;
  dpReference?: string;
  dueDate?: string;
  creditNotes?: string;
}

export function CreditCheckoutModal({
  open,
  onClose,
  onConfirm,
  isProcessing = false,
}: CreditCheckoutModalProps) {
  const total = useCartStore((s) => s.total);
  const cartCustomerId = useCartStore((s) => s.customerId);
  const cartCustomerName = useCartStore((s) => s.customerName);

  const [step, setStep] = useState<'customer' | 'details'>(
    cartCustomerId ? 'details' : 'customer',
  );
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [customerSearch, setCustomerSearch] = useState('');

  // Credit details
  const [hasDp, setHasDp] = useState(false);
  const [dpAmount, setDpAmount] = useState(0);
  const [dpMethod, setDpMethod] = useState('cash');
  const [dpReference, setDpReference] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [creditNotes, setCreditNotes] = useState('');

  const customerId = selectedCustomer?.id ?? cartCustomerId;
  const customerName = selectedCustomer?.name ?? cartCustomerName;

  // Fetch customers for selector
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['customers', customerSearch],
    queryFn: () => customersApi.list({ search: customerSearch || undefined }),
    enabled: open && step === 'customer',
  });

  // Fetch existing credit for the selected customer
  const { data: customerCredits = [] } = useQuery({
    queryKey: ['credit-sales-customer', customerId],
    queryFn: () =>
      creditApi.getCustomerSales(customerId!, 'outstanding'),
    enabled: open && !!customerId,
  });

  const existingOutstanding = useMemo(
    () => customerCredits.reduce((sum, cs) => sum + cs.outstandingAmount, 0),
    [customerCredits],
  );

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q),
    );
  }, [customers, customerSearch]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    useCartStore.getState().setCustomer(customer.id, customer.name);
    setStep('details');
  };

  const handleConfirm = () => {
    if (!customerId || !customerName) return;

    onConfirm({
      customerId,
      customerName,
      dpAmount: hasDp ? dpAmount : 0,
      dpMethod: hasDp ? dpMethod : 'cash',
      dpReference: hasDp && dpReference ? dpReference : undefined,
      dueDate: dueDate || undefined,
      creditNotes: creditNotes || undefined,
    });
  };

  const handleClose = () => {
    setStep(cartCustomerId ? 'details' : 'customer');
    setSelectedCustomer(null);
    setCustomerSearch('');
    setHasDp(false);
    setDpAmount(0);
    setDpMethod('cash');
    setDpReference('');
    setDueDate('');
    setCreditNotes('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-600" />
            BON / Piutang
          </DialogTitle>
          <DialogDescription>
            {step === 'customer'
              ? 'Pilih pelanggan untuk transaksi BON'
              : 'Lengkapi detail piutang'}
          </DialogDescription>
        </DialogHeader>

        {step === 'customer' ? (
          <>
            {/* Customer Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau telepon pelanggan..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>

            <ScrollArea className="h-[350px] -mx-6 px-6">
              {isLoadingCustomers ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <User className="h-12 w-12 mb-4 opacity-50" />
                  <p className="font-medium">Tidak ada pelanggan</p>
                  <p className="text-sm">
                    {customerSearch
                      ? 'Coba kata kunci lain'
                      : 'Belum ada data pelanggan'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      className={cn(
                        'w-full text-left p-3 rounded-lg border transition-all',
                        'hover:border-amber-400 hover:bg-amber-50',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                          <span className="text-sm font-semibold text-amber-700">
                            {customer.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">
                            {customer.name}
                          </h4>
                          {customer.phone && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        ) : (
          <div className="space-y-4">
            {/* Selected Customer */}
            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="h-10 w-10 rounded-full bg-amber-200 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-amber-700" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{customerName}</p>
                {existingOutstanding > 0 && (
                  <p className="text-xs text-amber-700 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Piutang aktif: {formatCurrency(existingOutstanding)}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep('customer')}
                className="text-xs"
              >
                Ganti
              </Button>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">
                Total Transaksi
              </span>
              <span className="text-lg font-bold">{formatCurrency(total)}</span>
            </div>

            {/* Down Payment Toggle */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="has-dp"
                  checked={hasDp}
                  onChange={(e) => {
                    setHasDp(e.target.checked);
                    if (!e.target.checked) setDpAmount(0);
                  }}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="has-dp" className="text-sm cursor-pointer">
                  Bayar DP (Uang Muka)
                </Label>
              </div>

              {hasDp && (
                <div className="space-y-3 pl-6 border-l-2 border-amber-200 ml-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Jumlah DP</Label>
                    <Input
                      type="number"
                      min={0}
                      max={total}
                      value={dpAmount || ''}
                      onChange={(e) =>
                        setDpAmount(Math.min(Number(e.target.value) || 0, total))
                      }
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Metode DP</Label>
                    <Select value={dpMethod} onValueChange={setDpMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Tunai</SelectItem>
                        <SelectItem value="qris">QRIS</SelectItem>
                        <SelectItem value="bank_transfer">
                          Transfer Bank
                        </SelectItem>
                        <SelectItem value="card">Kartu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {dpMethod !== 'cash' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">No. Referensi</Label>
                      <Input
                        value={dpReference}
                        onChange={(e) => setDpReference(e.target.value)}
                        placeholder="Opsional"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Jatuh Tempo
                <span className="text-xs text-muted-foreground">(opsional)</span>
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Credit Notes */}
            <div className="space-y-1.5">
              <Label className="text-sm">
                Catatan BON{' '}
                <span className="text-xs text-muted-foreground">(opsional)</span>
              </Label>
              <Input
                value={creditNotes}
                onChange={(e) => setCreditNotes(e.target.value)}
                placeholder="Mis: Bayar akhir bulan"
              />
            </div>

            {/* Summary */}
            <div className="space-y-1 p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium">{formatCurrency(total)}</span>
              </div>
              {hasDp && dpAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">DP</span>
                  <span className="font-medium text-green-600">
                    -{formatCurrency(dpAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-amber-200 font-semibold">
                <span>Sisa Piutang</span>
                <span className="text-amber-700">
                  {formatCurrency(total - (hasDp ? dpAmount : 0))}
                </span>
              </div>
            </div>
          </div>
        )}

        {step === 'details' && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleClose}>
              Batal
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!customerId || isProcessing}
              className="bg-amber-600 hover:bg-amber-500 text-white"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {isProcessing ? 'Memproses...' : 'Buat BON'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
