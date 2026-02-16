import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CompleteSummary {
  businessType: string | null;
  templateSections: {
    categories: boolean;
    products: boolean;
    modifiers: boolean;
    tables: boolean;
  };
  paymentMethods: string[];
  hasEmployee: boolean;
}

interface CompleteStepProps {
  summary: CompleteSummary;
  isApplying: boolean;
  onComplete: () => void;
  onBack: () => void;
}

export function CompleteStep({ summary, isApplying, onComplete, onBack }: CompleteStepProps) {
  const items = [
    { label: 'Tipe bisnis', value: summary.businessType || 'Belum dipilih', done: !!summary.businessType },
    { label: 'Template', value: getTemplateSummary(summary.templateSections), done: !!summary.businessType },
    { label: 'Pembayaran', value: summary.paymentMethods.join(', ') || 'Belum dipilih', done: summary.paymentMethods.length > 0 },
    { label: 'Karyawan', value: summary.hasEmployee ? 'Ditambahkan' : 'Dilewati', done: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="py-4"
    >
      <div className="mb-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.6, bounce: 0.4 }}
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30"
        >
          <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
        </motion.div>
        <h2 className="text-2xl font-bold">Siap Digunakan!</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Berikut ringkasan setup Anda. Klik &quot;Selesai&quot; untuk menerapkan semua pengaturan.
        </p>
      </div>

      <div className="mx-auto max-w-md space-y-3">
        {items.map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex items-center gap-3 rounded-lg border p-3"
          >
            <CheckCircle2 className={`h-5 w-5 shrink-0 ${item.done ? 'text-green-600' : 'text-muted-foreground'}`} />
            <div className="flex-1">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row">
        <Button variant="outline" onClick={onBack} disabled={isApplying} className="flex-1">
          Kembali
        </Button>
        <Button onClick={onComplete} disabled={isApplying} className="flex-1">
          {isApplying ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menerapkan...</>
          ) : (
            <><ArrowRight className="mr-2 h-4 w-4" /> Selesai & Mulai</>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

function getTemplateSummary(sections: CompleteSummary['templateSections']): string {
  const parts: string[] = [];
  if (sections.categories) parts.push('kategori');
  if (sections.products) parts.push('produk');
  if (sections.modifiers) parts.push('modifier');
  if (sections.tables) parts.push('meja');
  if (parts.length === 0) return 'Tidak ada data diterapkan';
  return `Data: ${parts.join(', ')}`;
}
