import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes, Op } from 'sequelize';
import { KycVerification } from '../entities/kyc-verification.entity';

export type KycVerificationWriteInput = Partial<
  Omit<CreationAttributes<KycVerification>, 'id' | 'userId'>
>;

@Injectable()
export class KycVerificationRepository {
  constructor(
    @InjectModel(KycVerification)
    private readonly model: typeof KycVerification,
  ) {}

  findByUserId(userId: string): Promise<KycVerification | null> {
    return this.model.findOne({ where: { userId } });
  }

  /** Returns the user's verification row, creating an empty one if needed. */
  async findOrCreate(userId: string): Promise<KycVerification> {
    const [row] = await this.model.findOrCreate({
      where: { userId },
      defaults: { userId } as CreationAttributes<KycVerification>,
    });
    return row;
  }

  async update(id: string, data: KycVerificationWriteInput): Promise<void> {
    await this.model.update(data, { where: { id } });
  }

  /** Another user who has already used this ID (passed identity or approved). */
  findOtherUserWithFingerprint(
    fingerprint: string,
    userId: string,
  ): Promise<KycVerification | null> {
    return this.model.findOne({
      where: {
        userId: { [Op.ne]: userId },
        [Op.or]: [
          {
            idFingerprint: fingerprint,
            [Op.or]: [{ identityStatus: 'passed' }, { approvedAt: { [Op.ne]: null } }],
          },
          // A BVN/NIN another user added for their salary account.
          { walletIdFingerprint: fingerprint },
        ],
      },
    });
  }
}
