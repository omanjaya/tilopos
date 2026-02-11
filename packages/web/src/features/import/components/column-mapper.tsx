import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';

export interface TargetField {
  key: string;
  label: string;
  required: boolean;
}

interface ColumnMapperProps {
  excelHeaders: string[];
  targetFields: TargetField[];
  mappings: Record<string, string>;
  onChange: (mappings: Record<string, string>) => void;
}

const NONE_VALUE = '__none__';

/** Fuzzy matching: compare normalized strings for auto-mapping */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/** Auto-map Excel headers to target fields by fuzzy match */
// eslint-disable-next-line react-refresh/only-export-components
export function autoMapColumns(
  excelHeaders: string[],
  targetFields: TargetField[],
): Record<string, string> {
  const mappings: Record<string, string> = {};
  const usedHeaders = new Set<string>();

  // Alias map for common column name variations
  const aliases: Record<string, string[]> = {
    name: ['nama', 'namaproduct', 'namaproduk', 'productname', 'namacustomer', 'customername', 'namabarang'],
    sku: ['sku', 'kode', 'kodebarang', 'kodeproduk', 'productcode', 'itemcode'],
    price: ['harga', 'hargajual', 'baseprice', 'sellingprice', 'hargadasar'],
    basePrice: ['harga', 'hargajual', 'baseprice', 'sellingprice', 'hargadasar'],
    costPrice: ['hargabeli', 'hargamodal', 'costprice', 'modal', 'hpp'],
    description: ['deskripsi', 'keterangan', 'catatan', 'desc'],
    unit: ['satuan', 'unit', 'uom'],
    category: ['kategori', 'category', 'group', 'kelompok'],
    phone: ['telepon', 'telp', 'hp', 'nohp', 'phonenumber', 'nomorhp', 'notelepon', 'handphone'],
    email: ['email', 'emailaddress', 'surel'],
    address: ['alamat', 'address'],
    notes: ['catatan', 'notes', 'keterangan', 'note'],
  };

  for (const field of targetFields) {
    const fieldNorm = normalize(field.key);
    const fieldAliases = aliases[field.key] || [fieldNorm];

    for (const header of excelHeaders) {
      if (usedHeaders.has(header)) continue;
      const headerNorm = normalize(header);

      const isMatch =
        headerNorm === fieldNorm ||
        fieldAliases.includes(headerNorm) ||
        headerNorm.includes(fieldNorm) ||
        fieldNorm.includes(headerNorm);

      if (isMatch) {
        mappings[field.key] = header;
        usedHeaders.add(header);
        break;
      }
    }
  }

  return mappings;
}

export function ColumnMapper({ excelHeaders, targetFields, mappings, onChange }: ColumnMapperProps) {
  const handleChange = (fieldKey: string, excelColumn: string) => {
    const updated = { ...mappings };
    if (excelColumn === NONE_VALUE) {
      delete updated[fieldKey];
    } else {
      updated[fieldKey] = excelColumn;
    }
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 pb-2 border-b">
        <div className="text-sm font-medium text-muted-foreground">Field TiloPOS</div>
        <div />
        <div className="text-sm font-medium text-muted-foreground">Kolom Excel</div>
      </div>

      {targetFields.map((field) => (
        <div
          key={field.key}
          className="grid grid-cols-[1fr_auto_1fr] items-center gap-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">{field.label}</span>
            {field.required && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                Wajib
              </Badge>
            )}
          </div>

          <ArrowRight className="h-4 w-4 text-muted-foreground" />

          <Select
            value={mappings[field.key] || NONE_VALUE}
            onValueChange={(v) => handleChange(field.key, v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pilih kolom..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>-- Lewati --</SelectItem>
              {excelHeaders.map((header) => (
                <SelectItem key={header} value={header}>
                  {header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}
