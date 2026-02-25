import { GoogleGenAI } from "@google/genai";
import db from '../db';

// Helper to get API Key from env or DB
const getApiKey = () => {
  const envKey = process.env.GEMINI_API_KEY;
  if (envKey && envKey !== 'MY_GEMINI_API_KEY') return envKey;

  try {
    const setting = db.prepare("SELECT value FROM app_settings WHERE key = 'gemini_api_key'").get() as { value: string };
    return setting?.value;
  } catch (e) {
    return null;
  }
};

interface DocumentChunk {
  id: number;
  content: string;
  embedding: number[];
  filename: string;
}

export class RagService {

  // Generate embedding for a text
  async generateEmbedding(text: string): Promise<number[]> {
    const currentKey = getApiKey();
    const ai = currentKey ? new GoogleGenAI({ apiKey: currentKey }) : null;

    if (!ai) {
      console.warn("GEMINI_API_KEY not set. Skipping embedding generation.");
      return []; // Return empty or throw specific error
    }
    try {
      const result = await ai.models.embedContent({
        model: "text-embedding-004",
        contents: { parts: [{ text }] }
      } as any);

      if (!result.embeddings || result.embeddings.length === 0) {
        throw new Error("No embedding returned");
      }
      return result.embeddings[0].values;
    } catch (error) {
      console.error("Error generating embedding:", error);
      throw error;
    }
  }

  // Calculate cosine similarity
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Search for relevant documents
  async search(query: string, limit: number = 3): Promise<DocumentChunk[]> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);

      if (queryEmbedding.length === 0) return [];

      // Fetch all documents (Naive approach for MVP - acceptable for < 10k chunks)
      const docs = db.prepare('SELECT * FROM documents').all() as any[];

      const scoredDocs = docs.map(doc => {
        let embedding: number[] = [];
        try {
          embedding = JSON.parse(doc.embedding);
        } catch (e) {
          console.error("Error parsing embedding for doc", doc.id);
          return { ...doc, embedding: [], score: 0 };
        }

        return {
          ...doc,
          embedding,
          score: this.cosineSimilarity(queryEmbedding, embedding)
        };
      });

      // Sort by score descending
      scoredDocs.sort((a, b) => b.score - a.score);

      return scoredDocs.slice(0, limit);
    } catch (err) {
      console.error("Search error:", err);
      return [];
    }
  }

  // Ingest a document (text content)
  async ingestDocument(filename: string, content: string) {
    const currentKey = getApiKey();
    if (!currentKey) throw new Error("GEMINI_API_KEY is missing. Cannot ingest documents.");

    // 1. Chunking (Simple paragraph/length based)
    const chunks = this.chunkText(content, 1000); // ~1000 chars per chunk

    for (const chunk of chunks) {
      // 2. Generate Embedding
      const embedding = await this.generateEmbedding(chunk);

      // 3. Store in DB
      db.prepare('INSERT INTO documents (filename, content, embedding) VALUES (?, ?, ?)').run(
        filename,
        chunk,
        JSON.stringify(embedding)
      );
    }
  }

  private chunkText(text: string, chunkSize: number): string[] {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

export const ragService = new RagService();
