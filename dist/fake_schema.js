"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fakeFieldResolver = exports.fakeTypeResolver = void 0;
const assert = require("assert");
const graphql_1 = require("graphql");
const fake_1 = require("./fake");
exports.fakeTypeResolver = async (value, context, info, abstractType) => {
    const defaultResolved = await graphql_1.defaultTypeResolver(value, context, info, abstractType);
    if (defaultResolved != null) {
        return defaultResolved;
    }
    const possibleTypes = info.schema.getPossibleTypes(abstractType);
    return fake_1.getRandomItem(possibleTypes);
};
exports.fakeFieldResolver = async (source, args, context, info) => {
    const { schema, parentType, fieldName } = info;
    const fieldDef = parentType.getFields()[fieldName];
    let resolved = await graphql_1.defaultFieldResolver(source, args, context, info);
    if (resolved === undefined && source && typeof source === 'object') {
        resolved = source[info.path.key]; // alias value
    }
    if (resolved === undefined) {
        resolved = fakeValueOfType(fieldDef.type);
    }
    if (resolved instanceof Error) {
        return resolved;
    }
    const isMutation = parentType === schema.getMutationType();
    const isCompositeReturn = graphql_1.isCompositeType(graphql_1.getNullableType(fieldDef.type));
    if (isMutation && isCompositeReturn && isPlainObject(resolved)) {
        const inputArg = args['input'];
        return Object.assign(Object.assign({}, (Object.keys(args).length === 1 && isPlainObject(inputArg)
            ? inputArg
            : args)), resolved);
    }
    return resolved;
    function fakeValueOfType(type) {
        if (graphql_1.isNonNullType(type)) {
            return fakeValueOfType(type.ofType);
        }
        if (graphql_1.isListType(type)) {
            return Array(getListLength(fieldDef))
                .fill(null)
                .map(() => fakeValueOfType(type.ofType));
        }
        const valueCB = getExampleValueCB(fieldDef) ||
            getFakeValueCB(fieldDef) ||
            getExampleValueCB(type) ||
            getFakeValueCB(type);
        if (graphql_1.isLeafType(type)) {
            if (valueCB) {
                return valueCB();
            }
            return fakeLeafValueCB(type);
        }
        else {
            // TODO: error on fake directive
            const __typename = graphql_1.isAbstractType(type)
                ? fake_1.getRandomItem(schema.getPossibleTypes(type)).name
                : type.name;
            return Object.assign({ __typename }, (valueCB ? valueCB() : {}));
        }
    }
    function getFakeValueCB(object) {
        const fakeDirective = schema.getDirective('fake');
        const args = getDirectiveArgs(fakeDirective, object);
        return args && (() => fake_1.fakeValue(args.type, args.options, args.locale));
    }
    function getExampleValueCB(object) {
        const examplesDirective = schema.getDirective('examples');
        const args = getDirectiveArgs(examplesDirective, object);
        return args && (() => fake_1.getRandomItem(args.values));
    }
    function getListLength(object) {
        const listLength = schema.getDirective('listLength');
        const args = getDirectiveArgs(listLength, object);
        return args ? fake_1.getRandomInt(args.min, args.max) : fake_1.getRandomInt(2, 4);
    }
};
function fakeLeafValueCB(type) {
    if (graphql_1.isEnumType(type)) {
        const values = type.getValues().map((x) => x.value);
        return fake_1.getRandomItem(values);
    }
    const faker = fake_1.stdScalarFakers[type.name];
    if (faker)
        return faker();
    return `<${type.name}>`;
}
function getDirectiveArgs(directive, object) {
    assert(directive != null);
    let args = undefined;
    if (object.astNode != null) {
        args = graphql_1.getDirectiveValues(directive, object.astNode);
    }
    if (object.extensionNodes != null) {
        for (const node of object.extensionNodes) {
            args = graphql_1.getDirectiveValues(directive, node);
        }
    }
    return args;
}
function isPlainObject(maybeObject) {
    return (typeof maybeObject === 'object' &&
        maybeObject !== null &&
        !Array.isArray(maybeObject));
}
