/**
 * @deprecated This file is deprecated. Please import from '@/components/illustrations/empty-states' instead.
 *
 * This file is kept for backward compatibility and re-exports all illustrations
 * from the new modular structure.
 *
 * Old usage:
 * import { EmptyBoxIllustration } from '@/components/illustrations/empty-illustrations';
 *
 * New usage (recommended):
 * import { EmptyBox } from '@/components/illustrations/empty-states';
 */

export {
  // New names (recommended)
  EmptyBox,
  SearchEmpty,
  CartEmpty,
  UsersEmpty,
  DocumentEmpty,
  Error,
  Construction,
  NoConnection,
  NoPermission,
  Success,
  InboxEmpty,
  FolderEmpty,
  CalendarEmpty,
  ChartEmpty,
  // Old names (deprecated but still supported)
  EmptyBoxIllustration,
  SearchEmptyIllustration,
  CartEmptyIllustration,
  UsersEmptyIllustration,
  DocumentEmptyIllustration,
  ErrorIllustration,
  ConstructionIllustration,
  NoConnectionIllustration,
  NoPermissionIllustration,
  SuccessIllustration,
  InboxEmptyIllustration,
  FolderEmptyIllustration,
  CalendarEmptyIllustration,
  ChartEmptyIllustration,
} from './empty-states';
