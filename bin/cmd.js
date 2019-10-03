#!/usr/bin/env node
"use strict";
const meow = require("meow");
const canNpmPublish = require("../lib/can-npm-publish").canNpmPublish;
const cli = meow(
    `
    Usage
      $ can-npm-publish [directory|pacakge.json path]

    Options
      --verbose  show detail of errors

    Examples
      $ can-npm-publish
      $ echo $? # 0 or 1
`,
    {
        flags: {
            help: {
                type: "boolean",
                alias: "h"
            },
            verbose: {
                type: "boolean"
            }
        }
    }
);
if (cli.flags.help) {
    cli.showHelp();
}

canNpmPublish(cli.input[0], {
    verbose: cli.flags.verbose
})
    .then(() => {
        process.exit(0);
    })
    .catch(error => {
        if (cli.flags.verbose) {
            console.error(error.message);
        }
        process.exit(1);
    });
