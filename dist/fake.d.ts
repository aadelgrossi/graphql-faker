export declare function getRandomInt(min: number, max: number): any;
export declare function getRandomItem<T>(array: ReadonlyArray<T>): T;
export declare const stdScalarFakers: {
    Int: () => any;
    Float: () => any;
    String: () => string;
    Boolean: () => any;
    ID: () => string;
};
export declare function fakeValue(type: any, options?: any, locale?: any): any;
