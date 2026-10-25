# Security Policy

## Supported versions

Security fixes are released for the latest minor version of ArchCalc. Please update to the newest [release](https://github.com/murtazapatel89100/ArchCalc/releases) before reporting.

| Version | Supported          |
| ------- | ------------------ |
| 1.3.x   | :white_check_mark: |
| < 1.3   | :x:                |

## Reporting a vulnerability

Please **do not** report security vulnerabilities in public GitHub issues.

Use GitHub's [private vulnerability reporting](https://github.com/murtazapatel89100/ArchCalc/security/advisories/new) instead. Include:

- the affected version and platform,
- what an attacker could do,
- steps or a proof of concept to reproduce it.

We will acknowledge your report, keep you updated on progress, and credit you in the release notes if you'd like. Confirmed issues are fixed and released as quickly as possible.

## Scope

ArchCalc is an offline desktop app: it stores your data locally and does not send it anywhere. Things we're particularly interested in:

- ways for imported data (Settings → Import) or quote notes to execute code or markup,
- writing files outside the location chosen in the save dialog,
- issues in the release artifacts or the AUR package.
