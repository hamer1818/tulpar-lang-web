---
title: File I/O
description: Learn how to read and write files in Tulpar.
---

## Reading Files

You can read the entire content of a file into a string.

```tulpar
str content = read_file("test.txt");
print(content);
```

## Writing Files

You can write content to a file. This will overwrite the existing content.

```tulpar
write_file("test.txt", "Hello Tulpar!");
```

## Appending to Files

You can append content to the end of a file.

```tulpar
append_file("test.txt", "\nNew line");
```

## Checking Existence

You can check if a file exists.

```tulpar
bool exists = file_exists("test.txt");
if (exists) {
    print("File found!");
}
```
