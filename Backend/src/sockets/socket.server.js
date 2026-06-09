const { Server, Socket } = require("socket.io");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const aiService = require("../services/ai-service");
const messageModel = require("../models/message.model");
const { createMemory, queryMemory } = require("../services/vector.service");

function initSocketServer(httpServer) {
  const io = new Server(httpServer, {});

  io.use(async (socket, next) => {
    const cookies = cookie.parse(socket.handshake.headers?.cookie || "");

    console.log("socket connection cookies:", cookies);

    if (!cookies.token) {
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET);

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

      // Save user message in MongoDB
      const message = await messageModel.create({
        chat: messagePayLoad.chat,
        user: socket.user._id,
        content: messagePayLoad.content,
        role: "user",
      });

      // Convert user message text into vector (numbers)
      const vectors = await aiService.generateVector(messagePayLoad.content);

      // Find similar messages from Pinecone
      const memory = await queryMemory({
        queryVector: vectors,
        limit: 3,
        metadata: {
          user: { $eq: socket.user._id.toString() }
        },
      });

      console.log(memory);

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

      // Get last 20 messages from MongoDB
      const chatHistory = (
        await messageModel
          .find({
            chat: messagePayLoad.chat,
          })
          .sort({ createdAt: -1 })
          .limit(20)
          .lean()
      ).reverse();

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

     console.log(ltm[0])
     console.log(stm)

      
        // Send chat history to Gemini and get reply
        const response = await aiService.generateResponse([...ltm, ...stm]);

        // Save AI reply in MongoDB
        const responseMessage = await messageModel.create({
          chat: messagePayLoad.chat,
          user: socket.user._id,
          content: response,
          role: "model",
        });

        // Convert AI reply text into vector (numbers)
        const responseVectors = await aiService.generateVector(response);

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

         // Send AI reply to user
        socket.emit("ai-response", {
          content: response,
          chat: messagePayLoad.chat,
        });
    });
  });
}

module.exports = initSocketServer;
