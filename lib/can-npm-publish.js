// MIT © 2018 azu
"use strict";
const fetch = require("node-fetch");
const readPkg = require("read-pkg");
const validatePkgName = require("validate-npm-package-name");
/**
 * Return rejected promise if the package name is invalid
 * @param packagePath
 * @returns {Promise}
 */
const checkPkgName = packagePath => {
    return readPkg(packagePath).then(pkg => {
        const name = pkg["name"];
        const result = validatePkgName(name);
        if (!result.validForNewPackages) {
            return Promise.reject(new Error(result.errors.join("\n")));
        }
    });
};

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
        // @scope/name => @scope%2Fname
        const encodedName = name.replace(/\//g, "%2F");
        return fetch(`https://registry.npmjs.com/${encodedName}`)
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
                    return Promise.reject(new Error(`${name}@${version} is already published`));
                }
                return;
            });
    });
};
const canNpmPublish = packagePath => {
    return Promise.all([checkPkgName(packagePath), checkAlreadyPublish(packagePath), checkPrivateField(packagePath)]);
};
module.exports.canNpmPublish = canNpmPublish;
