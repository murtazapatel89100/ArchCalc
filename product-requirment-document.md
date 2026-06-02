# Project Name

ArchCalc

Tagline:
A keyboard-first calculator, converter, scratchpad, and developer utility for Linux power users.

---

# Vision

Most calculators solve arithmetic.

ArchCalc should solve calculations, conversions, developer tasks, and temporary thinking.

The goal is to replace:

- Calculator
- Unit Converter
- Percentage Calculator
- Programmer Calculator
- Quick Notes
- Scratchpad
- Tiny Utility Scripts

with a single desktop application.

---

# Target Users

## Primary

- Developers
- Linux users
- Students
- Engineers

## Secondary

- Business owners
- Accountants
- Freelancers

---

# Core Principles

## Keyboard First

Every action should be possible without touching the mouse.

## Local First

No internet required.

## Fast

Launch under 1 second.

## Lightweight

Low memory usage.

## Powerful

Simple calculations should remain simple.

Advanced calculations should remain accessible.

---

# Technology Stack

Frontend:
- React
- TypeScript
- TailwindCSS
- shadcn/ui

Desktop:
- Tauri v2

Backend:
- Rust

Storage:
- SQLite
or
- Local JSON initially

---

# Development Phases

---

# Phase 1
# MVP Calculator

Goal:
Build a usable calculator.

---

## Features

### Basic Arithmetic

Support:

- Addition
- Subtraction
- Multiplication
- Division
- Modulo

Examples:

2 + 2

10 * 45

100 / 4

---

### Expression Parsing

Support:

(5 + 5) * 10

2 + 3 * 4

---

### History

Store:

- Expression
- Result
- Timestamp

---

### Keyboard Controls

Enter:
Calculate

Escape:
Close window

Arrow Keys:
Navigate history

---

### Copy Result

One click copy.

---

### Dark Theme

Default theme.

---

## Rust Concepts Learned

- Functions
- Modules
- Structs
- Result
- Error handling

---

# Phase 2
# Developer Calculator

Goal:
Become useful for developers.

---

## Number Systems

Convert between:

- Decimal
- Binary
- Hexadecimal
- Octal

Examples:

255

0xff

0b101010

---

## Bitwise Operations

Support:

AND

OR

XOR

NOT

SHIFT

Examples:

255 & 15

255 >> 4

---

## Encoding Tools

Base64 Encode

Base64 Decode

---

## Hash Tools

Generate:

- MD5
- SHA1
- SHA256

Example:

sha256 hello world

---

## UUID Generator

Generate UUIDs instantly.

---

## Timestamp Tools

Unix Timestamp

Timestamp To Date

Date To Timestamp

---

## Rust Concepts Learned

- Enums
- Pattern Matching
- Traits

---

# Phase 3
# Smart Input Engine

Goal:
Reduce syntax requirements.

---

## Natural Language Calculations

Examples:

15 percent of 500

salary after 10 percent deduction from 50000

25 percent discount on 1000

---

## Financial Calculations

GST

EMI

Compound Interest

Profit Margin

Simple Interest

---

## Formula Registry

Store formulas as metadata.

Example:

emi

gst

compound_interest

---

## Saved Variables

Example:

salary = 50000

rent = 12000

food = 5000

salary - rent - food

---

## Rust Concepts Learned

- Parsing
- Tokenization
- Custom data structures

---

# Phase 4
# Scratchpad Workspace

Goal:
Become a thinking tool.

---

## Multi-line Calculations

Example:

salary = 50000

rent = 12000

food = 5000

remaining = salary - rent - food

---

## Live Evaluation

Results update automatically.

---

## Variables

Store variables in memory.

---

## Workspaces

Examples:

Personal

Business

Project A

Taxes

---

## Save Workspace

Persist automatically.

---

## Workspace Search

Quickly switch workspaces.

---

# Phase 5
# Unit Conversion System

Goal:
Become the only conversion tool needed.

---

## Length

km

m

cm

inch

feet

mile

---

## Weight

kg

g

lb

oz

---

## Storage

kb

mb

gb

tb

---

## Temperature

celsius

fahrenheit

kelvin

---

## Currency

Optional

Requires API.

Can be added later.

---

Examples

5 km in miles

100 gb in mb

50 celsius in fahrenheit

---

# Phase 6
# Command Palette Mode

Goal:
Transform calculator into productivity tool.

---

Input Examples

> 2 + 2

> 100 gb in mb

> sha256 hello

> uuid

> timestamp now

> gst 1000

---

Architecture

Command Based

Command Registry

Plugin System

---

Commands

calc

convert

hash

encode

decode

uuid

timestamp

formula

workspace

---

# Phase 7
# Linux Power User Features

Goal:
Leverage Rust system access.

---

## RAM Usage

Command:

ram

Output:

Current RAM Usage

---

## CPU Usage

Command:

cpu

---

## Disk Usage

Command:

disk

---

## Battery Status

Command:

battery

---

## Network Information

Command:

network

---

Rust Crates

sysinfo

battery

---

# Phase 8
# Graphing Engine

Goal:
Visual understanding.

---

Examples

x^2

sin(x)

compound interest over 5 years

---

Features

Pan

Zoom

Export

---

Libraries

plotters

or frontend chart library

---

# Phase 9
# Plugin Architecture

Goal:
Allow expansion.

---

Plugin Structure

plugins/

convert/

finance/

crypto/

system/

---

Plugin Interface

Trait Based

Dynamic Registration

---

Example

trait CommandPlugin {
    fn execute();
}

---

# Phase 10
# Production Release

Goal:
Polish.

---

## Features

Auto Updates

Crash Logging

Settings

Themes

Import Export

Backup Restore

Global Shortcut

System Tray

---

Packaging

Linux

Windows

macOS

---

# Stretch Goals

---

## OCR Calculator

Paste image.

Extract numbers.

Calculate.

---

## AI Free Expression Understanding

Examples:

How much is 15 percent of 4000

Split 5000 among 7 people

---

## Clipboard Watcher

Monitor copied calculations.

Auto evaluate.

---

## Quick Launcher

Similar to Raycast.

Examples:

uuid

sha256

calculate

convert

---

# Success Metrics

Launch Time:
< 1 second

Memory Usage:
< 100 MB

Calculation Response:
< 50 ms

Keyboard Usage:
100%

Mouse Required:
No

Offline Capability:
100%

Platform Support:
Linux First
Windows Later
macOS Later
