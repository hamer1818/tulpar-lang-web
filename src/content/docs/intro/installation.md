---
title: Installation
description: How to install and build Tulpar from source.
---

## Prerequisites

- GCC or Clang compiler
- Make (optional but recommended)
- CMake 3.10+ (optional)

## Build from Source

### Linux / macOS

```bash
git clone https://github.com/hamer1818/TulparLang.git
cd TulparLang
chmod +x build.sh
./build.sh
```

### Windows (WSL)

```bash
git clone https://github.com/hamer1818/TulparLang.git
cd TulparLang
wsl bash build.sh
```

### Windows (Native)

```cmd
git clone https://github.com/hamer1818/TulparLang.git
cd TulparLang
build.bat
```

## Using Makefile

If you have `make` installed, you can use the following commands:

```bash
make          # Build the project
make clean    # Clean build artifacts
make run      # Build and run demo
```
