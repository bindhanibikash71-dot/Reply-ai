/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AppMode = 'listening' | 'custom_speak' | 'chat_analyze';

export type ToneType =
  | 'Casual'
  | 'Funny'
  | 'Savage'
  | 'Smart'
  | 'Confident'
  | 'Romantic'
  | 'Emotional'
  | 'Flirty'
  | 'Professional'
  | 'Respectful'
  | 'Gangster'
  | 'Cold'
  | 'Sigma'
  | 'Introvert'
  | 'Extrovert'
  | 'Attitude'
  | 'Mature';

export type RelationshipType =
  | 'girlfriend/boyfriend'
  | 'friend'
  | 'stranger'
  | 'coworker'
  | 'teacher'
  | 'family';

export type EmotionType =
  | 'neutral'
  | 'anger'
  | 'flirting'
  | 'sadness'
  | 'awkward silence'
  | 'sarcasm'
  | 'nervousness'
  | 'excitement'
  | 'passive aggression'
  | 'jealousy'
  | 'embarrassment';

export interface ReplyConfig {
  tone: ToneType;
  relationship: RelationshipType;
  primaryEmotion: EmotionType;
  isQuickComeback: boolean;
  isFlirtAssist: boolean;
  isSilenceSaver: boolean;
  isGroupChat: boolean;
  isAutoShort: boolean;
}

export interface ReplyResponse {
  primaryReply: string;
  explanation?: string; // Optional context for the user about why this works
  variations: {
    tone: ToneType;
    replyText: string;
  }[];
  perceivedEmotion?: string;
  confidenceScore?: number; // 0-100 indicating reply effectiveness
}

export interface TranscribedMessage {
  id: string;
  text: string;
  timestamp: string;
  speaker: 'them' | 'you';
}

export interface ChatAnalysisResponse {
  summary: string;
  relationshipStatus: string;
  underlyingMotivation: string;
  suggestedAction: string;
  replies: {
    label: string; // e.g., "Smooth option", "Sigma Option", "Boundary Option"
    text: string;
  }[];
}
