const { Server, Socket } = require("socket.io");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const aiService = require("../services/ai-service");
const messageModel = require("../models/message.model");
const { createMemory, queryMemory } = require("../services/vector.service");

function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "https://ai-chat-gpt-frontend.vercel.app",
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    const cookies = cookie.parse(socket.handshake.headers?.cookie || "");

    // Get token either from cookies or from the auth object
    const token = cookies.token || socket.handshake.auth?.token;

    // Reject connection if no token is provided
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await userModel.findById(decoded.id);

      socket.user = user;

      next();
    } catch (error) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("ai-message", async (messagePayLoad) => {
      console.log(messagePayLoad); /* {chat, content} */

      const [message, vectors] = await Promise.all([
        // Save user message in MongoDB
        messageModel.create({
          chat: messagePayLoad.chat,
          user: socket.user._id,
          content: messagePayLoad.content,
          role: "user",
        }),

        // Convert user message text into vector (numbers)
        aiService.generateVector(messagePayLoad.content),
      ]);

      // Save user message vector in Pinecone
      await createMemory({
        vectors,
        messageId: message._id,
        metadata: {
          chat: messagePayLoad.chat,
          user: socket.user._id,
          text: messagePayLoad.content,
        },
      });

      const [memory, chatHistory] = await Promise.all([
        // Find similar messages from Pinecone
        queryMemory({
          queryVector: vectors,
          limit: 3,
          metadata: {
            user: { $eq: socket.user._id.toString() },
          },
        }),

        // Get last 20 messages from MongoDB
        messageModel
          .find({
            chat: messagePayLoad.chat,
          })
          .sort({ createdAt: -1 })
          .limit(20)
          .lean()
          .then((messages) => messages.reverse()),
      ]);

      const stm = chatHistory.map((item) => {
        return {
          role: item.role,
          parts: [{ text: item.content }],
        };
      });

      const ltm = [
        {
          role: "user",
          parts: [
            {
              text: `
              these are some previous messages from the chat, use them to generate a response
              ${memory.map((item) => item.metadata.text).join("\n")}
          `,
            },
          ],
        },
      ];

      // Send chat history to Gemini and get reply
      const response = await aiService.generateResponse([...ltm, ...stm]);

      // Send AI reply to user
      socket.emit("ai-response", {
        content: response,
        chat: messagePayLoad.chat,
      });

      const [responseMessage, responseVectors] = await Promise.all([
        // Save AI reply in MongoDB
        messageModel.create({
          chat: messagePayLoad.chat,
          user: socket.user._id,
          content: response,
          role: "model",
        }),

        // Convert AI reply text into vector (numbers)
        aiService.generateVector(response),
      ]);

      // Save AI reply vector in Pinecone
      await createMemory({
        vectors: responseVectors,
        messageId: responseMessage._id,
        metadata: {
          chat: messagePayLoad.chat,
          user: socket.user._id,
          text: response,
        },
      });
    });
  });
}

module.exports = initSocketServer;
