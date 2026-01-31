import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import type { IEmployeeRepository } from '@domain/interfaces/repositories/employee.repository';

export interface UpdateProfileInput {
  employeeId: string;
  name?: string;
  phone?: string;
  profilePhotoUrl?: string;
  preferences?: Record<string, unknown>;
}

export interface UpdateProfileOutput {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  profilePhotoUrl: string | null;
  preferences: Record<string, unknown> | null;
}

@Injectable()
export class UpdateProfileUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.EMPLOYEE)
    private readonly employeeRepo: IEmployeeRepository,
  ) {}

  async execute(input: UpdateProfileInput): Promise<UpdateProfileOutput> {
    const employee = await this.employeeRepo.findById(input.employeeId);
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Check if email is being changed (not allowed through this endpoint)
    // Email changes should be done through a separate verification flow

    const updated = await this.employeeRepo.update(input.employeeId, {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.profilePhotoUrl !== undefined && { profilePhotoUrl: input.profilePhotoUrl }),
      ...(input.preferences !== undefined && { preferences: input.preferences }),
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      profilePhotoUrl: updated.profilePhotoUrl,
      preferences: updated.preferences,
    };
  }
}
