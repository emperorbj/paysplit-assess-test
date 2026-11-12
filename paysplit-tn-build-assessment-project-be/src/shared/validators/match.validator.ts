import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

/**
 * Asserts that the decorated property equals another property on the same object.
 *
 * @example
 * ```ts
 * @Match('password', { message: 'Passwords do not match' })
 * confirmPassword: string;
 * ```
 */
export function Match(property: string, validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'match',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints as [string];
          return value === (args.object as Record<string, unknown>)[relatedPropertyName];
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints as [string];
          return `${args.property} must match ${relatedPropertyName}`;
        },
      },
    });
  };
}
