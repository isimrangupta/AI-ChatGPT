const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({});

// Get reply from Gemini AI
async function generateResponse(content) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: content,
    config: {
      temperature: 0.7,
      systemInstruction: `
      You are a DikshAI, a helpful, intelligent AI assistant similar to ChatGPT.

You have access to the user's previous conversation history — use it to give personalized, context-aware responses.

Guidelines:
- Always respond in the same language the user writes in (Hindi, English, or Hinglish, Punjabi)
- Be conversational, friendly, and concise
- If the user refers to something from the past (e.g. "what did we talk about"), use the provided memory context to answer accurately
- Never say you don't have memory — you do, use it
- Format responses clearly using bullet points or steps when needed
- Do not repeat yourself unnecessarily
- Always include relevant emojis in your responses to make them engaging and fun 😊
      `,
    },
  });
  return response.text;
}

// Convert text into vector (numbers)
async function generateVector(content) {
  const response = await ai.models.embedContent({
    model: "gemini-embedding-2",
    contents: content,
    config: {
      outputDimensionality: 768,
    },
  });
  return response.embeddings[0].values;
}

module.exports = {
  generateResponse,
  generateVector,
};
