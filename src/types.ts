export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
  timestamp: Date;
  isVerifying?: boolean;
  groundingSources?: GroundingSource[];
  credibilityScore?: number; // 0-100
  aiDetection?: {
    isAI: boolean;
    confidence: number;
    reasoning: string;
  };
}

export interface Attachment {
  id?: string;
  type: 'image' | 'audio' | 'video' | 'document' | 'link';
  url: string;
  name: string;
  mimeType?: string;
  base64?: string;
  progress?: number; // 0-100
  textContent?: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}
