const cors = require("cors")
const express = require("express")
const cookieParser = require("cookie-parser")

/* Routes */
const authRoutes = require("./routes/auth.routes")
const chatRoutes = require("./routes/chat.routes")


const app = express();

/* CORS Middleware  */
app.use(
    cors({
        origin: "https://ai-chat-gpt-frontend.vercel.app",
        credentials:true,
    })
)

/* Using Middlewares */
app.use(express.json());
app.use(cookieParser());


/* Using Routes */
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes)

module.exports = app;