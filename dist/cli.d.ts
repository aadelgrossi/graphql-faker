declare type Options = {
    fileName: string | undefined;
    port: number;
    corsOrigin: string | true;
    openEditor: boolean;
    extendURL: string | undefined;
    headers: {
        [key: string]: string;
    };
    forwardHeaders: [string];
};
export declare function parseCLI(commandCB: (options: Options) => void): void;
export {};
