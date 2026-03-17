const socket = io();

let myUsername = "";
let typingTimer = null;
let isTyping = false;
const typingUsers = new Set();

// HTML-ээс элементүүдээ авч байна
const overlay = document.getElementById("overlay");
const app = document.getElementById("app");
const usernameInput = document.getElementById("usernameInput");
const joinBtn = document.getElementById("joinBtn");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const messages = document.getElementById("messages");
const userList = document.getElementById("userList");
const typingBar = document.getElementById("typingBar");

// АЛДАА ЗАССАН: Холболтын төлөв харуулах элементүүд (Хэрэв HTML дээр байгаа бол)
const connectionStatus = document.getElementById("connectionStatus");
const statusDot = document.getElementById("statusDot");

function avatarColor(name) {
  let hash = 0;
  for (let c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  // АЛДАА ЗАССАН: Backticks ` ` ашиглах ёстой
  return `color-${Math.abs(hash) % 8}`;
}

function initials(name) {
  return name.slice(0, 2).toUpperCase();
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function scrollToBottom() {
  messages.scrollTop = messages.scrollHeight;
}

function joinChat() {
  const name = usernameInput.value.trim();
  if (!name) return usernameInput.focus();

  myUsername = name;
  socket.emit("user:join", name);

  overlay.classList.add("hidden");
  setTimeout(() => {
    overlay.style.display = "none";
    app.classList.add("visible");
    msgInput.focus();
  }, 400);
}

joinBtn.addEventListener("click", joinChat);
usernameInput.addEventListener(
  "keydown",
  (e) => e.key === "Enter" && joinChat(),
);

function sendMessage() {
  const text = msgInput.value.trim();
  if (!text) return;
  socket.emit("chat:message", text);
  msgInput.value = "";
  stopTyping();
}

sendBtn.addEventListener("click", sendMessage);
msgInput.addEventListener("keydown", (e) => e.key === "Enter" && sendMessage());

msgInput.addEventListener("input", () => {
  if (!isTyping) {
    isTyping = true;
    socket.emit("chat:typing", true);
  }
  clearTimeout(typingTimer);
  typingTimer = setTimeout(stopTyping, 1500);
});

function stopTyping() {
  if (isTyping) {
    isTyping = false;
    socket.emit("chat:typing", false);
  }
  clearTimeout(typingTimer);
}

// --- ДЭЛГЭЦ ДЭЭР ХАРУУЛАХ ФУНКЦҮҮД ---

function renderMessage({ username, text, timestamp, socketId }) {
  const isMine = username === myUsername;
  const div = document.createElement("div");
  // АЛДАА ЗАССАН: Backticks ` ` ашиглах ёстой
  div.className = `msg ${isMine ? "mine" : ""}`;

  div.innerHTML = `
    <div class="msg-avatar ${avatarColor(username)}">${initials(username)}</div>
    <div class="msg-body">
      <div class="msg-meta">
        <span class="msg-username ${isMine ? "mine" : ""}">${username}${isMine ? " (you)" : ""}</span>
        <span class="msg-time">${formatTime(timestamp)}</span>
      </div>
      <div class="msg-text">${escapeHtml(text)}</div>
    </div>
  `;

  messages.appendChild(div);
  scrollToBottom();
}

function renderSystem({ text, timestamp }) {
  const div = document.createElement("div");
  div.className = "msg-system";
  // АЛДАА ЗАССАН: Backticks ` ` ашиглах ёстой
  div.textContent = `- ${text} - ${formatTime(timestamp)}`;
  messages.appendChild(div);
  scrollToBottom();
}

function renderUsers(users) {
  userList.innerHTML = "";
  users.forEach((name) => {
    const li = document.createElement("li");
    li.textContent = name;
    if (name === myUsername) li.classList.add("me");
    userList.appendChild(li);
  });
}

function renderTyping() {
  if (typingUsers.size === 0) {
    typingBar.innerHTML = "";
    return;
  }
  const names = [...typingUsers].join(", ");
  const label = typingUsers.size === 1 ? "is typing" : "are typing";
  typingBar.innerHTML = `
        <div class="typing-dots"><span></span><span></span><span></span></div>
        <span>${names} ${label}...</span>
    `;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- SOCKET EVENTS ---

socket.on("chat:message", renderMessage);
socket.on("system:message", renderSystem);
socket.on("users:update", renderUsers);

socket.on("chat:typing", ({ username, isTyping }) => {
  if (username === myUsername) return;
  isTyping ? typingUsers.add(username) : typingUsers.delete(username);
  renderTyping();
});

socket.on("connect", () => {
  if (connectionStatus) connectionStatus.textContent = "Connected";
  if (connectionStatus) connectionStatus.classList.remove("offline");
  if (statusDot) statusDot.classList.remove("offline");
});

socket.on("disconnect", () => {
  if (connectionStatus) connectionStatus.textContent = "Disconnected";
  if (connectionStatus) connectionStatus.classList.add("offline");
  if (statusDot) statusDot.classList.add("offline");
});
