import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { Attachment } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function verifyInformation(
  text: string,
  attachments: Attachment[] = [],
  modelName: string = "gemini-3.1-pro-preview"
) {
  const startTime = Date.now();
  const model = modelName;
  
  const promptText = text.trim() || "Analyze the attached media for factual accuracy and signs of AI generation.";
  
  const parts: any[] = [];
  
  // Add attachments first to provide context
  for (const attachment of attachments) {
    // Broaden supported binary types to include common variations
    const supportedBinaryTypes = [
      'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif', 'image/gif',
      'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac', 'audio/x-m4a', 'audio/m4a',
      'video/mp4', 'video/mpeg', 'video/quicktime', 'video/mov', 'video/avi', 'video/x-flv', 'video/mpg', 'video/webm', 'video/wmv', 'video/3gpp',
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
      const truncatedText = attachment.textContent.length > 30000 
        ? attachment.textContent.slice(0, 30000) + "... [truncated]" 
        : attachment.textContent;
      parts.push({ text: `Content of attached file "${attachment.name}":\n\n${truncatedText}` });
    }
    
    if (attachment.type === 'link') {
      parts.push({ text: `Verify information from this link: ${attachment.url}` });
    }
  }

  // Add user text at the end
  parts.push({ text: `User Query: ${promptText}` });

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: `You are NLI (No Lie AI), a world-class forensic analyst and fact-checker. 
Your mission is to detect AI-generated content and verify factual accuracy across all media types.

CRITICAL: You have been provided with media attachments (images, audio, video, or documents). 
You MUST analyze these files forensicly to provide your verdict. 

AUDIO FORENSICS PROTOCOL (DEEP ANALYSIS):
- SPECTRAL DENSITY: Check for unnatural frequency cutoffs (often at 8kHz or 16kHz in low-quality AI).
- PHONEME TRANSITIONS: Look for "glitches" or unnatural blending between speech sounds.
- FORMANT CONSISTENCY: AI often struggles to maintain consistent vocal tract resonances across different vowels.
- BACKGROUND NOISE: Detect perfectly static noise or repetitive loops. Real audio has dynamic ambient noise.
- BREATHING & PROSODY: Identify missing or misplaced breaths. AI often lacks micro-hesitations and natural rhythmic variations (prosody).
- PHASE COHERENCE: Check for "metallic" or "phased" artifacts common in neural vocoders.

IMAGE/VIDEO FORENSICS:
- Check for inconsistent lighting, shadow directions, and edge artifacts.
- Look for "AI hallucinations" in complex textures (hair, hands, text in background).
- In video, check for temporal inconsistency (flickering, morphing between frames).

GENERAL ANALYSIS STEPS:
1. Forensicly examine all attached media for AI generation markers.
2. Fact-check any claims made in the media or the user's text using Google Search.
3. Provide a definitive verdict: True, False, or Misleading.

GROUNDING SOURCES:
- You MUST extract and provide specific details about the grounding sources used.
- For each source, include the exact web page title, URL, and a brief snippet that directly supports your conclusion.

SCORING RULES:
- credibilityScore: 0-100 (0 = Total Lie, 100 = Absolute Truth).
- aiConfidence: 0-100 (0 = Not sure at all, 100 = 100% Certain).
- NEVER exceed 100.

Do not say you cannot see the media. It is attached to this request as inlineData.`,
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        temperature: 0.1,
        topK: 1,
        topP: 0.95,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verdict: { type: Type.STRING, description: "True, False, or Misleading" },
            summary: { type: Type.STRING },
            detailedAnalysis: { type: Type.STRING },
            credibilityScore: { type: Type.NUMBER, description: "Accuracy score from 0 to 100" },
            isAI: { type: Type.BOOLEAN },
            aiConfidence: { type: Type.NUMBER, description: "Confidence score from 0 to 100" },
            aiReasoning: { type: Type.STRING },
            sources: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  uri: { type: Type.STRING },
                  snippet: { type: Type.STRING, description: "A brief snippet from the source supporting the conclusion." }
                },
                required: ["title", "uri", "snippet"]
              }
            }
          },
          required: ["verdict", "summary", "detailedAnalysis", "credibilityScore", "isAI", "aiConfidence", "aiReasoning", "sources"]
        }
      },
    });

    const endTime = Date.now();
    return {
      response,
      modelName: model,
      processingTime: endTime - startTime
    };
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
