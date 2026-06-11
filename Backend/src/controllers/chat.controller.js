const chatModel = require("../models/chat.model");
const messageModel = require("../models/message.model");

async function createChat(req, res) {
  const { title } = req.body;
  const user = req.user;

  const chat = await chatModel.create({
    user: user._id,
    title,
  });

  res.status(201).json({
    message: "chat created successfully",
    chat: {
      _id: chat._id,
      title: chat.title,
      lastActivity: chat.lastActivity,
      user: chat.user,
    },
  });
}

// Get all chats of logged-in user
async function getChats(req, res) {
  const user = req.user;

  const chats = await chatModel
    .find({ user: user._id })
    .sort({ lastActivity: -1 });

  res.status(200).json({
    message: "chats fetched successfully",
    chats: chats.map((chat) => ({
      _id: chat._id,
      title: chat.title,
      lastActivity: chat.lastActivity,
      user: chat.user,
    })),
  });
}

// Get all messages of a specific chat
async function getMessages(req, res) {
  const { id } = req.params;

  const messages = await messageModel.find({ chat: id }).sort({ createdAt: 1 });

  res.status(200).json({
    message: "messages fetched successfully",
    messages: messages.map((msg) => ({
      _id: msg._id,
      content: msg.content,
      role: msg.role,
      chat: msg.chat,
      createdAt: msg.createdAt,
    })),
  });
}

// Delete a chat and its messages
async function deleteChat(req, res) {
  const { id } = req.params;
  const user = req.user;

  const chat = await chatModel.findOne({ _id: id, user: user._id });

  if (!chat) {
    return res.status(404).json({
      message: "Chat not found",
    });
  }

  await messageModel.deleteMany({ chat: id });
  await chatModel.deleteOne({ _id: id });

  res.status(200).json({
    message: "Chat deleted successfully",
  });
}

module.exports = {
  createChat,
  getChats,
  getMessages,
  deleteChat,
};
