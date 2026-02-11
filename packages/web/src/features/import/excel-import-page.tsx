import { useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiClient } from '@/api/client';
import { useBusinessFeatures } from '@/hooks/use-business-features';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertCircle,
  X,
  Package,
  Users,
  Download,
} from 'lucide-react';
import { ColumnMapper, autoMapColumns, type TargetField } from './components/column-mapper';
import { downloadCSVTemplate } from '@/lib/csv-template';

type ImportType = 'products' | 'customers';

interface SheetPreview {
  sheetName: string;
  headers: string[];
  sampleRows: Record<string, string | number | null>[];
  totalRows: number;
}

interface ImportResult {
  imported: number;
  errors: string[];
  total: number;
}

const PRODUCT_FIELDS: TargetField[] = [
  { key: 'name', label: 'Nama Produk', required: true },
  { key: 'sku', label: 'SKU / Kode', required: false },
  { key: 'price', label: 'Harga Jual', required: false },
  { key: 'costPrice', label: 'Harga Modal', required: false },
  { key: 'description', label: 'Deskripsi', required: false },
  { key: 'unit', label: 'Satuan', required: false },
  { key: 'category', label: 'Kategori', required: false },
];

const CUSTOMER_FIELDS: TargetField[] = [
  { key: 'name', label: 'Nama Customer', required: true },
  { key: 'phone', label: 'No. Telepon', required: false },
  { key: 'email', label: 'Email', required: false },
  { key: 'address', label: 'Alamat', required: false },
  { key: 'notes', label: 'Catatan', required: false },
];

export function ExcelImportPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hasExcelImport } = useBusinessFeatures();

  const initialType = (searchParams.get('type') as ImportType) || 'products';
  const [importType, setImportType] = useState<ImportType>(initialType);
  const [step, setStep] = useState(0);

  // Step 1 state
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Step 2 state
  const [sheets, setSheets] = useState<SheetPreview[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  // Step 3 state
  const [mappings, setMappings] = useState<Record<string, string>>({});

  // Step 4 state
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const targetFields = importType === 'products' ? PRODUCT_FIELDS : CUSTOMER_FIELDS;

  const currentSheet = sheets.find((s) => s.sheetName === selectedSheet);

  const getEndpointBase = () =>
    importType === 'products' ? '/inventory/products' : '/customers';

  // ── Step 1: File Upload ──

  const handleFileSelect = useCallback((selectedFile: File) => {
    setUploadError(null);

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.xlsx')) {
      setUploadError('Hanya file Excel (.xlsx) yang didukung');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setUploadError('Ukuran file maksimal 10MB');
      return;
    }

    setFile(selectedFile);
    setSheets([]);
    setSelectedSheet('');
    setMappings({});
    setImportResult(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFileSelect(droppedFile);
    },
    [handleFileSelect],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) handleFileSelect(selected);
    },
    [handleFileSelect],
  );

  // ── Step 2: Preview & Select Sheet ──

  const handleUploadPreview = async () => {
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiClient.post<SheetPreview[]>(
        `${getEndpointBase()}/import-xlsx/preview`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      const sheetData = res.data;
      setSheets(sheetData);
      const firstSheet = sheetData[0];
      if (firstSheet) {
        setSelectedSheet(firstSheet.sheetName);
        // Auto-map columns
        const autoMapped = autoMapColumns(firstSheet.headers, targetFields);
        setMappings(autoMapped);
      }
      setStep(1);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setUploadError(msg || 'Gagal membaca file Excel');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    const sheet = sheets.find((s) => s.sheetName === sheetName);
    if (sheet) {
      const autoMapped = autoMapColumns(sheet.headers, targetFields);
      setMappings(autoMapped);
    }
  };

  // ── Step 3: Map Columns ──
  // handled by ColumnMapper component

  // ── Step 4: Import ──

  const handleImport = async () => {
    if (!file || !selectedSheet) return;
    setIsImporting(true);

    try {
      // Build mappings array for the backend
      const mappingsArray = Object.entries(mappings).map(([field, excelColumn]) => ({
        excelColumn,
        field,
      }));

      const formData = new FormData();
      formData.append('file', file);
      formData.append('sheetName', selectedSheet);
      formData.append('mappings', JSON.stringify(mappingsArray));

      const res = await apiClient.post<ImportResult>(
        `${getEndpointBase()}/import-xlsx`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      setImportResult(res.data);
      setStep(3);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setImportResult({
        imported: 0,
        errors: [msg || 'Import gagal. Silakan coba lagi.'],
        total: 0,
      });
      setStep(3);
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setSheets([]);
    setSelectedSheet('');
    setMappings({});
    setImportResult(null);
    setUploadError(null);
    setStep(0);
  };

  const hasRequiredMappings = targetFields
    .filter((f) => f.required)
    .every((f) => mappings[f.key]);

  if (!hasExcelImport) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Fitur Tidak Tersedia</h3>
            <p className="text-sm text-muted-foreground">
              Fitur Excel Import belum diaktifkan untuk bisnis Anda.
              Aktifkan di menu Pengaturan &gt; Fitur.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Import dari Excel</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Import data produk atau customer dari file Excel (.xlsx)
        </p>
      </div>

      {/* Import Type Selector */}
      {step === 0 && (
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <Button
              variant={importType === 'products' ? 'default' : 'outline'}
              className="flex items-center gap-2"
              onClick={() => setImportType('products')}
            >
              <Package className="h-4 w-4" />
              Produk
            </Button>
            <Button
              variant={importType === 'customers' ? 'default' : 'outline'}
              className="flex items-center gap-2"
              onClick={() => setImportType('customers')}
            >
              <Users className="h-4 w-4" />
              Customer
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadCSVTemplate(importType, true)}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Template CSV
          </Button>
        </div>
      )}

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {['Upload File', 'Pilih Sheet', 'Mapping Kolom', 'Hasil Import'].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${
                i < step
                  ? 'bg-primary text-primary-foreground'
                  : i === step
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span
              className={`text-sm hidden sm:inline ${
                i === step ? 'font-medium' : 'text-muted-foreground'
              }`}
            >
              {label}
            </span>
            {i < 3 && <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />}
          </div>
        ))}
      </div>

      {/* Step 0: Upload */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Upload File Excel
            </CardTitle>
            <CardDescription>
              Pilih file .xlsx yang berisi data {importType === 'products' ? 'produk' : 'customer'} untuk diimport
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : file
                    ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('xlsx-file-input')?.click()}
            >
              {file ? (
                <div className="space-y-2">
                  <FileSpreadsheet className="h-12 w-12 text-green-600 mx-auto" />
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setUploadError(null);
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Hapus
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Drag & drop file Excel di sini, atau klik untuk memilih
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Format: .xlsx | Maks: 10MB
                  </p>
                </div>
              )}
              <input
                id="xlsx-file-input"
                type="file"
                className="hidden"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleInputChange}
              />
            </div>

            {uploadError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {uploadError}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleUploadPreview}
                disabled={!file || isUploading}
              >
                {isUploading ? 'Membaca file...' : 'Lanjutkan'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Select Sheet & Preview */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Pilih Sheet & Preview Data</CardTitle>
            <CardDescription>
              Pilih sheet yang berisi data dan periksa preview-nya
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sheet selector */}
            {sheets.length > 1 && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Sheet:</span>
                <Select value={selectedSheet} onValueChange={handleSheetChange}>
                  <SelectTrigger className="w-60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sheets.map((s) => (
                      <SelectItem key={s.sheetName} value={s.sheetName}>
                        {s.sheetName} ({s.totalRows} baris)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Sheet info */}
            {currentSheet && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Badge variant="outline">{currentSheet.headers.length} kolom</Badge>
                <Badge variant="outline">{currentSheet.totalRows} baris data</Badge>
              </div>
            )}

            {/* Preview table */}
            {currentSheet && currentSheet.sampleRows.length > 0 && (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {currentSheet.headers.map((h) => (
                        <TableHead key={h} className="whitespace-nowrap text-xs">
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentSheet.sampleRows.map((row, i) => (
                      <TableRow key={i}>
                        {currentSheet.headers.map((h) => (
                          <TableCell key={h} className="text-xs whitespace-nowrap max-w-[200px] truncate">
                            {row[h] !== null && row[h] !== undefined ? String(row[h]) : '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(0)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Button>
              <Button onClick={() => setStep(2)}>
                Mapping Kolom
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Column Mapping */}
      {step === 2 && currentSheet && (
        <Card>
          <CardHeader>
            <CardTitle>Mapping Kolom</CardTitle>
            <CardDescription>
              Hubungkan kolom Excel dengan field {importType === 'products' ? 'produk' : 'customer'} di TiloPOS.
              Kolom yang cocok sudah otomatis dipilih.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ColumnMapper
              excelHeaders={currentSheet.headers}
              targetFields={targetFields}
              mappings={mappings}
              onChange={setMappings}
            />

            {!hasRequiredMappings && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                Semua field wajib harus dipetakan sebelum melanjutkan
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Button>
              <Button
                onClick={handleImport}
                disabled={!hasRequiredMappings || isImporting}
              >
                {isImporting ? (
                  <>Mengimport...</>
                ) : (
                  <>
                    Import {currentSheet.totalRows} Data
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>

            {isImporting && (
              <div className="space-y-2">
                <Progress value={undefined} className="w-full" />
                <p className="text-xs text-muted-foreground text-center">
                  Sedang mengimport data...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Results */}
      {step === 3 && importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.imported > 0 ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
              Hasil Import
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{importResult.total}</div>
                <div className="text-xs text-muted-foreground">Total Baris</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{importResult.imported}</div>
                <div className="text-xs text-muted-foreground">Berhasil</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <div className="text-2xl font-bold text-destructive">{importResult.errors.length}</div>
                <div className="text-xs text-muted-foreground">Gagal</div>
              </div>
            </div>

            {importResult.imported > 0 && (
              <Progress
                value={(importResult.imported / importResult.total) * 100}
                className="w-full"
              />
            )}

            {/* Errors */}
            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Detail Error:</h4>
                <div className="max-h-60 overflow-y-auto border rounded-lg p-3 space-y-1">
                  {importResult.errors.map((error, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleReset}>
                Import Lagi
              </Button>
              <Button
                onClick={() =>
                  navigate(
                    importType === 'products' ? '/app/products' : '/app/customers',
                  )
                }
              >
                Lihat {importType === 'products' ? 'Produk' : 'Customer'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
