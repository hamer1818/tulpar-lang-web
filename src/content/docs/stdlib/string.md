---
title: String Functions
description: Reference for Tulpar's string manipulation library.
---

## Transformation

```tulpar
upper(s)              // Convert to uppercase
lower(s)              // Convert to lowercase
capitalize(s)         // Capitalize first letter
reverse(s)            // Reverse string
```

## Search and Check

```tulpar
contains(s, sub)      // Check if contains substring
startsWith(s, pre)    // Check prefix
endsWith(s, suf)      // Check suffix
indexOf(s, sub)       // Find first occurrence
count(s, sub)         // Count occurrences
```

## Manipulation

```tulpar
trim(s)               // Remove whitespace
replace(s, old, new)  // Replace substring
substring(s, i, j)    // Extract substring
repeat(s, n)          // Repeat string n times
```

## Array Operations

```tulpar
split(s, delim)       // Split into array
join(sep, arr)        // Join array to string
```

## Validation

```tulpar
isEmpty(s)            // Check if empty
isDigit(s)            // Check if all digits
isAlpha(s)            // Check if all letters
```
