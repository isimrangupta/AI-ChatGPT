import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import ThemeToggle from "../components/ThemeToggle";
import ChatBubble from "../components/ChatBubble";
import TypingIndicator from "../components/TypingIndicator";
import {
  Plus,
  Send,
  Trash2,
  Menu,
  X,
  LogOut,
  MessageSquare,
  Loader2,
} from "lucide-react";

export default function Chat() {
  const { user, logout } = useAuth();
  const socketRef = useSocket();
  const navigate = useNavigate();

  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState("");

  const messagesEndRef = useRef(null);

  async function fetchChats() {
    setLoadingChats(true);
    try {
      const res = await api.get("/api/chat");
      setChats(res.data.chats);
    } catch (err) {
      console.error("Failed to fetch chats", err);
    } finally {
      setLoadingChats(false);
    }
  }

  // Fetch all chats on mount
  useEffect(() => {
    fetchChats();
  }, []);

  async function fetchMessages(chatId) {
    setLoadingMessages(true);
    try {
      const res = await api.get(`/api/chat/${chatId}/messages`);
      setMessages(res.data.messages);
    } catch (err) {
      console.error("Failed to fetch messages", err);
    } finally {
      setLoadingMessages(false);
    }
  }

  // Fetch messages when active chat changes
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }
    fetchMessages(activeChat._id);
  }, [activeChat]);

  // Listen for AI responses via socket
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return;

    function handleAiResponse(data) {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          _id: Date.now().toString(),
          role: "model",
          content: data.content,
          chat: data.chat,
        },
      ]);
    }

    socket.on("ai-response", handleAiResponse);

    return () => {
      socket.off("ai-response", handleAiResponse);
    };
  }, [socketRef]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Create new chat
  async function handleCreateChat(e) {
    e.preventDefault();
    if (!newChatTitle.trim()) return;

    try {
      const res = await api.post("/api/chat", { title: newChatTitle.trim() });
      const newChat = res.data.chat;
      setChats((prev) => [newChat, ...prev]);
      setActiveChat(newChat);
      setNewChatTitle("");
      setShowNewChatModal(false);
      setSidebarOpen(false);
    } catch (err) {
      console.error("Failed to create chat", err);
    }
  }

  // Delete chat
  async function handleDeleteChat(chatId, e) {
    e.stopPropagation();
    if (!confirm("Delete this chat?")) return;

    try {
      await api.delete(`/api/chat/${chatId}`);
      setChats((prev) => prev.filter((c) => c._id !== chatId));
      if (activeChat?._id === chatId) {
        setActiveChat(null);
      }
    } catch (err) {
      console.error("Failed to delete chat", err);
    }
  }

  // Send message
  function handleSendMessage(e) {
    e.preventDefault();
    if (!input.trim() || !activeChat) return;

    const socket = socketRef?.current;
    if (!socket) return;

    const userMessage = {
      _id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      chat: activeChat._id,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    socket.emit("ai-message", {
      chat: activeChat._id,
      content: input.trim(),
    });

    setInput("");
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="h-screen flex bg-white dark:bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed sm:relative z-40 sm:z-0 top-0 left-0 h-full w-72 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
        }`}
      >
        {/* Sidebar header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">D</span>
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">
              DikshAI
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="sm:hidden text-gray-500 dark:text-gray-400"
          >
            <X size={20} />
          </button>
        </div>

        {/* New chat button */}
        <div className="p-3">
          <button
            onClick={() => setShowNewChatModal(true)}
            className="w-full flex items-center justify-center gap-2 bg-linear-to-r from-indigo-500 to-purple-600 text-white font-medium py-2.5 rounded-xl shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/40 active:scale-[0.98] transition-all text-sm"
          >
            <Plus size={18} />
            New Chat
          </button>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          {loadingChats ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          ) : chats.length === 0 ? (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">
              No chats yet
            </p>
          ) : (
            chats.map((chat) => (
              <div
                key={chat._id}
                onClick={() => {
                  setActiveChat(chat);
                  setSidebarOpen(false);
                }}
                className={`w-full group flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left transition-colors cursor-pointer ${
                  activeChat?._id === chat._id
                    ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <MessageSquare size={16} className="shrink-0" />
                <span className="flex-1 truncate">{chat.title}</span>
                <button
                  onClick={(e) => handleDeleteChat(chat._id, e)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* User footer */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-linear-to-r from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {user?.fullName?.firstName?.[0]?.toUpperCase()}
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
              {user?.fullName?.firstName} {user?.fullName?.lastName}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-30 sm:hidden"
        ></div>
      )}

      {/* Main chat area */}
      <main className="flex-1 flex flex-col h-full min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="sm:hidden text-gray-600 dark:text-gray-300"
            >
              <Menu size={22} />
            </button>
            <h2 className="font-semibold text-gray-900 dark:text-white truncate">
              {activeChat ? activeChat.title : "Select a chat"}
            </h2>
          </div>
          <ThemeToggle />
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-8">
          {!activeChat ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-linear-to-r from-indigo-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
                <MessageSquare size={28} className="text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Welcome to DikshAI
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                Select a chat from the sidebar or create a new one to start
                chatting.
              </p>
            </div>
          ) : loadingMessages ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              {messages.length === 0 && (
                <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">
                  No messages yet. Say hi! 👋
                </p>
              )}
              {messages.map((msg) => (
                <ChatBubble
                  key={msg._id}
                  role={msg.role}
                  content={msg.content}
                />
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        {activeChat && (
          <form
            onSubmit={handleSendMessage}
            className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-800"
          >
            <div className="max-w-3xl mx-auto flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="w-12 h-12 shrink-0 flex items-center justify-center bg-linear-to-r from-indigo-500 to-purple-600 text-white rounded-2xl shadow-lg shadow-indigo-500/30 active:scale-95 transition-all disabled:opacity-40"
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        )}
      </main>

      {/* New chat modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              New Chat
            </h3>
            <form onSubmit={handleCreateChat}>
              <input
                type="text"
                autoFocus
                value={newChatTitle}
                onChange={(e) => setNewChatTitle(e.target.value)}
                placeholder="Enter chat name..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all mb-4"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewChatModal(false);
                    setNewChatTitle("");
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newChatTitle.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 text-white font-medium text-sm shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
