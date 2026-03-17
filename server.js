const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// АЛДАА: PORT дээр || (OR) тэмдэг дутуу байсан
const PORT = process.env.PORT || 3000;

const users = {};

app.use(express.static(path.join(__dirname, "./")));

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("user:join", (username) => {
    users[socket.id] = username;
    // АЛДАА: Template literal буюу ` ` тэмдэг дутуу байсан
    console.log(`${username} joined`);

    socket.broadcast.emit("system:message", {
      text: `${username} joined the chat`,
      timestamp: Date.now(),
    });

    io.emit("users:update", Object.values(users));
  });

  socket.on("chat:message", (msg) => {
    // АЛДАА: || тэмдэг дутуу
    const username = users[socket.id] || "Anonymous";
    // АЛДАА: ` ` тэмдэг дутуу
    console.log(`[${username}]: ${msg}`);

    io.emit("chat:message", {
      username,
      text: msg,
      timestamp: Date.now(),
      socketId: socket.id,
    });
  });

  socket.on("chat:typing", (isTyping) => {
    const username = users[socket.id];
    if (username) {
      socket.broadcast.emit("chat:typing", { username, isTyping });
    }
  });

  socket.on("disconnect", () => {
    const username = users[socket.id];
    if (username) {
      delete users[socket.id];
      // АЛДАА: ` ` тэмдэг дутуу
      console.log(`${username} disconnected`);

      io.emit("system:message", {
        // АЛДАА: ` ` тэмдэг дутуу
        text: `${username} left the chat`,
        timestamp: Date.now(),
      });

      io.emit("users:update", Object.values(users));
    }
  });
});

server.listen(PORT, () => {
  // АЛДАА: ` ` тэмдэг дутуу
  console.log(`Chat server running at http://localhost:${PORT}`);
});
