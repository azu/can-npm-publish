const path = require("path");
const assert = require("assert");
const canNpmPublish = require("../lib/can-npm-publish").canNpmPublish;

const shouldNotCalled = () => {
    throw new Error("SHOULD NOT CALLED");
};
describe("can-npm-publish", () => {
    it("should be rejected, it is invalid name", () => {
        return canNpmPublish(path.join(__dirname, "fixtures/invalid-name.json")).then(shouldNotCalled, (error) => {
            assert.ok(/name can only contain URL-friendly characters/s.test(error.message));
        });
    });
    it("should be rejected, it is private:true", () => {
        return canNpmPublish(path.join(__dirname, "fixtures/private.json")).then(shouldNotCalled, (error) => {
            assert.ok(/This package is private/.test(error.message));
        });
    });
    it("should be rejected, it is already published", () => {
        return canNpmPublish(path.join(__dirname, "fixtures/already-published.json")).then(shouldNotCalled, (error) => {
            assert.ok(/is already published/.test(error.message));
        });
    });
    it("should be rejected, it is already published to yarnpkg registry", () => {
        return canNpmPublish(path.join(__dirname, "fixtures/already-published-registry.json")).then(
            shouldNotCalled,
            (error) => {
                assert.ok(/is already published/.test(error.message));
            }
        );
    });
    it("should be rejected, it is already published scoped package", () => {
        return canNpmPublish(path.join(__dirname, "fixtures/scoped-package.json")).then(shouldNotCalled, (error) => {
            assert.ok(/is already published/.test(error.message));
        });
    });
    it("should be resolve, it is not published yet", () => {
        return canNpmPublish(path.join(__dirname, "fixtures/not-published-yet.json"));
    });
    it("should be resolve, it is not 404 package", () => {
        return canNpmPublish(path.join(__dirname, "fixtures/404-package.json"), { verbose: true });
    });
    it("should be resolve, it is not published yet to yarnpkg registry", () => {
        return canNpmPublish(path.join(__dirname, "fixtures/not-published-yet-registry.json"));
    });
    it("should warn when verbose, it is legacy name", () => {
        const stderrWrite = process.stderr.write.bind(process.stderr);
        let stderrOutput = "";

        // Capture output to stderr in `stderrOutput`
        process.stderr.write = (chunk, encoding, callback) => {
            if (typeof chunk === "string") {
                stderrOutput += chunk;
            }
        };

        return canNpmPublish(path.join(__dirname, "fixtures/legacy-name.json"), { verbose: true }).then(
            () => {
                // Restore stderr to normal
                process.stderr.write = stderrWrite;
                assert.ok(/name can no longer contain capital letters/.test(stderrOutput));
            },
            (error) => {
                console.log(error);
                shouldNotCalled();
            }
        );
    });
});
