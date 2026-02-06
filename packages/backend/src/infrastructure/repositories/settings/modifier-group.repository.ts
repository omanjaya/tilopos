import { Injectable } from '@nestjs/common';
import { ModifierSelectionType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type {
  ModifierGroupRecord,
  CreateModifierGroupData,
  UpdateModifierGroupData,
} from '../../../domain/interfaces/repositories/settings.repository';

/**
 * Repository for managing modifier groups.
 * Handles CRUD operations for product modifiers.
 */
@Injectable()
export class ModifierGroupRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all modifier groups for a business
   */
  async findModifierGroups(businessId: string): Promise<ModifierGroupRecord[]> {
    const groups = await this.prisma.modifierGroup.findMany({
      where: { businessId, isActive: true },
      include: { modifiers: true },
    });

    // ModifierGroup doesn't have updatedAt in Prisma schema, so we add it from createdAt
    return groups.map((g) => ({
      ...g,
      updatedAt: g.createdAt, // Use createdAt as updatedAt since schema doesn't have it
    }));
  }

  /**
   * Create a new modifier group with modifiers
   */
  async createModifierGroup(data: CreateModifierGroupData): Promise<ModifierGroupRecord> {
    const group = await this.prisma.modifierGroup.create({
      data: {
        businessId: data.businessId,
        name: data.name,
        selectionType: data.selectionType as ModifierSelectionType,
        minSelection: data.minSelection,
        maxSelection: data.maxSelection,
        isRequired: data.isRequired,
        modifiers: { create: data.modifiers },
      },
    });

    return {
      ...group,
      updatedAt: group.createdAt, // Use createdAt as updatedAt since schema doesn't have it
    };
  }

  /**
   * Update modifier group information
   */
  async updateModifierGroup(
    id: string,
    data: UpdateModifierGroupData,
  ): Promise<ModifierGroupRecord> {
    const group = await this.prisma.modifierGroup.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return {
      ...group,
      updatedAt: group.createdAt, // Use createdAt as updatedAt since schema doesn't have it
    };
  }

  /**
   * Soft delete a modifier group (set isActive to false)
   */
  async deleteModifierGroup(id: string): Promise<void> {
    await this.prisma.modifierGroup.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
