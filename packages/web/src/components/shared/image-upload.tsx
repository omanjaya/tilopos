import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { uploadsApi } from '@/api/endpoints/uploads.api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  className?: string;
}

export function ImageUpload({ value, onChange, className }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value ?? null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: uploadsApi.image,
    onSuccess: (data) => {
      setPreview(data.url);
      onChange(data.url);
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Upload gagal', description: 'Gagal mengupload gambar.' });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'File tidak valid', description: 'Pilih file gambar.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
    uploadMutation.mutate(file);
  };

  const handleRemove = () => {
    setPreview(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={cn('relative', className)}>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      {preview ? (
        <div className="relative h-40 w-40 overflow-hidden rounded-lg border">
          <img src={preview} alt="Preview" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm"
          >
            <X className="h-3 w-3" />
          </button>
          {uploadMutation.isPending && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="h-40 w-40 flex-col gap-2"
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="h-8 w-8 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Upload Gambar</span>
        </Button>
      )}
    </div>
  );
}
