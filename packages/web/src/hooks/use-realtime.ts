/**
 * Real-time Hooks (Legacy Export)
 *
 * This file maintains backward compatibility by re-exporting from the new modular structure.
 * The implementation has been refactored into feature-focused hooks in the `realtime/` directory.
 *
 * @deprecated Import from '@/hooks/realtime' instead for better tree-shaking.
 */

// Re-export everything from the new modular structure
export {
  useRealtimeOrders,
  useRealtimeInventory,
  useRealtimeQueue,
  useRealtimeTransactions,
  useRealtimeShifts,
  useRealtimeShiftSales,
  useRealtimeNotifications,
  useRealtimeDeviceSync,
  useRealtimeSync,
} from './realtime';
