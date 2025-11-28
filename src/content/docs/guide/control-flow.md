---
title: Control Flow
description: Learn about control flow statements in Tulpar.
---

## If-Else Statements

```tulpar
int age = 18;

if (age >= 18) {
    print("Adult");
} else {
    print("Minor");
}

// Logical operators
if (age >= 18 && age < 65) {
    print("Working age");
}
```

## While Loop

```tulpar
int i = 0;
while (i < 10) {
    if (i == 5) continue;
    if (i == 8) break;
    print(i);
    i++;
}
```

## For Loop

Tulpar supports both C-style for loops and for-each loops:

```tulpar
// C-style for loop
for (int i = 0; i < 10; i++) {
    print("i =", i);
}

// For-each with range
for (i in range(10)) {
    print("i =", i);
}
```
