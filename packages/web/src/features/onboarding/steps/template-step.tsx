import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { templatesApi, type TemplateData } from '@/api/endpoints/templates.api';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { formatCurrency } from '@/lib/format';

interface TemplateSections {
  categories: boolean;
  products: boolean;
  modifiers: boolean;
  tables: boolean;
  units: boolean;
}

interface TemplateStepProps {
  typeCode: string;
  sections: TemplateSections;
  onToggleSection: (key: keyof TemplateSections) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export function TemplateStep({ typeCode, sections, onToggleSection, onNext, onBack, onSkip }: TemplateStepProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: template, isLoading } = useQuery({
    queryKey: ['templates', typeCode],
    queryFn: () => templatesApi.get(typeCode),
    enabled: !!typeCode,
  });

  if (isLoading || !template) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sectionItems = buildSectionItems(template, sections);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="py-4"
    >
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold">Template {template.label}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pilih data yang ingin diterapkan ke outlet Anda.
        </p>
      </div>

      <div className="mx-auto max-w-lg space-y-3">
        {sectionItems.map((item) => (
          <div key={item.key} className="rounded-lg border">
            <div className="flex items-center gap-3 p-4">
              <Checkbox
                checked={item.checked}
                onCheckedChange={() => onToggleSection(item.key as keyof TemplateSections)}
                disabled={item.count === 0}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{item.label} ({item.count} {item.unit})</p>
                <p className="text-xs text-muted-foreground">{item.preview}</p>
              </div>
              {item.details.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(expanded === item.key ? null : item.key)}
                >
                  {expanded === item.key ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <><Eye className="mr-1 h-3 w-3" /><ChevronDown className="h-4 w-4" /></>
                  )}
                </Button>
              )}
            </div>
            {expanded === item.key && item.details.length > 0 && (
              <div className="border-t bg-muted/30 px-4 py-3">
                <div className="grid gap-1 text-xs text-muted-foreground">
                  {item.details.map((d, i) => (
                    <span key={i}>{d}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Kembali
        </Button>
        <Button onClick={onNext} className="flex-1">
          Lanjut
        </Button>
      </div>
      <div className="mx-auto mt-2 max-w-md">
        <Button variant="ghost" onClick={onSkip} className="w-full">
          Lewati langkah ini
        </Button>
      </div>
    </motion.div>
  );
}

function buildSectionItems(template: TemplateData, sections: TemplateSections) {
  return [
    {
      key: 'categories',
      label: 'Kategori produk',
      count: template.categories.length,
      unit: 'kategori',
      checked: sections.categories,
      preview: template.categories.map((c) => c.name).join(', '),
      details: template.categories.map((c) => c.name),
    },
    {
      key: 'products',
      label: 'Produk contoh',
      count: template.products.length,
      unit: 'produk',
      checked: sections.products,
      preview: template.products.slice(0, 3).map((p) => p.name).join(', ') + (template.products.length > 3 ? ', ...' : ''),
      details: template.products.map((p) => `${p.name} — ${formatCurrency(p.price)}`),
    },
    {
      key: 'modifiers',
      label: 'Modifier',
      count: template.modifierGroups.length,
      unit: 'grup',
      checked: sections.modifiers,
      preview: template.modifierGroups.map((m) => m.name).join(', ') || 'Tidak ada',
      details: template.modifierGroups.flatMap((m) =>
        [`${m.name}:`, ...m.options.map((o) => `  ${o.name}${o.price > 0 ? ` (+${formatCurrency(o.price)})` : ''}`)]
      ),
    },
    {
      key: 'tables',
      label: 'Meja',
      count: template.tables.length,
      unit: 'meja',
      checked: sections.tables,
      preview: template.tables.length > 0
        ? template.tables.slice(0, 3).map((t) => t.name).join(', ') + (template.tables.length > 3 ? ', ...' : '')
        : 'Tidak ada meja',
      details: template.tables.map((t) => `${t.name} (kapasitas ${t.capacity})`),
    },
    {
      key: 'units',
      label: 'Satuan',
      count: template.units.length,
      unit: 'satuan',
      checked: sections.units,
      preview: template.units.join(', '),
      details: template.units,
    },
  ];
}
