import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export interface TransferTemplateItemInput {
  productId?: string;
  variantId?: string;
  ingredientId?: string;
  itemName: string;
  defaultQuantity: number;
}

export interface CreateTransferTemplateInput {
  businessId: string;
  name: string;
  description?: string;
  sourceOutletId: string;
  destinationOutletId: string;
  items: TransferTemplateItemInput[];
  createdBy: string;
}

export interface UpdateTransferTemplateInput {
  name?: string;
  description?: string;
  sourceOutletId?: string;
  destinationOutletId?: string;
  items?: TransferTemplateItemInput[];
}

export interface TransferTemplate {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  sourceOutletId: string;
  destinationOutletId: string;
  sourceOutletName?: string;
  destinationOutletName?: string;
  items: TransferTemplateItem[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
}

export interface TransferTemplateItem {
  id: string;
  templateId: string;
  productId: string | null;
  variantId: string | null;
  ingredientId: string | null;
  itemName: string;
  defaultQuantity: number;
}

@Injectable()
export class TransferTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all templates for a business
   */
  async list(businessId: string): Promise<TransferTemplate[]> {
    // Using raw query since schema might not exist yet
    try {
      const templates = await this.prisma.$queryRaw<any[]>`
        SELECT
          t.*,
          so.name as "sourceOutletName",
          do.name as "destinationOutletName",
          (
            SELECT COUNT(*)::int
            FROM stock_transfers st
            WHERE st.notes LIKE '%Template: ' || t.name || '%'
          ) as "usageCount"
        FROM transfer_templates t
        LEFT JOIN outlets so ON so.id = t.source_outlet_id
        LEFT JOIN outlets do ON do.id = t.destination_outlet_id
        WHERE t.business_id = ${businessId}::uuid
        ORDER BY t.updated_at DESC
      `;

      // Get items for each template
      for (const template of templates) {
        template.items = await this.prisma.$queryRaw<any[]>`
          SELECT *
          FROM transfer_template_items
          WHERE template_id = ${template.id}::uuid
          ORDER BY created_at ASC
        `;
      }

      return templates.map(this.mapToTransferTemplate);
    } catch (error) {
      // If tables don't exist, return empty array
      console.warn('Transfer templates table not found, returning empty array');
      return [];
    }
  }

  /**
   * Get a single template by ID
   */
  async get(id: string, businessId: string): Promise<TransferTemplate> {
    try {
      const [template] = await this.prisma.$queryRaw<any[]>`
        SELECT
          t.*,
          so.name as "sourceOutletName",
          do.name as "destinationOutletName"
        FROM transfer_templates t
        LEFT JOIN outlets so ON so.id = t.source_outlet_id
        LEFT JOIN outlets do ON do.id = t.destination_outlet_id
        WHERE t.id = ${id}::uuid AND t.business_id = ${businessId}::uuid
      `;

      if (!template) {
        throw new NotFoundException('Template not found');
      }

      template.items = await this.prisma.$queryRaw<any[]>`
        SELECT *
        FROM transfer_template_items
        WHERE template_id = ${id}::uuid
        ORDER BY created_at ASC
      `;

      return this.mapToTransferTemplate(template);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new NotFoundException('Template not found or tables not initialized');
    }
  }

  /**
   * Create a new template
   */
  async create(input: CreateTransferTemplateInput): Promise<TransferTemplate> {
    try {
      // Insert template
      const [template] = await this.prisma.$queryRaw<any[]>`
        INSERT INTO transfer_templates (
          id, business_id, name, description,
          source_outlet_id, destination_outlet_id,
          created_by, created_at, updated_at
        )
        VALUES (
          gen_random_uuid(),
          ${input.businessId}::uuid,
          ${input.name},
          ${input.description || null},
          ${input.sourceOutletId}::uuid,
          ${input.destinationOutletId}::uuid,
          ${input.createdBy},
          NOW(),
          NOW()
        )
        RETURNING *
      `;

      // Insert items
      for (const item of input.items) {
        await this.prisma.$queryRaw`
          INSERT INTO transfer_template_items (
            id, template_id, product_id, variant_id,
            ingredient_id, item_name, default_quantity, created_at
          )
          VALUES (
            gen_random_uuid(),
            ${template.id}::uuid,
            ${item.productId || null}::uuid,
            ${item.variantId || null}::uuid,
            ${item.ingredientId || null}::uuid,
            ${item.itemName},
            ${item.defaultQuantity},
            NOW()
          )
        `;
      }

      return this.get(template.id, input.businessId);
    } catch (error) {
      console.error('Failed to create template:', error);
      throw new Error('Failed to create template. Make sure database schema is up to date.');
    }
  }

  /**
   * Update a template
   */
  async update(
    id: string,
    businessId: string,
    input: UpdateTransferTemplateInput,
  ): Promise<TransferTemplate> {
    try {
      // Update template
      if (input.name || input.description || input.sourceOutletId || input.destinationOutletId) {
        await this.prisma.$queryRaw`
          UPDATE transfer_templates
          SET
            name = COALESCE(${input.name}, name),
            description = COALESCE(${input.description || null}, description),
            source_outlet_id = COALESCE(${input.sourceOutletId || null}::uuid, source_outlet_id),
            destination_outlet_id = COALESCE(${input.destinationOutletId || null}::uuid, destination_outlet_id),
            updated_at = NOW()
          WHERE id = ${id}::uuid AND business_id = ${businessId}::uuid
        `;
      }

      // Update items if provided
      if (input.items) {
        // Delete existing items
        await this.prisma.$queryRaw`
          DELETE FROM transfer_template_items
          WHERE template_id = ${id}::uuid
        `;

        // Insert new items
        for (const item of input.items) {
          await this.prisma.$queryRaw`
            INSERT INTO transfer_template_items (
              id, template_id, product_id, variant_id,
              ingredient_id, item_name, default_quantity, created_at
            )
            VALUES (
              gen_random_uuid(),
              ${id}::uuid,
              ${item.productId || null}::uuid,
              ${item.variantId || null}::uuid,
              ${item.ingredientId || null}::uuid,
              ${item.itemName},
              ${item.defaultQuantity},
              NOW()
            )
          `;
        }
      }

      return this.get(id, businessId);
    } catch (error) {
      throw new NotFoundException('Template not found or update failed');
    }
  }

  /**
   * Delete a template
   */
  async delete(id: string, businessId: string): Promise<void> {
    try {
      // Delete items first (foreign key constraint)
      await this.prisma.$queryRaw`
        DELETE FROM transfer_template_items
        WHERE template_id = ${id}::uuid
      `;

      // Delete template
      const result = await this.prisma.$queryRaw<any[]>`
        DELETE FROM transfer_templates
        WHERE id = ${id}::uuid AND business_id = ${businessId}::uuid
        RETURNING id
      `;

      if (result.length === 0) {
        throw new NotFoundException('Template not found');
      }
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new Error('Failed to delete template');
    }
  }

  /**
   * Map raw database result to TransferTemplate interface
   */
  private mapToTransferTemplate(raw: any): TransferTemplate {
    return {
      id: raw.id,
      businessId: raw.business_id,
      name: raw.name,
      description: raw.description,
      sourceOutletId: raw.source_outlet_id,
      destinationOutletId: raw.destination_outlet_id,
      sourceOutletName: raw.sourceOutletName,
      destinationOutletName: raw.destinationOutletName,
      items: (raw.items || []).map((item: any) => ({
        id: item.id,
        templateId: item.template_id,
        productId: item.product_id,
        variantId: item.variant_id,
        ingredientId: item.ingredient_id,
        itemName: item.item_name,
        defaultQuantity: Number(item.default_quantity),
      })),
      createdBy: raw.created_by,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
      usageCount: Number(raw.usageCount || 0),
    };
  }
}
