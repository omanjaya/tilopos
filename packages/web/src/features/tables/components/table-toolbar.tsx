import { Save, RotateCcw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TableToolbarProps {
  sections: string[];
  activeSection: string;
  onSectionChange: (section: string) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  editable: boolean;
  hasUnsavedChanges: boolean;
  onSave: () => void;
  onReset: () => void;
}

export function TableToolbar({
  sections,
  activeSection,
  onSectionChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  editable,
  hasUnsavedChanges,
  onSave,
  onReset,
}: TableToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* Section tabs */}
      <Tabs value={activeSection} onValueChange={onSectionChange} className="w-auto">
        <TabsList>
          {sections.length > 1 && <TabsTrigger value="Semua">Semua</TabsTrigger>}
          {sections.map((s) => (
            <TabsTrigger key={s} value={s}>
              {s}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={onZoomOut} title="Zoom Out" aria-label="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-xs font-medium tabular-nums w-10 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button variant="outline" size="icon" onClick={onZoomIn} title="Zoom In" aria-label="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={onZoomReset} title="Reset Zoom" aria-label="Reset zoom">
          <Maximize2 className="h-4 w-4" />
        </Button>

        {editable && (
          <>
            <Button variant="outline" size="sm" onClick={onReset} className="gap-1.5">
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button size="sm" onClick={onSave} disabled={!hasUnsavedChanges} className="gap-1.5">
              <Save className="h-4 w-4" />
              Simpan
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
