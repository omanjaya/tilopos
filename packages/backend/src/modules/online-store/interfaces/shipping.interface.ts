/**
 * Shipping Calculator Interfaces
 *
 * Interfaces for calculating shipping costs and managing delivery zones.
 */

export type ShippingMode = 'distance' | 'flat_rate' | 'free';

export interface ShippingEstimate {
  shippingMode: ShippingMode;
  cost: number;
  estimatedDays: number;
  distanceKm: number | null;
  description: string;
}

export interface DeliveryZone {
  name: string;
  minDistanceKm: number;
  maxDistanceKm: number;
  cost: number;
  estimatedDays: number;
}
