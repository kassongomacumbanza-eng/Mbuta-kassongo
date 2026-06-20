export interface VideoClip {
  id: string;
  name: string;
  url: string; // Stock visual URL, data URL, or object URL
  duration: number; // in seconds
  startTrim: number; // slice start, seconds
  endTrim: number; // slice end, seconds
  hue: number; // decorative color seed
  thumbnailColor: string;
  videoType: "ambient" | "meme" | "custom";
}

export interface AudioTrack {
  id: string;
  name: string;
  vibe: string;
  volume: number; // 0.0 - 1.0
  synthNote: number; // Frequency for retro audio oscillator simulation
  isActive: boolean;
  isVoiceover?: boolean;
  blobUrl?: string;
  startTime?: number;
  duration?: number;
}

export interface TextOverlay {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  x: number; // percent 0-100
  y: number; // percent 0-100
  fontSize: number; // px representation
  fontStyle: "clean" | "neon" | "bubble-gum" | "ransom-note" | "vhs-bold";
  fontFamily: "Inter" | "Space Grotesk" | "Playfair Display" | "JetBrains Mono";
  color: string;
  animation: "none" | "bounce" | "zoom" | "fade" | "pulse";
}

export interface StickerOverlay {
  id: string;
  text: string;
  color: string;
  startTime: number;
  endTime: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface SfxOverlay {
  id: string;
  type: "woosh" | "pop" | "risada";
  name: string;
  startTime: number;
  duration: number; // in seconds
  volume: number; // 0.0 to 1.0
}

export type TimelineTrackType = "video" | "audio" | "sticker" | "subtitle";

export interface ProjectSettings {
  aspectRatio: "9:16" | "16:9" | "1:1";
  duration: number; // total target timeline duration, default 15s
  volume: number; // master volume
  selectedFilter: string; // overlay visuals
  speed: number; // 0.5x, 1x, 1.5x, 2x
  transitionStyle?: "fade" | "slide" | "glitch" | "none";
  autoDucking?: boolean;
}

export interface MemeTemplate {
  id: string;
  name: string;
  vibe: string;
  aspectRatio: "9:16" | "16:9" | "1:1";
  videoStyle: string;
  defaultCaptions: Omit<TextOverlay, "id">[];
  defaultStickers?: Omit<StickerOverlay, "id">[];
}

export interface AIScriptOutput {
  title: string;
  soundtrackStyle: string;
  hookText: string;
  captions: {
    startTime: number;
    endTime: number;
    text: string;
    visualCue: string;
  }[];
  suggestedFilter: string;
  tags: string[];
}
