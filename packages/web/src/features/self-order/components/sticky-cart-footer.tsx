import { motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface StickyCartFooterProps {
  itemCount: number;
  total: number;
  onViewCart: () => void;
}

export function StickyCartFooter({ itemCount, total, onViewCart }: StickyCartFooterProps) {
  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white shadow-lg">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Cart info */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <motion.div
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.3 }}
                key={itemCount}
              >
                <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-center">
                  {itemCount}
                </Badge>
              </motion.div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </p>
              <p className="text-xs text-muted-foreground">Keranjang</p>
            </div>
          </div>

          {/* Total and action */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(total)}
              </p>
            </div>
            <Button size="lg" onClick={onViewCart} className="min-w-[140px]">
              Lihat Keranjang
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
