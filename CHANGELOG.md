# Changelog

## [1.2.0](https://github.com/murtazapatel89100/ArchCalc/compare/archcalc-v1.1.1...archcalc-v1.2.0) (2026-07-09)


### Features

* add scientific calculator UI and documentation ([515a27a](https://github.com/murtazapatel89100/ArchCalc/commit/515a27ad0d46732738fba555736992f0921a6139))

## [1.1.1](https://github.com/murtazapatel89100/ArchCalc/compare/archcalc-v1.1.0...archcalc-v1.1.1) (2026-06-30)


### Bug Fixes

* **ci:** remove app/pnpm-workspace.yaml breaking pnpm install ([dce1a3e](https://github.com/murtazapatel89100/ArchCalc/commit/dce1a3ec7e165d14c795499a4bb4818d398958c9))

## [1.1.0](https://github.com/murtazapatel89100/ArchCalc/compare/archcalc-v1.0.1...archcalc-v1.1.0) (2026-06-30)


### Features

* add custom window title bar ([95979f6](https://github.com/murtazapatel89100/ArchCalc/commit/95979f6193fd28e04dde4251ae9f80373ea23bde))

## [1.0.1](https://github.com/murtazapatel89100/ArchCalc/compare/archcalc-v1.0.0...archcalc-v1.0.1) (2026-06-30)


### Bug Fixes

* resolve broken dev tools, converter bugs, and UI polish ([f292b06](https://github.com/murtazapatel89100/ArchCalc/commit/f292b06689813f67b6547dfc169f0ee5a7db91c6))

## [0.7.0](https://github.com/murtazapatel89100/ArchCalc/compare/archcalc-v0.6.0...archcalc-v0.7.0) (2026-06-10)


### Features

* **web:** os-aware downloads and windows release config ([f1cc658](https://github.com/murtazapatel89100/ArchCalc/commit/f1cc658d923956968239a553d53065cdaf904129))

## [0.6.0](https://github.com/murtazapatel89100/ArchCalc/compare/archcalc-v0.5.0...archcalc-v0.6.0) (2026-06-10)


### Features

* **web:** add direct download card and display total download count ([14361b9](https://github.com/murtazapatel89100/ArchCalc/commit/14361b999b40245e7ff848935d9270e07163dc69))


### Bug Fixes

* **app:** add debug info for NaN and fix race condition in live results ([5eefd30](https://github.com/murtazapatel89100/ArchCalc/commit/5eefd30f48f72b656d0c45cc214f60b70eb8a615))

## [0.5.0](https://github.com/murtazapatel89100/ArchCalc/compare/archcalc-v0.4.3...archcalc-v0.5.0) (2026-06-10)


### Features

* **web:** update UI to vertical stack feature cards and add download section ([7a036dd](https://github.com/murtazapatel89100/ArchCalc/commit/7a036dd45937cf60f8d4cbc210a886860adf996b))


### Bug Fixes

* **app:** await evaluator.math in Live Results to fix NaN bug ([f6515cb](https://github.com/murtazapatel89100/ArchCalc/commit/f6515cb73e2964907f5fe9aeeb4895351fd4d967))

## [0.4.3](https://github.com/murtazapatel89100/ArchCalc/compare/archcalc-v0.4.2...archcalc-v0.4.3) (2026-06-10)


### Bug Fixes

* **aur:** disable updpkgsums in aur deploy action to prevent hash overwriting ([e797b0e](https://github.com/murtazapatel89100/ArchCalc/commit/e797b0e06759776f89dd94ef520351b9619379ce))

## [0.4.2](https://github.com/murtazapatel89100/ArchCalc/compare/archcalc-v0.4.1...archcalc-v0.4.2) (2026-06-10)


### Bug Fixes

* **aur:** correctly expand SHA256 variable in PKGBUILD generation ([a399fbb](https://github.com/murtazapatel89100/ArchCalc/commit/a399fbb337486302594eadcf26de69867ccf8ef3))

## [0.4.1](https://github.com/murtazapatel89100/ArchCalc/compare/archcalc-v0.4.0...archcalc-v0.4.1) (2026-06-10)


### Bug Fixes

* correctly sync tauri config version to 0.4.0 to match the latest release ([5e7e9c8](https://github.com/murtazapatel89100/ArchCalc/commit/5e7e9c87394977dc84c87d5c78d8c4896c6ca24a))
* sync tauri config version and exclude web from releases ([36b0b61](https://github.com/murtazapatel89100/ArchCalc/commit/36b0b61aaff437ca0f34d57c7dec3fdea51e4641))

## [0.4.0](https://github.com/murtazapatel89100/ArchCalc/compare/archcalc-v0.3.1...archcalc-v0.4.0) (2026-06-10)


### Features

* merge linux release workflow into release-please to resolve github token workflow trigger restrictions ([14f1727](https://github.com/murtazapatel89100/ArchCalc/commit/14f17277a341eabe9d68ccfe7fcdbcc190dedb8a))

## [0.3.1](https://github.com/murtazapatel89100/ArchCalc/compare/archcalc-v0.3.0...archcalc-v0.3.1) (2026-06-10)


### Bug Fixes

* enforce standalone pnpm binary installation ([83613e3](https://github.com/murtazapatel89100/ArchCalc/commit/83613e36b3ceb930abc9cfde6fc87bec432d3c0a))
* grant contents write permission to release workflow for binary uploads ([0975ea0](https://github.com/murtazapatel89100/ArchCalc/commit/0975ea086c737e59deab88c485c0f953d70f8746))
* pin pnpm action version to specific semver ([27083ad](https://github.com/murtazapatel89100/ArchCalc/commit/27083ad44cca6f31dd3baa02aeea68a68260ed5c))
* remove explicit version input to resolve pnpm version mismatch ([0237896](https://github.com/murtazapatel89100/ArchCalc/commit/023789634db73b82655d9df026a1f08312d0cdce))
* use corepack via packageManager field for pnpm setup ([ef88b17](https://github.com/murtazapatel89100/ArchCalc/commit/ef88b173d7367e90c49b65f60e2b89fc6fcbf4c9))

## [0.3.0](https://github.com/murtazapatel89100/ArchCalc/compare/archcalc-v0.2.0...archcalc-v0.3.0) (2026-06-10)


### Features

* major updates to SEO, CI, and release pipelines ([22a39d7](https://github.com/murtazapatel89100/ArchCalc/commit/22a39d76cbd54c51149453c3a6d52cafce13ebe1))


### Bug Fixes

* pnpm action version parsing issue ([94f1f4b](https://github.com/murtazapatel89100/ArchCalc/commit/94f1f4bef206402daf93c28a15459b92f66c8d70))

## [0.2.0](https://github.com/murtazapatel89100/ArchCalc/compare/archcalc-v0.1.0...archcalc-v0.2.0) (2026-06-07)


### Features

* complete UI revamp, integrate real sysinfo, and update branding ([3105947](https://github.com/murtazapatel89100/ArchCalc/commit/3105947cf9e0468bf211fcf13b47ea668fbb6f77))
* restructure to app/ and web/, implement global shortcuts, and enhance settings screen ([25932e5](https://github.com/murtazapatel89100/ArchCalc/commit/25932e51bb84e19bcd5597823ad9b8266deb7665))


### Bug Fixes

* add packages field to workspace and fix pre-commit hook biome flag ([db07240](https://github.com/murtazapatel89100/ArchCalc/commit/db07240a744f5c3ee4af180fbd5585a7c8b66cd8))
* resolve invisible dropdown options, add history retention, and add workspace naming modal ([c99b796](https://github.com/murtazapatel89100/ArchCalc/commit/c99b796bd54f5e49c29fb808a82af2c1f9864711))
