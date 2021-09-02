// MIT © 2018 azu
"use strict";
const path = require("path");
const spawn = require("cross-spawn");
const readPkg = require("read-pkg");
const validatePkgName = require("validate-npm-package-name");
const { extractJSONObject } = require("extract-first-json");
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
 * @param {{verbose : boolean}} options
 * @returns {Promise}
 */
const viewPackage = (packageName, registry, options) => {
    return new Promise((resolve, reject) => {
        const registryArgs = registry ? ["--registry", registry] : [];
        const view = spawn("npm", ["view", packageName, "versions", "--json"].concat(registryArgs));
        let _stdoutResult = "";
        let _stderrResult = "";

        /**
         * @param stdout
         * @param stderr
         * @returns {{stdoutJSON: null | {}, stderrJSON: null | {}}}
         */
        const getJsonOutputs = ({ stdout, stderr }) => {
            let stdoutJSON = null;
            let stderrJSON = null;
            if (stdout) {
                try {
                    stdoutJSON = JSON.parse(stdout);
                } catch (error) {
                    // nope
                    if (options.verbose) {
                        console.error("stdoutJSON parse error", stdout);
                    }
                }
            }
            if (stderr) {
                try {
                    stderrJSON = JSON.parse(stderr);
                } catch (error) {
                    // nope
                    if (options.verbose) {
                        console.error("stderrJSON parse error", stdout);
                    }
                }
            }
            return {
                stdoutJSON,
                stderrJSON
            };
        };
        const isError = (json) => {
            return json && typeof json !== "string" && "error" in json;
        };
        const is404Error = (json) => {
            return isError(json) && json.error.code === "E404";
        };
        view.stdout.on("data", (data) => {
            _stdoutResult += data.toString();
        });

        view.stderr.on("data", (err) => {
            const stdErrorStr = err.toString();
            // Workaround for npm 7
            // npm 7 --json option is broken
            // It aim to remove non json output.
            // FIXME: However,This logics will break json chunk(chunk may be invalid json)
            // https://github.com/azu/can-npm-publish/issues/19
            // https://github.com/npm/cli/issues/2740
            const jsonObject = extractJSONObject(stdErrorStr);
            if (jsonObject) {
                _stderrResult = JSON.stringify(jsonObject, null, 4);
            }
        });

        view.on("close", (code) => {
            // Note:
            // npm 6 output JSON in stdout
            // npm 7(7.18.1) output JSON in stderr
            const { stdoutJSON, stderrJSON } = getJsonOutputs({
                stdout: _stdoutResult,
                stderr: _stderrResult
            });
            if (options.verbose) {
                console.log("`npm view` command's exit code:", code);
                console.log("`npm view` stdoutJSON", stdoutJSON);
                console.log("`npm view` stderrJSON", stderrJSON);
            }
            // npm6 view --json output to stdout if the package is 404 → can publish
            if (is404Error(stdoutJSON)) {
                return resolve([]);
            }
            // npm7 view --json output to stderr if the package is 404 → can publish
            if (is404Error(stderrJSON)) {
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
            if (stdoutJSON) {
                // if success to get, resolve with versions json
                return resolve(stdoutJSON);
            } else {
                return reject(_stderrResult);
            }
        });
    });
};

/**
 *
 * @param {string} packagePath
 * @param {{verbose : boolean}} options
 * @returns {Promise<readPkg.NormalizedPackageJson>}
 */
const checkAlreadyPublish = (packagePath, options) => {
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
        return viewPackage(name, registry, options).then((versions) => {
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
        checkAlreadyPublish(packagePath, options),
        checkPrivateField(packagePath)
    ]);
};
module.exports.canNpmPublish = canNpmPublish;
