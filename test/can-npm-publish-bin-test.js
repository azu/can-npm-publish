const { spawn } = require("child_process");
const assert = require("assert");
const path = require("path");

// Path to the executable script
const binPath = path.join(__dirname, "../bin/cmd.js");

describe("can-npm-publish bin", () => {
    it("should return 0, it can publish", (done) => {
        const bin = spawn("node", [binPath, path.join(__dirname, "fixtures/not-published-yet.json")]);

        // Finish the test when the executable finishes and returns 0
        bin.on("close", (exit_code) => {
            assert.ok(exit_code === 0);
        });
        bin.on("close", () => {
            done();
        });
    });
    it("should return 1, it can't publish", (done) => {
        const bin = spawn("node", [binPath, path.join(__dirname, "fixtures/already-published.json")]);

        // Finish the test when the executable finishes and returns 1
        bin.on("close", (exit_code) => {
            assert.ok(exit_code === 1);
            done();
        });
    });
    it("should send errors to stderr when verbose, it can't publish", (done) => {
        const bin = spawn("node", [binPath, path.join(__dirname, "fixtures/already-published.json"), "--verbose"]);
        // Finish the test and stop the executable when it outputs to stderr
        bin.stderr.on("data", (data) => {
            assert.ok(/almin@0.15.2 is already published/.test(data));
            bin.kill();
        });
        bin.on("close", () => {
            done();
        });
    });
});
