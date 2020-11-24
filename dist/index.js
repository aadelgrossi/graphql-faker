#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const express = require("express");
const chalk = require("chalk");
const open = require("open");
const cors = require("cors");
const bodyParser = require("body-parser");
const graphqlHTTP = require("express-graphql");
const graphql_1 = require("graphql");
const middleware_1 = require("graphql-voyager/middleware");
const cli_1 = require("./cli");
const proxy_1 = require("./proxy");
const utils_1 = require("./utils");
const fake_schema_1 = require("./fake_schema");
const fake_definition_1 = require("./fake_definition");
const log = console.log;
cli_1.parseCLI((options) => {
    const { extendURL, headers, forwardHeaders } = options;
    const fileName = options.fileName ||
        (extendURL ? './schema_extension.faker.graphql' : './schema.faker.graphql');
    if (!options.fileName) {
        log(chalk.yellow(`Default file ${chalk.magenta(fileName)} is used. ` +
            `Specify [file] parameter to change.`));
    }
    let userSDL = utils_1.existsSync(fileName) && utils_1.readSDL(fileName);
    if (extendURL) {
        // run in proxy mode
        utils_1.getRemoteSchema(extendURL, headers)
            .then((schema) => {
            const remoteSDL = new graphql_1.Source(graphql_1.printSchema(schema), `Inrospection from "${extendURL}"`);
            if (!userSDL) {
                let body = fs.readFileSync(path.join(__dirname, 'default-extend.graphql'), 'utf-8');
                const rootTypeName = schema.getQueryType().name;
                body = body.replace('___RootTypeName___', rootTypeName);
                userSDL = new graphql_1.Source(body, fileName);
            }
            const executeFn = proxy_1.getProxyExecuteFn(extendURL, headers, forwardHeaders);
            runServer(options, userSDL, remoteSDL, executeFn);
        })
            .catch((error) => {
            log(chalk.red(error.stack));
            process.exit(1);
        });
    }
    else {
        if (!userSDL) {
            userSDL = new graphql_1.Source(fs.readFileSync(path.join(__dirname, 'default-schema.graphql'), 'utf-8'), fileName);
        }
        runServer(options, userSDL);
    }
});
function runServer(options, userSDL, remoteSDL, customExecuteFn) {
    const { port, openEditor } = options;
    const corsOptions = {
        credentials: true,
        origin: options.corsOrigin,
    };
    const app = express();
    let schema;
    try {
        schema = remoteSDL
            ? fake_definition_1.buildWithFakeDefinitions(remoteSDL, userSDL)
            : fake_definition_1.buildWithFakeDefinitions(userSDL);
    }
    catch (error) {
        if (error instanceof fake_definition_1.ValidationErrors) {
            prettyPrintValidationErrors(error);
            process.exit(1);
        }
    }
    app.options('/graphql', cors(corsOptions));
    app.use('/graphql', cors(corsOptions), graphqlHTTP(() => ({
        schema,
        typeResolver: fake_schema_1.fakeTypeResolver,
        fieldResolver: fake_schema_1.fakeFieldResolver,
        customExecuteFn,
        graphiql: true,
    })));
    app.get('/user-sdl', (_, res) => {
        res.status(200).json({
            userSDL: userSDL.body,
            remoteSDL: remoteSDL && remoteSDL.body,
        });
    });
    app.use('/user-sdl', bodyParser.text({ limit: '8mb' }));
    app.post('/user-sdl', (req, res) => {
        try {
            const fileName = userSDL.name;
            fs.writeFileSync(fileName, req.body);
            userSDL = new graphql_1.Source(req.body, fileName);
            schema = remoteSDL
                ? fake_definition_1.buildWithFakeDefinitions(remoteSDL, userSDL)
                : fake_definition_1.buildWithFakeDefinitions(userSDL);
            const date = new Date().toLocaleString();
            log(`${chalk.green('✚')} schema saved to ${chalk.magenta(fileName)} on ${date}`);
            res.status(200).send('ok');
        }
        catch (err) {
            res.status(500).send(err.message);
        }
    });
    app.use('/editor', express.static(path.join(__dirname, 'editor')));
    app.use('/voyager', middleware_1.express({ endpointUrl: '/graphql' }));
    app.use('/voyager.worker.js', express.static(path.join(__dirname, '../node_modules/graphql-voyager/dist/voyager.worker.js')));
    const server = app.listen(port);
    const shutdown = () => {
        server.close();
        process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    log(`\n${chalk.green('✔')} Your GraphQL Fake API is ready to use 🚀
  Here are your links:

  ${chalk.blue('❯')} Interactive Editor: http://localhost:${port}/editor
  ${chalk.blue('❯')} GraphQL API:        http://localhost:${port}/graphql
  ${chalk.blue('❯')} GraphQL Voyager:    http://localhost:${port}/voyager

  `);
    if (openEditor) {
        setTimeout(() => open(`http://localhost:${port}/editor`), 500);
    }
}
function prettyPrintValidationErrors(validationErrors) {
    const { subErrors } = validationErrors;
    log(chalk.red(subErrors.length > 1
        ? `\nYour schema constains ${subErrors.length} validation errors: \n`
        : `\nYour schema constains a validation error: \n`));
    for (const error of subErrors) {
        let [message, ...otherLines] = error.toString().split('\n');
        log([chalk.yellow(message), ...otherLines].join('\n') + '\n\n');
    }
}
