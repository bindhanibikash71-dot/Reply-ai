/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// High limits for handling large chat screenshot base64 strings
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

/**
 * Utility to parse and clean JSON output returned by LLMs, robust even if formatted as Markdown blocks.
 */
function cleanAndParseJSON(rawText: string) {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '').trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch (err: any) {
    console.error('Failed to parse JSON content from OpenRouter:', rawText);
    throw new Error(`JSON format error: ${err.message}`);
  }
}

/**
 * Standard text generation client call for OpenRouter API
 */
async function callOpenRouter(systemInstruction: string, prompt: string, customModel?: string): Promise<string> {
  // Respecting both OPENROUTER_API_KEY and GEMINI_API_KEY fallback
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not defined. Please add it via the Settings > Secrets panel.');
  }

  const modelId = customModel || process.env.OPENROUTER_MODEL_ID || 'google/gemini-2.5-flash';
  const url = 'https://openrouter.ai/api/v1/chat/completions';

  const bodyData = {
    model: modelId,
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.25,      // Extremely fast & deterministic
    max_tokens: 380,        // Cap length of suggestions to reduce latency response
    provider: {
      allow_fallbacks: true // Ensure fast completions if primary model is slow/busy
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.APP_URL || 'https://ai.studio/build',
      'X-Title': 'Cognitive Conversation Engine'
    },
    body: JSON.stringify(bodyData)
  });

  if (!response.ok) {
    const errorMsg = await response.text();
    throw new Error(`OpenRouter API error (Status ${response.status}): ${errorMsg}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  if (!choice || !choice.message?.content) {
    throw new Error('Invalid or empty completion received from OpenRouter API.');
  }

  return choice.message.content;
}

/**
 * Multimodal vision generation client call for OpenRouter API
 */
async function callOpenRouterWithVision(systemInstruction: string, promptText: string, base64Image: string, mimeType: string, customModel?: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not defined. Please add it via the Settings > Secrets panel.');
  }

  const modelId = customModel || process.env.OPENROUTER_MODEL_ID || 'google/gemini-2.5-flash';
  const url = 'https://openrouter.ai/api/v1/chat/completions';

  // Ensure base64 string is correctly formatted as a Data URL
  const dataUrl = base64Image.startsWith('data:') 
    ? base64Image 
    : `data:${mimeType};base64,${base64Image}`;

  const bodyData = {
    model: modelId,
    messages: [
      { role: 'system', content: systemInstruction },
      {
        role: 'user',
        content: [
          { type: 'text', text: promptText },
          {
            type: 'image_url',
            image_url: {
              url: dataUrl
            }
          }
        ]
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.25,
    max_tokens: 450, // Enough for visual analytics response
    provider: {
      allow_fallbacks: true
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.APP_URL || 'https://ai.studio/build',
      'X-Title': 'Cognitive Conversation Engine'
    },
    body: JSON.stringify(bodyData)
  });

  if (!response.ok) {
    const errorMsg = await response.text();
    throw new Error(`OpenRouter Vision API error (Status ${response.status}): ${errorMsg}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  if (!choice || !choice.message?.content) {
    throw new Error('Invalid or empty completion received from OpenRouter Vision API.');
  }

  return choice.message.content;
}

// Ensure server endpoints are set up FIRST
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', developer: 'Bikash Bindhani', time: new Date().toISOString() });
});

/**
 * Endpoint to generate a highly humanized reply for Live Listen Mode.
 * Ensures the target response targets the caller opposite to the User.
 */
app.post('/api/generate-reply', async (req, res) => {
  try {
    const { transcript, history = [], config } = req.body;

    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({ error: 'Transcript is required' });
    }

    const {
      tone = 'Casual',
      relationship = 'friend',
      primaryEmotion = 'neutral',
      isQuickComeback = false,
      isFlirtAssist = false,
      isSilenceSaver = false,
      isGroupChat = false,
      isAutoShort = false,
      selectedModel,
    } = config || {};

    const systemInstruction = `You are the user's advanced real-time AI conversation partner and live reply brain. 
Your ultimate priority is to help the user continue and respond masterfully to public or private conversations.

⭐⭐⭐ CRITICAL RULE: ONLY REPLY TO THE OTHER SPEAKER (SAMNE JO HAI USKA REPLY KARE) ⭐⭐⭐
1. You must ONLY reply to the person opposite or in front of the user (e.g., 'Other Person', 'them'). 
2. You must NEVER reply to the owner ('you', 'User') or analyze the owner's thoughts/statements as if they were queries targeted at you. Treat the User's statements in history STRICTLY as past context of what the user already said. Your generated suggested replies must ALWAYS be words for the User to speak in response to the OTHER person's latest utterance.
3. If the transcript corresponds to the User ('you'), your job is to keep standby or suggest what the User can say next to keep the Other Person engaged; never converse with the user or agree/reply with the user's statements directly.
4. Always sound highly human, natural, cool, and effortless. NO robot words, NO formal assistant speak ("I am an AI", "How can I help you?", etc.).
5. Prefer very short replies. Most replies should be under 12 words. Maximum 2 short sentences.
6. Slightly imperfect grammar is encouraged to maintain a spoken, texting, or voice-chat vibe.
7. Understand and seamlessly translate/adapt Hinglish (Hindi-English mix, e.g., "bata kya hua", "kahan tha kal") and broken English.
8. Embody the Tone directly:
   - Casual: Relatable, easygoing, everyday.
   - Funny: Playful, humorous, cracking smiles.
   - Savage: Direct, teasing, smart roasts, sharp.
   - Smart: Intelligent, clever, insightful yet grounded.
   - Confident: Assured, unfazed, high charisma.
   - Romantic: Sincerely sweet, connecting.
   - Flirty: Subtle, tease-heavy, seductive charm, magnetic.
   - Professional: Polite, brief, competent, structured.
   - Respectful: Clean, humble, highly supportive.
   - Gangster: Slang-infused, street-smart, punchy.
   - Cold: Bulletproof, low-reactivity, highly minimalist.
   - Sigma: Unbothered, deep confidence, zero desperation.
   - Introvert: Slightly brief, soft, listening vibe.
   - Extrovert: High-energy, warm, active conversation-driver.
   - Attitude: Sleek, high-value, cool indifference, slightly playful.
   - Mature: Grounded, understanding, calm wisdom.
9. Keep replies clean, highly readable, and easily pronounceable (optimizing for live reading aloud).`;

    const parsedHistory = history.length > 0 
      ? history.map((h: any) => `${h.speaker === 'you' ? 'User (Owner)' : 'Other Person (Opposite Speaker)'}: "${h.text}"`).join('\n')
      : 'No previous messages.';

    const prompt = `Current transcript of the opposite speaker speaking to the User:
"${transcript}"

Conversation State Context:
- Past Dialogue Memory (Use this for flow. Remember User/Owner is 'you' and 'Other Person' is the person 'samne' whose words you reply to):
${parsedHistory}

Active Context Configurations:
- Desired Reply Tone: ${tone}
- Relationship mapping: ${relationship}
- Primary Speaker Emotion: ${primaryEmotion}
- Special Modifiers:
  * Quick Comeback Mode: ${isQuickComeback ? 'ON (generate punchy instant comebacks/teases)' : 'OFF'}
  * Flirt Assist Mode: ${isFlirtAssist ? 'ON (deploy flirty magnetic charm)' : 'OFF'}
  * Silence Saver Mode: ${isSilenceSaver ? 'ON (generate conversational bridges to save awkward silences)' : 'OFF'}
  * Group Chat Mode: ${isGroupChat ? 'ON (assume multiple speaking sounds, keep replies adaptable)' : 'OFF'}
  * Auto Short Mode: ${isAutoShort ? 'ON (ultra-fast 1 to 5 word responses)' : 'OFF'}

Generate a JSON response containing:
- "primaryReply": the primary generated response. Do NOT include quotation marks. Ensure it replies directly to the opposite speaker (Other Person).
- "explanation": a concise 5-to-10 word tip/trick on why this response works here.
- "perceivedEmotion": detect the emotion represented in the transcript in 1-2 words.
- "confidenceScore": a number 0 to 100 on how effective this reply is in real life.
- "variations": exactly 3 direct variations of replies in other matching tones that fit the flow of replying to the opposite speaker. Check that these variants do not talk to the Owner, but rather help the Owner reply.`;

    const responseText = await callOpenRouter(systemInstruction, prompt, selectedModel);
    res.json(cleanAndParseJSON(responseText));
  } catch (err: any) {
    console.error('Error generating live reply via OpenRouter:', err);
    res.status(500).json({ error: err.message || 'Failed to generate live reply.' });
  }
});

/**
 * Endpoint to humanize and translate raw typed thoughts (Hinglish/broken English)
 * into confident, high-caliber spoken English.
 */
app.post('/api/custom-speak', async (req, res) => {
  try {
    const { rawText, tone = 'Confident', selectedModel } = req.body;

    if (!rawText || typeof rawText !== 'string') {
      return res.status(400).json({ error: 'Text input is required' });
    }

    const systemInstruction = `You are a conversation brain. Your job is to convert raw, messy, anxious, or Hinglish/broken thoughts typed by the user into ultra-competent, highly natural, confident spoken English.
Keep standard meanings of Hinglish phrases intact:
- "usko bolo ki main kal busy tha" -> "Tell him I was busy yesterday."
- "main gussa nahi hun mood off hai" -> "I'm not angry, just not in a good mood."
- "bol ki main aa raha hu 5 mins me" -> "Tell them I'll be there in 5 minutes."
- "mujhe uske sath baat nahi karni" -> "I don't really feel like talking to them right now."

Ensure the spoken output is effortless, natural, confident, and free of any robotic tone. No explanations in the reply itself.`;

    const prompt = `User's raw typed thought: "${rawText}"
Target Tone slope: ${tone}

Please translate/upgrade this thought into the primary confident spoken reply, offer a 5-10 word psychological delivery tip, and suggest 3 active variations in other matching tones. Output as JSON containing "primaryReply", "explanation", and a "variations" array of objects with "tone" and "replyText" properties.`;

    const responseText = await callOpenRouter(systemInstruction, prompt, selectedModel);
    res.json(cleanAndParseJSON(responseText));
  } catch (err: any) {
    console.error('Error in custom-speak via OpenRouter:', err);
    res.status(500).json({ error: err.message || 'Failed to process spoken thoughts.' });
  }
});

/**
 * Endpoint to analyze pasted chat logs / text and recommend tactical replies
 */
app.post('/api/analyze-chat-text', async (req, res) => {
  try {
    const { chatText, userSide = 'User', selectedModel } = req.body;

    if (!chatText || typeof chatText !== 'string') {
      return res.status(400).json({ error: 'Chat text is required' });
    }

    const systemInstruction = `You are an expert social dynamics psychologist and conversation tactical analyzer. 
Analyze the provided chat exchange from the perspective of helping the user.
1. Outline the current tension/friction, relationship vibes, and underlying motives.
2. Formulate 4 highly effective, natural, non-robotic next messages the user can copy & paste. Make sure the replies have distinct strategic labels (e.g. "Savage Comeback", "Smooth tease", "Grounded boundary", "Sigma pivot").
Keep replies short, human, casual, texting-native. No quotation marks in replies. Ensure you reply ONLY to the opposite person.`;

    const prompt = `Chat logs text to analyze:
"""
${chatText}
"""
User represents: ${userSide}

Please analyze this log and return a JSON response matching the ChatAnalysisResponse schema containing:
"summary", "relationshipStatus", "underlyingMotivation", "suggestedAction", and a "replies" array with "label" and "text" keys.`;

    const responseText = await callOpenRouter(systemInstruction, prompt, selectedModel);
    res.json(cleanAndParseJSON(responseText));
  } catch (err: any) {
    console.error('Error analyzing chat text via OpenRouter:', err);
    res.status(500).json({ error: err.message || 'Failed to analyze chat text.' });
  }
});

/**
 * Endpoint to analyze uploaded screenshots of chat transcripts
 */
app.post('/api/analyze-screenshot', async (req, res) => {
  try {
    const { base64Image, mimeType = 'image/png', selectedModel } = req.body;

    if (!base64Image) {
      return res.status(400).json({ error: 'Screenshot image data is required' });
    }

    // Extract the raw base64 string if it contains the data url prefix
    const base64Data = base64Image.includes(';base64,') 
      ? base64Image.split(';base64,')[1] 
      : base64Image;

    const systemInstruction = `You are a social dynamics master and conversation strategist.
Analyze the uploaded screenshot containing chat threads (e.g., from WhatsApp, iMessage, Tinder, Instagram).
1. Read the text from the screenshot accurately.
2. Formulate the relationship status, underlying motivation of the other speaker, and general strategy.
3. Generate 4 clever, highly aesthetic, spoken/messaging replies suitable for social messaging threads. No robot formulas. Labels should be short and tactical. Encourage replying ONLY to the opposite person ('samne jo hai').`;

    const promptText = `Please analyze this chat screenshot. Detect the dialog flow, read who is saying what, identify the psychological leverage, and write a tactical brief with 4 ultimate next replies. Output strictly as JSON.`;

    const responseText = await callOpenRouterWithVision(systemInstruction, promptText, base64Data, mimeType, selectedModel);
    res.json(cleanAndParseJSON(responseText));
  } catch (err: any) {
    console.error('Error analyzing screenshot via OpenRouter:', err);
    res.status(500).json({ error: err.message || 'Failed to analyze screenshot.' });
  }
});

// Configure Vite integration for develop and production serving
async function configureViteAndStatic() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite dev server mounted as middleware.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production static asset serving configured.');
  }
}

configureViteAndStatic().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server actively running on http://0.0.0.0:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to configure server:', err);
});
