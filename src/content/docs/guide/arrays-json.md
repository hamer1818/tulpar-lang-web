---
title: Arrays & JSON
description: Learn about arrays and JSON support in Tulpar.
---

## Arrays

Tulpar supports both mixed-type arrays and type-safe arrays.

```tulpar
// Type-safe arrays
arrayInt numbers = [1, 2, 3, 4, 5];
arrayStr names = ["Ali", "Veli", "Ayşe"];

// Mixed-type arrays
array mixed = [1, "two", 3.0];

// Array operations
int len = length(numbers);
push(numbers, 6);
int last = pop(numbers);
```

## JSON Objects

Tulpar has first-class support for JSON objects.

```tulpar
// JSON objects
arrayJson user = {
    "name": "Hamza",
    "age": 25,
    "email": "hamza@example.com"
};

// Nested objects
arrayJson company = {
    "name": "Tech Corp",
    "ceo": {
        "name": "Hamza",
        "contact": {
            "email": "hamza@techcorp.com"
        }
    }
};
```

### Accessing Data

You can access data using bracket notation or dot notation.

```tulpar
// Bracket notation
str name = user["name"];

// Chained access
str email = company["ceo"]["contact"]["email"];

// Dot notation
print(user.name);
company.ceo.contact.email = "new@email.com";
```

### JSON Serialization

Tulpar provides built-in functions for JSON serialization and deserialization.

```tulpar
arrayJson user = { "name": "Ali", "age": 25, "skills": ["C", "Go"] };

// Convert to string
str js = toJson(user);

// Parse from string
arrayJson back = fromJson(js);
```
