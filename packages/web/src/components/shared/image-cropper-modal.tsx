import { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Crop, RotateCw, ZoomIn, Check, X } from 'lucide-react';

interface ImageCropperModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCropComplete: (croppedFile: File) => void;
}

export function ImageCropperModal({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete,
}: ImageCropperModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleCrop = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;

    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const size = Math.min(image.naturalWidth, image.naturalHeight);
    canvas.width = size;
    canvas.height = size;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context state
    ctx.save();

    // Move to center
    ctx.translate(canvas.width / 2, canvas.height / 2);

    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // Apply zoom
    ctx.scale(zoom, zoom);

    // Draw image centered
    const drawWidth = image.naturalWidth;
    const drawHeight = image.naturalHeight;
    ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

    // Restore context state
    ctx.restore();

    // Convert canvas to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
          onCropComplete(file);
          onOpenChange(false);
        }
      },
      'image/jpeg',
      0.95,
    );
  }, [zoom, rotation, onCropComplete, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="h-5 w-5" />
            Crop & Edit Gambar
          </DialogTitle>
          <DialogDescription>
            Sesuaikan zoom dan rotasi gambar sebelum upload
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview Area */}
          <div className="relative flex items-center justify-center overflow-hidden rounded-lg border bg-muted" style={{ height: '400px' }}>
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Preview"
              className="max-h-full max-w-full object-contain transition-transform"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
              }}
              crossOrigin="anonymous"
            />
            {/* Hidden canvas for cropping */}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Zoom Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <ZoomIn className="h-4 w-4" />
                  Zoom
                </Label>
                <span className="text-sm text-muted-foreground">{Math.round(zoom * 100)}%</span>
              </div>
              <Slider
                value={[zoom]}
                onValueChange={(value) => setZoom(value[0] ?? 1)}
                min={0.5}
                max={3}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Rotation Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <RotateCw className="h-4 w-4" />
                  Rotasi
                </Label>
                <span className="text-sm text-muted-foreground">{rotation}°</span>
              </div>
              <div className="flex gap-2">
                <Slider
                  value={[rotation]}
                  onValueChange={(value) => setRotation(value[0] ?? 0)}
                  min={0}
                  max={360}
                  step={15}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setZoom(1);
                  setRotation(0);
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            <X className="mr-2 h-4 w-4" />
            Batal
          </Button>
          <Button type="button" onClick={handleCrop}>
            <Check className="mr-2 h-4 w-4" />
            Crop & Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
