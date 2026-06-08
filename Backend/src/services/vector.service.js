// Import the Pinecone library
const { Pinecone } = require("@pinecone-database/pinecone");

// Initialize a Pinecone client with your API key
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

const cohortChatGptindex = pc.Index("chat-gpt");

// Save message in Pinecone
async function createMemory({ vectors, metadata, messageId }) {
  await cohortChatGptindex.upsert({
    records: [
      {
        id: String(messageId),
        values: Array.from(vectors),
        metadata,
      },
    ],
  });
}

// Find similar messages from Pinecone
async function queryMemory({ queryVector, limit = 5, metadata }) {
  const data = await cohortChatGptindex.query({
    vector: queryVector,
    topK: limit,
    filter: metadata ? { metadata } : undefined,
    includeMetadata: true,
  });

  return data.matches;
}

module.exports = {
  createMemory,
  queryMemory,
};
