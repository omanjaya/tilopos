import { Button } from '@/components/ui/button';
import { Download, FileText, Printer } from 'lucide-react';
import {
  exportToPDF,
  exportToExcel,
  printReport,
} from '@/lib/export-utils';

interface ExportButtonsProps {
  title: string;
  headers: string[];
  data: (string | number)[][];
  filename: string;
  summary?: { label: string; value: string | number }[];
  onExport?: () => void;
}

export function ExportButtons({
  title,
  headers,
  data,
  filename,
  summary,
  onExport,
}: ExportButtonsProps) {
  const handleExportPDF = () => {
    exportToPDF(title, headers, data, filename, summary);
    onExport?.();
  };

  const handleExportExcel = async () => {
    await exportToExcel(title, headers, data, filename, summary);
    onExport?.();
  };

  const handlePrint = () => {
    printReport();
    onExport?.();
  };

  return (
    <div className="export-buttons flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportPDF}
        className="gap-2"
      >
        <FileText className="h-4 w-4" />
        Export PDF
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportExcel}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        Export Excel
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        className="gap-2"
      >
        <Printer className="h-4 w-4" />
        Print
      </Button>
    </div>
  );
}
