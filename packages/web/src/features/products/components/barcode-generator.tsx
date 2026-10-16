import { useEffect, useRef, useCallback, useState } from 'react';
import JsBarcode from 'jsbarcode';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Printer } from 'lucide-react';
import { toast } from '@/lib/toast-utils';

interface BarcodePreviewProps {
  value: string;
  width?: number;
  height?: number;
  format?: string;
}

export function BarcodePreview({ value, width = 2, height = 50, format = 'EAN13' }: BarcodePreviewProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: value.length === 13 ? format : 'CODE128',
        width,
        height,
        displayValue: true,
        fontSize: 12,
        margin: 5,
      });
    } catch {
      // Invalid barcode value — render nothing
      if (svgRef.current) {
        svgRef.current.innerHTML = '';
      }
    }
  }, [value, width, height, format]);

  if (!value) return null;

  return <svg ref={svgRef} className="max-w-full" />;
}

interface BarcodePrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: { name: string; barcode: string; sku?: string }[];
}

export function BarcodePrintModal({ open, onOpenChange, items }: BarcodePrintModalProps) {
  const [labelSize, setLabelSize] = useState<'40x30' | '50x25'>('50x25');
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    if (!printRef.current) return;

    const isSmall = labelSize === '40x30';
    const labelW = isSmall ? '40mm' : '50mm';
    const labelH = isSmall ? '30mm' : '25mm';

    const css = `
    @page { margin: 5mm; size: auto; }
    body { margin: 0; font-family: sans-serif; }
    .grid { display: flex; flex-wrap: wrap; gap: 2mm; }
    .label {
      width: ${labelW};
      height: ${labelH};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border: 0.5px dashed #ccc;
      padding: 1mm;
      box-sizing: border-box;
    }
    .label .name { font-size: 7px; font-weight: bold; text-align: center; margin-bottom: 1mm; max-width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .label svg { max-width: 100%; height: auto; }
    @media print { .label { border: none; } }`;

    // Print from a hidden same-origin iframe: the document is fully built via DOM
    // APIs *before* print() is called (no inline script, CSP-safe, no race).
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;
    if (!win || !doc) {
      iframe.remove();
      toast.error({ title: 'Gagal mencetak', description: 'Browser tidak mengizinkan jendela cetak.' });
      return;
    }

    doc.title = 'Cetak Barcode';
    const style = doc.createElement('style');
    style.textContent = css;
    doc.head.appendChild(style);
    const container = doc.createElement('div');
    container.className = 'grid';
    Array.from(printRef.current.children).forEach((child) => {
      container.appendChild(doc.importNode(child, true));
    });
    doc.body.appendChild(container);

    const cleanup = () => iframe.remove();
    win.addEventListener('afterprint', cleanup, { once: true });
    win.focus();
    win.print();
    // Fallback cleanup for browsers that don't fire afterprint
    window.setTimeout(cleanup, 60_000);
  }, [labelSize]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cetak Barcode</DialogTitle>
          <DialogDescription>
            {items.length} barcode akan dicetak.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Ukuran Label</Label>
            <Select value={labelSize} onValueChange={(v) => setLabelSize(v as '40x30' | '50x25')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50x25">50 x 25 mm</SelectItem>
                <SelectItem value="40x30">40 x 30 mm</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="max-h-60 overflow-y-auto rounded border p-3">
            <div ref={printRef} className="flex flex-wrap gap-2">
              {items.map((item, i) => (
                <div key={i} className="label flex flex-col items-center">
                  <div className="name text-[10px] font-semibold truncate max-w-[45mm]">{item.name}</div>
                  <BarcodePreview value={item.barcode} width={1.5} height={30} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Cetak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
