export class EnumUtil {
    public static getNumericEnumValues<T extends object>(e: T): (number)[] {
        return Object.values(e).filter(value => typeof value === 'number');
    }
}