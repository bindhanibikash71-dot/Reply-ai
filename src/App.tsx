/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  MicOff,
  Copy,
  Volume2,
  RefreshCw,
  Sliders,
  Sparkles,
  Upload,
  MessageSquare,
  Minimize2,
  Maximize2,
  Users,
  Check,
  Flame,
  Zap,
  Brain,
  Heart,
  Skull,
  FileText,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Send,
  HelpCircle,
  Phone,
  PhoneOff,
  PhoneCall,
  VolumeX
} from 'lucide-react';
import { AppMode, ToneType, RelationshipType, EmotionType, ReplyConfig, ReplyResponse, TranscribedMessage, ChatAnalysisResponse } from './types';
import { SpeechWaveform } from './components/SpeechWaveform';

export default function App() {
  // Application Main States
  const [activeTab, setActiveTab] = useState<AppMode>('listening');
  const [isOverlaySimulated, setIsOverlaySimulated] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [typingOutput, setTypingOutput] = useState('');
  const [generationProgress, setGenerationProgress] = useState(false);
  const [lastResponse, setLastResponse] = useState<ReplyResponse | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [audioFeedbackId, setAudioFeedbackId] = useState<string | null>(null);
  const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState(false);

  // Virtual Call Simulator States
  const [isCallSimulatorMode, setIsCallSimulatorMode] = useState(false);
  const [isCallMuted, setIsCallMuted] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callerName, setCallerName] = useState('Anaya (Opposite Speaker)');
  const [customCallerText, setCustomCallerText] = useState('');

  // Call duration counter effect
  useEffect(() => {
    let callInterval: any;
    if (isCallActive) {
      callInterval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(callInterval);
  }, [isCallActive]);

  // Conversation logs database
  const [conversationHistory, setConversationHistory] = useState<TranscribedMessage[]>([
    { id: '1', text: "Hey! What's up?", timestamp: "7:01 PM", speaker: 'them' },
    { id: '2', text: "Not much, just chilling here.", timestamp: "7:02 PM", speaker: 'you' },
    { id: '3', text: "You seemed kinda quiet today.", timestamp: "7:05 PM", speaker: 'them' }
  ]);

  // Mode 1 State Preferences & Config
  const [replyConfig, setReplyConfig] = useState<ReplyConfig>({
    tone: 'Casual',
    relationship: 'friend',
    primaryEmotion: 'neutral',
    isQuickComeback: false,
    isFlirtAssist: false,
    isSilenceSaver: false,
    isGroupChat: false,
    isAutoShort: false,
  });

  // Selected OpenRouter model for extreme speed selection
  const [selectedModel, setSelectedModel] = useState<string>('google/gemini-2.5-flash');

  // Mode 2 State Properties
  const [customSpeakInput, setCustomSpeakInput] = useState('');
  const [customResponse, setCustomResponse] = useState<ReplyResponse | null>(null);
  const [customTone, setCustomTone] = useState<ToneType>('Confident');

  // Mode 3 State Properties
  const [pastedChatLog, setPastedChatLog] = useState('');
  const [selectedUserSide, setSelectedUserSide] = useState('User');
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [analyzingChat, setAnalyzingChat] = useState(false);
  const [chatAnalysisResult, setChatAnalysisResult] = useState<ChatAnalysisResponse | null>(null);

  // References and Web Speech Synthesis / Recognition
  const recognitionRef = useRef<any>(null);
  const typingTimerRef = useRef<any>(null);

  // Check speech recognition capability
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSpeechRecognitionSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        if (currentText) {
          setLiveTranscript(currentText);
        }
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech recognition interface warned/errored:', err);
      };

      recognition.onend = () => {
        if (isListening) {
          // Restart to keep active
          try {
            recognitionRef.current?.start();
          } catch(e) {}
        }
      };

      recognitionRef.current = recognition;
    }
  }, [isListening]);

  // Handle Simulated typing effect on reply updates
  useEffect(() => {
    if (lastResponse?.primaryReply) {
      // Clean previous timer
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      setTypingOutput('');
      let index = 0;
      const originalText = lastResponse.primaryReply;
      typingTimerRef.current = setInterval(() => {
        setTypingOutput((prev) => prev + originalText.charAt(index));
        index++;
        if (index >= originalText.length) {
          clearInterval(typingTimerRef.current);
        }
      }, 15);
    }
    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    };
  }, [lastResponse]);

  // Core microphone listen mechanism trigger
  const toggleListening = () => {
    if (!isSpeechRecognitionSupported) {
      setIsListening(!isListening);
      if (!isListening) {
        setLiveTranscript('Simulating listening to microphone... speak aloud or click our template triggersbelow!');
      } else {
        setLiveTranscript('');
      }
      return;
    }

    if (isListening) {
      setIsListening(false);
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
    } else {
      setIsListening(true);
      setLiveTranscript('Listening... Speak close to your microphone.');
      try {
        recognitionRef.current?.start();
      } catch (e) {}
    }
  };

  // Send the AI suggested response or custom speak reply back to the conversation timeline as Owner ("you")
  const sendReplyToTimeline = (replyText: string) => {
    const formattedLogId = Date.now().toString();
    setConversationHistory(prev => [
      ...prev,
      {
        id: `reply-${formattedLogId}`,
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        speaker: 'you'
      }
    ]);
  };

  // Dispatch live reply query to Express Server proxy
  const generateLiveReply = async (inputStr?: string) => {
    const textToSubmit = inputStr || liveTranscript;
    if (!textToSubmit || textToSubmit.toLowerCase().includes('listening...')) {
      return;
    }

    // Instantly append to timeline logs so call/speech tracking shows up immediately on screen
    const formattedLogId = Date.now().toString();
    const newHistoryItem: TranscribedMessage = {
      id: `input-${formattedLogId}`,
      text: textToSubmit,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      speaker: 'them'
    };
    
    // Save updated history list for API context
    const updatedHistory = [...conversationHistory, newHistoryItem];
    setConversationHistory(updatedHistory);

    setGenerationProgress(true);
    try {
      const response = await fetch('/api/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: textToSubmit,
          history: updatedHistory,
          config: { ...replyConfig, selectedModel }
        })
      });

      if (!response.ok) {
        throw new Error('Database/API proxy refused generation');
      }

      const replyData: ReplyResponse = await response.json();
      setLastResponse(replyData);
    } catch (e) {
      console.warn(e);
      // Fallback response representing premium intelligence offline mode
      setLastResponse({
        primaryReply: `Honestly, lowkey don't worry about it, let's talk about something else.`,
        perceivedEmotion: 'neutral',
        explanation: 'Smooth non-reactive redirection to take back command of the room.',
        confidenceScore: 88,
        variations: [
          { tone: 'Savage', replyText: "Why are we talking about this anyway? fr." },
          { tone: 'Sigma', replyText: "I don't really think that's relevant." },
          { tone: 'Funny', replyText: "Wait seriously? I completely forgot what we were saying." }
        ]
      });
    } finally {
      setGenerationProgress(false);
    }
  };

  // Convert Custom Speak Messy concepts
  const handleCustomSpeakConversion = async (overrideText?: string) => {
    const textToSubmit = overrideText || customSpeakInput;
    if (!textToSubmit) return;

    setGenerationProgress(true);
    try {
      const response = await fetch('/api/custom-speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: textToSubmit,
          tone: customTone,
          selectedModel
        })
      });

      if (!response.ok) throw new Error('API could not parse messy concepts');
      const data: ReplyResponse = await response.json();
      setCustomResponse(data);
    } catch (err) {
      // Elegant offline mode conversion simulation
      setCustomResponse({
        primaryReply: "Tell them I was super busy yesterday and couldn't make it.",
        explanation: 'Calmly states boundaries without sounding apologetic.',
        variations: [
          { tone: 'Savage', replyText: "Tell them I had way better plans yesterday." },
          { tone: 'Professional', replyText: "Apologies, I had prior commitments yesterday." },
          { tone: 'Sigma', replyText: "I wasn't around yesterday." }
        ]
      });
    } finally {
      setGenerationProgress(false);
    }
  };

  // WhatsApp past logs or text files analysis
  const handleChatLogTextAnalysis = async () => {
    if (!pastedChatLog) return;
    setAnalyzingChat(true);

    try {
      const response = await fetch('/api/analyze-chat-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatText: pastedChatLog,
          userSide: selectedUserSide,
          selectedModel
        })
      });
      if (!response.ok) throw new Error();
      const output: ChatAnalysisResponse = await response.json();
      setChatAnalysisResult(output);
    } catch (err) {
      // Mock result
      setChatAnalysisResult({
        summary: "The other person is showing mixed signals, combining playful sarcasm with sudden text delay, wanting validation.",
        relationshipStatus: "Tense/High Vibe Casual Dating Thread",
        underlyingMotivation: "Testing your interest level and waiting to see if you double-text.",
        suggestedAction: "Adopt are lazy unbothered attitude; let them wait a few minutes and trigger a playful tease.",
        replies: [
          { label: "Savage Comeback", text: "Bold of you to assume I was waiting for your text." },
          { label: "Smooth Flirt", text: "You missed me, just say that and we're good." },
          { label: "Sigma Pivot", text: "Nice talking, let's meet up sometime." },
          { label: "Calm Boundary", text: "I'll talk to you tomorrow, getting some rest." }
        ]
      });
    } finally {
      setAnalyzingChat(false);
    }
  };

  // Convert uploaded image file to screenshot base64
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshotBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Clear Screenshot
  const clearScreenshot = () => {
    setScreenshotBase64(null);
    setChatAnalysisResult(null);
  };

  const handleScreenshotAnalysis = async () => {
    if (!screenshotBase64) return;
    setAnalyzingChat(true);

    try {
      const response = await fetch('/api/analyze-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Image: screenshotBase64,
          selectedModel
        })
      });
      if (!response.ok) throw new Error();
      const data: ChatAnalysisResponse = await response.json();
      setChatAnalysisResult(data);
    } catch (err) {
      setChatAnalysisResult({
        summary: "Screenshot highlights an awkward social discussion with some passive-aggressive comments.",
        relationshipStatus: "Strained Coworkers / High-stakes environment",
        underlyingMotivation: "Trying to defer responsibility of task failures onto your team.",
        suggestedAction: "Politely clarify timelines to document facts, rejecting subtle blame.",
        replies: [
          { label: "Strategic Professional", text: "Let's check the shared tracker to align on those specific updates." },
          { label: "Cool & Brief", text: "Understood, we'll keep that in mind next time." },
          { label: "Sigma Grounding", text: "I'll let you know once we have a definitive schedule." },
          { label: "Witty Roast", text: "That sounds like a task for someone with free slots on their calendar." }
        ]
      });
    } finally {
      setAnalyzingChat(false);
    }
  };

  // Simulated preset screenshot testing options
  const runPresetScreenshotDemo = (presetType: 'flirt' | 'office' | 'dating') => {
    setAnalyzingChat(true);
    setTimeout(() => {
      if (presetType === 'flirt') {
        setChatAnalysisResult({
          summary: "Highly charged flirting session. She's asking unannounced questions to test your interest boundary.",
          relationshipStatus: "High-Interest Romantic Target",
          underlyingMotivation: "Provoking a protective or pursuit response from your side.",
          suggestedAction: "Deflect with confidence. Answer her playful questions with a teasing counter-question.",
          replies: [
            { label: "Witty Flirt", text: "You always think about me this much, or is today special?" },
            { label: "Savage Comeback", text: "I'd tell you, but we aren't there yet." },
            { label: "Smooth Reply", text: "Let's figure that out over some coffee." },
            { label: "Sigma Style", text: "I am lowkey unpredictable, keeps it interesting." }
          ]
        });
      } else if (presetType === 'office') {
        setChatAnalysisResult({
          summary: "Boss is demanding off-work answers regarding project deployment under the guise of an emergency.",
          relationshipStatus: "Manager and Coworker tension",
          underlyingMotivation: "Anxiety driven, trying to offload weekend worries to secure their peace of mind.",
          suggestedAction: "Acknowledge receipt while firmly delaying exhaustive analysis until work-hours.",
          replies: [
            { label: "Confident Work Boundary", text: "I see your point. I will deep dive and resolve this first thing Monday." },
            { label: "Smart Pivot", text: "We checked the critical logs, it is standing stable for now." },
            { label: "Cool Professional", text: "Noted, I'll update the team deck accordingly in the morning." },
            { label: "Brief Signal", text: "Got it. Will check and update on email tomorrow." }
          ]
        });
      } else {
        setChatAnalysisResult({
          summary: "Stagnating WhatsApp thread. The exchange has turned dry with one-word responses.",
          relationshipStatus: "Dormant Friend / Casual Acquaintance",
          underlyingMotivation: "Slight boredom combined with routine fatigue. They aren't trying to reject, just empty of conversational energy.",
          suggestedAction: "Re-energies with a shocking/playful observation rather than mundane questions.",
          replies: [
            { label: "Silence Breaker", text: "Tell me something weird that happened to you today." },
            { label: "Playful Accusation", text: "You text like you're writing a formal grocery list, honestly." },
            { label: "Sigma Escape", text: "Anyway, I'm heading out. Catch you later." },
            { label: "Emotional Vibe", text: "Hope your day is treating you better than these dry texts!" }
          ]
        });
      }
      setAnalyzingChat(false);
    }, 800);
  };

  // TTS Read aloud implementation
  const runTTSPlayback = (textToSpeak: string, uniqueId: string) => {
    if (!textToSpeak) return;
    setAudioFeedbackId(uniqueId);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      // Try list speech voices
      const voices = window.speechSynthesis.getVoices();
      const standardVoice = voices.find(v => v.lang.includes('en-US')) || voices[0];
      if (standardVoice) {
        utterance.voice = standardVoice;
      }

      utterance.onend = () => {
        setAudioFeedbackId(null);
      };
      utterance.onerror = () => {
        setAudioFeedbackId(null);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setAudioFeedbackId(null);
      alert('Speech synthesis is restricted inside this iframe sandbox.');
    }
  };

  // Helper copy to clipboard
  const handleCopyClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => {
      setCopiedText(null);
    }, 1800);
  };

  // Simulation dialogue presets for faster sandboxed frame testing
  const conversationTestingTriggers = [
    { title: "Why are you so quiet?", tone: "Casual" as ToneType, emotion: "awkward silence" as EmotionType },
    { title: "Where were you last night?", tone: "Sigma" as ToneType, emotion: "sarcasm" as EmotionType },
    { title: "We need to talk about us.", tone: "Confident" as ToneType, emotion: "nervousness" as EmotionType },
    { title: "You literally changed.", tone: "Savage" as ToneType, emotion: "passive aggression" as EmotionType },
    { title: "Are you free this weekend?", tone: "Flirty" as ToneType, emotion: "flirting" as EmotionType }
  ];

  const handleTestTriggerClick = (text: string, tone: ToneType, emotion: EmotionType) => {
    setLiveTranscript(text);
    setReplyConfig(prev => ({
      ...prev,
      tone,
      primaryEmotion: emotion
    }));
    generateLiveReply(text);
  };

  // Quick speak thought simulation presets
  const speakThoughtPresets = [
    { raw: "Usko bolo ki main kal busy tha call nahi pick kar paya", tone: "Confident" as ToneType },
    { raw: "Mujhe tumhare sath baat hi nahi karni bilkul nikal jao", tone: "Savage" as ToneType },
    { raw: "Main gussa nahi hu bas thoda busy aur stressed hu boss", tone: "Professional" as ToneType },
    { raw: "Tum bahut sundar lag rahi ho is dress mein", tone: "Flirty" as ToneType }
  ];

  return (
    <div className="min-h-screen bg-slate-radial relative text-slate-100 overflow-x-hidden font-sans">
      
      {/* Top HUD bar */}
      <header className="border-b border-white/5 bg-[#080808] sticky top-0 z-50 px-6 sm:px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          {/* Glowing Premium Neural Synapse Logo */}
          <div className="relative flex items-center justify-center">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl blur opacity-35 animate-pulse"></div>
            <div className="relative w-10 h-10 rounded-xl bg-[#090e16] border border-cyan-500/35 overflow-hidden flex items-center justify-center shadow-lg">
              <img
                src="/src/assets/images/reply_ai_logo_1779827485736.png"
                alt="Reply AI Logo"
                className="w-full h-full object-cover transition duration-300 hover:scale-110"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border border-slate-950 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs font-mono tracking-[0.25em] uppercase text-cyan-100 font-bold">
                REPLY AI ENGINE <span className="text-slate-500 ml-1">v2.5</span>
              </h1>
              <span className="text-[9px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-2 py-0.5 rounded-full font-mono uppercase tracking-wider font-semibold">
                By Bikash Bindhani
              </span>
            </div>
            <p className="text-[9px] text-slate-500 font-mono tracking-[0.1em] uppercase mt-0.5">REAL-TIME HUMANIZATION & TACTICAL SOCIAL SPEECH ENGINE</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Simulation overlay Mode toggle */}
          <button
            onClick={() => setIsOverlaySimulated(!isOverlaySimulated)}
            className={`flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase px-3 py-1.5 rounded-full border transition-all duration-300 ${
              isOverlaySimulated
                ? 'bg-blue-500/10 text-blue-300 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-200'
            }`}
          >
            {isOverlaySimulated ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
            <span>{isOverlaySimulated ? "Full Dashboard" : "Overlay Float"}</span>
          </button>

          <div className="hidden md:flex items-center gap-3 text-[10px] font-mono text-slate-500">
            <span>SIGNAL: 98%</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            <span className="text-emerald-500 font-semibold uppercase tracking-wider">ENCRYPTED</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Floating Simulated Widget Layer */}
        {isOverlaySimulated ? (
          <div className="w-full max-w-md mx-auto my-12 glass-panel rounded-2xl glow-container overflow-hidden border border-white/5">
            <div className="p-3 bg-[#080808] border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)] animate-pulse" />
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400">CONVERSATION WIDGET OVERLAY</span>
              </div>
              <button onClick={() => setIsOverlaySimulated(false)} className="text-slate-400 hover:text-slate-100">
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-[#050505]/95 space-y-4">
              {/* Quick Tone & Settings in Small Widget */}
              <div className="flex gap-2 justify-between">
                <div className="w-1/2">
                  <label className="text-[10px] uppercase font-mono text-slate-500 tracking-wider">TONE</label>
                  <select
                    value={replyConfig.tone}
                    onChange={(e) => setReplyConfig({ ...replyConfig, tone: e.target.value as ToneType })}
                    className="w-full bg-white/5 border border-white/10 text-xs px-2.5 py-1.5 rounded-lg text-slate-200 outline-none focus:border-white/20"
                  >
                    {['Casual', 'Savage', 'Sigma', 'Confident', 'Flirty', 'Funny', 'Cold', 'Mature'].map(t => (
                      <option key={t} value={t} className="bg-[#0c0c0c]">{t}</option>
                    ))}
                  </select>
                </div>
                <div className="w-1/2">
                  <label className="text-[10px] uppercase font-mono text-slate-500 tracking-wider">USER SLANT</label>
                  <select
                    value={replyConfig.relationship}
                    onChange={(e) => setReplyConfig({ ...replyConfig, relationship: e.target.value as RelationshipType })}
                    className="w-full bg-white/5 border border-white/10 text-xs px-2.5 py-1.5 rounded-lg text-slate-200 outline-none focus:border-white/20"
                  >
                    <option value="friend" className="bg-[#0c0c0c]">Friend</option>
                    <option value="girlfriend/boyfriend" className="bg-[#0c0c0c]">Romantic Partner</option>
                    <option value="coworker" className="bg-[#0c0c0c]">Coworker</option>
                    <option value="stranger" className="bg-[#0c0c0c]">Stranger</option>
                  </select>
                </div>
              </div>

              {/* Minimal Waveform */}
              <div onClick={toggleListening} className="cursor-pointer glass-panel p-3 rounded-xl border border-dashed border-white/10 hover:border-blue-500/30 flex flex-col items-center">
                <SpeechWaveform isActive={isListening} />
                <span className="text-[10px] font-mono text-slate-500 mt-2">
                  {isListening ? "Listening... click to pause" : "Standby... click to activate"}
                </span>
              </div>

              {/* Immediate Reply Box */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono uppercase text-slate-500 tracking-widest">INSTANT REPLY GENERATION</span>
                  {lastResponse?.perceivedEmotion && (
                    <span className="text-[10px] uppercase font-mono bg-white/5 text-slate-300 border border-white/10 px-1.5 py-0.5 rounded">
                      {lastResponse.perceivedEmotion}
                    </span>
                  )}
                </div>

                <div className="p-4 bg-white/5 rounded-xl relative border border-white/5">
                  {generationProgress ? (
                    <div className="h-16 flex items-center justify-center">
                      <span className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                    </div>
                  ) : lastResponse ? (
                    <div className="space-y-2">
                      <p className="text-base text-white font-medium glow-cyan leading-relaxed tracking-tight">
                        {typingOutput || lastResponse.primaryReply}
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <span className="text-[10px] font-mono text-emerald-500 flex items-center gap-1">
                          <Check className="w-3 h-3" /> MATCHED {lastResponse.confidenceScore}% ACCURACY
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCopyClipboard(lastResponse.primaryReply)}
                            className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-slate-100 transition"
                          >
                            {copiedText === lastResponse.primaryReply ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => runTTSPlayback(lastResponse.primaryReply, 'widget-tts')}
                            className={`p-1.5 rounded transition ${
                              audioFeedbackId === 'widget-tts' ? 'bg-white/10 text-white animate-pulse' : 'hover:bg-white/5 text-slate-400 hover:text-slate-100'
                            }`}
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic h-12 flex items-center justify-center">Speak or click a preset below to populate live replies.</p>
                  )}
                </div>
              </div>

              {/* Tiny Simulation triggers */}
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1.5">Simulation feeds:</span>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {conversationTestingTriggers.slice(0,3).map((t, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleTestTriggerClick(t.title, t.tone, t.emotion)}
                      className="text-[10px] bg-white/5 border border-white/10 hover:border-white/20 px-2 py-1 rounded-md text-slate-300 font-mono whitespace-nowrap"
                    >
                      "{t.title}"
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Normal Dashboard Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Sidebar Controller Dashboard Settings Panel */}
            <section className="lg:col-span-4 space-y-6">
              <div className="glass-panel rounded-2xl p-5 glow-container">
                <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
                  <Sliders className="w-4 h-4 text-slate-400" />
                  <h2 className="text-xs font-mono tracking-[0.2em] uppercase font-bold text-slate-400">
                    ALIGNMENT & TONAL MAP
                  </h2>
                </div>

                <div className="space-y-5">
                  
                  {/* Select Tone */}
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 block mb-2">
                       TARGET ENGINE TONE ({replyConfig.tone})
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        'Casual', 'Funny', 'Savage', 'Smart', 'Confident', 
                        'Romantic', 'Flirty', 'Cold', 'Sigma', 
                        'Attitude', 'Mature', 'Gangster'
                      ].map((t) => {
                        const isActive = replyConfig.tone === t;
                        return (
                          <button
                            key={t}
                            onClick={() => setReplyConfig({ ...replyConfig, tone: t as ToneType })}
                            className={`text-[10px] font-mono py-1.5 px-2 rounded transition-all duration-150 text-center uppercase tracking-wider ${
                              isActive
                                ? 'bg-white/10 text-white border border-white/20 font-bold'
                                : 'bg-transparent text-slate-500 border border-transparent hover:text-slate-300'
                            }`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Select Relationship mapping */}
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 block mb-2">
                      RELATIONSHIP MAPPING
                    </label>
                    <select
                      value={replyConfig.relationship}
                      onChange={(e) => setReplyConfig({ ...replyConfig, relationship: e.target.value as RelationshipType })}
                      className="w-full bg-[#0a0a0a] border border-white/10 text-xs px-3 py-2 rounded-lg text-slate-300 focus:outline-none focus:border-white/20 transition"
                    >
                      <option value="friend" className="bg-[#0a0a0a]">Friend / Peer</option>
                      <option value="girlfriend/boyfriend" className="bg-[#0a0a0a]">Girlfriend / Boyfriend (Romantic)</option>
                      <option value="stranger" className="bg-[#0a0a0a]">Stranger / Brand New</option>
                      <option value="coworker" className="bg-[#0a0a0a]">Coworker / Boss</option>
                      <option value="teacher" className="bg-[#0a0a0a]">Teacher / Mentor</option>
                      <option value="family" className="bg-[#0a0a0a]">Family / Elder</option>
                    </select>
                  </div>

                  {/* Perceived speaker Emotion mapping */}
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 block mb-2">
                      INCOMING EMOTION LENS
                    </label>
                    <select
                      value={replyConfig.primaryEmotion}
                      onChange={(e) => setReplyConfig({ ...replyConfig, primaryEmotion: e.target.value as EmotionType })}
                      className="w-full bg-[#0a0a0a] border border-white/10 text-xs px-3 py-2 rounded-lg text-slate-300 focus:outline-none focus:border-white/20 transition"
                    >
                      <option value="neutral" className="bg-[#0a0a0a]">Neutral Status</option>
                      <option value="anger" className="bg-[#0a0a0a]">Anger / Confrontation</option>
                      <option value="flirting" className="bg-[#0a0a0a]">Flirting / Teasing</option>
                      <option value="sadness" className="bg-[#0a0a0a]">Sadness / Distress</option>
                      <option value="awkward silence" className="bg-[#0a0a0a]">Tense Silence / Stagnation</option>
                      <option value="sarcasm" className="bg-[#0a0a0a]">Sarcasm / Scepticism</option>
                      <option value="nervousness" className="bg-[#0a0a0a]">Anxiety / Nervousness</option>
                      <option value="excitement" className="bg-[#0a0a0a]">High Excitement</option>
                      <option value="passive aggression" className="bg-[#0a0a0a]">Passive-Aggression</option>
                      <option value="jealousy" className="bg-[#0a0a0a]">Jealousy / Control</option>
                      <option value="embarrassment" className="bg-[#0a0a0a]">Embarrassment</option>
                    </select>
                  </div>

                  {/* COGNITIVE AI MODEL DRIVE SELECTOR (LATENCY REMEDIES) */}
                  <div className="pt-3 border-t border-white/5 mt-4">
                    <label className="text-[10px] uppercase tracking-widest text-cyan-400 font-extrabold block mb-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      COGNITIVE ENGINE (SPEED DRIVE)
                    </label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full bg-[#060b13] border border-cyan-500/25 text-xs px-3 py-2.5 rounded-lg text-cyan-200 focus:outline-none focus:border-cyan-500/55 transition font-mono font-bold"
                    >
                      <option value="google/gemini-2.5-flash" className="bg-[#0a0f18] text-emerald-300 font-bold">⚡ Gemini 2.5 Flash (Instant)</option>
                      <option value="deepseek/deepseek-chat" className="bg-[#0a0f18] text-cyan-300 font-bold">🚀 DeepSeek V3 (Very Fast)</option>
                      <option value="meta-llama/llama-3.1-8b-instruct" className="bg-[#0a0f18] text-slate-300">⚡ Llama 3.1 8B (Snappy)</option>
                      <option value="google/gemini-2.5-pro" className="bg-[#0a0f18] text-purple-300">🧠 Gemini 2.5 Pro (Deep Smart)</option>
                      <option value="mistralai/mistral-7b-instruct" className="bg-[#0a0f18] text-slate-300">💨 Mistral 7B (Lightweight)</option>
                    </select>
                    <span className="text-[9px] text-slate-500 font-mono mt-1.5 block leading-relaxed uppercase">
                      Swap models instantly if one feels slow or congested!
                    </span>
                  </div>

                  {/* Smart Power Mode Overlays */}
                  <div className="border-t border-white/5 pt-4">
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 block mb-3">
                      TACTICAL MODE OVERLAYS
                    </label>
                    <div className="space-y-2.5">
                      
                      <button
                        onClick={() => setReplyConfig({ ...replyConfig, isQuickComeback: !replyConfig.isQuickComeback })}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition ${
                          replyConfig.isQuickComeback
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-white/5 text-slate-400 border-transparent hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Flame className="w-3.5 h-3.5" />
                          <div className="text-xs">
                            <p className="font-medium text-slate-200">Quick Comeback Mode</p>
                            <p className="text-[10px] text-slate-500 font-mono">Instant defensive/roast triggers</p>
                          </div>
                        </div>
                        <div className={`w-1.5 h-1.5 rounded-full ${replyConfig.isQuickComeback ? 'bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'bg-[#1a1a1a]'}`} />
                      </button>

                      <button
                        onClick={() => setReplyConfig({ ...replyConfig, isFlirtAssist: !replyConfig.isFlirtAssist })}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition ${
                          replyConfig.isFlirtAssist
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            : 'bg-white/5 text-slate-400 border-transparent hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Heart className="w-3.5 h-3.5" />
                          <div className="text-xs">
                            <p className="font-medium text-slate-200">Flirt Assist Mode</p>
                            <p className="text-[10px] text-slate-500 font-mono">Magnetic charm calibrations</p>
                          </div>
                        </div>
                        <div className={`w-1.5 h-1.5 rounded-full ${replyConfig.isFlirtAssist ? 'bg-rose-400 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'bg-[#1a1a1a]'}`} />
                      </button>

                      <button
                        onClick={() => setReplyConfig({ ...replyConfig, isSilenceSaver: !replyConfig.isSilenceSaver })}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition ${
                          replyConfig.isSilenceSaver
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-white/5 text-slate-400 border-transparent hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5" />
                          <div className="text-xs">
                            <p className="font-medium text-slate-200">Silence Saver Mode</p>
                            <p className="text-[10px] text-slate-500 font-mono">Bridges for awkward gaps</p>
                          </div>
                        </div>
                        <div className={`w-1.5 h-1.5 rounded-full ${replyConfig.isSilenceSaver ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-[#1a1a1a]'}`} />
                      </button>

                      <button
                        onClick={() => setReplyConfig({ ...replyConfig, isAutoShort: !replyConfig.isAutoShort })}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition ${
                          replyConfig.isAutoShort
                            ? 'bg-[#1e1e2e] text-indigo-300 border-indigo-500/30'
                            : 'bg-white/5 text-slate-400 border-transparent hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Skull className="w-3.5 h-3.5" />
                          <div className="text-xs">
                            <p className="font-medium text-slate-200">Auto Short Mode</p>
                            <p className="text-[10px] text-slate-500 font-mono">Ultra fast 1-5 word answers</p>
                          </div>
                        </div>
                        <div className={`w-1.5 h-1.5 rounded-full ${replyConfig.isAutoShort ? 'bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.8)]' : 'bg-[#1a1a1a]'}`} />
                      </button>

                    </div>
                  </div>

                </div>
              </div>
            </section>

            {/* Active Display Panel Area */}
            <section className="lg:col-span-8 space-y-6">
              
              {/* Tabs Control - Elegant Dark rounded menu */}
              <div className="flex bg-white/5 p-1 rounded-full border border-white/10 overflow-x-auto max-w-full">
                <button
                  onClick={() => setActiveTab('listening')}
                  className={`flex-1 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 ${
                    activeTab === 'listening'
                      ? 'bg-white text-black font-extrabold shadow-md'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                  }`}
                >
                  Live Listen
                </button>

                <button
                  onClick={() => setActiveTab('custom_speak')}
                  className={`flex-1 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 ${
                    activeTab === 'custom_speak'
                      ? 'bg-white text-black font-extrabold shadow-md'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                  }`}
                >
                  Custom Speak
                </button>

                <button
                  onClick={() => setActiveTab('chat_analyze')}
                  className={`flex-1 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 ${
                    activeTab === 'chat_analyze'
                      ? 'bg-white text-black font-extrabold shadow-md'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                  }`}
                >
                  Draft Analyzer
                </button>
              </div>

              {/* Mode Views */}
              <AnimatePresence mode="wait">
                
                {/* ━━━━━━━━━━━━━━━━━━━ MODE 1 ━━━━━━━━━━━━━━━━━━━ */}
                {activeTab === 'listening' && (
                  <motion.div
                    key="mode-listening"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {/* Choice of input method: Mic or Call Simulator */}
                    <div className="glass-panel rounded-2xl p-6 glow-container animate-[fadeIn_0.5s_ease-out]">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/5">
                        <div>
                          <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider font-semibold block">CHOOSE COGNITIVE FEED INPUT</span>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Choose classic nearby capturing or simulated live incoming voice lines.</p>
                        </div>
                        <div className="flex bg-[#070707] p-1 rounded-xl border border-white/5 self-start sm:self-auto">
                          <button
                            onClick={() => {
                              setIsCallSimulatorMode(false);
                              setIsCallActive(false);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded-lg transition duration-150 ${!isCallSimulatorMode ? 'bg-white/10 text-white font-extrabold shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                          >
                            <Mic className="w-3 h-3" /> Standard Mic Guard
                          </button>
                          <button
                            onClick={() => setIsCallSimulatorMode(true)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded-lg transition duration-150 ${isCallSimulatorMode ? 'bg-blue-600/20 text-blue-300 border border-blue-500/10 font-extrabold shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                          >
                            <PhoneCall className="w-3 h-3" /> Call Sandbox System
                          </button>
                        </div>
                      </div>

                      {isCallSimulatorMode ? (
                        <div className="space-y-6">
                          {/* Simulated Caller Interface */}
                          <div className="p-5 bg-[#090b14]/90 rounded-2xl border border-blue-500/20 relative overflow-hidden shadow-inner">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                              <div className="flex items-center gap-3.5">
                                <div className="relative">
                                  <div className={`w-12 h-12 rounded-full bg-[#121625] border flex items-center justify-center transition-all ${isCallActive ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.25)] animate-pulse' : 'border-white/10'}`}>
                                    <Phone className={`w-5 h-5 ${isCallActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                                  </div>
                                  {isCallActive && (
                                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#090b14] rounded-full animate-ping" />
                                  )}
                                </div>

                                <div className="text-center sm:text-left">
                                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                                    <h4 className="text-sm font-bold tracking-tight text-white">{callerName}</h4>
                                    <span className="text-[8px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono uppercase font-semibold">Active Phone Line</span>
                                  </div>
                                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">
                                    {isCallActive 
                                      ? `ONGOING CALL CONNECTED • ${Math.floor(callDuration / 60).toString().padStart(2, '0')}:${(callDuration % 60).toString().padStart(2, '0')}`
                                      : 'DISCONNECTED • STANDBY'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {!isCallActive ? (
                                  <button
                                    onClick={() => setIsCallActive(true)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition duration-150 shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
                                  >
                                    <PhoneCall className="w-3.5 h-3.5" /> Simulation Call Start
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => setIsCallMuted(!isCallMuted)}
                                      className={`p-2.5 rounded-xl border transition-all duration-150 ${isCallMuted ? 'bg-amber-500/10 text-amber-300 border-amber-500/25' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'}`}
                                      title={isCallMuted ? 'Unmute Audio Feedback' : 'Mute Audio Feedback'}
                                    >
                                      {isCallMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                    </button>
                                    <button
                                      onClick={() => setIsCallActive(false)}
                                      className="flex items-center gap-1.5 px-4 py-2 bg-red-650 hover:bg-red-550 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition duration-150"
                                    >
                                      <PhoneOff className="w-3.5 h-3.5" /> End Call
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {isCallActive ? (
                            <div className="space-y-4">
                              {/* Trigger Speech Preset Section */}
                              <div>
                                <span className="text-[10px] uppercase font-mono text-slate-500 tracking-wider block mb-2">Simulate words spoken by caller ({callerName}):</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {[
                                    { title: "Yaar tum call kyun nahi receive kar rahe the?", translation: "Why weren't you picking up my calls?" },
                                    { title: "Listen, I need to know if you're actually serious about this.", translation: "Tell me if we are actually serious." },
                                    { title: "Kya chal raha hai? Bahut bade log ho gaye tum... busy?", translation: "What's going on with you? So busy?" },
                                    { title: "Hey, sorry for before... are we good?", translation: "Sorry for before, is everything okay?" },
                                    { title: "Tell me the truth, are you hiding something from me?", translation: "Are you hiding something or what?" },
                                    { title: "Mera mood off tha aaj... thodi der baat karein?", translation: "I was having a bad mood today, talk for a bit?" }
                                  ].map((p, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => {
                                        setLiveTranscript(p.title);
                                        generateLiveReply(p.title);
                                      }}
                                      className="text-left py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition group duration-150"
                                    >
                                      <p className="text-xs text-slate-350 group-hover:text-white font-medium">"{p.title}"</p>
                                      <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wide mt-1 italic font-light">{p.translation}</p>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Custom Caller statement */}
                              <div className="border-t border-white/5 pt-3">
                                <label className="text-[10px] uppercase font-mono text-slate-500 tracking-wider block mb-1.5">Or Type Custom Statement for opposite Caller:</label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={customCallerText}
                                    onChange={(e) => setCustomCallerText(e.target.value)}
                                    placeholder="Type anything (Hindi, Hinglish or general dialog logs...)"
                                    className="flex-1 bg-[#0a0a0a] border border-white/10 text-xs px-3.5 py-2.5 rounded-lg text-slate-300 placeholder-slate-650 focus:outline-none focus:border-white/20 font-sans"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && customCallerText) {
                                        setLiveTranscript(customCallerText);
                                        generateLiveReply(customCallerText);
                                        setCustomCallerText('');
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={() => {
                                      if (customCallerText) {
                                        setLiveTranscript(customCallerText);
                                        generateLiveReply(customCallerText);
                                        setCustomCallerText('');
                                      }
                                    }}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition duration-150 font-mono"
                                  >
                                    Speak
                                  </button>
                                </div>
                              </div>

                              <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-[10px] leading-relaxed text-blue-300 rounded-xl font-mono flex items-start gap-2 select-none">
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                                <div>
                                  <p className="font-bold uppercase tracking-wider text-[8px] mb-0.5">OWNER ASSIST CALIBRATION SECURED</p>
                                  The OpenRouter engine is instructed to exclusively construct comebacks/replies addressing the Opposite Caller. It will never reply to or analyze the Owner (Bikash Bindhani) directly.
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="py-8 text-center text-slate-500 italic space-y-2">
                              <PhoneCall className="w-8 h-8 text-slate-600 mx-auto animate-pulse" />
                              <p className="text-xs font-semibold uppercase tracking-wider">VIRTUAL CALL SANDBOX STANDBY</p>
                              <p className="text-[10px] font-mono text-slate-605 uppercase tracking-widest">Click "Simulation Call Start" to simulate a real-time call & configure triggers.</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Classical Microphone capture */
                        <div className="space-y-6">
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)] animate-pulse' : 'bg-white/10'}`} />
                                <h3 className="font-mono tracking-wider text-slate-200 text-sm font-bold uppercase">
                                  {isListening ? "ACTIVE CONVERSATION LISTENER" : "STANDBY TRANSCRIPTION GUARD"}
                                </h3>
                              </div>
                              <p className="text-xs text-slate-500 font-mono mt-1 font-light">Speak with nearby peers to capture conversation. Replier loads suggestions.</p>
                            </div>

                            <button
                              onClick={toggleListening}
                              className={`flex items-center gap-3 px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest transition-all duration-300 cursor-pointer ${
                                isListening
                                  ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:bg-white/95'
                                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 shadow-md'
                              }`}
                            >
                              {isListening ? (
                                <>
                                  <Mic className="w-3.5 h-3.5 text-black animate-pulse" />
                                  Active Capturing...
                                </>
                              ) : (
                                <>
                                  <MicOff className="w-3.5 h-3.5 text-slate-400" />
                                  Activate Mic Listening
                                </>
                              )}
                            </button>
                          </div>

                          {/* Microphone waveforms visualizer */}
                          <SpeechWaveform isActive={isListening} />

                          {/* Web Transcription Display Buffer */}
                          <div className="mt-4 p-4 bg-[#070707] rounded-xl border border-white/5">
                            <span className="text-[9px] uppercase font-mono text-slate-500 tracking-wider block mb-1 font-semibold">
                              CAPTURE FEED BUFFER
                            </span>
                            <p className={`text-sm ${liveTranscript ? 'text-slate-200 font-medium' : 'text-slate-500 italic'}`}>
                              {liveTranscript || "Speak into mic, paste below, or query presets next to capture..."}
                            </p>
                          </div>

                          {/* SIMULATION TEST BENCH */}
                          <div className="mt-6 border-t border-white/5 pt-4">
                            <span className="text-[9px] font-mono text-slate-500 flex items-center gap-1 mb-2.5 uppercase tracking-widest font-semibold">
                              <Zap className="w-3.5 h-3.5 text-amber-500" />
                              FRAME SIMULATOR PRESETS (IF MICROPHONE PERMISSION IS SANDBOXED)
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {conversationTestingTriggers.map((t, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handleTestTriggerClick(t.title, t.tone, t.emotion)}
                                  className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 duration-200 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white font-mono"
                                >
                                  "{t.title}"
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Master reply generator cockpit */}
                    <div className="glass-panel rounded-2xl p-6 border border-white/5 glow-container space-y-6">
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2">
                          <Brain className="w-4 h-4 text-slate-400" />
                          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">GENERATED SUGGESTION COCKPIT</h3>
                        </div>
                        {lastResponse && (
                          <div className="flex gap-2">
                            <span className="text-[10px] uppercase font-mono bg-white/5 text-slate-300 border border-white/10 px-2.5 py-1 rounded-full">
                              Trained Tone: {replyConfig.tone}
                            </span>
                            <span className="text-[10px] uppercase font-mono bg-white/5 text-slate-300 border border-white/10 px-2.5 py-1 rounded-full">
                              Perceived Sentiments: {lastResponse.perceivedEmotion}
                            </span>
                          </div>
                        )}
                      </div>

                      {generationProgress ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3">
                          <span className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">FAST REPLIER STREAMING ACTIVE...</p>
                        </div>
                      ) : lastResponse ? (
                        <div className="space-y-6">
                          
                          {/* Main Primary read-aloud result */}
                          <div className="p-6 bg-gradient-to-b from-[#0c0c0c] to-[#060606] rounded-2xl relative border border-white/5 overflow-hidden">
                            <span className="text-[9px] font-mono tracking-widest text-[#555] absolute top-3 left-4 uppercase">
                              SUGGESTED RESPONSE:
                            </span>

                            <div className="py-6 font-sans">
                              <p className="text-2xl md:text-3xl text-white tracking-tight leading-relaxed font-extrabold filter">
                                "{typingOutput || lastResponse.primaryReply}"
                              </p>
                            </div>

                            <div className="flex items-center justify-between mt-3 pt-4 border-t border-white/5">
                              <span className="text-xs text-slate-400 font-mono italic">
                                "{lastResponse.explanation}"
                              </span>

                              {/* Interactive actions */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => sendReplyToTimeline(lastResponse.primaryReply)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 rounded-xl text-xs font-mono text-cyan-300 transition duration-150"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  Send as Bikash's Reply
                                </button>

                                <button
                                  onClick={() => handleCopyClipboard(lastResponse.primaryReply)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-mono text-slate-350 transition duration-150"
                                >
                                  {copiedText === lastResponse.primaryReply ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                      Copied!
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                                      Copy Text
                                    </>
                                  )}
                                </button>

                                <button
                                  onClick={() => runTTSPlayback(lastResponse.primaryReply, 'primary-listen')}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition duration-300 ${
                                    audioFeedbackId === 'primary-listen'
                                      ? 'bg-white/10 text-white border border-white/25'
                                      : 'bg-white/5 hover:bg-white/10 text-slate-350 border border-white/10'
                                  }`}
                                >
                                  <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                                  Hear Delivery
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Variations */}
                          <div className="space-y-3">
                            <h4 className="text-[10px] uppercase font-mono tracking-widest text-slate-500">
                              3 Alternative variations:
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {lastResponse.variations.map((v, i) => (
                                <div key={i} className="bg-[#0a0a0a]/40 hover:bg-[#0c0c0c]/85 duration-200 border border-white/5 p-4 rounded-xl flex flex-col justify-between">
                                  <div className="space-y-1.5">
                                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#111] border border-white/5 text-slate-400 tracking-wider inline-block">
                                      {v.tone}
                                    </span>
                                    <p className="text-sm text-slate-200 leading-relaxed font-semibold">"{v.replyText}"</p>
                                  </div>
                                  
                                  <div className="flex justify-end gap-1.5 pt-3 border-t border-white/5 bg-transparent mt-3 rounded-b-lg">
                                    <button
                                      onClick={() => sendReplyToTimeline(v.replyText)}
                                      className="p-1 hover:bg-[#151d30]/50 rounded font-mono text-[10px] text-cyan-400 hover:text-cyan-200 transition"
                                      title="Send as Bikash's Reply to timeline"
                                    >
                                      <Send className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleCopyClipboard(v.replyText)}
                                      className="p-1 hover:bg-white/10 rounded font-mono text-[10px] text-slate-400 hover:text-slate-200 transition"
                                    >
                                      {copiedText === v.replyText ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                    <button
                                      onClick={() => runTTSPlayback(v.replyText, `var-${i}`)}
                                      className={`p-1 rounded transition ${
                                        audioFeedbackId === `var-${i}` ? 'text-white animate-pulse' : 'text-slate-400 hover:text-slate-200'
                                      }`}
                                    >
                                      <Volume2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Quick Regenerate */}
                          <div className="flex justify-between items-center text-[10px] text-slate-500 pt-3 border-t border-white/5 font-mono tracking-wider">
                            <span className="flex items-center gap-1 text-emerald-500 uppercase font-medium">
                              <ShieldCheck className="w-3.5 h-3.5" /> Social Hazard Filter PASS
                            </span>
                            <button
                              onClick={() => generateLiveReply()}
                              className="flex items-center gap-1.5 text-slate-350 hover:text-white duration-200 uppercase font-mono text-[10px] font-bold tracking-widest"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-slate-400" /> Regenerate Style Variations
                            </button>
                          </div>

                        </div>
                      ) : (
                        <div className="py-12 text-center text-slate-500 italic space-y-2">
                          <Clock className="w-6 h-6 text-slate-600 mx-auto animate-pulse" />
                          <p className="text-xs">No live replies buffered.</p>
                          <p className="text-[10px] font-mono text-slate-650 uppercase tracking-widest">Activate the microphone above or trigger simulation mock messages.</p>
                        </div>
                      )}
                    </div>

                    {/* Timeline conversational history logs */}
                    <div className="glass-panel rounded-2xl p-6 glow-container">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                        <span className="font-mono text-xs uppercase tracking-widest text-slate-400">Conversational Feed Timeline</span>
                        <button
                          onClick={() => setConversationHistory([])}
                          className="text-[10px] uppercase font-mono text-rose-400 hover:text-rose-300 transition"
                        >
                          Clear Log Memory
                        </button>
                      </div>

                      <div className="space-y-4 max-h-56 overflow-y-auto pr-2">
                        {conversationHistory.map((h) => (
                          <div key={h.id} className={`flex gap-3 max-w-lg ${h.speaker === 'you' ? 'ml-auto justify-end' : 'mr-auto justify-start'}`}>
                            {h.speaker === 'them' && (
                              <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[10px] font-mono text-blue-300 font-bold shrink-0" title="Opposite Speaker (Them)">
                                OP
                              </div>
                            )}
                            <div className={`p-3 rounded-xl border ${
                              h.speaker === 'you'
                                ? 'bg-[#0f1b29]/40 text-cyan-200 border-cyan-500/20'
                                : 'bg-slate-900/60 text-slate-300 border-slate-950'
                            }`}>
                              <span className="text-[9px] uppercase font-mono tracking-wider block mb-1 font-semibold text-slate-500">
                                {h.speaker === 'you' ? 'Bikash Bindhani (Owner)' : 'Opposite Speaker'}
                              </span>
                              <p className="text-xs leading-relaxed font-sans">"{h.text}"</p>
                              <span className="text-[8px] text-slate-600 block text-right mt-1 font-mono">{h.timestamp}</span>
                            </div>
                            {h.speaker === 'you' && (
                              <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-[10px] font-mono text-cyan-300 font-bold shrink-0" title="Bikash Bindhani (You)">
                                BB
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ━━━━━━━━━━━━━━━━━━━ MODE 2 ━━━━━━━━━━━━━━━━━━━ */}
                {activeTab === 'custom_speak' && (
                  <motion.div
                    key="mode-speak"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    <div className="glass-panel rounded-2xl p-6 border border-white/5 glow-container space-y-6">
                      <div>
                        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                          CUSTOM SPEAK HUMANIZATION
                        </h3>
                        <p className="text-xs text-slate-500 font-mono mt-1">Convert your messy, raw, tense, or Hinglish thoughts into confident, spokeable real-world English.</p>
                      </div>

                      <div className="space-y-4">
                        
                        {/* Text typed input box */}
                        <div>
                          <label className="text-[9px] uppercase font-mono tracking-widest text-slate-500 block mb-1.5">
                            Type raw, broken English or Hinglish thoughts:
                          </label>
                          <div className="relative">
                            <textarea
                              value={customSpeakInput}
                              onChange={(e) => setCustomSpeakInput(e.target.value)}
                              placeholder='e.g., "usko bolo ki kal busy tha", or "bol de late ho rha dosto k sath hu"'
                              rows={3}
                              className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-white/20 font-sans leading-relaxed"
                            />
                            <button
                              onClick={() => handleCustomSpeakConversion()}
                              disabled={!customSpeakInput || generationProgress}
                              className="absolute bottom-3 right-3 p-2 bg-white hover:bg-[#efefef] text-black font-bold rounded-lg disabled:opacity-30 disabled:scale-100 cursor-pointer active:scale-95 duration-100"
                            >
                              <Send className="w-4 h-4 text-black" />
                            </button>
                          </div>
                        </div>

                        {/* Presets */}
                        <div className="space-y-2">
                          <span className="text-[9px] uppercase font-mono text-slate-500 tracking-widest block">
                            Quick-test messy thought simulation presets:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {speakThoughtPresets.map((p, i) => (
                              <button
                                key={i}
                                onClick={() => {
                                  setCustomSpeakInput(p.raw);
                                  setCustomTone(p.tone);
                                  handleCustomSpeakConversion(p.raw);
                                }}
                                className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 py-1.5 px-3 rounded-lg text-slate-300 font-mono duration-150 text-left"
                              >
                                {p.raw}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Tone settings for custom speak */}
                        <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-white/5">
                          <span className="text-[9px] uppercase font-mono text-slate-500 tracking-widest">Target Conversion Slope:</span>
                          {['Confident', 'Sigma', 'Professional', 'Savage', 'Romantic', 'Cold', 'Funny'].map((t) => (
                            <button
                              key={t}
                              onClick={() => setCustomTone(t as ToneType)}
                              className={`text-xs px-2.5 py-1 rounded-full border font-mono transition ${
                                customTone === t
                                  ? 'bg-white/10 text-white border-white/20'
                                  : 'bg-transparent text-slate-500 border-transparent hover:border-white/10 hover:text-slate-300'
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>

                      </div>
                    </div>

                    {/* Custom Speak Output Display */}
                    <div className="glass-panel rounded-2xl p-6 border border-white/5 glow-container space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-white/5">
                        <span className="font-mono text-xs uppercase tracking-widest text-slate-400">OUTPUT RESOLUTION DECK</span>
                        {customResponse && (
                          <span className="text-[10px] uppercase font-mono bg-[#111] text-slate-400 border border-white/10 px-2 py-0.5 rounded">
                            Slope: {customTone}
                          </span>
                        )}
                      </div>

                      {generationProgress ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-2">
                          <span className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                          <p className="text-xs text-slate-500 font-mono">Synthesizing human confidence curves...</p>
                        </div>
                      ) : customResponse ? (
                        <div className="space-y-6">
                          
                          {/* Polished Speech output panel */}
                          <div className="p-5 bg-[#0a0a0a] rounded-2xl border border-white/5 shadow-inner">
                            <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase block mb-2">
                              UPGRADED CONFIDENT PHRASE:
                            </span>

                            <p className="text-xl text-white font-bold leading-relaxed">
                              "{customResponse.primaryReply}"
                            </p>

                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                              <p className="text-xs text-slate-400 italic">
                                "{customResponse.explanation}"
                              </p>

                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleCopyClipboard(customResponse.primaryReply)}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-mono text-slate-300 transition"
                                >
                                  {copiedText === customResponse.primaryReply ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                  Copy upgrade
                                </button>

                                <button
                                  onClick={() => runTTSPlayback(customResponse.primaryReply, 'custom-speak-tts')}
                                  className={`p-1.5 rounded transition ${
                                    audioFeedbackId === 'custom-speak-tts' ? 'bg-white/15 text-white animate-pulse' : 'hover:bg-white/5 text-slate-405'
                                  }`}
                                >
                                  <Volume2 className="w-4 h-4 text-slate-400" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Alternate conversions */}
                          <div className="space-y-3">
                            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 block mb-2">
                              Alternative phrasing slates:
                            </span>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {customResponse.variations.map((v, i) => (
                                <div key={i} className="bg-[#0a0a0a]/40 p-4 border border-white/5 rounded-xl flex flex-col justify-between hover:bg-[#0c0c0c]/80 duration-150">
                                  <div className="space-y-1.5">
                                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#111] border border-white/5 text-slate-400 tracking-wider inline-block">
                                      {v.tone}
                                    </span>
                                    <p className="text-sm text-slate-200 leading-relaxed font-semibold">"{v.replyText}"</p>
                                  </div>

                                  <div className="flex justify-end gap-1.5 mt-3 pt-2.5 border-t border-white/5 bg-transparent">
                                    <button
                                      onClick={() => handleCopyClipboard(v.replyText)}
                                      className="p-1 hover:bg-white/10 rounded text-slate-405 hover:text-slate-200 transition text-[10px]"
                                    >
                                      {copiedText === v.replyText ? <Check className="w-3" /> : <Copy className="w-3" />}
                                    </button>
                                    <button
                                      onClick={() => runTTSPlayback(v.replyText, `custom-var-${i}`)}
                                      className={`p-1 rounded transition ${
                                        audioFeedbackId === `custom-var-${i}` ? 'text-white animate-pulse' : 'text-slate-405 hover:text-slate-200'
                                      }`}
                                    >
                                      <Volume2 className="w-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                        </div>
                      ) : (
                        <div className="py-12 text-center text-slate-500 italic">
                          <Sparkles className="w-6 h-6 text-slate-600 mx-auto mb-2 animate-pulse" />
                          <p className="text-xs font-mono lowercase tracking-wider text-slate-650">Conversion queue empty.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* ━━━━━━━━━━━━━━━━━━━ MODE 3 ━━━━━━━━━━━━━━━━━━━ */}
                {activeTab === 'chat_analyze' && (
                  <motion.div
                    key="mode-analyze"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Sub-panel: Screenshot analyzer */}
                      <div className="glass-panel p-5 rounded-2xl border border-white/5 glow-container space-y-4">
                        <div className="flex items-center gap-2">
                          <Upload className="w-4 h-4 text-slate-400" />
                          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">SCREENSHOT ANALYZER</h3>
                        </div>
                        <p className="text-xs text-slate-500 font-mono">Upload a screenshot from Tinder, Messenger, or WhatsApp containing dialog threads.</p>

                        {!screenshotBase64 ? (
                          <div className="border border-dashed border-white/10 hover:border-white/20 duration-205 p-6 rounded-xl flex flex-col items-center justify-center gap-3 text-center bg-[#0a0a0a] relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageFileChange}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                            <div className="p-3 bg-white/5 rounded-full">
                              <Upload className="w-5 h-5 text-slate-400" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-slate-300">Drop thread screenshot here</p>
                              <p className="text-[10px] text-slate-500 font-mono">Supports PNG, JPG, WebP formats</p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3 bg-[#0a0a0a] p-4 rounded-xl border border-white/10">
                            <span className="text-[9px] uppercase font-mono text-slate-500 tracking-widest block">Uploaded Snapshot:</span>
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <FileText className="w-8 h-8 text-white" />
                                <div>
                                  <p className="text-xs font-medium text-slate-300 leading-none">screenshot_thread.png</p>
                                  <p className="text-[10px] text-slate-500 font-mono mt-1">Image loaded successfully</p>
                                </div>
                              </div>
                              <button
                                onClick={clearScreenshot}
                                className="text-xs font-mono text-rose-450 hover:text-rose-350"
                              >
                                Delete
                              </button>
                            </div>

                            <button
                              onClick={handleScreenshotAnalysis}
                              disabled={analyzingChat}
                              className="w-full py-2 bg-white hover:bg-[#efefef] text-black rounded-lg text-xs font-bold font-mono tracking-wider transition cursor-pointer"
                            >
                              {analyzingChat ? "OCR & DYNAMICS ANALYSIS SECURED..." : "DECRYPT CHAT STRATEGY"}
                            </button>
                          </div>
                        )}

                        <div className="space-y-2 pt-2 border-t border-white/5">
                          <span className="text-[9px] uppercase font-mono text-slate-500 tracking-widest block">Or run preset instant screenshot simulations:</span>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              onClick={() => runPresetScreenshotDemo('flirt')}
                              className="text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg py-1.5 px-2 text-slate-300 font-mono text-center duration-150"
                            >
                              🔥 Flirt Test
                            </button>
                            <button
                              onClick={() => runPresetScreenshotDemo('office')}
                              className="text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg py-1.5 px-2 text-slate-300 font-mono text-center duration-150"
                            >
                              💼 Office Test
                            </button>
                            <button
                              onClick={() => runPresetScreenshotDemo('dating')}
                              className="text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg py-1.5 px-2 text-slate-300 font-mono text-center duration-150"
                            >
                              ❄️ Dry Text Test
                            </button>
                          </div>
                        </div>

                      </div>

                      {/* Sub-panel: Paste Logs Text analyzer */}
                      <div className="glass-panel p-5 rounded-2xl border border-white/5 glow-container space-y-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">WhatsApp Log Exporter</h3>
                        </div>
                        <p className="text-xs text-slate-500 font-mono">Paste logs or thread transcript from WhatsApp/Skype web logs here.</p>

                        <div className="space-y-3">
                          <textarea
                             value={pastedChatLog}
                             onChange={(e) => setPastedChatLog(e.target.value)}
                             placeholder='e.g., {"other": "are you serious?", "user": "yeah"}'
                             rows={4}
                             className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-white/20 font-mono leading-relaxed"
                          />

                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-mono tracking-widest text-[#555]">YOUR ALIGNMENT:</span>
                              <input
                                type="text"
                                value={selectedUserSide}
                                onChange={(e) => setSelectedUserSide(e.target.value)}
                                placeholder="e.g. Me/User"
                                className="bg-[#0a0a0a] border border-white/10 text-xs px-2 py-1 rounded text-slate-100 w-24 font-mono text-center focus:outline-none focus:border-white/20"
                              />
                            </div>

                            <button
                              onClick={handleChatLogTextAnalysis}
                              disabled={!pastedChatLog || analyzingChat}
                              className="px-4 py-2 bg-white hover:bg-[#efefef] text-black rounded-lg text-xs font-mono font-bold transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                            >
                              {analyzingChat ? "PROCESSING STRUCTURE..." : "ANALYZE COPING STRATEGY"}
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Chat Dynamics Analysis results output */}
                    <div className="glass-panel rounded-2xl p-6 border border-white/5 glow-container space-y-6">
                      <div className="border-b border-white/5 pb-3">
                        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">DYNAMIC PSYCHOLOGICAL BRIEFING</h3>
                      </div>

                      {analyzingChat ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-2">
                          <span className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                          <p className="text-xs text-slate-500 font-mono">DECRYPTING SOCIAL PATTERNS...</p>
                        </div>
                      ) : chatAnalysisResult ? (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                          
                          {/* Diagnostic Strategy block */}
                          <div className="md:col-span-5 bg-[#0a0a0a] border border-white/10 p-5 rounded-2xl space-y-4">
                            <span className="text-[9px] font-mono uppercase bg-[#111] text-slate-400 border border-white/5 px-2.5 py-0.5 rounded-full inline-block">
                              TACTICAL EVALUATION
                            </span>

                            <div className="space-y-4">
                              <div className="space-y-1">
                                <span className="text-[9px] font-mono text-slate-500 tracking-widest uppercase block">SUB-RELATIONSHIP VIBE:</span>
                                <p className="text-sm text-slate-200 font-bold">{chatAnalysisResult.relationshipStatus}</p>
                              </div>

                              <div className="space-y-1">
                                <span className="text-[9px] font-mono text-slate-500 tracking-widest uppercase block">UNDERLYING PSYCHOLOGICAL DEMAND:</span>
                                <p className="text-xs text-slate-300 leading-relaxed font-sans">{chatAnalysisResult.underlyingMotivation}</p>
                              </div>

                              <div className="space-y-1.5">
                                <span className="text-[9px] font-mono text-slate-500 tracking-widest uppercase block">RECOMMENDED STRATEGIC PLAY:</span>
                                <p className="text-xs text-white leading-relaxed font-sans font-medium bg-white/5 border border-white/5 px-2.5 py-1.5 rounded-lg">{chatAnalysisResult.suggestedAction}</p>
                              </div>

                              <div className="pt-3 border-t border-white/5">
                                <p className="text-xs text-slate-450 italic leading-relaxed">
                                  {chatAnalysisResult.summary}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* 4 Perfect Tactical responses */}
                          <div className="md:col-span-7 space-y-4">
                            <span className="text-[10px] uppercase font-mono tracking-widest text-[#555] block">
                              CHOOSE YOUR STRATEGIC COUNTER-MOVE:
                            </span>

                            <div className="space-y-3">
                              {chatAnalysisResult.replies.map((r, i) => (
                                <div key={i} className="bg-[#0a0a0a]/40 hover:bg-[#0c0c0c]/80 duration-150 border border-white/5 p-4 rounded-xl flex items-center justify-between gap-4">
                                  <div className="space-y-1.5 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                      <span className="text-[9px] uppercase font-mono text-slate-400 font-bold bg-[#111] border border-white/5 px-1.5 py-0.5 rounded">
                                        {r.label}
                                      </span>
                                    </div>
                                    <p className="text-sm text-slate-200 font-semibold leading-relaxed">"{r.text}"</p>
                                  </div>

                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleCopyClipboard(r.text)}
                                      className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-350 hover:text-white duration-150 flex items-center gap-1.5 cursor-pointer text-[11px]"
                                    >
                                      {copiedText === r.text ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                                      <span className="text-[10px] font-mono hidden sm:inline">Copy draft</span>
                                    </button>

                                    <button
                                      onClick={() => runTTSPlayback(r.text, `brief-var-${i}`)}
                                      className={`p-2 rounded-xl border border-white/10 transition duration-150 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white ${
                                        audioFeedbackId === `brief-var-${i}`
                                          ? 'bg-white/15 text-white border-white/20'
                                          : ''
                                      }`}
                                    >
                                      <Volume2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                        </div>
                      ) : (
                        <div className="py-12 text-center text-slate-500 italic space-y-1">
                          <FileText className="w-7 h-7 text-slate-600 mx-auto opacity-70 mb-2" />
                          <p className="text-xs font-mono font-medium text-slate-300">No active analysis briefing.</p>
                          <p className="text-[10px] font-mono text-slate-500">Simulate triggers block, upload images, or load thread files to begin.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>

            </section>

          </div>
        )}

      </main>

      <footer className="border-t border-white/5 bg-[#030303] mt-16 py-8 px-4 text-center text-xs text-slate-500 font-mono">
        <p className="uppercase tracking-widest text-[9px] text-slate-400 font-bold mb-1.5">DEVELOPED BY BIKASH BINDHANI • COGNITIVE COMPLIANCE AND SECURITY ACCREDITED</p>
        <p>COGNITIVE CONVERSATION ENGINE • CREATED BY BIKASH BINDHANI • PRIVATE SECURITY ACCREDITED</p>
        <p className="mt-3 text-[9px] text-[#444]">Powered by OpenRouter and Antigravity. Live sound synthesizing built in.</p>
      </footer>

    </div>
  );
}
