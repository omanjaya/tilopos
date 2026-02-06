/**
 * Empty State Illustrations
 *
 * Collection of simple SVG illustrations for empty states.
 * All illustrations are inline SVG components that support theming.
 *
 * Usage:
 * import { EmptyBox, SearchEmpty, CartEmpty } from '@/components/illustrations/empty-states';
 * <EmptyBox className="w-48 h-48" />
 */

// Generic Empty States
export { EmptyBox } from './EmptyBox';
export { SearchEmpty } from './SearchEmpty';
export { CartEmpty } from './CartEmpty';
export { DocumentEmpty } from './DocumentEmpty';
export { FolderEmpty } from './FolderEmpty';
export { InboxEmpty } from './InboxEmpty';
export { CalendarEmpty } from './CalendarEmpty';
export { ChartEmpty } from './ChartEmpty';

// User-related
export { UsersEmpty } from './UsersEmpty';

// Status & Feedback
export { Error } from './Error';
export { Success } from './Success';
export { Construction } from './Construction';
export { NoConnection } from './NoConnection';
export { NoPermission } from './NoPermission';

// Backward compatibility exports (deprecated - use new names)
/** @deprecated Use EmptyBox instead */
export { EmptyBox as EmptyBoxIllustration } from './EmptyBox';
/** @deprecated Use SearchEmpty instead */
export { SearchEmpty as SearchEmptyIllustration } from './SearchEmpty';
/** @deprecated Use CartEmpty instead */
export { CartEmpty as CartEmptyIllustration } from './CartEmpty';
/** @deprecated Use UsersEmpty instead */
export { UsersEmpty as UsersEmptyIllustration } from './UsersEmpty';
/** @deprecated Use DocumentEmpty instead */
export { DocumentEmpty as DocumentEmptyIllustration } from './DocumentEmpty';
/** @deprecated Use Error instead */
export { Error as ErrorIllustration } from './Error';
/** @deprecated Use Construction instead */
export { Construction as ConstructionIllustration } from './Construction';
/** @deprecated Use NoConnection instead */
export { NoConnection as NoConnectionIllustration } from './NoConnection';
/** @deprecated Use NoPermission instead */
export { NoPermission as NoPermissionIllustration } from './NoPermission';
/** @deprecated Use Success instead */
export { Success as SuccessIllustration } from './Success';
/** @deprecated Use InboxEmpty instead */
export { InboxEmpty as InboxEmptyIllustration } from './InboxEmpty';
/** @deprecated Use FolderEmpty instead */
export { FolderEmpty as FolderEmptyIllustration } from './FolderEmpty';
/** @deprecated Use CalendarEmpty instead */
export { CalendarEmpty as CalendarEmptyIllustration } from './CalendarEmpty';
/** @deprecated Use ChartEmpty instead */
export { ChartEmpty as ChartEmptyIllustration } from './ChartEmpty';
