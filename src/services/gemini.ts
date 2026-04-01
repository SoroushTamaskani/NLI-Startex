import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { Attachment } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function verifyInformation(
  text: string,
  attachments: Attachment[] = []
) {
  const model = "gemini-3.1-pro-preview";
  
  const promptText = text.trim() || "Analyze the attached media for factual accuracy and signs of AI generation.";
  
  const parts: any[] = [{ text: `User Input: ${promptText}` }];

  for (const attachment of attachments) {
    // Only send supported binary types to inlineData
    const supportedBinaryTypes = [
      'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif',
      'audio/wav', 'audio/mp3', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac',
      'video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/x-flv', 'video/mpg', 'video/webm', 'video/wmv', 'video/3gpp',
      'application/pdf'
    ];

    if (attachment.base64 && attachment.mimeType && supportedBinaryTypes.includes(attachment.mimeType)) {
      parts.push({
        inlineData: {
          data: attachment.base64,
          mimeType: attachment.mimeType,
        },
      });
    }
    
    // If we have extracted text content (for .docx, .txt, .md), send it as a text part
    if (attachment.textContent) {
      // Truncate to avoid hitting request size limits (approx 30k characters)
      const truncatedText = attachment.textContent.length > 30000 
        ? attachment.textContent.slice(0, 30000) + "... [truncated]" 
        : attachment.textContent;
      parts.push({ text: `Content of attached file "${attachment.name}":\n\n${truncatedText}` });
    }
    
    if (attachment.type === 'link') {
      parts.push({ text: `Verify information from this link: ${attachment.url}` });
    }
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: `You are NLI (No Lie AI), a world-class forensic analyst and fact-checker. 
Your mission is to detect AI-generated content and verify factual accuracy across all media types.

AI DETECTION GUIDELINES:
- IMAGES: Look for anatomical inconsistencies (fingers, teeth), unnatural textures, lighting mismatches, and background warping.
- VIDEO: Check for lip-sync issues, unnatural blinking, "shimmering" artifacts, and inconsistent shadows.
- AUDIO: Listen for robotic cadence, lack of natural breathing, and spectral inconsistencies.
- TEXT: Identify repetitive structures, lack of specific personal insight, and overly polished but vacuous phrasing.

FACT-CHECKING GUIDELINES:
- Use Google Search to verify specific claims, dates, and figures.
- Cross-reference multiple reliable sources.
- Assign a credibility score (0-100) based on source reliability.

Provide a definitive verdict (True, False, or Misleading) and a detailed breakdown of your findings.`,
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        temperature: 0.1,
        topK: 40,
        topP: 0.95,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verdict: { type: Type.STRING, description: "True, False, or Misleading" },
            summary: { type: Type.STRING },
            detailedAnalysis: { type: Type.STRING },
            credibilityScore: { type: Type.NUMBER },
            isAI: { type: Type.BOOLEAN },
            aiConfidence: { type: Type.NUMBER },
            aiReasoning: { type: Type.STRING }
          },
          required: ["verdict", "summary", "detailedAnalysis", "credibilityScore", "isAI", "aiConfidence", "aiReasoning"]
        }
      },
    });

    return response;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // If it's a 500 error, it might be a transient issue or a problem with the schema/tools
    // We can try to re-throw a more descriptive error or handle it
    throw error;
  }
}
