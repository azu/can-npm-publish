const path = require("path");
const assert = require("assert");
const canNpmPublish = require("../lib/can-npm-publish").canNpmPublish;

const shouldNotCalled = () => {
    throw new Error("SHOULD NOT CALLED");
};
describe("can-npm-publish", () => {
    it("should be rejected, it is invalid name", () => {
        return canNpmPublish(path.join(__dirname, "fixtures/invalid-name.json")).then(shouldNotCalled, error => {
            assert.ok(/Invalid name/s.test(error.message));
        });
    });
    it("should be rejected, it is private:true", () => {
        return canNpmPublish(path.join(__dirname, "fixtures/private.json")).then(shouldNotCalled, error => {
            assert.ok(/This package is private/.test(error.message));
        });
    });
    it("should be rejected, it is already published", () => {
        return canNpmPublish(path.join(__dirname, "fixtures/already-published.json")).then(shouldNotCalled, error => {
            assert.ok(/is already published/.test(error.message));
        });
    });
    it("should be rejected, it is already published scoped package", () => {
        return canNpmPublish(path.join(__dirname, "fixtures/scoped-package.json")).then(shouldNotCalled, error => {
            assert.ok(/is already published/.test(error.message));
        });
    });
    it("should be resolve, it is not published yet", () => {
        return canNpmPublish(path.join(__dirname, "fixtures/not-published-yet.json"));
    });
});
