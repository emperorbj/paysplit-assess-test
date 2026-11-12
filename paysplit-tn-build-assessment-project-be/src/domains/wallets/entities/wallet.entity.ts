import { Table, Column, DataType, ForeignKey, BelongsTo, HasOne } from 'sequelize-typescript';
import { BaseEntity } from '../../../core/base.entity';
import { MoneyColumn } from '../../../core/money-column.decorator';
import { User } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';
import { LedgerAccount } from '../../ledger/entities/ledger-account.entity';
import type { WalletAccentColor } from '../constants/wallet.constants';

/**
 * A budget wallet ("Dec Trip Fund", "Emergency Buffer"). Its money lives in the
 * PaySplit ledger as a sub-balance of the user's salary account — it is not a
 * separate bank account.
 */
@Table({ tableName: 'wallets' })
export class Wallet extends BaseEntity<Wallet> {
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false, field: 'user_id' })
  declare userId: string;

  @Column({ type: DataType.STRING(60), allowNull: false })
  declare name: string;

  @ForeignKey(() => Category)
  @Column({ type: DataType.UUID, allowNull: false, field: 'category_id' })
  declare categoryId: string;

  @BelongsTo(() => Category)
  declare category?: Category;

  @Column({ type: DataType.STRING(20), allowNull: false, field: 'accent_color' })
  declare accentColor: WalletAccentColor;

  /** Goal in kobo. Null = "No targeted amount". */
  @MoneyColumn({ field: 'target_amount', allowNull: true })
  declare targetAmount: number | null;

  @Column({ type: DataType.STRING(3), allowNull: false, defaultValue: 'NGN' })
  declare currency: string;

  @HasOne(() => LedgerAccount)
  declare account?: LedgerAccount;
}
