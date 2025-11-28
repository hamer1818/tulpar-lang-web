---
title: Getting Started
description: Learn how to write your first Tulpar program.
---

## Your First Program

Create a file named `hello.tpr`:

```tulpar
// Hello World with UTF-8 support
str greeting = "Merhaba Dünya!";
print(greeting);

// Function definition
func square(int n) {
    return n * n;
}

// Usage
int result = square(5);
print("5'in karesi:", result);
```

## Run the Program

You can run your Tulpar program using the command line:

### Linux / macOS

```bash
./tulpar hello.tpr
```

### Windows (WSL)

```bash
wsl ./tulpar hello.tpr
```

### Windows (Native)

```cmd
tulpar.exe hello.tpr
```

## Interactive REPL Mode

Tulpar also supports an interactive Read-Eval-Print Loop (REPL) mode. Run the interpreter without any arguments to start it:

```bash
./tulpar
```

In REPL mode, you can type Tulpar code and see the results immediately.
