import { Injectable } from '@nestjs/common';

import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { UserRepository, UserWriteInput } from '../repository/user.repository';
import { RoleRepository } from '../repository/role.repository';
import { SetupProgressRepository } from '../repository/setup-progress.repository';
import { buildOnboardingStatus, OnboardingStatus } from '../utils/onboarding-status';

/** Role names seeded by `database/seeders/*-seed-roles.js`. */
export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
} as const;

/** Roles that may use the admin dashboard (`/admin/*`). */
export const ADMIN_ROLES: readonly string[] = [ROLES.ADMIN, ROLES.SUPER_ADMIN];

/** True for admin and super-admin accounts. Needs `user.role` loaded. */
export function isAdminUser(user: Pick<User, 'role'>): boolean {
  return !!user.role && ADMIN_ROLES.includes(user.role.name);
}

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly setupProgress: SetupProgressRepository,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email.toLowerCase().trim());
  }

  create(data: UserWriteInput): Promise<User> {
    return this.userRepository.create(data);
  }

  update(id: string, data: UserWriteInput): Promise<void> {
    return this.userRepository.update(id, data);
  }

  /** Revokes every access token issued so far (logout, password change/reset). */
  incrementTokenVersion(id: string): Promise<void> {
    return this.userRepository.incrementTokenVersion(id);
  }

  findRoleByName(name: string): Promise<Role | null> {
    return this.roleRepository.findByName(name);
  }

  /** Onboarding status including the live setup checklist. */
  async getOnboardingStatus(user: User): Promise<OnboardingStatus> {
    return buildOnboardingStatus(user, await this.setupProgress.getFlags(user.id));
  }
}
