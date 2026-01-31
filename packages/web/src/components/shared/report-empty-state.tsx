import { FileBarChart, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReportEmptyStateProps {
  title?: string;
  description?: string;
  onChangeDateRange?: () => void;
}

export function ReportEmptyState({
  title = 'Tidak ada data',
  description = 'Belum ada data untuk periode ini.',
  onChangeDateRange,
}: ReportEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-3 mb-4">
        <FileBarChart className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      {onChangeDateRange && (
        <Button variant="outline" size="sm" onClick={onChangeDateRange}>
          <Calendar className="h-4 w-4 mr-2" />
          Ubah Rentang Tanggal
        </Button>
      )}
    </div>
  );
}
