---
title: Basic Examples
description: Learn from example programs written in Tulpar.
---

## Calculator

```tulpar
print("=== TulparLang Calculator ===");

int a = inputInt("First number: ");
int b = inputInt("Second number: ");

print("Sum:", a + b);
print("Difference:", a - b);
print("Product:", a * b);
print("Division:", a / b);
```

## Fibonacci Sequence

```tulpar
func fibonacci(int n) {
    if (n <= 1) {
        return n;
    }
    return fibonacci(n - 1) + fibonacci(n - 2);
}

print("Fibonacci sequence:");
for (int i = 0; i < 10; i++) {
    print("F(" + toString(i) + ") =", fibonacci(i));
}
```

## JSON Data Processing

```tulpar
arrayJson users = {
    "data": [
        {"name": "Alice", "age": 25, "role": "Developer"},
        {"name": "Bob", "age": 30, "role": "Designer"},
        {"name": "Charlie", "age": 35, "role": "Manager"}
    ]
};

// Process user data
for (int i = 0; i < length(users["data"]); i++) {
    arrayJson user = users["data"][i];
    str name = user["name"];
    int age = user["age"];
    str role = user["role"];
    
    print(name, "-", age, "years old -", role);
}
```

## String Processing

```tulpar
str email = "  HAMZA@EXAMPLE.COM  ";

// Clean and parse email
str clean = lower(trim(email));
arrayStr parts = split(clean, "@");
str username = parts[0];
str domain = parts[1];

print("Username:", username);
print("Domain:", domain);
print("Valid:", contains(domain, "."));
```

## Mathematical Computation

```tulpar
// Calculate circle properties
float radius = 5.0;
float pi = 3.14159;

float area = pi * pow(radius, 2.0);
float circumference = 2.0 * pi * radius;

print("Radius:", radius);
print("Area:", area);
print("Circumference:", circumference);

// Random point in circle
float angle = random() * 2.0 * pi;
float r = random() * radius;
float x = r * cos(angle);
float y = r * sin(angle);

print("Random point: (", x, ",", y, ")");
```
