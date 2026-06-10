const mongoose = require("mongoose")

async function connectDb() {
    try {
        await mongoose.connect(process.env.MONGO_URL)
        console.log("connectd to MongoDB")

    } catch (error) {
        console.log("Error connecting to MongoDB:", error)
    }
}

module.exports  = connectDb;