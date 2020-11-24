import { Source, GraphQLError, GraphQLSchema } from 'graphql';
export declare function buildWithFakeDefinitions(schemaSDL: Source, extensionSDL?: Source, options?: {
    skipValidation: boolean;
}): GraphQLSchema;
export declare class ValidationErrors extends Error {
    subErrors: GraphQLError[];
    constructor(errors: any);
}
