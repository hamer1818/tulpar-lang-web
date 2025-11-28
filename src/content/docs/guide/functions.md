---
title: Functions
description: Learn how to define and use functions in Tulpar.
---

## Definition

Functions are defined using the `func` keyword:

```tulpar
// Function definition
func add(int a, int b) {
    return a + b;
}
```

## Recursion

Tulpar supports recursive functions:

```tulpar
// Recursive function
func fibonacci(int n) {
    if (n <= 1) {
        return n;
    }
    return fibonacci(n - 1) + fibonacci(n - 2);
}
```

## Calling Functions

```tulpar
// Function call
int sum = add(5, 3);
int fib = fibonacci(10);
```
