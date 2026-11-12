import { Column, DataType, Model } from 'sequelize-typescript';

interface MoneyColumnOptions {
  field: string;
  allowNull?: boolean;
  defaultValue?: number;
}

/**
 * A BIGINT minor-units column that always reads back as a JS number.
 *
 * node-postgres returns BIGINT as a string to avoid precision loss. Amounts
 * here stay far below Number.MAX_SAFE_INTEGER (HePaid caps a single amount at
 * 10^10 kobo), so converting is safe.
 */
export function MoneyColumn(options: MoneyColumnOptions): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const key = propertyKey as string;
    (
      Column({
        type: DataType.BIGINT,
        field: options.field,
        allowNull: options.allowNull ?? false,
        ...(options.defaultValue !== undefined ? { defaultValue: options.defaultValue } : {}),
        get(this: Model) {
          const raw = this.getDataValue(key) as unknown;
          return raw === null || raw === undefined ? raw : Number(raw);
        },
      }) as PropertyDecorator
    )(target, key);
  };
}
