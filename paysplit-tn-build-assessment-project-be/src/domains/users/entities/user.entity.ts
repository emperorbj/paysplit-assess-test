import { Table, Column, DataType, ForeignKey, BelongsTo, HasOne } from 'sequelize-typescript';
import { BaseEntity } from '../../../core/base.entity';
import { Role } from './role.entity';
import type { KycStatus } from '../constants/kyc-status.constants';
import { KycVerification } from '../../kyc/entities/kyc-verification.entity';
import type { NotificationPreferences } from '../constants/notification-preferences.constants';

@Table({ tableName: 'users' })
export class User extends BaseEntity<User> {
  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  declare email: string;

  @Column({ type: DataType.STRING, allowNull: false, field: 'first_name' })
  declare firstName: string;

  @Column({ type: DataType.STRING, allowNull: false, field: 'last_name' })
  declare lastName: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare password?: string;

  @Column({ type: DataType.STRING, allowNull: true, field: 'phone_number' })
  declare phoneNumber?: string | null;

  /** ISO 3166-1 alpha-2 country code chosen during profile setup (e.g. "NG"). */
  @Column({ type: DataType.STRING(2), allowNull: true, field: 'country_code' })
  declare countryCode?: string | null;

  /** Default currency for salary processing, derived from the country (e.g. "NGN"). */
  @Column({ type: DataType.STRING(3), allowNull: true, field: 'currency_code' })
  declare currencyCode?: string | null;

  /** Public URL of the profile picture in Cloud Storage. */
  @Column({ type: DataType.STRING(512), allowNull: true, field: 'profile_image_url' })
  declare profileImageUrl?: string | null;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    field: 'is_email_verified',
  })
  declare isEmailVerified: boolean;

  /** Set when the user creates (or resets) their password. Null = signup not finished. */
  @Column({ type: DataType.DATE, allowNull: true, field: 'password_set_at' })
  declare passwordSetAt?: Date | null;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'not_started',
    field: 'kyc_status',
  })
  declare kycStatus: KycStatus;

  @Column({ type: DataType.BOOLEAN, defaultValue: true, allowNull: false, field: 'is_active' })
  declare isActive: boolean;

  @ForeignKey(() => Role)
  @Column({ type: DataType.UUID, allowNull: true, field: 'role_id' })
  declare roleId?: string;

  @BelongsTo(() => Role)
  declare role?: Role;

  @Column({ type: DataType.DATE, allowNull: true, field: 'last_login_at' })
  declare lastLoginAt?: Date | null;

  @Column({ type: DataType.DATE, allowNull: true, field: 'deactivated_at' })
  declare deactivatedAt?: Date | null;

  /** Bumped on logout / password change / reset; access tokens carry it as `ver`. */
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0, field: 'token_version' })
  declare tokenVersion: number;

  /** Per-channel notification toggles. Null = defaults (see notification-preferences). */
  @Column({ type: DataType.JSONB, allowNull: true, field: 'notification_preferences' })
  declare notificationPreferences?: NotificationPreferences | null;

  @HasOne(() => KycVerification)
  declare kycVerification?: KycVerification | null;

  override toJSON(): Record<string, unknown> {
    const values = { ...(this.get() as unknown as Record<string, unknown>) };
    delete values['password'];
    delete values['tokenVersion'];
    delete values['notificationPreferences'];
    // Holds encrypted identifiers — never serialise. KYC progress is exposed via `onboarding`.
    delete values['kycVerification'];
    values['role'] = this.role?.name ?? null;
    return values;
  }
}
