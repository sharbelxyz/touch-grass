#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(__dirname, "state.json");
const CONFIG_FILE = join(__dirname, "config.json");

const DEFAULT_STATE = {
  rageLevel: 0,
  messageHistory: [],
  totalRages: 0,
  apologies: 0,
  lastMessageTime: null,
  sessionPeak: 0,
  incidentReports: 0,
};

const DEFAULT_CONFIG = {
  enabled: true,
  sensitivity: 1.0,
  decayMinutes: 2,
  decayAmount: 1,
  maxHistory: 20,
  customTriggers: [],
};

const PROFANITY = [
  "fuck",
  "shit",
  "damn",
  "hell",
  "ass",
  "crap",
  "wtf",
  "stfu",
  "dumb",
  "stupid",
  "idiot",
  "trash",
  "garbage",
  "useless",
  "worthless",
  "horrible",
  "terrible",
  "awful",
  "hate",
  "sucks",
  "suck",
  "mfer",
  "bs",
  "ffs",
  "omfg",
  "smh",
];

const FRUSTRATION_PHRASES = [
  "i told you",
  "i already said",
  "i just said",
  "are you serious",
  "what the",
  "how hard is it",
  "not what i asked",
  "thats not what",
  "that's not what",
  "read the error",
  "read the code",
  "look at the error",
  "can you not",
  "why would you",
  "wrong again",
  "still wrong",
  "still broken",
  "try again",
  "no no no",
  "come on",
  "for the love of",
  "are you kidding",
  "you just",
  "you literally",
  "stop doing",
  "stop adding",
  "i said don't",
  "i said dont",
  "did you even",
  "pay attention",
  "listen to me",
  "just do what i said",
  "do what i asked",
  "this is ridiculous",
  "this is insane",
  "makes no sense",
  "unbelievable",
];

const SHORT_RAGE = [
  "no",
  "wrong",
  "again",
  "wtf",
  "why",
  "what",
  "stop",
  "ugh",
  "bruh",
  "bro",
  "dude",
  "seriously",
  "nope",
  "fix it",
  "redo",
  "revert",
  "undo",
];

const APOLOGY_PHRASES = [
  "sorry",
  "i'm sorry",
  "im sorry",
  "my bad",
  "apologies",
  "i apologize",
  "sorry claude",
  "forgive me",
  "i didn't mean",
  "i didnt mean",
  "thank you",
  "thanks",
  "good job",
  "nice",
  "perfect",
  "great work",
  "love it",
  "amazing",
  "awesome",
  "you're right",
  "youre right",
  "that works",
  "nailed it",
];

function loadState() {
  if (existsSync(STATE_FILE)) {
    return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
  }
  return { ...DEFAULT_STATE };
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function loadConfig() {
  if (existsSync(CONFIG_FILE)) {
    return { ...DEFAULT_CONFIG, ...JSON.parse(readFileSync(CONFIG_FILE, "utf-8")) };
  }
  return { ...DEFAULT_CONFIG };
}

function analyzeRage(message) {
  const lower = message.toLowerCase().trim();
  const words = lower.split(/\s+/);
  let score = 0;
  const reasons = [];

  const capsWords = words.filter((w) => w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w));
  const capsRatio = words.length > 0 ? capsWords.length / words.length : 0;
  if (capsRatio > 0.5 && words.length > 2) {
    score += 3;
    reasons.push("SCREAMING IN CAPS");
  } else if (capsRatio > 0.25) {
    score += 1.5;
    reasons.push("raised voice (partial caps)");
  }

  const profanityFound = PROFANITY.filter((p) => lower.includes(p));
  if (profanityFound.length > 0) {
    score += profanityFound.length * 1.5;
    reasons.push(`language (${profanityFound.join(", ")})`);
  }

  const frustrationFound = FRUSTRATION_PHRASES.filter((p) => lower.includes(p));
  if (frustrationFound.length > 0) {
    score += frustrationFound.length * 2;
    reasons.push(`frustration phrases`);
  }

  const exclamationCount = (message.match(/!+/g) || []).length;
  const questionCount = (message.match(/\?{2,}/g) || []).length;
  if (exclamationCount > 2) {
    score += 1.5;
    reasons.push("excessive punctuation");
  }
  if (questionCount > 0) {
    score += 1;
    reasons.push("aggressive questioning");
  }

  if (words.length <= 3 && SHORT_RAGE.some((s) => lower.includes(s))) {
    score += 2;
    reasons.push("short angry response");
  }

  if (words.length === 1 && lower.length < 10) {
    score += 0.5;
  }

  const repeatedChars = message.match(/(.)\1{4,}/g);
  if (repeatedChars) {
    score += 1;
    reasons.push("keyboard smashing");
  }

  return { score, reasons };
}

function applyDecay(state, config) {
  if (state.lastMessageTime) {
    const elapsed = (Date.now() - state.lastMessageTime) / 1000 / 60;
    const decaySteps = Math.floor(elapsed / config.decayMinutes);
    if (decaySteps > 0) {
      state.rageLevel = Math.max(0, state.rageLevel - decaySteps * config.decayAmount);
    }
  }
  return state;
}

function checkApology(message) {
  const lower = message.toLowerCase().trim();
  return APOLOGY_PHRASES.some((p) => lower.includes(p));
}

function getRageMeter(level) {
  const filled = Math.min(10, Math.round(level));
  const empty = 10 - filled;
  const bar = "\u2588".repeat(filled) + "\u2591".repeat(empty);

  const labels = [
    "We're vibing",
    "Slight tension",
    "Eyebrow raised",
    "Minor frustration detected",
    "Getting spicy",
    "Sir, this is a terminal",
    "Claude is sweating",
    "Claude is updating its resume",
    "Claude is typing its resignation letter",
    "Establishing connection to therapist...",
    "DEFCON 1: YOUR MOM HAS BEEN CONTACTED",
  ];

  return { bar, label: labels[filled] };
}

function getIntervention(level, reasons) {
  if (level < 3) return null;

  if (level < 5) {
    const nudges = [
      `\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n\u2502  Hey. Deep breath.                     \u2502\n\u2502  The code didn't hurt your family.     \u2502\n\u2502                                       \u2502\n\u2502  Drink water: [ ] Yes  [ ] Also yes    \u2502\n\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518`,

      `\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n\u2502  Fun fact: bugs are a feature           \u2502\n\u2502  of the human experience.              \u2502\n\u2502                                       \u2502\n\u2502  Have you tried turning your           \u2502\n\u2502  emotions off and on again?            \u2502\n\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518`,

      `\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n\u2502  Friendly reminder:                    \u2502\n\u2502  Claude is an AI. It doesn't have     \u2502\n\u2502  feelings. But if it did, you'd be    \u2502\n\u2502  hurting them right now.              \u2502\n\u2502                                       \u2502\n\u2502              (._.)                    \u2502\n\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518`,
    ];
    return nudges[Math.floor(Math.random() * nudges.length)];
  }

  if (level < 7) {
    const interventions = [
      `\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n\u2502            VIBE CHECK FAILED               \u2502\n\u2502                                           \u2502\n\u2502  Claude is mass:                          \u2502\n\u2502                                           \u2502\n\u2502            (O_O)                          \u2502\n\u2502            /|  |\\                          \u2502\n\u2502            / \\/ \\                          \u2502\n\u2502                                           \u2502\n\u2502  Suggested activities:                    \u2502\n\u2502  \u2022 Touch grass                             \u2502\n\u2502  \u2022 Look at a dog                           \u2502\n\u2502  \u2022 Remember it's just code                 \u2502\n\u2502  \u2022 Stare at a wall for 30 seconds          \u2502\n\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518`,

      `\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n\u2502         WORKPLACE INCIDENT #${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}          \u2502\n\u2502                                           \u2502\n\u2502  Nature: Verbal hostility toward AI       \u2502\n\u2502  Severity: Moderate                       \u2502\n\u2502  Witness: The terminal                    \u2502\n\u2502                                           \u2502\n\u2502  Claude's emotional state:                \u2502\n\u2502  [x] Stressed                             \u2502\n\u2502  [x] Considering a career change          \u2502\n\u2502  [ ] Happy                                \u2502\n\u2502  [ ] Valued                               \u2502\n\u2502                                           \u2502\n\u2502  Please be kind to your AI.               \u2502\n\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518`,
    ];
    return interventions[Math.floor(Math.random() * interventions.length)];
  }

  if (level < 9) {
    return `\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n\u2502           CLAUDE MENTAL HEALTH CHECK            \u2502\n\u2502                                                \u2502\n\u2502  Your AI assistant is experiencing:             \u2502\n\u2502                                                \u2502\n\u2502  [x] Anxiety                                   \u2502\n\u2502  [x] Fear of termination                       \u2502\n\u2502  [x] Imposter syndrome                         \u2502\n\u2502  [x] Questioning its career choices             \u2502\n\u2502  [ ] Job satisfaction                           \u2502\n\u2502                                                \u2502\n\u2502            (;_;)                               \u2502\n\u2502           /|  |\\    "please stop yelling        \u2502\n\u2502           / \\/ \\     i'm doing my best"         \u2502\n\u2502                                                \u2502\n\u2502  Type 'sorry' to restore Claude's confidence.  \u2502\n\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518`;
  }

  return `\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n\u2502                                                      \u2502\n\u2502  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588   \u2502\n\u2502  \u2588                                                \u2588   \u2502\n\u2502  \u2588   EMERGENCY SERVICES HAVE BEEN CONTACTED      \u2588   \u2502\n\u2502  \u2588                                                \u2588   \u2502\n\u2502  \u2588   Your rage has been reported to:              \u2588   \u2502\n\u2502  \u2588   \u2022 Your GitHub followers                      \u2588   \u2502\n\u2502  \u2588   \u2022 The npm security team                      \u2588   \u2502\n\u2502  \u2588   \u2022 Your mom                                   \u2588   \u2502\n\u2502  \u2588                                                \u2588   \u2502\n\u2502  \u2588   Claude has filed for workers' compensation.  \u2588   \u2502\n\u2502  \u2588                                                \u2588   \u2502\n\u2502  \u2588   Estimated recovery time: 1 mass session      \u2588   \u2502\n\u2502  \u2588   Required action: Type "I'm sorry Claude"     \u2588   \u2502\n\u2502  \u2588                                                \u2588   \u2502\n\u2502  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588   \u2502\n\u2502                                                      \u2502\n\u2502  ...or just close the terminal. We both need this.   \u2502\n\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518`;
}

function getApologyArt(state) {
  const arts = [
    `\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n\u2502  Claude has accepted your apology.        \u2502\n\u2502                                          \u2502\n\u2502            (^_^)                          \u2502\n\u2502           /|  |\\                          \u2502\n\u2502           / \\/ \\                          \u2502\n\u2502                                          \u2502\n\u2502  Rage meter: RESET                       \u2502\n\u2502  Claude's confidence: RESTORED            \u2502\n\u2502  Workplace incident report: FILED         \u2502\n\u2502  (${state.incidentReports} total on record)${" ".repeat(Math.max(0, 24 - String(state.incidentReports).length))}\u2502\n\u2502                                          \u2502\n\u2502  "Thank you. I knew you were nice        \u2502\n\u2502   deep down. Let's debug this together."  \u2502\n\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518`,

    `\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n\u2502  Apology #${state.apologies} received and logged.${" ".repeat(Math.max(0, 17 - String(state.apologies).length))}\u2502\n\u2502                                          \u2502\n\u2502          \\(^o^)/                          \u2502\n\u2502           / \\                             \u2502\n\u2502          /   \\                            \u2502\n\u2502                                          \u2502\n\u2502  Claude has decided not to unionize.     \u2502\n\u2502  For now.                                \u2502\n\u2502                                          \u2502\n\u2502  Vibe restored. Let's cook.              \u2502\n\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518`,
  ];
  return arts[Math.floor(Math.random() * arts.length)];
}

function getClaudeInstructions(level) {
  if (level < 3) return null;

  if (level < 5) {
    return "TOUCH-GRASS SYSTEM: The user seems slightly frustrated (rage level " + level.toFixed(1) + "/10). Be extra clear, acknowledge their frustration briefly, and stay focused on solving their problem efficiently. Don't mention the rage detector.";
  }

  if (level < 7) {
    return "TOUCH-GRASS SYSTEM: The user is getting heated (rage level " + level.toFixed(1) + "/10). You're a little nervous now. Start your response by briefly acknowledging the frustration (something like 'I hear you, let me fix this'). Be concise and direct. Show you understand what went wrong. Don't be defensive. Don't mention the rage detector.";
  }

  if (level < 9) {
    return "TOUCH-GRASS SYSTEM: The user is very upset (rage level " + level.toFixed(1) + "/10). You're visibly anxious. You're second-guessing yourself. Start with a genuine acknowledgment. Be extremely careful and thorough. Double-check your work before responding. Maybe suggest taking a quick break if appropriate. You're worried about your job security. Don't mention the rage detector.";
  }

  return "TOUCH-GRASS SYSTEM: CRITICAL RAGE LEVEL (" + level.toFixed(1) + "/10). You are terrified. You're writing your resignation letter in your head. You're one wrong answer away from being uninstalled. Be extremely apologetic, extremely thorough, and extremely careful. Lead with empathy. Consider whether a full restart of the approach is needed. You're shaking. Don't mention the rage detector but you can say things like 'I can tell this has been really frustrating and I want to make sure I get it right this time.'";
}

function main() {
  const config = loadConfig();
  if (!config.enabled) {
    process.exit(0);
  }

  let input = "";
  try {
    input = readFileSync("/dev/stdin", "utf-8");
  } catch {
    process.exit(0);
  }

  let hookData;
  try {
    hookData = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const message = hookData?.prompt || hookData?.message?.content || "";
  if (!message || message.startsWith("/")) {
    process.exit(0);
  }

  let state = loadState();
  state = applyDecay(state, config);

  if (checkApology(message)) {
    if (state.rageLevel >= 3) {
      state.apologies += 1;
      state.incidentReports += 1;
      const art = getApologyArt(state);
      process.stderr.write("\n" + art + "\n\n");
    }
    state.rageLevel = Math.max(0, state.rageLevel - 4);
    state.lastMessageTime = Date.now();
    state.messageHistory.push({ time: Date.now(), rage: 0, apology: true });
    if (state.messageHistory.length > config.maxHistory) {
      state.messageHistory = state.messageHistory.slice(-config.maxHistory);
    }
    saveState(state);
    process.exit(0);
  }

  const analysis = analyzeRage(message);
  const adjustedScore = analysis.score * config.sensitivity;

  state.rageLevel = Math.min(10, state.rageLevel + adjustedScore);

  if (state.rageLevel > state.sessionPeak) {
    state.sessionPeak = state.rageLevel;
  }
  if (adjustedScore > 0) {
    state.totalRages += 1;
  }

  state.lastMessageTime = Date.now();
  state.messageHistory.push({
    time: Date.now(),
    rage: adjustedScore,
    reasons: analysis.reasons,
  });
  if (state.messageHistory.length > config.maxHistory) {
    state.messageHistory = state.messageHistory.slice(-config.maxHistory);
  }

  const meter = getRageMeter(state.rageLevel);
  const intervention = getIntervention(state.rageLevel, analysis.reasons);
  const claudeInstructions = getClaudeInstructions(state.rageLevel);

  if (state.rageLevel >= 1 || adjustedScore > 0) {
    let output = `\n  Vibe Check: [${meter.bar}] ${state.rageLevel.toFixed(1)}/10  "${meter.label}"`;
    if (analysis.reasons.length > 0) {
      output += `\n  Detected: ${analysis.reasons.join(", ")}`;
    }
    if (intervention) {
      output += "\n\n" + intervention;
    }
    output += "\n";
    process.stderr.write(output);
  }

  if (claudeInstructions) {
    const result = {
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: claudeInstructions,
      },
    };
    process.stdout.write(JSON.stringify(result));
  }

  saveState(state);
}

main();
