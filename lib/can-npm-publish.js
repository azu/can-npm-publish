// MIT © 2018 azu
"use strict";
const path = require("path");
const spawn = require("cross-spawn");
const readPkg = require("read-pkg");
const validatePkgName = require("validate-npm-package-name");
/**
 * @param {string} [filePathOrDirPath]
 * @returns {Promise<readPkg.NormalizedPackageJson>}
 */
const readPkgWithPath = (filePathOrDirPath) => {
    if (filePathOrDirPath) {
        const isJSON = path.extname(filePathOrDirPath) === ".json";
        if (isJSON) {
            return Promise.resolve(require(filePathOrDirPath));
        }
        return readPkg({ cwd: filePathOrDirPath });
    } else {
        return readPkg();
    }
};
/**
 * Return rejected promise if the package name is invalid
 * @param {string} packagePath
 * @param {{verbose:boolean}} options
 * @returns {Promise}
 */
const checkPkgName = (packagePath, options) => {
    return readPkgWithPath(packagePath).then((pkg) => {
        const name = pkg["name"];
        const result = validatePkgName(name);
        // Treat Legacy Names as valid
        // https://github.com/npm/validate-npm-package-name#legacy-names
        // https://github.com/azu/can-npm-publish/issues/8
        const isInvalidNamingInNewRule = !result.validForNewPackages;
        if (isInvalidNamingInNewRule) {
            if (Array.isArray(result.errors)) {
                return Promise.reject(new Error(result.errors.join("\n")));
            }
            // warning is ignored by default
            if (options.verbose && result.warnings) {
                console.warn(result.warnings.join("\n"));
            }
        }
    });
};

/**
 * Return rejected promise if the package is not `private:true`
 * @param {string} packagePath
 * @returns {Promise}
 */
const checkPrivateField = (packagePath) => {
    return readPkgWithPath(packagePath).then((pkg) => {
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

        view.stdout.on("data", (data) => {
            result += data.toString();
        });

        view.stderr.on("data", (err) => {
            errorResult += err.toString();
        });

        view.on("close", (code) => {
            if (code !== 0) {
                return reject(new Error(errorResult));
            }
            const resultJSON = JSON.parse(result);
            if (resultJSON && resultJSON.error) {
                // the package is not in the npm registry => can publish
                if (resultJSON.error.code === "E404") {
                    return resolve([]); // resolve as empty version
                } else {
                    // other error => can not publish
                    return reject(new Error(errorResult));
                }
            }
            resolve(resultJSON);
        });
    });
};

const checkAlreadyPublish = (packagePath) => {
    return readPkgWithPath(packagePath).then((pkg) => {
        const name = pkg["name"];
        const version = pkg["version"];
        const publishConfig = pkg["publishConfig"];
        const registry = publishConfig && publishConfig["registry"];
        if (name === undefined) {
            return Promise.reject(new Error("This package has no `name`."));
        }
        if (version === undefined) {
            return Promise.reject(new Error("This package has no `version`."));
        }
        return viewPackage(name, registry).then((versions) => {
            if (versions.includes(version)) {
                return Promise.reject(new Error(`${name}@${version} is already published`));
            }
            return;
        });
    });
};
/**
 *
 * @param {string} packagePath
 * @param {{verbose : boolean}} options
 * @returns {Promise<[any]>}
 */
const canNpmPublish = (packagePath, options = { verbose: false }) => {
    return Promise.all([
        checkPkgName(packagePath, options),
        checkAlreadyPublish(packagePath),
        checkPrivateField(packagePath)
    ]);
};
module.exports.canNpmPublish = canNpmPublish;
