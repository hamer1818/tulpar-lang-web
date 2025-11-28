---
title: Advanced Examples
description: Advanced Tulpar examples covering networking, file I/O, and databases.
---

## Chat Server

A simple TCP chat server that echoes messages back to the client.

```tulpar
print("Starting server...");

// Create server socket listening on 127.0.0.1:8080
int sockfd = socket_server("127.0.0.1", 8080);
if (sockfd == -1) {
    print("Failed to start server");
    return;
}

print("Server listening on 127.0.0.1:8080");

// Accept a connection
int client_sock = socket_accept(sockfd);
if (client_sock == -1) {
    print("Accept failed");
    socket_close(sockfd);
    return;
}

print("Client connected");

// Receive message
str msg = socket_receive(client_sock, 1024);
print("Received: " + msg);

// Send response
socket_send(client_sock, "Hello from Tulpar Server!");

// Close connections
socket_close(client_sock);
socket_close(sockfd);
print("Server closed");
```

## Database Management

An example of creating a table, inserting data, and querying it using SQLite.

```tulpar
print("Opening database...");
int db = db_open("query_test.db");

if (db != 0) {
    print("Creating table...");
    db_query(db, "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT);");
    
    print("Inserting data...");
    db_query(db, "INSERT INTO users (name) VALUES ('Tulpar');");

    print("Querying data...");
    array results = db_query(db, "SELECT * FROM users;");

    print("Results:");
    print(results);
    
    print("Closing database...");
    db_close(db);
}
```

## File Operations

Reading, writing, and modifying files.

```tulpar
str filename = "test_file.txt";

// Write to file
write_file(filename, "Merhaba Tulpar!\nBu bir test dosyasıdır.");

// Check if exists
if (file_exists(filename)) {
    // Read content
    str content = read_file(filename);
    print("Content:", content);
    
    // Append data
    append_file(filename, "\nNew line added.");
}
```
