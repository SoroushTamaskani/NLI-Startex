import type { AttachmentKind } from '../shared/files';
import type { ApiError, Audience, CheckMode, UploadRef, VerificationResult, VerifyStage } from '../shared/types';

export type { AttachmentKind } from '../shared/files';
export type * from '../shared/types';

/** An attachment as stored with a message. The file itself lives in IndexedDB under `id`. */
export interface AttachmentMeta {
  id: string;
  kind: AttachmentKind;
  name: string;
  mimeType: string;
  size: number;
  ref: UploadRef;
}

/** An attachment still in the composer, possibly uploading. */
export interface DraftAttachment {
  id: string;
  kind: AttachmentKind;
  name: string;
  mimeType: string;
  size: number;
  file: Blob;
  previewUrl: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  progress: number;
  ref?: UploadRef;
  error?: string;
}

export interface UserMessage {
  id: string;
  role: 'user';
  text: string;
  attachments: AttachmentMeta[];
  mode: CheckMode;
  /** Who the answer was written for. Missing on messages saved before ages were added. */
  audience?: Audience;
  createdAt: string;
}

export interface AssistantMessage {
  id: string;
  role: 'assistant';
  /** The user message this answers. */
  replyTo: string;
  createdAt: string;
  result?: VerificationResult;
  error?: ApiError;
  feedback?: 'helpful' | 'not-helpful';
  /** Text answers saved by the first version of NLI, before structured results. */
  legacyContent?: string;
}

export type Message = UserMessage | AssistantMessage;

export interface Session {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export interface PendingCheck {
  sessionId: string;
  replyTo: string;
  stage: 'starting' | VerifyStage;
  startedAt: number;
  mode: CheckMode;
}
