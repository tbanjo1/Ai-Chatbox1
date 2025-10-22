import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import {
  getDatabase, ref, push, onChildAdded, get, update, remove
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

const $ = (id) => document.getElementById(id);
const chatEl = $("chat"), promptEl = $("prompt");
const sendBtn = $("send"), signInBtn = $("signin"), signOutBtn = $("signout");
const newBtn = $("new"), delBtn = $("del"), renBtn = $("rename");
const whoEl = $("who"), errEl = $("error");

let currentChatId = null;

function appendMsg(text, who="bot") {
  const div = document.createElement("div");
  div.className = `msg ${who}`;
  div.textContent = text;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

async function ensureChatForUser(uid) {
  const snap = await get(ref(db, `users/${uid}/chats`));
  if (snap.exists()) {
    if (!currentChatId) currentChatId = Object.keys(snap.val())[0];
    return currentChatId;
  }
  const r = await push(ref(db, `users/${uid}/chats`), { title: "New chat", ts: Date.now() });
  currentChatId = r.key;
  return currentChatId;
}

function loadHistory(uid) {
  chatEl.innerHTML = "";
  const msgsRef = ref(db, `users/${uid}/chats/${currentChatId}/messages`);
  onChildAdded(msgsRef, (s) => {
    const { role, content } = s.val();
    appendMsg(content, role === "user" ? "user" : "bot");
  });
}

// Auth state
onAuthStateChanged(auth, async (user) => {
  signInBtn.hidden = !!user;
  signOutBtn.hidden = !user;
  whoEl.textContent = user ? `Logged in as ${user.email}` : "Not signed in";
  if (!user) {
    chatEl.innerHTML = "";
    appendMsg("Sign in with Google to sync chats across devices.", "bot");
    return;
  }
  await ensureChatForUser(user.uid);
  loadHistory(user.uid);
});

// Sign-in / out
signInBtn?.addEventListener("click", async () => {
  errEl.textContent = "";
  try { await signInWithPopup(auth, provider); }
  catch (e) { errEl.textContent = e.message || "Sign in failed."; }
});
signOutBtn?.addEventListener("click", () => signOut(auth));

// Send
sendBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  const text = promptEl.value.trim();
  if (!user || !text) return;
  const base = `users/${user.uid}/chats/${currentChatId}`;
  await push(ref(db, `${base}/messages`), { role: "user", content: text, ts: Date.now() });
  promptEl.value = "";
  try {
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: text })
    });
    const data = await r.json();
    await push(ref(db, `${base}/messages`), { role: "assistant", content: data.reply || "(no reply)", ts: Date.now() });
  } catch (e) {
    await push(ref(db, `${base}/messages`), { role: "assistant", content: "Server error.", ts: Date.now() });
  }
});

// Compose enter behavior
promptEl?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendBtn.click();
  }
});

// New / Delete / Rename
newBtn?.addEventListener("click", async () => {
  const user = auth.currentUser; if (!user) return;
  const r = await push(ref(db, `users/${user.uid}/chats`), { title: "Untitled", ts: Date.now() });
  currentChatId = r.key;
  chatEl.innerHTML = "";
});
delBtn?.addEventListener("click", async () => {
  const user = auth.currentUser; if (!user || !currentChatId) return;
  await remove(ref(db, `users/${user.uid}/chats/${currentChatId}`));
  currentChatId = null;
  await ensureChatForUser(user.uid);
  chatEl.innerHTML = "";
  loadHistory(user.uid);
});
renBtn?.addEventListener("click", async () => {
  const user = auth.currentUser; if (!user || !currentChatId) return;
  const title = prompt("New chat title?");
  if (title) await update(ref(db, `users/${user.uid}/chats/${currentChatId}`), { title });
});
