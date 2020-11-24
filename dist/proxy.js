"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProxyExecuteFn = void 0;
const graphql_1 = require("graphql");
const utils_1 = require("./utils");
function getProxyExecuteFn(url, headers, forwardHeaders) {
    //TODO: proxy extensions
    return (args) => {
        const { schema, document, contextValue, operationName } = args;
        const request = contextValue;
        const proxyHeaders = Object.create(null);
        for (const name of forwardHeaders) {
            proxyHeaders[name] = request.headers[name];
        }
        const strippedAST = removeUnusedVariables(stripExtensionFields(schema, document));
        const operations = graphql_1.separateOperations(strippedAST);
        const operationAST = operationName
            ? operations[operationName]
            : Object.values(operations)[0];
        return utils_1.graphqlRequest(url, Object.assign(Object.assign({}, headers), proxyHeaders), graphql_1.print(operationAST), args.variableValues, operationName).then((result) => proxyResponse(result, args));
    };
}
exports.getProxyExecuteFn = getProxyExecuteFn;
function proxyResponse(response, args) {
    const rootValue = response.data || {};
    const globalErrors = [];
    for (const error of response.errors || []) {
        const { message, path, extensions } = error;
        const errorObj = new graphql_1.GraphQLError(message, undefined, undefined, undefined, path, undefined, extensions);
        if (!path) {
            globalErrors.push(errorObj);
            continue;
        }
        // Recreate root value up to a place where original error was thrown
        // and place error as field value.
        pathSet(rootValue, error.path, errorObj);
    }
    if (globalErrors.length !== 0) {
        return { errors: globalErrors };
    }
    return graphql_1.execute(Object.assign(Object.assign({}, args), { rootValue }));
}
function pathSet(rootObject, path, value) {
    let currentObject = rootObject;
    const basePath = [...path];
    const lastKey = basePath.pop();
    for (const key of basePath) {
        if (currentObject[key] == null) {
            currentObject[key] = typeof key === 'number' ? [] : {};
        }
        currentObject = currentObject[key];
    }
    currentObject[lastKey] = value;
}
function injectTypename(node) {
    return Object.assign(Object.assign({}, node), { selections: [
            ...node.selections,
            {
                kind: graphql_1.Kind.FIELD,
                name: {
                    kind: graphql_1.Kind.NAME,
                    value: '__typename',
                },
            },
        ] });
}
function stripExtensionFields(schema, operationAST) {
    const typeInfo = new graphql_1.TypeInfo(schema);
    return graphql_1.visit(operationAST, graphql_1.visitWithTypeInfo(typeInfo, {
        [graphql_1.Kind.FIELD]: () => {
            const fieldDef = typeInfo.getFieldDef();
            if (fieldDef.name.startsWith('__') ||
                fieldDef.extensions['isExtensionField'] === true) {
                return null;
            }
        },
        [graphql_1.Kind.SELECTION_SET]: {
            leave(node) {
                const type = typeInfo.getParentType();
                if (graphql_1.isAbstractType(type) || node.selections.length === 0)
                    return injectTypename(node);
            },
        },
    }));
}
function removeUnusedVariables(documentAST) {
    const seenVariables = Object.create(null);
    graphql_1.visit(documentAST, {
        [graphql_1.Kind.VARIABLE_DEFINITION]: () => false,
        [graphql_1.Kind.VARIABLE]: (node) => {
            seenVariables[node.name.value] = true;
        },
    });
    return graphql_1.visit(documentAST, {
        [graphql_1.Kind.VARIABLE_DEFINITION]: (node) => {
            if (!seenVariables[node.variable.name.value]) {
                return null;
            }
        },
    });
}
