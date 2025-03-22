const { GoogleGenerativeAI } = require("@google/generative-ai");
const MedicalRecord = require("../models/medicalRecord");

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const modelText = genAI.getGenerativeModel({ model: "gemini-pro" });
const modelEmbedding = genAI.getGenerativeModel({ model: "embedding-001" });

/**
 * Generate embedding vector for text using Gemini
 * @param {string} text - Text to generate embedding for
 * @returns {Array} - Embedding vector
 */
async function generateEmbedding(text) {
  try {
    const result = await modelEmbedding.embedContent(text);
    const embedding = result.embedding.values;
    return embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    return [];
  }
}

/**
 * Calculate cosine similarity between two vectors
 * @param {Array} vecA - First vector
 * @param {Array} vecB - Second vector
 * @returns {number} - Similarity score between 0 and 1
 */
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Search medical records using semantic search
 * @param {string} query - Search query
 * @param {string} userId - User ID
 * @returns {Array} - Search results with scores and explanations
 */
async function searchRecords(query, userId) {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Get all records for the user
    const records = await MedicalRecord.find({
      patient: userId,
      vectorEmbedding: { $exists: true, $ne: null },
    });

    // Calculate similarity scores
    const scoredRecords = records.map((record) => {
      const score = cosineSimilarity(queryEmbedding, record.vectorEmbedding);
      return { record, score };
    });

    // Sort by similarity and get top results (score > 0.7)
    const filteredResults = scoredRecords
      .filter((item) => item.score > 0.7)
      .sort((a, b) => b.score - a.score);

    // Get explanations for top 5 results
    const topResults = filteredResults.slice(0, 5);

    if (topResults.length === 0) {
      // If no high-similarity results, return top 3 records regardless of score
      return scoredRecords.sort((a, b) => b.score - a.score).slice(0, 3);
    }

    // Generate explanations for the top results
    const resultsWithExplanations = await Promise.all(
      topResults.map(async ({ record, score }) => {
        try {
          const prompt = `
            You are analyzing a medical record that matched a search query.
            
            Medical record title: "${record.title}"
            Medical record description: "${record.description}"
            Medical record type: "${record.recordType}"
            
            Search query: "${query}"
            
            In 1-2 sentences, explain why this medical record is relevant to the search query.
            Be specific and mention any medical terms or concepts that connect the query to the record.
            Keep your explanation concise and medical-focused.
          `;

          const result = await modelText.generateContent(prompt);
          const explanation = result.response.text();

          return {
            record,
            score,
            explanation,
          };
        } catch (error) {
          console.error("Error generating explanation:", error);
          return { record, score };
        }
      })
    );

    return resultsWithExplanations;
  } catch (error) {
    console.error("Error searching records:", error);
    throw error;
  }
}

module.exports = {
  generateEmbedding,
  searchRecords,
};
