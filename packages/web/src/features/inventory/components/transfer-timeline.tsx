import { formatDateTime } from '@/lib/format';
import { Check, Clock, Truck, PackageCheck, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StockTransferStatus as TransferStatus } from '@/api/endpoints/inventory.api';

interface TimelineStep {
  status: TransferStatus;
  label: string;
  timestamp?: string | null;
  actor?: string | null;
  icon: React.ReactNode;
}

interface TransferTimelineProps {
  currentStatus: TransferStatus;
  requestedAt?: string;
  requestedBy?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  shippedAt?: string | null;
  receivedAt?: string | null;
  receivedBy?: string | null;
}

const TIMELINE_CONFIG: Record<TransferStatus, { icon: React.ReactNode; color: string }> = {
  pending: { icon: <Clock className="h-4 w-4" />, color: 'text-blue-600 bg-blue-100' },
  approved: { icon: <Check className="h-4 w-4" />, color: 'text-yellow-600 bg-yellow-100' },
  rejected: { icon: <XCircle className="h-4 w-4" />, color: 'text-red-600 bg-red-100' },
  in_transit: { icon: <Truck className="h-4 w-4" />, color: 'text-purple-600 bg-purple-100' },
  received: { icon: <PackageCheck className="h-4 w-4" />, color: 'text-green-600 bg-green-100' },
  cancelled: { icon: <XCircle className="h-4 w-4" />, color: 'text-red-600 bg-red-100' },
};

export function TransferTimeline({
  currentStatus,
  requestedAt,
  requestedBy,
  approvedAt,
  approvedBy,
  shippedAt,
  receivedAt,
  receivedBy,
}: TransferTimelineProps) {
  const steps: TimelineStep[] = [
    {
      status: 'pending',
      label: 'Diminta',
      timestamp: requestedAt,
      actor: requestedBy,
      icon: TIMELINE_CONFIG.pending.icon,
    },
    {
      status: 'approved',
      label: 'Disetujui',
      timestamp: approvedAt,
      actor: approvedBy,
      icon: TIMELINE_CONFIG.approved.icon,
    },
    {
      status: 'in_transit',
      label: 'Dikirim',
      timestamp: shippedAt,
      actor: undefined,
      icon: TIMELINE_CONFIG.in_transit.icon,
    },
    {
      status: 'received',
      label: 'Diterima',
      timestamp: receivedAt,
      actor: receivedBy,
      icon: TIMELINE_CONFIG.received.icon,
    },
  ];

  const getCurrentStepIndex = (): number => {
    if (currentStatus === 'cancelled' || currentStatus === 'rejected') return -1;
    if (currentStatus === 'received') return 3;
    if (currentStatus === 'in_transit') return 2;
    if (currentStatus === 'approved') return 1;
    return 0;
  };

  const currentStepIndex = getCurrentStepIndex();
  const isCancelled = currentStatus === 'cancelled' || currentStatus === 'rejected';
  const isRejected = currentStatus === 'rejected';

  if (isCancelled) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-red-100 p-3">
            <XCircle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="font-medium text-red-900">
              {isRejected ? 'Transfer Ditolak' : 'Transfer Dibatalkan'}
            </p>
            <p className="text-sm text-red-700">
              {isRejected
                ? 'Permintaan transfer ini ditolak dan tidak dapat dilanjutkan'
                : 'Transfer ini telah dibatalkan dan tidak dapat dilanjutkan'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        {/* Progress bar background */}
        <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gray-200" />
        {/* Progress bar fill */}
        {currentStepIndex > 0 && (
          <div
            className="absolute left-6 top-6 w-0.5 bg-blue-500 transition-all duration-500"
            style={{
              height: `${(currentStepIndex / (steps.length - 1)) * 100}%`,
            }}
          />
        )}

        {/* Timeline steps */}
        <div className="space-y-6">
          {steps.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const config = TIMELINE_CONFIG[step.status];

            return (
              <div key={step.status} className="relative flex items-start gap-4">
                {/* Icon */}
                <div
                  className={cn(
                    'relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-4 border-background transition-all',
                    isCompleted ? config.color : 'bg-gray-100 text-gray-400',
                    isCurrent && 'ring-4 ring-blue-100'
                  )}
                >
                  {step.icon}
                </div>

                {/* Content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-2">
                    <h4
                      className={cn(
                        'font-medium',
                        isCompleted ? 'text-gray-900' : 'text-gray-400'
                      )}
                    >
                      {step.label}
                    </h4>
                    {isCurrent && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Saat ini
                      </span>
                    )}
                  </div>

                  {step.timestamp && (
                    <p className="mt-1 text-sm text-gray-600">
                      {formatDateTime(step.timestamp)}
                    </p>
                  )}

                  {step.actor && (
                    <p className="mt-0.5 text-xs text-gray-500">
                      oleh: {step.actor}
                    </p>
                  )}

                  {!isCompleted && !step.timestamp && (
                    <p className="mt-1 text-sm text-gray-400 italic">
                      Menunggu...
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
