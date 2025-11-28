---
title: Modules & Imports
description: Learn how to organize your Tulpar code with modules and imports.
---

## Importing Files

You can include other Tulpar files using the `import` keyword. This allows you to reuse code and organize your project.

```tulpar
// Import a file
import "examples/utils.tpr";

// Use functions from the imported file
int result = topla(10, 20);
print("Result:", result);
```

## Shared State

Imported files share the same global state. Variables defined in an imported file are accessible in the importing file.

```tulpar
// In utils.tpr
float PI = 3.14159;

// In main.tpr
import "utils.tpr";
print("PI:", PI);
```
