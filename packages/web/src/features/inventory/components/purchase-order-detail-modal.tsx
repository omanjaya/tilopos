import type { PurchaseOrderView } from '@/api/endpoints/inventory.api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatDateTime } from '@/lib/format';

interface PurchaseOrderDetailModalProps {
  purchaseOrder: PurchaseOrderView | null;
  outletName: string;
  statusLabel: string;
  onOpenChange: (open: boolean) => void;
}

/** Read-only PO detail rendered from the list row (GET /suppliers/purchase-orders includes items + supplier). */
export function PurchaseOrderDetailModal({
  purchaseOrder: po,
  outletName,
  statusLabel,
  onOpenChange,
}: PurchaseOrderDetailModalProps) {
  return (
    <Dialog open={!!po} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {po && (
          <>
            <DialogHeader>
              <DialogTitle>{po.poNumber}</DialogTitle>
              <DialogDescription>Detail purchase order</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Supplier</p>
                <p className="font-medium">{po.supplierName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Outlet</p>
                <p className="font-medium">{outletName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium">{statusLabel}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Dibuat</p>
                <p className="font-medium">{formatDateTime(po.createdAt)}</p>
              </div>
              {po.orderedAt && (
                <div>
                  <p className="text-muted-foreground">Dipesan</p>
                  <p className="font-medium">{formatDateTime(po.orderedAt)}</p>
                </div>
              )}
              {po.receivedAt && (
                <div>
                  <p className="text-muted-foreground">Diterima</p>
                  <p className="font-medium">{formatDateTime(po.receivedAt)}</p>
                </div>
              )}
              {po.notes && (
                <div className="sm:col-span-2">
                  <p className="text-muted-foreground">Catatan</p>
                  <p className="font-medium">{po.notes}</p>
                </div>
              )}
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Dipesan</TableHead>
                    <TableHead className="text-right">Diterima</TableHead>
                    <TableHead className="text-right">Harga Satuan</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {po.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.itemName}</TableCell>
                      <TableCell className="text-right">{item.quantityOrdered}</TableCell>
                      <TableCell className="text-right">{item.quantityReceived}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unitCost)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <p className="text-right text-sm">
              Total: <span className="font-semibold">{formatCurrency(po.totalAmount)}</span>
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
