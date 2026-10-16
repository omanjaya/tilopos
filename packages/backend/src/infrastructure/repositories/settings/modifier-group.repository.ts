import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ModifierSelectionType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type {
  ModifierGroupRecord,
  CreateModifierGroupData,
  UpdateModifierGroupData,
} from '../../../domain/interfaces/repositories/settings.repository';

/**
 * Repository for modifier groups. Updates/deletes are scoped to the caller's business.
 */
@Injectable()
export class ModifierGroupRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findModifierGroups(businessId: string): Promise<ModifierGroupRecord[]> {
    return this.prisma.modifierGroup.findMany({
      where: { businessId, isActive: true },
      include: { modifiers: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createModifierGroup(data: CreateModifierGroupData): Promise<ModifierGroupRecord> {
    return this.prisma.modifierGroup.create({
      data: {
        businessId: data.businessId,
        name: data.name,
        selectionType: data.selectionType as ModifierSelectionType,
        minSelection: data.minSelection,
        maxSelection: data.maxSelection,
        isRequired: data.isRequired,
        modifiers: {
          create: data.modifiers.map((m, index) => ({
            name: m.name,
            price: m.price,
            sortOrder: index,
          })),
        },
      },
    });
  }

  /**
   * Updates the group and (when `modifiers` is given) reconciles its modifiers in one transaction.
   * Modifiers are never hard-deleted: sold lines reference them, so missing ones are deactivated.
   */
  async updateModifierGroup(
    businessId: string,
    id: string,
    data: UpdateModifierGroupData,
  ): Promise<ModifierGroupRecord> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.modifierGroup.findFirst({
        where: { id, businessId },
        select: { minSelection: true, maxSelection: true },
      });
      if (!current) {
        throw new NotFoundException('Modifier group not found');
      }
      const minSelection = data.minSelection ?? current.minSelection;
      const maxSelection =
        data.maxSelection !== undefined ? data.maxSelection : current.maxSelection;
      if (maxSelection !== null && minSelection > maxSelection) {
        throw new BadRequestException('minSelection cannot be greater than maxSelection');
      }

      await tx.modifierGroup.updateMany({
        where: { id, businessId },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          ...(data.selectionType !== undefined && {
            selectionType: data.selectionType as ModifierSelectionType,
          }),
          ...(data.minSelection !== undefined && { minSelection: data.minSelection }),
          ...(data.maxSelection !== undefined && { maxSelection: data.maxSelection }),
          ...(data.isRequired !== undefined && { isRequired: data.isRequired }),
        },
      });

      if (data.modifiers) {
        const existing = await tx.modifier.findMany({
          where: { modifierGroupId: id },
          select: { id: true },
        });
        const existingIds = new Set(existing.map((m) => m.id));
        const keptIds = new Set<string>();
        for (const [index, m] of data.modifiers.entries()) {
          if (m.id) {
            if (!existingIds.has(m.id)) {
              throw new BadRequestException(`Modifier ${m.id} does not belong to this group`);
            }
            keptIds.add(m.id);
            await tx.modifier.update({
              where: { id: m.id },
              data: { name: m.name, price: m.price, sortOrder: index, isActive: true },
            });
          } else {
            await tx.modifier.create({
              data: { modifierGroupId: id, name: m.name, price: m.price, sortOrder: index },
            });
          }
        }
        await tx.modifier.updateMany({
          where: { modifierGroupId: id, isActive: true, id: { notIn: [...keptIds] } },
          data: { isActive: false },
        });
      }

      const group = await tx.modifierGroup.findFirst({
        where: { id, businessId },
        include: { modifiers: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
      });
      if (!group) {
        throw new NotFoundException('Modifier group not found');
      }
      return group;
    });
  }

  /** Soft delete (isActive = false). */
  async deleteModifierGroup(businessId: string, id: string): Promise<void> {
    const { count } = await this.prisma.modifierGroup.updateMany({
      where: { id, businessId },
      data: { isActive: false },
    });
    if (count === 0) {
      throw new NotFoundException('Modifier group not found');
    }
  }
}
