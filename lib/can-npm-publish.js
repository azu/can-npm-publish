// MIT © 2018 azu
"use strict";
const spawn = require("child_process").spawn;
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

/**
 * Return Promise which resolves with an array of version numbers for the package
 * or rejects if anything failed
 * @param packageName
 * @param registry
 * @returns {Promise}
 */
const viewPackage = (packageName, registry) => {
    return new Promise((resolve, reject) => {
        const registryArgs = registry ? ["--registry", registry] : [];
        const view = spawn("npm", ["view", packageName, "versions", "--json"].concat(registryArgs));
        let result = "";
        let errorResult = "";

        view.stdout.on("data", data => {
            result += data.toString();
        });

        view.stderr.on("data", err => {
            errorResult += err.toString();
        });

        view.on("close", code => {
            if (code > 0) {
                reject(new Error(errorResult));
                return;
            }

            resolve(JSON.parse(result));
        });
    });
};

const checkAlreadyPublish = packagePath => {
    return readPkg(packagePath).then(pkg => {
        const name = pkg["name"];
        const version = pkg["version"];
        const publishConfig = pkg["publishConfig"];
        const registry = publishConfig && publishConfig["registry"];
        if (name === undefined) {
            return Promise.reject(new Error("This package has not `name`."));
        }
        if (version === undefined) {
            return Promise.reject(new Error("This package has not `version`."));
        }
        return viewPackage(name, registry).then(versions => {
            if (versions.includes(version)) {
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
