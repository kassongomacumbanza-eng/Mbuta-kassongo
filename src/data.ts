import { MemeTemplate, AudioTrack } from "./types";

export const BUILTIN_FILTERS = [
  { id: "none", name: "Normal", filter: "none" },
  { id: "cyberneon", name: "Cyberneon", filter: "hue-rotate(140deg) saturate(220%) contrast(120%) brightness(105%) shadow-[0_0_15px_rgba(236,72,153,0.7)]" },
  { id: "vintage", name: "Retro VHS", filter: "sepia(50%) contrast(90%) saturate(130%) brightness(95%) noise" },
  { id: "noir", name: "Noir Cinema", filter: "grayscale(100%) contrast(150%) brightness(90%)" },
  { id: "warm", name: "Warm Sun", filter: "sepia(20%) saturate(160%) hue-rotate(-10deg) brightness(105%)" },
  { id: "cool", name: "Cool Teal", filter: "saturate(140%) hue-rotate(180deg) brightness(95%)" },
  { id: "rainbow", name: "Pop Acid", filter: "hue-rotate(270deg) saturate(300%) contrast(140%)" },
];

export const BUILTIN_AUDIO: AudioTrack[] = [
  { id: "beat-1", name: "Kassongo Kuduro Bounce", vibe: "Festive & Rhythmic Beats", volume: 0.7, synthNote: 110, isActive: false },
  { id: "beat-2", name: "Cyberpunk Night Drive", vibe: "Heavy Synthwave Arpeggio", volume: 0.5, synthNote: 73, isActive: false },
  { id: "beat-3", name: "Luanda Sunset Guitar", vibe: "Acoustic Warm Melodies", volume: 0.6, synthNote: 165, isActive: false },
  { id: "beat-4", name: "Lofi Coding Chillout", vibe: "Relaxing Retro Keys", volume: 0.8, synthNote: 130, isActive: false },
];

export const MEME_TEMPLATES: MemeTemplate[] = [
  {
    id: "luanda-dance",
    name: "Luanda Kuduro Challenge",
    vibe: "Street Dance & Rhythmic Vibes",
    aspectRatio: "9:16",
    videoStyle: "pulsing-circles",
    defaultCaptions: [
      { text: "🔥 CASUAL KASSONGO DANCE", startTime: 0, endTime: 4, x: 50, y: 15, fontSize: 32, fontStyle: "vhs-bold", fontFamily: "Space Grotesk", color: "#f59e0b", animation: "bounce" },
      { text: "Minha reação ao usar o editor Kassongo Cut:", startTime: 4, endTime: 7, x: 50, y: 80, fontSize: 24, fontStyle: "clean", fontFamily: "Inter", color: "#ffffff", animation: "pulse" },
      { text: "Basta arrastar para arrumar suas tracks!", startTime: 7, endTime: 11, x: 50, y: 70, fontSize: 28, fontStyle: "neon", fontFamily: "JetBrains Mono", color: "#ec4899", animation: "zoom" },
      { text: "É MELHOR QUE CAPCUT SIM! 🚀", startTime: 11, endTime: 15, x: 50, y: 50, fontSize: 36, fontStyle: "ransom-note", fontFamily: "Space Grotesk", color: "#10b981", animation: "bounce" }
    ],
    defaultStickers: [
      { text: "💯 GOAT", color: "#10b981", startTime: 0, endTime: 5, x: 20, y: 30, scale: 1.2, rotation: -15 },
      { text: "👑 KASSONGO", color: "#fbbf24", startTime: 6, endTime: 12, x: 80, y: 25, scale: 1.4, rotation: 10 }
    ]
  },
  {
    id: "drake-yes-no",
    name: "Drake Preference (CapCut VS Kassongo)",
    vibe: "Funny Comparative Template",
    aspectRatio: "1:1",
    videoStyle: "drake-meme-split",
    defaultCaptions: [
      { text: "Preocupar com subscrições pagas do CapCut", startTime: 0, endTime: 6, x: 70, y: 25, fontSize: 18, fontStyle: "vhs-bold", fontFamily: "Inter", color: "#ffffff", animation: "none" },
      { text: "❌ DRAKE DISAGREES", startTime: 0, endTime: 6, x: 30, y: 40, fontSize: 26, fontStyle: "ransom-note", fontFamily: "Space Grotesk", color: "#ef4444", animation: "pulse" },
      { text: "Criar seus clipes grátis e rápidos na Kassongo", startTime: 6, endTime: 15, x: 70, y: 75, fontSize: 20, fontStyle: "neon", fontFamily: "Space Grotesk", color: "#10b981", animation: "bounce" },
      { text: "✅ Kassongo Cut no Comando!", startTime: 6, endTime: 15, x: 30, y: 90, fontSize: 24, fontStyle: "bubble-gum", fontFamily: "Space Grotesk", color: "#3b82f6", animation: "zoom" }
    ],
    defaultStickers: [
      { text: "👎 Meh", color: "#ef4444", startTime: 0, endTime: 6, x: 30, y: 15, scale: 1.3, rotation: -5 },
      { text: "🚀 PRO", color: "#10b981", startTime: 6, endTime: 15, x: 30, y: 65, scale: 1.5, rotation: 12 }
    ]
  },
  {
    id: "synth-chill-vlog",
    name: "Summer Minimalistic Vlog",
    vibe: "Aesthetic Sunset & Travel Diaries",
    aspectRatio: "16:9",
    videoStyle: "synthwave-grid",
    defaultCaptions: [
      { text: "golden hour diaries", startTime: 0, endTime: 5, x: 50, y: 75, fontSize: 28, fontStyle: "clean", fontFamily: "Playfair Display", color: "#fed7aa", animation: "fade" },
      { text: "editing like a storyteller with Kassongo Cut", startTime: 5, endTime: 11, x: 50, y: 80, fontSize: 18, fontStyle: "clean", fontFamily: "Inter", color: "#ffffff", animation: "pulse" },
      { text: "your daily dose of cinematic code", startTime: 11, endTime: 15, x: 50, y: 45, fontSize: 32, fontStyle: "neon", fontFamily: "JetBrains Mono", color: "#c084fc", animation: "zoom" }
    ]
  }
];

export const PROCEDURAL_VIDEO_CLIPS = [
  { id: "clip-grid", name: "Sunset Cyber Synth Grid", style: "synthwave-grid", duration: 15, thumbnailColor: "bg-gradient-to-tr from-pink-600 to-indigo-800" },
  { id: "clip-matrix", name: "Luanda Terminal Rain", style: "matrix-streams", duration: 15, thumbnailColor: "bg-gradient-to-b from-emerald-950 to-green-600" },
  { id: "clip-particles", name: "Aesthetic Galaxy Bokeh", style: "city-lights", duration: 20, thumbnailColor: "bg-gradient-to-tr from-amber-700 to-zinc-900" },
  { id: "clip-kawaii", name: "Kawaii Bubble Dream", style: "kawaii-dream", duration: 15, thumbnailColor: "bg-gradient-to-tr from-rose-400 to-amber-200" },
  { id: "clip-rainbow", name: "Rainbow Rhythm Ripple", style: "rainbow-pop", duration: 12, thumbnailColor: "bg-gradient-to-tr from-teal-400 to-amber-400" },
];
