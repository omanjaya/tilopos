import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { uploadsApi } from '@/api/endpoints/uploads.api';
import { useToast } from '@/hooks/use-toast';
import { ImagePlus, X, Loader2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageCropperModal } from './image-cropper-modal';

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  className?: string;
  maxSizeMB?: number;
}

export function ImageUpload({ value, onChange, className, maxSizeMB = 5 }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value ?? null);
  const [isDragging, setIsDragging] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: uploadsApi.image,
    onSuccess: (data) => {
      setPreview(data.url);
      onChange(data.url);
      toast({ title: 'Berhasil!', description: 'Gambar berhasil diupload' });
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Upload gagal', description: 'Gagal mengupload gambar.' });
    },
  });

  const validateAndUpload = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'File tidak valid', description: 'Pilih file gambar (JPG, PNG, GIF)' });
      return;
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      toast({
        variant: 'destructive',
        title: 'File terlalu besar',
        description: `Ukuran maksimal ${maxSizeMB}MB. File ini ${fileSizeMB.toFixed(1)}MB`,
      });
      return;
    }

    // Show cropper modal
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedFile: File) => {
    // Show preview immediately
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(croppedFile);

    // Compress image before upload (if > 1MB)
    let fileToUpload = croppedFile;
    const fileSizeMB = croppedFile.size / (1024 * 1024);
    if (fileSizeMB > 1) {
      try {
        fileToUpload = await compressImage(croppedFile, 0.8);
      } catch (error) {
        console.warn('Image compression failed, uploading original', error);
      }
    }

    uploadMutation.mutate(fileToUpload);
  };

  const compressImage = (file: File, quality: number): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;

          let { width, height } = img;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(new File([blob], file.name, { type: 'image/jpeg' }));
              } else {
                reject(new Error('Canvas toBlob failed'));
              }
            },
            'image/jpeg',
            quality,
          );
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    validateAndUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleRemove = () => {
    setPreview(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <>
      <div className={cn('relative', className)}>
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      {preview ? (
        <div className="relative h-48 w-48 overflow-hidden rounded-lg border-2 border-muted">
          <img src={preview} alt="Preview" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute right-2 top-2 rounded-full bg-destructive p-1.5 text-destructive-foreground shadow-md transition-transform hover:scale-110"
          >
            <X className="h-4 w-4" />
          </button>
          {uploadMutation.isPending && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 backdrop-blur-sm">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
              <p className="text-xs text-white">Uploading...</p>
            </div>
          )}
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex h-48 w-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed transition-all hover:border-primary hover:bg-accent/50',
            isDragging && 'border-primary bg-accent',
          )}
        >
          {isDragging ? (
            <>
              <Upload className="h-10 w-10 text-primary" />
              <div className="text-center">
                <p className="text-sm font-medium text-primary">Drop gambar di sini</p>
              </div>
            </>
          ) : (
            <>
              <ImagePlus className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">Upload Gambar</p>
                <p className="text-xs text-muted-foreground">Klik atau drag & drop</p>
                <p className="mt-1 text-xs text-muted-foreground">Max {maxSizeMB}MB</p>
              </div>
            </>
          )}
        </div>
      )}
      </div>

      {/* Cropper Modal */}
      {imageToCrop && (
        <ImageCropperModal
          open={cropperOpen}
          onOpenChange={setCropperOpen}
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
        />
      )}
    </>
  );
}
