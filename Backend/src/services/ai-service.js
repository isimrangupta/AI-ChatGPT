const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({});


// Get reply from Gemini AI
async function generateResponse(content) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: content,
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
    generateVector 
};
