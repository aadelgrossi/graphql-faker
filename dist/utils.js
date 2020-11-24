"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.graphqlRequest = exports.getRemoteSchema = exports.readSDL = exports.existsSync = void 0;
const fs = require("fs");
const fetch = require("node-fetch");
const node_fetch_1 = require("node-fetch");
const graphql_1 = require("graphql");
function existsSync(filePath) {
    try {
        fs.statSync(filePath);
    }
    catch (err) {
        if (err.code == 'ENOENT')
            return false;
    }
    return true;
}
exports.existsSync = existsSync;
function readSDL(filepath) {
    return new graphql_1.Source(fs.readFileSync(filepath, 'utf-8'), filepath);
}
exports.readSDL = readSDL;
function getRemoteSchema(url, headers) {
    return graphqlRequest(url, headers, graphql_1.getIntrospectionQuery())
        .then((response) => {
        if (response.errors) {
            throw Error(JSON.stringify(response.errors, null, 2));
        }
        return graphql_1.buildClientSchema(response.data);
    })
        .catch((error) => {
        throw Error(`Can't get introspection from ${url}:\n${error.message}`);
    });
}
exports.getRemoteSchema = getRemoteSchema;
function graphqlRequest(url, headers, query, variables, operationName) {
    return fetch(url, {
        method: 'POST',
        headers: new node_fetch_1.Headers(Object.assign({ 'content-type': 'application/json' }, (headers || {}))),
        body: JSON.stringify({
            operationName,
            query,
            variables,
        }),
    }).then((responce) => {
        if (responce.ok)
            return responce.json();
        return responce.text().then((body) => {
            throw Error(`${responce.status} ${responce.statusText}\n${body}`);
        });
    });
}
exports.graphqlRequest = graphqlRequest;
