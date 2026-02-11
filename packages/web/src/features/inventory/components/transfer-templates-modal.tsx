import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '@/api/endpoints/inventory.api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Trash2,
  Edit2,
  Copy,
  Loader2,
  FileText,
  ArrowRightLeft,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { TransferTemplateFormModal } from './transfer-template-form-modal';
import type { TransferTemplate } from '@/types/transfer-template.types';
import type { AxiosError } from 'axios';

interface TransferTemplatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseTemplate?: (template: TransferTemplate) => void;
}

export function TransferTemplatesModal({
  open,
  onOpenChange,
  onUseTemplate,
}: TransferTemplatesModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TransferTemplate | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['transfer-templates'],
    queryFn: () => inventoryApi.listTransferTemplates(),
    enabled: open,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.deleteTransferTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfer-templates'] });
      toast({ title: 'Template dihapus' });
      setDeleteConfirmId(null);
    },
    onError: (error: AxiosError<any>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal menghapus template',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const handleUseTemplate = (template: TransferTemplate) => {
    onUseTemplate?.(template);
    onOpenChange(false);
    toast({
      title: '✓ Template diterapkan',
      description: `Template "${template.name}" siap digunakan`,
    });
  };

  const handleEdit = (template: TransferTemplate) => {
    setEditingTemplate(template);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingTemplate(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Transfer Templates</DialogTitle>
              <Button
                size="sm"
                onClick={() => setFormOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" /> Buat Template
              </Button>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : templates && templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Belum Ada Template</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Buat template untuk transfer yang sering dilakukan
              </p>
              <Button
                className="mt-4"
                onClick={() => setFormOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" /> Buat Template Pertama
              </Button>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px] pr-4">
              <div className="space-y-3">
                {templates?.map((template) => (
                  <div
                    key={template.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{template.name}</h4>
                          {template.usageCount > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {template.usageCount}x digunakan
                            </Badge>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {template.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ArrowRightLeft className="h-3 w-3" />
                          <span>
                            {template.sourceOutletName} → {template.destinationOutletName}
                          </span>
                          <span className="text-xs">•</span>
                          <span>{template.items.length} items</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {onUseTemplate && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleUseTemplate(template)}
                          >
                            <Copy className="mr-2 h-3 w-3" /> Gunakan
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(template)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteConfirmId(template.id)}
                        >
                          <Trash2 className="h-3 w-3 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <TransferTemplateFormModal
        open={formOpen}
        onOpenChange={handleCloseForm}
        template={editingTemplate}
      />

      <ConfirmDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="Hapus Template"
        description="Apakah Anda yakin ingin menghapus template ini? Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        onConfirm={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
        isLoading={deleteMutation.isPending}
        variant="destructive"
      />
    </>
  );
}
