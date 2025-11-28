---
title: Structs
description: Learn how to define and use custom types (structs) in Tulpar.
---

## Defining Structs

You can define custom data types using the `type` keyword.

```tulpar
// Type definition with default values
type Person {
    str name;
    int age;
    str city = "İstanbul";
}
```

## Creating Instances

You can create instances of your struct using a constructor-like syntax.

```tulpar
// Constructor with named arguments
Person p1 = Person("Ali", 25, "Ankara");
Person p2 = Person(name: "Ayşe", age: 30);  // Uses default city
```

## Accessing Fields

Fields can be accessed and modified using dot notation.

```tulpar
// Access and modify
print(p1.name, p1.age);
p1.city = "İzmir";
```

## JSON Conversion

Structs can be converted to and from JSON.

```tulpar
// Convert struct to JSON string
str jsonStr = toJson(p1);

// Create struct from JSON string
Person p3 = fromJson("Person", jsonStr);
```
