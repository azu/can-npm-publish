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
        let _stdoutResult = "";
        let _stderrResult = "";

        const getJsonOutputs = ({ stdout, stderr }) => {
            let stdoutJSON = {};
            let stderrJSON = {};
            try {
                stdoutJSON = JSON.parse(stdout);
            } catch (error) {
                // nope
                // console.warn("stdoutJSON parse error", stdout);
            }
            try {
                stderrJSON = JSON.parse(stderr);
            } catch (error) {
                // nope
                // console.warn("stderrJSON parse error", stderr);
            }
            return {
                stdoutJSON,
                stderrJSON
            };
        };
        const isError = (json) => {
            return json && "error" in json;
        };
        const is404Json = (json) => {
            return isError(json) && json.error.code === "E404";
        };
        view.stdout.on("data", (data) => {
            _stdoutResult += data.toString();
        });

        view.stderr.on("data", (err) => {
            const stdErrorStr = err.toString();
            try {
                // Workaround for npm 7
                // npm 7 --json option is broken
                // It aim to remove non json output.
                // FIXME: However,This logics will break json chunk(chunk may be invalid json)
                // https://github.com/azu/can-npm-publish/issues/19
                // https://github.com/npm/cli/issues/2740
                JSON.parse(stdErrorStr); // parse check
                _stderrResult += stdErrorStr;
            } catch (error) {}
        });

        view.on("close", (code) => {
            // Note:
            // npm 6 output JSON in stdout
            // npm 7(7.18.1) output JSON in stderr
            const { stderrJSON, stdoutJSON } = getJsonOutputs({
                stdout: _stdoutResult,
                stderr: _stderrResult
            });
            // npm6 view --json output to stdout if the package is 404 → can publish
            if (is404Json(stdoutJSON)) {
                return resolve([]);
            }
            // npm7 view --json output to stderr if the package is 404 → can publish
            if (is404Json(stderrJSON)) {
                return resolve([]);
            }
            // in other error, can not publish → reject
            if (isError(stdoutJSON)) {
                return reject(new Error(_stdoutResult));
            }
            if (isError(stderrJSON)) {
                return reject(new Error(_stderrResult));
            }
            // if command is failed by other reasons(no json output), treat it as actual error
            if (code !== 0) {
                return reject(new Error(_stderrResult));
            }
            // if success to get, resolve with versions json
            return resolve(stdoutJSON);
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
