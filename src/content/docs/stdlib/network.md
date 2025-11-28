---
title: Network (Sockets)
description: Learn how to create network applications with Tulpar.
---

## Server

You can create a TCP server using `socket_server`, `socket_accept`, `socket_receive`, and `socket_send`.

```tulpar
// Create server on port 8080
int sockfd = socket_server("127.0.0.1", 8080);

// Accept connection
int client = socket_accept(sockfd);

// Receive data
str msg = socket_receive(client, 1024);
print("Received:", msg);

// Send response
socket_send(client, "Hello Client!");

// Close sockets
socket_close(client);
socket_close(sockfd);
```

## Client

You can create a TCP client using `socket_create`, `socket_connect`, `socket_send`, and `socket_receive`.

```tulpar
// Create socket
int sockfd = socket_create();

// Connect to server
socket_connect(sockfd, "127.0.0.1", 8080);

// Send message
socket_send(sockfd, "Hello Server!");

// Receive response
str response = socket_receive(sockfd, 1024);
print("Response:", response);

// Close socket
socket_close(sockfd);
```
