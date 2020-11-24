import { Source, GraphQLSchema } from 'graphql';
export declare function existsSync(filePath: string): boolean;
export declare function readSDL(filepath: string): Source;
export declare function getRemoteSchema(url: string, headers: {
    [name: string]: string;
}): Promise<GraphQLSchema>;
export declare function graphqlRequest(url: any, headers: any, query: any, variables?: any, operationName?: any): any;
