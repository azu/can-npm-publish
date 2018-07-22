# can-npm-publish [![Build Status](https://travis-ci.org/azu/can-npm-publish.svg?branch=master)](https://travis-ci.org/azu/can-npm-publish)

A command line tool that check to see if `npm publish` is possible.

## Check list

All check list is passed, exit status will be `0`.

- [x] Check that the package's name is valid
    - [validate-npm-package-name](https://github.com/npm/validate-npm-package-name "validate-npm-package-name")
- [x] Check that the package is not `private:true`
- [x] Check that `package@version` is already published in npm registry

## Install

Install with [npm](https://www.npmjs.com/):

    npm install can-npm-publish

## Usage

    Usage
      $ can-npm-publish [directory|pacakge.json path]

    Options
      --verbose  show detail of errors

    Examples
      $ can-npm-publish
      $ echo $? # 0 or 1

All check list is passed, exit status will be `0`.
If has any error, exit status will be `1`.

If you want to know details of the error, you can use `--verbose` flag.

    $ can-npm-publish --verbose
    almin@0.13.10 is already published
    $ echo $?
    1

### UseCase

Run `can-npm-publish` before `npm publish`:

    can-npm-publish && npm publish

You can use it for publishing without choice.

For example, it is useful for using with [lerna](https://github.com/lerna/lerna "lerna").

Publish all packages if it is possible.

    lerna exec --bail=false -- "can-npm-publish && npm publish"

In this use-case, you should use [@monorepo-utils/publish](https://github.com/azu/monorepo-utils/blob/master/packages/@monorepo-utils/publish) instead of `can-npm-publish`.
Because, [@monorepo-utils/publish](https://github.com/azu/monorepo-utils/blob/master/packages/@monorepo-utils/publish) wrapped `can-npm-publish`.

## Changelog

See [Releases page](https://github.com/azu/can-npm-publish/releases).

## Running tests

Install devDependencies and Run `npm test`:

    npm i -d && npm test

## Contributing

Pull requests and stars are always welcome.

For bugs and feature requests, [please create an issue](https://github.com/azu/can-npm-publish/issues).

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## Author

- [github/azu](https://github.com/azu)
- [twitter/azu_re](https://twitter.com/azu_re)

## License

MIT © azu
