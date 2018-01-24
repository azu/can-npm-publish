// MIT © 2018 azu
"use strict";
const fetch = require("node-fetch");
const readPkg = require("read-pkg");
/**
 * Return rejected promise if the package is not `private:true`
 * @param packagePath
 * @returns {Promise}
 */
const checkPrivateField = packagePath => {
    return readPkg(packagePath).then(pkg => {
        if (pkg["private"] === true) {
            return Promise.reject(new Error("This package is private."));
        }
    });
};

const checkAlreadyPublish = packagePath => {
    return readPkg(packagePath).then(pkg => {
        const name = pkg["name"];
        const version = pkg["version"];
        if (name === undefined) {
            return Promise.reject(new Error("This package has not `name`."));
        }
        if (version === undefined) {
            return Promise.reject(new Error("This package has not `version`."));
        }
        // https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md#getpackageversion
        return fetch(`https://registry.npmjs.com/${encodeURIComponent(name)}`)
            .then(response => {
                if (response.status === 404) {
                    // not published yet
                    return {
                        versions: []
                    };
                }
                if (!response.ok) {
                    return Promise.reject(new Error(response.statusText));
                }
                return response.json();
            })
            .then(json => {
                if (json.error) {
                    // {"error":"version not found: 18.0.0"}
                    return Promise.reject(new Error(json.error));
                }
                const versions = json["versions"];
                if (versions[version]) {
                    return Promise.reject(new Error(`${name}@${versions} is already published`));
                }
                return;
            });
    });
};
const canNpmPublish = packagePath => {
    return Promise.all([checkAlreadyPublish(packagePath), checkPrivateField(packagePath)]);
};
module.exports.canNpmPublish = canNpmPublish;
