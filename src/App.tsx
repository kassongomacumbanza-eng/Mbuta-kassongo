import { useState, useEffect, useRef, useMemo } from "react";
import { 
  Video, 
  Music, 
  Type as TypeIcon, 
  Smile, 
  Sparkles, 
  Sliders, 
  Volume2, 
  Plus, 
  Trash2, 
  Download, 
  Wand2, 
  Edit3, 
  Layers, 
  Film, 
  Heart, 
  Share2, 
  CheckCircle, 
  Settings, 
  AlertCircle,
  HelpCircle,
  Save,
  Grid,
  Check,
  RefreshCw,
  Mic,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { VideoClip, AudioTrack, TextOverlay, StickerOverlay, SfxOverlay, ProjectSettings, MemeTemplate, AIScriptOutput } from "./types";
import { BUILTIN_FILTERS, BUILTIN_AUDIO, MEME_TEMPLATES, PROCEDURAL_VIDEO_CLIPS } from "./data";
import { VideoCanvas } from "./components/VideoCanvas";
import { TransitionFramePreview } from "./components/TransitionFramePreview";

interface AudioVoiceoverPlayerProps {
  key?: any;
  track: AudioTrack;
  isPlaying: boolean;
  currentTime: number;
  masterVolume: number;
}

function AudioVoiceoverPlayer({ track, isPlaying, currentTime, masterVolume }: AudioVoiceoverPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = track.volume * masterVolume;
  }, [track.volume, masterVolume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const start = track.startTime || 0;
    const end = start + (track.duration || 0);

    if (isPlaying && currentTime >= start && currentTime <= end) {
      if (audio.paused) {
        const offset = currentTime - start;
        audio.currentTime = offset;
        audio.play().catch(e => console.warn("Não foi possível tocar a voz gravada:", e));
      } else {
        const offset = currentTime - start;
        if (Math.abs(audio.currentTime - offset) > 0.3) {
          audio.currentTime = offset;
        }
      }
    } else {
      if (!audio.paused) {
        audio.pause();
      }
    }
  }, [isPlaying, currentTime, track.startTime, track.duration]);

  return (
    <audio
      ref={audioRef}
      src={track.blobUrl}
      preload="auto"
      className="hidden"
    />
  );
}

export default function App() {
  // --- Main Editor States ---
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>("luanda-dance");

  // Project Settings
  const [settings, setSettings] = useState<ProjectSettings>({
    aspectRatio: "9:16",
    duration: 15,
    volume: 0.8,
    selectedFilter: "cyberneon",
    speed: 1,
    transitionStyle: "fade",
    autoDucking: true,
  });

  // Per-interval customized transition styles state mapping
  const [intervalTransitions, setIntervalTransitions] = useState<Record<number, "fade" | "slide" | "glitch" | "none">>({});

  // Timeline zoom level scale (1 = 100%, up to 4 = 400%)
  const [timelineZoom, setTimelineZoom] = useState<number>(1);

  // Per-interval customized transition durations mapping (defaults to 0.8s)
  const [intervalDurations, setIntervalDurations] = useState<Record<number, number>>({});

  // Draggable transition point times key state
  const [transitionTimes, setTransitionTimes] = useState<number[]>([]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  // Synchronize transitionTimes when project duration changes
  useEffect(() => {
    const segmentDuration = settings.duration > 15 ? 6 : 5;
    const pts: number[] = [];
    for (let t = segmentDuration; t < settings.duration; t += segmentDuration) {
      pts.push(t);
    }
    
    // Only reset/initialize if the count changes or if we don't have any points set but should have some
    setTransitionTimes(prev => {
      if (prev.length === pts.length && prev.every(pt => pt < settings.duration)) {
        return prev;
      }
      return pts;
    });
  }, [settings.duration]);

  // Window-level mouse listeners for seamless smooth dragging behavior
  useEffect(() => {
    if (draggingIndex === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (relativeX / rect.width) * 100));
      const newTime = Number(((percentage / 100) * settings.duration).toFixed(1));

      // Constraint boundaries check: cannot exceed neighbors or bounds (with safe 0.5s margin)
      const minLimit = draggingIndex > 0 ? transitionTimes[draggingIndex - 1] + 0.5 : 0.5;
      const maxLimit = draggingIndex < transitionTimes.length - 1 ? transitionTimes[draggingIndex + 1] - 0.5 : settings.duration - 0.5;
      const constrainedTime = Math.max(minLimit, Math.min(maxLimit, newTime));

      setTransitionTimes(prev => {
        const next = [...prev];
        const oldTime = next[draggingIndex];
        next[draggingIndex] = constrainedTime;

        // Migrates transition style key and duration dynamically if user has set customized values already
        if (oldTime !== constrainedTime) {
          if (intervalTransitions[oldTime] !== undefined) {
            setIntervalTransitions(prevInt => {
              const updated = { ...prevInt };
              const style = updated[oldTime];
              delete updated[oldTime];
              updated[constrainedTime] = style;
              return updated;
            });
          }
          if (intervalDurations[oldTime] !== undefined) {
            setIntervalDurations(prevDur => {
              const updated = { ...prevDur };
              const durationVal = updated[oldTime];
              delete updated[oldTime];
              updated[constrainedTime] = durationVal;
              return updated;
            });
          }
        }

        return next;
      });
    };

    const handleMouseUp = () => {
      setDraggingIndex(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingIndex, transitionTimes, settings.duration, intervalTransitions, intervalDurations]);

  // Clips state (starts loaded with predefined sequence)
  const [clips, setClips] = useState<VideoClip[]>([
    { id: "clip-grid", name: "Sunset Cyber Synth Grid", url: "", duration: 15, startTrim: 0, endTrim: 15, hue: 320, thumbnailColor: "bg-gradient-to-tr from-pink-600 to-indigo-800", videoType: "ambient" }
  ]);

  // Audio Tracks State
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>(BUILTIN_AUDIO);
  const [audioVibeVolume, setAudioVibeVolume] = useState<number>(0.7);

  // Subtitles / Text Overlays State
  const [subtitles, setSubtitles] = useState<TextOverlay[]>([]);

  // Stickers / Overlays State
  const [stickers, setStickers] = useState<StickerOverlay[]>([]);

  // Sound Effects (SFX) State
  const [sfxList, setSfxList] = useState<SfxOverlay[]>([]);

  // Voice Recording States
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [recordPlayheadStart, setRecordPlayheadStart] = useState<number>(0);
  const mediaRecorderRef = useRef<any | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Active edits sidebar state
  const [activeTab, setActiveTab] = useState<"templates" | "subtitles" | "stickers" | "ai-wizard" | "filters" | "voiceover" | "sfx">("templates");
  const [activeSubtitleIndex, setActiveSubtitleIndex] = useState<number | null>(null);
  const [activeStickerIndex, setActiveStickerIndex] = useState<number | null>(null);

  // --- AI Smart Prompt Assistant States ---
  const [aiConceptInput, setAiConceptInput] = useState<string>("Vídeo motivacional de dança de rua com ritmo rápido");
  const [aiDuration, setAiDuration] = useState<number>(15);
  const [aiLanguage, setAiLanguage] = useState<string>("pt-BR");
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [lastGeneratedScript, setLastGeneratedScript] = useState<AIScriptOutput | null>(null);

  // --- Web Audio Synth Sound Engine Ref ---
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const lastSfxTimeRef = useRef<number>(-1);

  // Monitor playback playhead and trigger SFX sounds when passing their start times
  useEffect(() => {
    if (!isPlaying) {
      lastSfxTimeRef.current = currentTime;
      return;
    }

    const lastTime = lastSfxTimeRef.current;

    // Reset reference tracker if playhead is reset or seeked backwards
    if (currentTime < lastTime) {
      lastSfxTimeRef.current = currentTime;
      return;
    }

    // Trigger each active sfx
    sfxList.forEach((sfx) => {
      if (currentTime >= sfx.startTime && lastTime < sfx.startTime) {
        triggerSfx(sfx.type, sfx.volume);
      }
    });

    lastSfxTimeRef.current = currentTime;
  }, [currentTime, isPlaying, sfxList]);

  // Initialize selected template default tracks
  useEffect(() => {
    if (selectedTemplateId) {
      const template = MEME_TEMPLATES.find(t => t.id === selectedTemplateId);
      if (template) {
        // Apply settings
        setSettings(prev => ({
          ...prev,
          aspectRatio: template.aspectRatio,
        }));

        // Load default titles
        const mappedSubtitles: TextOverlay[] = template.defaultCaptions.map((cap, index) => ({
          ...cap,
          id: `template-sub-${index}-${Date.now()}`
        }));
        setSubtitles(mappedSubtitles);

        // Load default stickers
        if (template.defaultStickers) {
          const mappedStickers: StickerOverlay[] = template.defaultStickers.map((st, index) => ({
            ...st,
            id: `template-st-${index}-${Date.now()}`
          }));
          setStickers(mappedStickers);
        } else {
          setStickers([]);
        }

        // Set matching audio track active
        setAudioTracks(prev => {
          return prev.map(track => {
            if (template.id === "luanda-dance" && track.id === "beat-1") {
              return { ...track, isActive: true };
            }
            if (template.id === "synth-chill-vlog" && track.id === "beat-4") {
              return { ...track, isActive: true };
            }
            if (template.id === "drake-yes-no" && track.id === "beat-2") {
              return { ...track, isActive: true };
            }
            return { ...track, isActive: false };
          });
        });
      }
    }
  }, [selectedTemplateId]);

  // Handle active audio synthesis during play
  useEffect(() => {
    if (isPlaying) {
      // Find any active audio track
      const activeTrack = audioTracks.find(t => t.isActive);
      if (activeTrack) {
        triggerSynthSound(activeTrack.synthNote, true);
      }
    } else {
      stopSynthSound();
    }
    return () => stopSynthSound();
  }, [isPlaying, audioTracks]);

  // Real-time Audio Ducking Processor side-effect
  useEffect(() => {
    if (!gainNodeRef.current || !audioCtxRef.current) return;

    if (settings.autoDucking) {
      // Duck soundtrack if subtitles, stickers, or an active voiceover are active at current playhead position
      const isSubtitleActive = subtitles.some(
        sub => currentTime >= sub.startTime && currentTime <= sub.endTime
      );
      const isStickerActive = stickers.some(
        st => currentTime >= st.startTime && currentTime <= st.endTime
      );
      const isVoiceoverActive = audioTracks.some(
        track => track.isVoiceover && track.isActive && track.blobUrl &&
        currentTime >= (track.startTime || 0) && currentTime <= ((track.startTime || 0) + (track.duration || 0))
      );
      const isDuckingTriggered = isSubtitleActive || isStickerActive || isVoiceoverActive;

      // When ducking, drop volume seamlessly down to 35% of output mix. Otherwise, full 100% volume mix.
      const multiplier = isDuckingTriggered ? 0.35 : 1.0;
      const targetVolume = audioVibeVolume * 0.15 * settings.volume * multiplier;

      // Use a target exponential smoothing time constant of 0.1s to avoid rough signal popping clicks
      gainNodeRef.current.gain.setTargetAtTime(targetVolume, audioCtxRef.current.currentTime, 0.1);
    } else {
      // Standard static volume level tracking
      const targetVolume = audioVibeVolume * 0.15 * settings.volume;
      gainNodeRef.current.gain.setTargetAtTime(targetVolume, audioCtxRef.current.currentTime, 0.08);
    }
  }, [currentTime, settings.autoDucking, subtitles, stickers, audioTracks, audioVibeVolume, settings.volume]);

  // --- Synth sound helpers ---
  const initAudioCtx = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
  };

  const triggerSynthSound = (frequency: number, pulsePattern = false) => {
    try {
      initAudioCtx();
      if (!audioCtxRef.current) return;

      stopSynthSound();

      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Fun retro synth sounds
      osc.type = frequency < 100 ? "sawtooth" : "sine";
      
      // Let the frequency pulsate if a pattern is enabled
      if (pulsePattern) {
        // rhythmic retro beat cadence simulation
        osc.frequency.setValueAtTime(frequency, ctx.currentTime);
        osc.frequency.setValueAtTime(frequency * 1.5, ctx.currentTime + 0.2);
        osc.frequency.setValueAtTime(frequency * 1.25, ctx.currentTime + 0.4);
        osc.frequency.setValueAtTime(frequency, ctx.currentTime + 0.6);
      } else {
        osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      }

      gain.gain.setValueAtTime(audioVibeVolume * 0.15 * settings.volume, ctx.currentTime);
      
      if (pulsePattern) {
        // Pulsing volume for beat
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      
      oscillatorRef.current = osc;
      gainNodeRef.current = gain;

      // Automatically reconnect sound pulse when time advances in play
      if (pulsePattern) {
        const pulseInterval = setInterval(() => {
          if (isPlaying && oscillatorRef.current) {
            const nextNote = frequency * (Math.random() > 0.5 ? 1.25 : 1);
            osc.frequency.setValueAtTime(nextNote, ctx.currentTime);
          } else {
            clearInterval(pulseInterval);
          }
        }, 800);
      }

    } catch (e) {
      console.warn("Audio Context launch prevented or delayed:", e);
    }
  };

  const stopSynthSound = () => {
    try {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
        oscillatorRef.current = null;
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
      }
    } catch (e) {}
  };

  // --- Sound Effects (SFX) Synthesizers ---
  const playWoosh = (volume: number) => {
    initAudioCtx();
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;
    
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      osc.type = "sine";
      // Sweet frequency sweep: pitch rises and then falls
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.22);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.45);
      
      // Resonant sweep for airy texture
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(250, now);
      filter.frequency.exponentialRampToValueAtTime(1500, now + 0.22);
      filter.frequency.exponentialRampToValueAtTime(350, now + 0.45);
      filter.Q.value = 4.0;

      // Amplitude envelope
      const targetGain = volume * settings.volume * 0.55;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(targetGain, now + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {
      console.warn("Falha ao tocar Woosh:", e);
    }
  };

  const playPop = (volume: number) => {
    initAudioCtx();
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;
    
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      // Burst pitch slide
      osc.frequency.setValueAtTime(1500, now);
      osc.frequency.exponentialRampToValueAtTime(130, now + 0.08);
      
      const targetGain = volume * settings.volume * 0.7;
      gain.gain.setValueAtTime(targetGain, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {
      console.warn("Falha ao tocar Pop:", e);
    }
  };

  const playRisada = (volume: number) => {
    initAudioCtx();
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;
    
    try {
      const pulses = 5;
      const pulseDuration = 0.09;
      const spacing = 0.06;
      const baseFreq = 420;
      const targetGain = volume * settings.volume * 0.45;

      for (let i = 0; i < pulses; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        // Rapid fire cartoon laughing notes
        const toneFactor = 1.0 + (i % 2 === 0 ? 0.3 : 0.1);
        const stFreq = baseFreq * toneFactor;
        const endFreq = (baseFreq - 90) * toneFactor;
        
        osc.type = "sawtooth"; // retro game feel
        osc.frequency.setValueAtTime(stFreq, now + i * (pulseDuration + spacing));
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + i * (pulseDuration + spacing) + pulseDuration);
        
        // Lowpass filter to smooth the sawtooth
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 1200;

        gain.gain.setValueAtTime(0, now + i * (pulseDuration + spacing));
        gain.gain.linearRampToValueAtTime(targetGain, now + i * (pulseDuration + spacing) + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * (pulseDuration + spacing) + pulseDuration);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + i * (pulseDuration + spacing));
        osc.stop(now + i * (pulseDuration + spacing) + pulseDuration + 0.01);
      }
    } catch (e) {
      console.warn("Falha ao tocar Risada:", e);
    }
  };

  const triggerSfx = (type: "woosh" | "pop" | "risada", volume = 1.0) => {
    if (type === "woosh") playWoosh(volume);
    else if (type === "pop") playPop(volume);
    else if (type === "risada") playRisada(volume);
  };

  // --- Voice Recording Logic ---
  const startVoiceRecording = async () => {
    try {
      // Step 1: Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      const options = { mimeType: "audio/webm" };
      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (innerErr) {
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorder.ondataavailable = (event: any) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Add new audio track
        const recordDuration = Number(recordingTime.toFixed(1)) || 3;
        const newTrack: AudioTrack = {
          id: `voiceover-${Date.now()}`,
          name: `Gravação ${audioTracks.filter(t => t.isVoiceover).length + 1}`,
          vibe: "Voz Gravada",
          volume: 1.0,
          synthNote: 0,
          isActive: true, // Make it active immediately
          isVoiceover: true,
          blobUrl: audioUrl,
          startTime: recordPlayheadStart,
          duration: recordDuration
        };

        // De-active standard background sound track if preferred so they hear the voiceover perfectly
        setAudioTracks(prev => [
          ...prev.map(t => t.isVoiceover ? t : { ...t, isActive: false }),
          newTrack
        ]);

        // Clean up tracks
        stream.getTracks().forEach(track => track.stop());
      };

      // Set starting markers
      const startAt = currentTime;
      setRecordPlayheadStart(startAt);
      setRecordingTime(0);
      setIsRecording(true);

      // Start actual MediaRecorder
      mediaRecorder.start(250); // Slice every 250ms
      mediaRecorderRef.current = mediaRecorder;

      // Timer to count up seconds
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const nextSec = prev + 0.1;
          // Stop automatically if we reach duration limit of project or max 60s
          if (startAt + nextSec >= settings.duration || nextSec >= 60) {
            stopVoiceRecording();
            return prev;
          }
          return nextSec;
        });
      }, 100);

      // Sincronizar: se o vídeo não estiver rodando, começamos a reproduzir o vídeo!
      if (!isPlaying) {
        setIsPlaying(true);
      }

    } catch (err) {
      console.error("Erro ao iniciar gravação de voz:", err);
      alert("Não foi possível acessar seu microfone. Por favor, verifique as permissões do seu navegador.");
    }
  };

  const stopVoiceRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);
    setIsPlaying(false); // Stop video play on finish recording
  };

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // --- AI Generator handler ---
  const handleAITemplateGeneration = async () => {
    if (!aiConceptInput.trim()) return;
    setIsGeneratingAI(true);
    setAiMessage("Conectando ao Kassongo AI Engine...");

    try {
      const response = await fetch("/api/gemini/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept: aiConceptInput,
          duration: aiDuration,
          language: aiLanguage
        })
      });

      if (!response.ok) {
        throw new Error("Falha ao comunicar com o servidor Kassongo Cut.");
      }

      const data: AIScriptOutput = await response.json();
      setLastGeneratedScript(data);

      // Successfully generated. Apply this template onto active timeline tracks instantly!
      setSelectedTemplateId(null); // Custom AI template active
      setSettings(prev => ({
        ...prev,
        duration: aiDuration,
        selectedFilter: data.suggestedFilter.toLowerCase()
      }));

      // Map AI response captions into subtitle tracks
      const formattedSubs: TextOverlay[] = data.captions.map((item, index) => ({
        id: `ai-caption-${index}-${Date.now()}`,
        text: item.text,
        startTime: item.startTime,
        endTime: item.endTime,
        x: 50,
        y: index % 2 === 0 ? 75 : 80, // Alternating rows
        fontSize: index === 0 ? 28 : 22,
        fontStyle: index === 0 ? "neon" : "vhs-bold",
        fontFamily: "Space Grotesk",
        color: index % 2 === 0 ? "#ec4899" : "#ffffff",
        animation: "zoom"
      }));
      setSubtitles(formattedSubs);

      // Generate funny dynamic AI stickers for overlays query
      setAiMessage("Otimizando pacotes de Stickers com Inteligência Artificial...");
      try {
        const stickersResponse = await fetch("/api/gemini/stickers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ concept: aiConceptInput, count: 3 })
        });
        if (stickersResponse.ok) {
          const stickersData = await stickersResponse.json();
          const fetchedStickers: StickerOverlay[] = stickersData.stickers.map((st: any, i: number) => ({
            id: `ai-sticker-${i}-${Date.now()}`,
            text: st.text,
            color: st.color || "#38bdf8",
            startTime: i * 4,
            endTime: (i + 1) * 4,
            x: 20 + i * 25,
            y: 25 + (i % 2) * 12,
            scale: 1.3,
            rotation: -10 + i * 12
          }));
          setStickers(fetchedStickers);
        }
      } catch (stickerErr) {
        console.error("Non-blocking sticker creation warning:", stickerErr);
      }

      // Automatically play preview once loaded
      setCurrentTime(0);
      setIsPlaying(true);
      setAiMessage("Vídeo de Inteligência Artificial criado com sucesso no Kassongo Cut!");
    } catch (e: any) {
      console.error(e);
      setAiMessage("Erro ao gerar roteiro dinâmico. Foi carregado um template responsivo fallback.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // --- Subtitles Editor helpers ---
  const handleAddSubtitle = () => {
    const newSub: TextOverlay = {
      id: `custom-sub-${Date.now()}`,
      text: "Minha Nova Legenda Digital",
      startTime: Math.max(0, currentTime),
      endTime: Math.min(settings.duration, currentTime + 3.5),
      x: 50,
      y: 75,
      fontSize: 24,
      fontStyle: "clean",
      fontFamily: "Inter",
      color: "#ffffff",
      animation: "bounce"
    };
    setSubtitles(prev => [...prev, newSub]);
    setActiveSubtitleIndex(subtitles.length);
  };

  const handleUpdateSubtitle = (index: number, updatedFields: Partial<TextOverlay>) => {
    setSubtitles(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, ...updatedFields };
      }
      return item;
    }));
  };

  const handleDeleteSubtitle = (index: number) => {
    setSubtitles(prev => prev.filter((_, idx) => idx !== index));
    setActiveSubtitleIndex(null);
  };

  // --- Stickers helpers ---
  const handleAddSticker = (stickerText: string, colorHex: string) => {
    const newSt: StickerOverlay = {
      id: `custom-st-${Date.now()}`,
      text: stickerText,
      color: colorHex,
      startTime: Math.max(0, currentTime),
      endTime: Math.min(settings.duration, currentTime + 4),
      x: 50,
      y: 30,
      scale: 1.3,
      rotation: 0
    };
    setStickers(prev => [...prev, newSt]);
    setActiveStickerIndex(stickers.length);
    setActiveTab("stickers");
  };

  const handleUpdateSticker = (index: number, updatedFields: Partial<StickerOverlay>) => {
    setStickers(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, ...updatedFields };
      }
      return item;
    }));
  };

  const handleDeleteSticker = (index: number) => {
    setStickers(prev => prev.filter((_, idx) => idx !== index));
    setActiveStickerIndex(null);
  };

  // --- Export simulation ---
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const triggerSimulationExport = () => {
    setIsPlaying(false);
    setShowExportModal(true);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white">
      
      {/* 1. Header Bar */}
      <header id="kassongo-header" className="sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 flex items-center justify-center shadow-lg transform rotate-3">
            <Film className="w-5.5 h-5.5 text-white stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
              Kassongo Cut
            </h1>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">Premium AI Media Suite</p>
          </div>
        </div>

        {/* Top Badges */}
        <div className="hidden md:flex items-center gap-5">
          <div className="flex items-center gap-2 text-xs bg-zinc-950 border border-zinc-800 rounded-full px-3 py-1 text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Motor AI Ativo</span>
          </div>

          <button
            id="export-template-button"
            onClick={triggerSimulationExport}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs tracking-wide py-2 px-5 rounded-lg flex items-center gap-2 shadow-lg hover:shadow-purple-500/20 active:scale-95 transition"
          >
            <Download className="w-4 h-4" />
            <span>EXPORTAR PRO</span>
          </button>
        </div>
      </header>

      {/* 2. Main Studio Workspace Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Playback Canvas and Playhead Control Panel (Col 7 / 12) */}
        <div className="lg:col-span-6 xl:col-span-7 flex flex-col gap-6">
          <VideoCanvas
            currentTime={currentTime}
            isPlaying={isPlaying}
            onTimeUpdate={setCurrentTime}
            clips={clips}
            subtitles={subtitles}
            stickers={stickers}
            settings={settings}
            setIsPlaying={setIsPlaying}
            selectedTemplateId={selectedTemplateId}
            intervalTransitions={intervalTransitions}
            intervalDurations={intervalDurations}
            transitionTimes={transitionTimes}
          />

          {/* Background Voiceover Players */}
          {audioTracks.filter(t => t.isVoiceover && t.blobUrl).map(track => (
            <AudioVoiceoverPlayer
              key={track.id}
              track={track}
              isPlaying={isPlaying}
              currentTime={currentTime}
              masterVolume={settings.volume}
            />
          ))}

          {/* Graphical Tracks Visual Timeline */}
          <div id="timeline-box" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-4.5 h-4.5 text-purple-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Linha do Tempo Multitaxas</h3>
              </div>
              
              <div className="flex items-center gap-3 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-850">
                <div className="flex items-center gap-1 text-zinc-400">
                  <ZoomOut className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase font-bold tracking-wider select-none">Zoom</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="4"
                  step="0.1"
                  value={timelineZoom}
                  onChange={(e) => setTimelineZoom(parseFloat(e.target.value))}
                  className="w-24 accent-purple-500 h-1 bg-zinc-850 rounded-lg cursor-pointer"
                  title="Ajustar zoom horizontal da linha do tempo"
                />
                <div className="flex items-center gap-1.5 text-purple-400 font-mono text-[10px] font-bold">
                  <span>{(timelineZoom * 100).toFixed(0)}%</span>
                  <ZoomIn className="w-3.5 h-3.5 text-purple-400" />
                </div>
              </div>

              <span className="text-xs text-zinc-500 font-mono">Total {settings.duration}s</span>
            </div>

            {/* Scrollable Tracks Area Viewport Wrapper */}
            <div className="w-full overflow-x-auto rounded-xl border border-zinc-950 bg-zinc-950 scrollbar-thin scrollbar-thumb-purple-500/40 scrollbar-track-zinc-950/20">
              {/* Simulated Tracks block */}
              <div 
                className="flex flex-col gap-3.5 p-4 relative"
                style={{ 
                  width: `${timelineZoom * 100}%`,
                  minWidth: "100%",
                }}
              >
                
                {/* Vertical Playhead Cursor bar based on horizontal zoom */}
                {(() => {
                  const offsetPct = (currentTime / settings.duration) * 100;
                  const offsetPx = (currentTime / settings.duration) * 92;
                  return (
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-purple-500 pointer-events-none z-30 shadow"
                      style={{
                        left: `calc(92px + ${offsetPct}% - ${offsetPx}px)`
                      }}
                    >
                      <div className="w-3 h-3 bg-purple-500 rounded-full -ml-[5px] shadow border border-white"></div>
                    </div>
                  );
                })()}

                {/* 1. Video Background track */}
                <div className="flex items-center gap-3 relative">
                  <div className="w-20 flex-shrink-0 flex items-center gap-1.5 text-zinc-400 sticky left-0 bg-zinc-950 z-20 pr-2 select-none border-r border-zinc-900/45 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.6)]">
                    <Film className="w-3.5 h-3.5 text-pink-400" />
                    <span className="text-[10px] font-bold uppercase">Video</span>
                  </div>
                  <div className="flex-1 h-8 rounded-lg bg-pink-950/20 border border-pink-900/30 flex items-center px-3 relative overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-pink-500/20 w-full rounded"></div>
                    <span className="text-[10px] text-pink-200 font-medium z-10 truncate">
                      {selectedTemplateId ? MEME_TEMPLATES.find(t=>t.id===selectedTemplateId)?.name : "Vídeo Procedural Kassongo"}
                    </span>
                    
                    {/* Transition physical ticks indicators */}
                    {transitionTimes.map((pt, idx) => {
                      const activeStyle = intervalTransitions[pt] !== undefined ? intervalTransitions[pt] : settings.transitionStyle;
                      if (!activeStyle || activeStyle === 'none') return null;
                      const posPct = (pt / settings.duration) * 100;
                      const emoji = activeStyle === 'fade' ? '🌙' : activeStyle === 'slide' ? '↔️' : '⚡';
                      return (
                        <div 
                          key={idx} 
                          className="absolute h-full top-0 w-2.5 bg-purple-600/80 hover:bg-purple-500 z-10 flex items-center justify-center cursor-help border-l border-r border-purple-405 group transition-colors"
                          style={{ left: `${posPct}%`, transform: 'translateX(-50%)' }}
                          title={`Transição ${activeStyle} em ${pt}s`}
                        >
                          <span className="text-[8px] absolute -top-1 font-mono scale-75 select-none">{emoji}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Captions / Subtitles Track */}
                <div className="flex items-center gap-3 relative">
                  <div className="w-20 flex-shrink-0 flex items-center gap-1.5 text-zinc-400 sticky left-0 bg-zinc-950 z-20 pr-2 select-none border-r border-zinc-900/45 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.6)]">
                    <TypeIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px] font-bold uppercase">Texto</span>
                  </div>
                  <div className="flex-1 h-8 rounded-lg bg-zinc-900 border border-zinc-800 relative flex items-center gap-1 p-1">
                    {subtitles.map((sub, sIdx) => {
                      const lLeft = (sub.startTime / settings.duration) * 100;
                      const lWidth = ((sub.endTime - sub.startTime) / settings.duration) * 100;

                      return (
                        <button
                          key={sub.id}
                          onClick={() => {
                            setActiveTab("subtitles");
                            setActiveSubtitleIndex(sIdx);
                          }}
                          className={`absolute h-6 rounded text-[9px] font-bold px-1.5 truncate transition border ${
                            activeSubtitleIndex === sIdx
                              ? "bg-amber-400 text-black border-white"
                              : "bg-amber-950/40 text-amber-300 border-amber-900/50"
                          }`}
                          style={{
                            left: `${lLeft}%`,
                            width: `${Math.max(12, lWidth)}%`,
                          }}
                        >
                          {sub.text}
                        </button>
                      );
                    })}
                    {subtitles.length === 0 && (
                      <span className="text-[10px] text-zinc-600 italic pl-2">Nenhuma legenda no tempo atual</span>
                    )}
                  </div>
                </div>

                {/* 3. Audio / Synth Track */}
                <div className="flex items-center gap-3 relative">
                  <div className="w-20 flex-shrink-0 flex items-center gap-1.5 text-zinc-400 sticky left-0 bg-zinc-950 z-20 pr-2 select-none border-r border-zinc-900/45 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.6)]">
                    <Music className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-[10px] font-bold uppercase">Áudio</span>
                  </div>
                  <div className="flex-1 h-8 rounded-lg bg-purple-950/20 border border-purple-900/30 flex items-center justify-between px-3 relative overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-purple-500/20 w-full rounded"></div>
                    <span className="text-[10px] text-purple-200 font-medium z-10 truncate">
                      {audioTracks.find(t => t.isActive)?.name || "Nenhuma trilha sonora selecionada"}
                    </span>
                    
                    {/* Micro sound trigger test button */}
                    <button
                      id="trigger-synth-pitch-test"
                      onClick={() => {
                        const activeT = audioTracks.find(t => t.isActive);
                        if (activeT) triggerSynthSound(activeT.synthNote);
                        else triggerSynthSound(130);
                      }}
                      className="z-10 bg-purple-900 hover:bg-purple-800 text-[10px] text-purple-200 font-bold px-2 py-0.5 rounded border border-purple-700"
                      title="Reproduzir um teste do sintetizador Kassongo instantaneamente"
                    >
                      Tocar Synth
                    </button>
                  </div>
                </div>

                {/* 4. Overlays / Stickers Track */}
                <div className="flex items-center gap-3 relative">
                  <div className="w-20 flex-shrink-0 flex items-center gap-1.5 text-zinc-400 sticky left-0 bg-zinc-950 z-20 pr-2 select-none border-r border-zinc-900/45 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.6)]">
                    <Smile className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] font-bold uppercase">Stickers</span>
                  </div>
                  <div className="flex-1 h-8 rounded-lg bg-zinc-900 border border-zinc-800 relative flex items-center gap-1 p-1">
                    {stickers.map((st, sIdx) => {
                      const lLeft = (st.startTime / settings.duration) * 100;
                      const lWidth = ((st.endTime - st.startTime) / settings.duration) * 100;

                      return (
                        <button
                          key={st.id}
                          onClick={() => {
                            setActiveTab("stickers");
                            setActiveStickerIndex(sIdx);
                          }}
                          className={`absolute h-6 rounded text-[9px] font-bold px-1.5 truncate transition border ${
                            activeStickerIndex === sIdx
                              ? "bg-emerald-400 text-black border-white"
                              : "bg-emerald-950/40 text-emerald-300 border-emerald-900/50"
                          }`}
                          style={{
                            left: `${lLeft}%`,
                            width: `${Math.max(12, lWidth)}%`,
                          }}
                        >
                          {st.text}
                        </button>
                      );
                    })}
                    {stickers.length === 0 && (
                      <span className="text-[10px] text-zinc-600 italic pl-2">Nenhum sticker adesivo</span>
                    )}
                  </div>
                </div>

                {/* 5. Voiceover / Narration Track */}
                <div className="flex items-center gap-3 relative">
                  <div className="w-20 flex-shrink-0 flex items-center gap-1.5 text-zinc-400 sticky left-0 bg-zinc-950 z-20 pr-2 select-none border-r border-zinc-900/45 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.6)]">
                    <Mic className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[10px] font-bold uppercase">Narrações</span>
                  </div>
                  <div className="flex-1 h-8 rounded-lg bg-zinc-900 border border-zinc-800 relative flex items-center gap-1 p-1">
                    {audioTracks.filter(t => t.isVoiceover).map((track) => {
                      const lLeft = ((track.startTime || 0) / settings.duration) * 100;
                      const lWidth = ((track.duration || 0) / settings.duration) * 100;

                      return (
                        <div
                          key={track.id}
                          className={`absolute h-6 rounded text-[9px] font-bold px-1.5 flex items-center justify-between gap-1 border transition ${
                            track.isActive
                              ? "bg-blue-600 text-white border-white"
                              : "bg-blue-950/40 text-blue-300 border-blue-900/50"
                          }`}
                          style={{
                            left: `${lLeft}%`,
                            width: `${Math.max(12, lWidth)}%`,
                          }}
                        >
                          <span className="truncate flex-1 tracking-tight" title={track.name}>🗣️ {track.name}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Delete voiceover track
                              setAudioTracks(prev => prev.filter(t => t.id !== track.id));
                            }}
                            className="hover:text-red-400 text-xs font-bold leading-none p-0.5 transition-colors cursor-pointer"
                            title="Excluir gravação"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                    {audioTracks.filter(t => t.isVoiceover).length === 0 && (
                      <span className="text-[10px] text-zinc-600 italic pl-2 hover:text-blue-400 select-none cursor-pointer" onClick={() => setActiveTab("voiceover")}>
                        Nenhuma narração gravada (abra a aba "Gravador" para iniciar)
                      </span>
                    )}
                  </div>
                </div>

                {/* 6. Sound Effects (SFX) Track */}
                <div className="flex items-center gap-3 relative">
                  <div className="w-20 flex-shrink-0 flex items-center gap-1.5 text-zinc-400 sticky left-0 bg-zinc-950 z-20 pr-2 select-none border-r border-zinc-900/45 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.6)]">
                    <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-[10px] font-bold uppercase text-purple-400">Efeitos SFX</span>
                  </div>
                  <div className="flex-1 h-8 rounded-lg bg-zinc-900 border border-zinc-800 relative flex items-center gap-1 p-1">
                    {sfxList.map((sfx) => {
                      const lLeft = (sfx.startTime / settings.duration) * 100;
                      // Scale visual size on timeline representation beautifully
                      const visualWidth = Math.max(0.5, sfx.duration);
                      const lWidth = (visualWidth / settings.duration) * 100;

                      return (
                        <div
                          key={sfx.id}
                          onClick={() => {
                            setActiveTab("sfx");
                          }}
                          className="absolute h-6 rounded text-[9px] font-bold px-1.5 flex items-center justify-between gap-1 border transition cursor-pointer bg-purple-900/60 hover:bg-purple-800 text-white border-purple-500/50"
                          style={{
                            left: `${lLeft}%`,
                            width: `${Math.max(16, lWidth)}%`,
                          }}
                          title={`${sfx.name} em ${sfx.startTime.toFixed(1)}s (Volume: ${(sfx.volume * 100).toFixed(0)}%)`}
                        >
                          <span className="truncate flex-1 tracking-tight select-none">
                            {sfx.type === "woosh" ? "💨" : sfx.type === "pop" ? "🎈" : "😂"} {sfx.name}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Delete sfx item
                              setSfxList(prev => prev.filter(item => item.id !== sfx.id));
                            }}
                            className="hover:text-red-400 text-xs font-bold leading-none p-0.5 transition-colors cursor-pointer ml-0.5"
                            title="Excluir efeito"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                    {sfxList.length === 0 && (
                      <span 
                        className="text-[10px] text-zinc-600 italic pl-2 hover:text-purple-400 select-none cursor-pointer" 
                        onClick={() => setActiveTab("sfx")}
                      >
                        Nenhum efeito sonoro adicionado (abra a aba "Efeitos" para inserir)
                      </span>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Draggable Transitions Timeline Track */}
            <div className="mt-4 pt-4 border-t border-zinc-800/60">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" /> Ajustar Divisórias de Transição (Arraste para mover)
                </span>
                <span className="text-[9px] text-zinc-500 font-mono italic">
                  Clique e segure sobre a bolinha com o emoji para arrastar
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-16 flex items-center gap-1.5 text-zinc-400">
                  <Sliders className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[10px] font-bold uppercase text-purple-400">Ponto {transitionTimes.length}x</span>
                </div>
                <div 
                  ref={trackRef}
                  className="flex-1 h-12 bg-zinc-950 rounded-lg relative border border-zinc-850 select-none overflow-visible"
                >
                  {/* Visual segment backgrounds */}
                  {(() => {
                    const points = [...transitionTimes].sort((a, b) => a - b);
                    const segmentStarts = [0, ...points];
                    const segmentEnds = [...points, settings.duration];
                    
                    return segmentStarts.map((start, idx) => {
                      const end = segmentEnds[idx];
                      const pctLeft = (start / settings.duration) * 100;
                      const pctWidth = ((end - start) / settings.duration) * 100;
                      
                      return (
                        <div
                          key={`bg-chunk-${idx}`}
                          className="absolute top-0 bottom-0 border-r border-dashed border-zinc-850/30 flex flex-col justify-center items-center px-1 text-center"
                          style={{
                            left: `${pctLeft}%`,
                            width: `${pctWidth}%`,
                            background: idx % 2 === 0 ? "rgba(168, 85, 247, 0.04)" : "transparent"
                          }}
                        >
                          <span className="text-[8px] font-bold block text-zinc-500 uppercase tracking-tight truncate max-w-full">
                            Chunk {idx + 1}
                          </span>
                          <span className="text-[8px] font-mono text-zinc-600 block">
                            {(end - start).toFixed(1)}s
                          </span>
                        </div>
                      );
                    });
                  })()}

                  {/* Render Draggable Dividers */}
                  {transitionTimes.map((pt, idx) => {
                    const activeStyle = intervalTransitions[pt] !== undefined ? intervalTransitions[pt] : settings.transitionStyle;
                    const posPct = (pt / settings.duration) * 100;
                    const emoji = activeStyle === 'fade' ? '🌙' : activeStyle === 'slide' ? '↔️' : activeStyle === 'glitch' ? '⚡' : '🚫';
                    const isDragging = draggingIndex === idx;

                    return (
                      <div
                        key={`drag-${idx}`}
                        onMouseDown={() => setDraggingIndex(idx)}
                        className="absolute top-0 bottom-0 w-6 -ml-3 z-20 cursor-col-resize group flex flex-col items-center justify-between py-1"
                        style={{ left: `${posPct}%` }}
                      >
                        {/* Interactive vertical line */}
                        <div className={`w-0.5 h-full relative pointer-events-none flex flex-col justify-center items-center ${
                          isDragging ? "bg-purple-400 opacity-100" : "bg-purple-600 group-hover:bg-purple-500"
                        }`}>
                          {/* Circle Drag Anchor handle */}
                          <div className={`w-5 h-5 rounded-full absolute top-1/2 -mt-2.5 flex items-center justify-center text-[10px] select-none border shadow pointer-events-auto transition ${
                            isDragging 
                              ? "bg-purple-500 border-white text-white scale-110" 
                              : "bg-purple-950 border-purple-500 hover:border-purple-400 hover:scale-105"
                          }`}>
                            {emoji}
                          </div>

                          {/* Float helper time tooltip and live frame previews */}
                          <div className="absolute bottom-full mb-1.5 bg-zinc-950 text-white font-mono text-[9px] p-2 rounded-xl border border-purple-500/80 pointer-events-none opacity-0 group-hover:opacity-100 transition shadow-2xl flex flex-col gap-1.5 items-center z-30 whitespace-nowrap">
                            <div className="flex gap-1.5 items-center justify-center pointer-events-none">
                              <div className="flex flex-col items-center">
                                <span className="text-[7.5px] text-zinc-400 font-bold uppercase tracking-tight mb-0.5 font-sans">Saída</span>
                                <TransitionFramePreview 
                                  time={Math.max(0, pt - 0.4)} 
                                  selectedTemplateId={selectedTemplateId} 
                                  clips={clips} 
                                  settings={settings}
                                  width={48}
                                  height={27}
                                />
                              </div>
                              <div className="text-zinc-600 text-[8px] font-bold px-0.5 self-end mb-1">➔</div>
                              <div className="flex flex-col items-center">
                                <span className="text-[7.5px] text-zinc-400 font-bold uppercase tracking-tight mb-0.5 font-sans">Entrada</span>
                                <TransitionFramePreview 
                                  time={Math.min(settings.duration, pt + 0.4)} 
                                  selectedTemplateId={selectedTemplateId} 
                                  clips={clips} 
                                  settings={settings}
                                  width={48}
                                  height={27}
                                />
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1 self-center border-t border-zinc-800/80 w-full pt-1 justify-center pointer-events-none">
                              <span className="font-bold text-purple-400 uppercase tracking-wide text-[7.5px] font-sans">Ponto {idx + 1}:</span>
                              <span className="font-mono text-[8.5px] bg-purple-950/50 px-1 py-0.2 rounded border border-purple-900/60 font-bold text-zinc-100">{pt.toFixed(1)}s</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Dedicated per-interval transition styles selector UI */}
            <div className="mt-4 pt-4 border-t border-zinc-800/60">
              <div className="flex items-center gap-2 mb-2">
                <Sliders className="w-4 h-4 text-purple-400 font-bold" />
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Configuração de Transições por Ponto de Corte</h4>
              </div>
              <p className="text-[11px] text-zinc-400 mb-3.5 leading-relaxed">
                Personalize ou desabilite o efeito de corte para cada intervalo na linha do tempo individualmente.
              </p>

              {(() => {
                const points = transitionTimes;

                if (points.length === 0) {
                  return (
                    <div className="text-center py-3 text-[11.5px] text-zinc-500 italic bg-zinc-950/20 border border-zinc-900 rounded-xl">
                      A duração total do projeto é muito curta para requerer pontos de transição.
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {points.map((pt, idx) => {
                      const activeStyle = intervalTransitions[pt] !== undefined ? intervalTransitions[pt] : (settings.transitionStyle || "fade");
                      const prevBound = idx > 0 ? points[idx - 1] : 0;
                      
                      return (
                        <div 
                          key={pt}
                          className="bg-zinc-950/40 border border-zinc-850 p-3 rounded-xl flex flex-col gap-2.5 hover:border-zinc-800 transition"
                        >
                          <div className="flex justify-between items-center bg-zinc-900/10 px-0.5 rounded">
                            <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-purple-950 text-purple-300 flex items-center justify-center text-[9px] font-mono border border-purple-900/60 font-bold">
                                #{idx + 1}
                              </span>
                              Intersecção em <span className="font-mono text-purple-400 font-bold bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-900/40">{pt.toFixed(1)}s</span>
                            </span>
                            <span className="text-[9px] text-zinc-500 font-mono">
                              Corte: {prevBound.toFixed(1)}s → {pt.toFixed(1)}s
                            </span>
                          </div>

                          {/* Pre-and-post cut-point frame previews */}
                          <div className="bg-zinc-950/60 p-2 rounded-xl border border-zinc-900/50 flex justify-around items-center gap-2">
                            <div className="flex flex-col items-center">
                              <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Saída (Anterior)</span>
                              <div className="relative group/thumb">
                                <TransitionFramePreview 
                                  time={Math.max(0, pt - 0.4)} 
                                  selectedTemplateId={selectedTemplateId} 
                                  clips={clips} 
                                  settings={settings}
                                  width={80}
                                  height={45}
                                />
                                <div className="absolute inset-0 bg-purple-500/0 hover:bg-purple-500/5 transition rounded pointer-events-none" />
                                <span className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.2 rounded text-[7.5px] font-mono text-zinc-300 pointer-events-none">{(Math.max(0, pt - 0.4)).toFixed(1)}s</span>
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-center justify-center text-purple-500/80 font-bold bg-purple-950/30 w-7 h-7 rounded-full border border-purple-900/40 self-center shadow">
                              <span className="text-xs">⚡</span>
                            </div>

                            <div className="flex flex-col items-center">
                              <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Entrada (Próximo)</span>
                              <div className="relative group/thumb">
                                <TransitionFramePreview 
                                  time={Math.min(settings.duration, pt + 0.4)} 
                                  selectedTemplateId={selectedTemplateId} 
                                  clips={clips} 
                                  settings={settings}
                                  width={80}
                                  height={45}
                                />
                                <div className="absolute inset-0 bg-purple-500/0 hover:bg-purple-500/5 transition rounded pointer-events-none" />
                                <span className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.2 rounded text-[7.5px] font-mono text-zinc-300 pointer-events-none">{(Math.min(settings.duration, pt + 0.4)).toFixed(1)}s</span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-1">
                            {[
                              { id: "none" as const, label: "Nenhum", emoji: "🚫" },
                              { id: "fade" as const, label: "Fade", emoji: "🌙" },
                              { id: "slide" as const, label: "Deslizar", emoji: "↔️" },
                              { id: "glitch" as const, label: "Glitch", emoji: "⚡" }
                            ].map((opt) => {
                              const isSelected = activeStyle === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  onClick={() => {
                                    setIntervalTransitions(prev => ({
                                      ...prev,
                                      [pt]: opt.id
                                    }));
                                  }}
                                  className={`py-1.5 rounded-lg text-[10px] font-bold flex flex-col items-center justify-center gap-1 border transition cursor-pointer ${
                                    isSelected
                                      ? "bg-purple-950 border-purple-500 text-purple-200 shadow-md"
                                      : "bg-zinc-900/50 border-zinc-850 hover:border-zinc-700 text-zinc-400"
                                  }`}
                                  title={`${opt.label} no corte de ${pt}s`}
                                >
                                  <span className="text-xs">{opt.emoji}</span>
                                  <span className="text-[9px] truncate max-w-full font-medium">{opt.label}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Dynamic transition duration slider */}
                          {activeStyle !== "none" && (
                            <div className="mt-1 bg-purple-950/10 border border-purple-900/20 p-2 rounded-lg flex flex-col gap-1.5">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-zinc-400">Duração do Efeito:</span>
                                <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-950/40 px-1 py-0.5 rounded border border-purple-900/40">
                                  {(intervalDurations[pt] !== undefined ? intervalDurations[pt] : 0.8).toFixed(1)}s
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min="0.2"
                                  max="3.0"
                                  step="0.1"
                                  value={intervalDurations[pt] !== undefined ? intervalDurations[pt] : 0.8}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setIntervalDurations(prev => ({
                                      ...prev,
                                      [pt]: val
                                    }));
                                  }}
                                  className="flex-1 accent-purple-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                                />
                                <span className="text-[8px] text-zinc-500 font-mono whitespace-nowrap">3.0s máx</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <p className="text-[10px] text-zinc-500 mt-3.5 leading-relaxed">
              💡 <strong className="text-zinc-400">Dica Kassongo:</strong> Clique nas barras de blocos acima para selecionar o texto ou o sticker e alterar suas configurações na barra lateral direita.
            </p>
          </div>
        </div>

        {/* Control and Properties Sidebar Panel (Col 5 / 12) */}
        <div className="lg:col-span-6 xl:col-span-5 flex flex-col gap-6">
          
          {/* Properties Nav tab bar */}
          <div className="flex bg-zinc-900 rounded-xl p-1.5 border border-zinc-800 shadow-md">
            {[
              { id: "templates", label: "Modelos", icon: Film },
              { id: "subtitles", label: "Textos", icon: TypeIcon },
              { id: "stickers", label: "Adesivos", icon: Smile },
              { id: "ai-wizard", label: "Kassongo AI", icon: Wand2 },
              { id: "filters", label: "Filtros", icon: Sliders },
              { id: "voiceover", label: "Gravador", icon: Mic },
              { id: "sfx", label: "Efeitos", icon: Volume2 },
            ].map((tab) => (
              <button
                key={tab.id}
                id={`tab-button-${tab.id}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-2 px-1 text-[11px] font-bold rounded-lg flex flex-col items-center gap-1 transition ${
                  activeTab === tab.id
                    ? "bg-purple-600 text-white shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <tab.icon className="w-4 h-4 cursor-pointer" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab content area */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg min-h-[460px] flex flex-col">
            
            {/* 1. Templates Tab View */}
            {activeTab === "templates" && (
              <div className="flex flex-col gap-4 flex-1">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 mb-1">Escolha um Modelo TikTok/Reels</h3>
                  <p className="text-xs text-zinc-400">Crie layouts de virais instantaneamente superiores ao CapCut.</p>
                </div>

                <div className="flex flex-col gap-3 max-h-[290px] overflow-y-auto pr-1">
                  {MEME_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      onClick={() => setSelectedTemplateId(tmpl.id)}
                      className={`w-full text-left p-4 rounded-xl border transition duration-200 flex items-center justify-between ${
                        selectedTemplateId === tmpl.id
                          ? "bg-purple-950/40 border-purple-500 text-purple-100 shadow-lg"
                          : "bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full ${
                            selectedTemplateId === tmpl.id ? "bg-purple-500/20 text-purple-300" : "bg-zinc-800 text-zinc-400"
                          }`}>
                            MODELO {tmpl.aspectRatio}
                          </span>
                          <span className="text-[10px] font-mono text-pink-400">⚡ 15 segundos</span>
                        </div>
                        <h4 className="font-bold text-xs">{tmpl.name}</h4>
                        <p className="text-[11px] text-zinc-500 mt-0.5 mt-1">{tmpl.vibe}</p>
                      </div>

                      {selectedTemplateId === tmpl.id && (
                        <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Import Custom Procedural Stock Video Clips */}
                <div className="mt-4 pt-4 border-t border-zinc-800">
                  <h4 className="text-xs font-bold text-zinc-300 mb-2 uppercase tracking-wider">Mudar Fundo de Vídeo Stock</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {PROCEDURAL_VIDEO_CLIPS.map((clip) => (
                      <button
                        key={clip.id}
                        onClick={() => {
                          setSelectedTemplateId(null); // break template selection to let custom sequence take place
                          setClips([{
                            id: clip.id,
                            name: clip.name,
                            url: "",
                            duration: clip.duration,
                            startTrim: 0,
                            endTrim: clip.duration,
                            hue: 200,
                            thumbnailColor: clip.thumbnailColor,
                            videoType: "ambient"
                          }]);
                          setSettings(prev => ({ ...prev, duration: clip.duration }));
                        }}
                        className={`p-2.5 rounded-lg border text-left text-[11px] transition ${
                          clips[0]?.id === clip.id
                            ? "bg-pink-950/30 border-pink-500 text-pink-200"
                            : "bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300"
                        }`}
                      >
                        <div className={`w-full h-8 rounded ${clip.thumbnailColor} mb-2`}></div>
                        <span className="font-bold block truncate">{clip.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Subtitles Tab View */}
            {activeTab === "subtitles" && (
              <div className="flex flex-col gap-4 flex-1">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100">Editor de Legendas Legíveis</h3>
                    <p className="text-xs text-zinc-400">Edite textos com estilos que as pessoas param para ler.</p>
                  </div>
                  <button
                    id="btn-add-text-subtitle"
                    onClick={handleAddSubtitle}
                    className="p-1 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center gap-1.5 text-xs font-bold transition active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Novo</span>
                  </button>
                </div>

                {/* Selected Subtitle Edit panel */}
                {activeSubtitleIndex !== null && subtitles[activeSubtitleIndex] ? (
                  <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800 flex flex-col gap-3.5">
                    <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Propriedades do Texto</span>
                      <button
                        id="btn-delete-selected-subtitle"
                        onClick={() => handleDeleteSubtitle(activeSubtitleIndex)}
                        className="text-red-400 hover:text-red-300 text-xs font-semibold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Deletar</span>
                      </button>
                    </div>

                    {/* Text field content input */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-zinc-400 font-bold">Conteúdo da Legenda</label>
                      <textarea
                        value={subtitles[activeSubtitleIndex].text}
                        onChange={(e) => handleUpdateSubtitle(activeSubtitleIndex, { text: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-lg p-2.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Font Family selection */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-zinc-400 font-bold">Fonte</label>
                        <select
                          value={subtitles[activeSubtitleIndex].fontFamily}
                          onChange={(e) => handleUpdateSubtitle(activeSubtitleIndex, { fontFamily: e.target.value as any })}
                          className="w-full bg-zinc-900 border border-zinc-850 rounded-lg p-2 text-xs text-zinc-300"
                        >
                          <option value="Space Grotesk">Space Grotesk (Trendy)</option>
                          <option value="Inter">Inter (Classic)</option>
                          <option value="Playfair Display">Playfair (Cinematographic)</option>
                          <option value="JetBrains Mono">JetBrains Mono (Modern)</option>
                        </select>
                      </div>

                      {/* Font Style preset */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-zinc-400 font-bold">Opção de Balão</label>
                        <select
                          value={subtitles[activeSubtitleIndex].fontStyle}
                          onChange={(e) => handleUpdateSubtitle(activeSubtitleIndex, { fontStyle: e.target.value as any })}
                          className="w-full bg-zinc-900 border border-zinc-850 rounded-lg p-2 text-xs text-zinc-300"
                        >
                          <option value="clean">Plano Simples</option>
                          <option value="neon">Brilho Neon</option>
                          <option value="bubble-gum">Balão Rosa</option>
                          <option value="ransom-note">Etiqueta Amarela</option>
                          <option value="vhs-bold">Televisão VHS</option>
                        </select>
                      </div>
                    </div>

                    {/* Colors & size slider */}
                    <div className="grid grid-cols-2 gap-3 items-center">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-zinc-400 font-bold">Tamanho ({subtitles[activeSubtitleIndex].fontSize}px)</label>
                        <input
                          type="range"
                          min={12}
                          max={60}
                          value={subtitles[activeSubtitleIndex].fontSize}
                          onChange={(e) => handleUpdateSubtitle(activeSubtitleIndex, { fontSize: parseInt(e.target.value) })}
                          className="w-full accent-purple-500 bg-zinc-900 rounded"
                        />
                      </div>

                      {/* Fast color presets */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-zinc-400 font-bold">Cor Primária</label>
                        <div className="flex gap-2">
                          {["#ffffff", "#facc15", "#fb7185", "#38bdf8", "#10b981"].map((col) => (
                            <button
                              key={col}
                              onClick={() => handleUpdateSubtitle(activeSubtitleIndex, { color: col })}
                              className={`w-5 h-5 rounded-full border ${subtitles[activeSubtitleIndex].color === col ? "border-white" : "border-transparent"}`}
                              style={{ backgroundColor: col }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Timestamps adjustment */}
                    <div className="grid grid-cols-2 gap-2 mt-1 pt-2 border-t border-zinc-900">
                      <div>
                        <label className="text-[10px] text-zinc-500 font-bold uppercase">Começar em ({subtitles[activeSubtitleIndex].startTime.toFixed(1)}s)</label>
                        <input
                          type="range"
                          min={0}
                          max={settings.duration}
                          step={0.1}
                          value={subtitles[activeSubtitleIndex].startTime}
                          onChange={(e) => handleUpdateSubtitle(activeSubtitleIndex, { startTime: parseFloat(e.target.value) })}
                          className="w-full accent-purple-500 bg-zinc-900 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 font-bold uppercase">Terminar em ({subtitles[activeSubtitleIndex].endTime.toFixed(1)}s)</label>
                        <input
                          type="range"
                          min={0}
                          max={settings.duration}
                          step={0.1}
                          value={subtitles[activeSubtitleIndex].endTime}
                          onChange={(e) => handleUpdateSubtitle(activeSubtitleIndex, { endTime: parseFloat(e.target.value) })}
                          className="w-full accent-purple-500 bg-zinc-900 rounded"
                        />
                      </div>
                    </div>

                    {/* Vertical / Horizontal Alignment slider */}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <label className="text-[10px] text-zinc-500 font-bold uppercase">Posição Y ({subtitles[activeSubtitleIndex].y}%)</label>
                        <input
                          type="range"
                          min={5}
                          max={95}
                          value={subtitles[activeSubtitleIndex].y}
                          onChange={(e) => handleUpdateSubtitle(activeSubtitleIndex, { y: parseInt(e.target.value) })}
                          className="w-full h-1.5 accent-pink-500 bg-zinc-900 rounded"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase">Animação</span>
                        <select
                          value={subtitles[activeSubtitleIndex].animation}
                          onChange={(e) => handleUpdateSubtitle(activeSubtitleIndex, { animation: e.target.value as any })}
                          className="bg-zinc-900 border border-zinc-800 text-xs rounded p-1 text-zinc-300"
                        >
                          <option value="none">Nenhuma</option>
                          <option value="bounce">Pular Ritmo</option>
                          <option value="zoom">Zoom</option>
                          <option value="pulse">Pulsação</option>
                          <option value="fade">Esmaecer (Fade)</option>
                        </select>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-zinc-950/40 rounded-xl border border-dashed border-zinc-800">
                    <TypeIcon className="w-10 h-10 text-zinc-600 mb-3" />
                    <span className="text-xs text-zinc-400 font-bold">Nenhum Texto Ativo</span>
                    <p className="text-[11px] text-zinc-500 mt-1 max-w-[240px]">
                      Para editar, selecione qualquer bloco de texto na Linha do Tempo ou crie um novo.
                    </p>
                  </div>
                )}

                {/* Listing of subtitles */}
                <div className="mt-2">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Histórico de Linhas</span>
                  <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {subtitles.map((sub, idx) => (
                      <button
                        key={sub.id}
                        onClick={() => setActiveSubtitleIndex(idx)}
                        className={`w-full text-left p-2 rounded text-xs transition border flex justify-between items-center ${
                          activeSubtitleIndex === idx
                            ? "bg-purple-950/50 border-purple-500 text-purple-200"
                            : "bg-zinc-950/50 border-zinc-900 text-zinc-400 hover:text-zinc-300"
                        }`}
                      >
                        <span className="truncate">{sub.text}</span>
                        <span className="font-mono text-[9px] text-zinc-500">{sub.startTime.toFixed(1)}s - {sub.endTime.toFixed(1)}s</span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* 3. Stickers Tab View */}
            {activeTab === "stickers" && (
              <div className="flex flex-col gap-4 flex-1">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 mb-1">Stickers Adesivos & Memes</h3>
                  <p className="text-xs text-zinc-400">Insira slogans vibrantes e divertidos com animações de rotação.</p>
                </div>

                {/* Sticker Library */}
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2 text-purple-400">Templates de Adesivo</span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { text: "💯 GOAT", color: "#10b981" },
                      { text: "🔥 VIRAL RITMO", color: "#f59e0b" },
                      { text: "🍿 SHOCK!", color: "#ec4899" },
                      { text: "⭐ PREMIUM VIP", color: "#a855f7" },
                      { text: "👑 KASSONGO", color: "#e11d48" },
                      { text: "🎬 TAKE UM", color: "#22c55e" }
                    ].map((st, i) => (
                      <button
                        key={i}
                        onClick={() => handleAddSticker(st.text, st.color)}
                        className="py-1.5 px-3 rounded-lg text-xs font-bold text-black text-center transition hover:scale-105"
                        style={{ backgroundColor: st.color }}
                      >
                        {st.text}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active Sticker Edit panel */}
                {activeStickerIndex !== null && stickers[activeStickerIndex] ? (
                  <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-850 mt-2 flex flex-col gap-3">
                    <div className="flex justify-between items-center decoration-transparent">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase">Adesivo Ativo</span>
                      <button
                        onClick={() => handleDeleteSticker(activeStickerIndex)}
                        className="text-red-400 text-xs flex items-center gap-1 font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 items-center">
                      <div className="flex flex-col gap-1 col-span-2">
                        <label className="text-[10px] text-zinc-400 font-bold">Frase do Adesivo</label>
                        <input
                          type="text"
                          value={stickers[activeStickerIndex].text}
                          onChange={(e) => handleUpdateSticker(activeStickerIndex, { text: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-xs text-white"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-zinc-400 font-bold">Escala ({stickers[activeStickerIndex].scale}x)</label>
                        <input
                          type="range"
                          min={0.5}
                          max={3}
                          step={0.1}
                          value={stickers[activeStickerIndex].scale}
                          onChange={(e) => handleUpdateSticker(activeStickerIndex, { scale: parseFloat(e.target.value) })}
                          className="w-full accent-purple-500 bg-zinc-900"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-zinc-400 font-bold">Rotação ({stickers[activeStickerIndex].rotation}°)</label>
                        <input
                          type="range"
                          min={-180}
                          max={180}
                          value={stickers[activeStickerIndex].rotation}
                          onChange={(e) => handleUpdateSticker(activeStickerIndex, { rotation: parseInt(e.target.value) })}
                          className="w-full accent-purple-500 bg-zinc-900"
                        />
                      </div>
                    </div>

                    {/* Coordinates position and duration editing */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-zinc-500">Posição X ({stickers[activeStickerIndex].x}%)</label>
                        <input
                          type="range"
                          min={10}
                          max={90}
                          value={stickers[activeStickerIndex].x}
                          onChange={(e) => handleUpdateSticker(activeStickerIndex, { x: parseInt(e.target.value) })}
                          className="w-full accent-pink-500 bg-zinc-900"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500">Posição Y ({stickers[activeStickerIndex].y}%)</label>
                        <input
                          type="range"
                          min={10}
                          max={90}
                          value={stickers[activeStickerIndex].y}
                          onChange={(e) => handleUpdateSticker(activeStickerIndex, { y: parseInt(e.target.value) })}
                          className="w-full accent-pink-500 bg-zinc-900"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className="text-[11px] text-zinc-500 text-center italic mt-4 block">
                    Selecione um sticker de legenda para alterar posições relativas e rotação.
                  </span>
                )}
              </div>
            )}

            {/* 4. Kassongo AI Genius Script Generator Tab View */}
            {activeTab === "ai-wizard" && (
              <div className="flex flex-col gap-4 flex-1">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-4 h-4 text-purple-400 fill-current" />
                    <span>Criação Virtual com Gemini AI</span>
                  </h3>
                  <p className="text-xs text-zinc-400">Gere um roteiro completo de vídeo, falas, legendas e estilo com Inteligência Artificial.</p>
                </div>

                <div className="flex flex-col gap-3.5 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">Qual é o tema do seu vídeo?</label>
                    <textarea
                      value={aiConceptInput}
                      onChange={(e) => setAiConceptInput(e.target.value)}
                      placeholder="Ex: Vlog de viagem em Luanda com ritmo rápido no pôr do sol..."
                      className="w-full bg-zinc-900 border border-zinc-850 rounded-lg p-2.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-zinc-400 font-bold">Duração</label>
                      <select
                        value={aiDuration}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setAiDuration(val);
                          setSettings(prev => ({ ...prev, duration: val }));
                        }}
                        className="bg-zinc-900 border border-zinc-850 text-xs rounded-lg p-2 text-zinc-300 pointer-events-auto"
                      >
                        <option value={10}>10 Segundos</option>
                        <option value={15}>15 Segundos</option>
                        <option value={20}>20 Segundos</option>
                        <option value={30}>30 Segundos</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-zinc-400 font-bold">Língua</label>
                      <select
                        value={aiLanguage}
                        onChange={(e) => setAiLanguage(e.target.value)}
                        className="bg-zinc-900 border border-zinc-850 text-xs rounded-lg p-2 text-zinc-300 pointer-events-auto"
                      >
                        <option value="pt-BR">Português (BR)</option>
                        <option value="en-US">English (US)</option>
                        <option value="fr-FR">Français (FR)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    id="submit-ai-generator"
                    onClick={handleAITemplateGeneration}
                    disabled={isGeneratingAI}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-zinc-800 disabled:to-zinc-800 text-white font-bold text-xs uppercase py-3 px-4 rounded-lg flex items-center justify-center gap-2 shadow-lg transition duration-200 mt-1 active:scale-95"
                  >
                    {isGeneratingAI ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-purple-300" />
                        <span>Configurando seu Kassongo...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        <span>Gerar Vídeo com Gemini AI</span>
                      </>
                    )}
                  </button>
                </div>

                {aiMessage && (
                  <div className="bg-purple-950/30 border border-purple-900/50 rounded-xl p-3 flex items-start gap-2 text-xs text-purple-300">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{aiMessage}</span>
                  </div>
                )}

                {lastGeneratedScript && (
                  <div className="bg-zinc-950/60 p-3 rounded border border-zinc-800 text-xs">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-pink-400 block mb-1">Resultado AI Ativo</span>
                    <p className="font-bold text-zinc-200">{lastGeneratedScript.title}</p>
                    <div className="flex gap-2 flex-wrap mt-1.5">
                      <span className="bg-purple-900/40 text-purple-200 text-[10px] px-2 py-0.5 rounded-full">
                        Vibe: {lastGeneratedScript.soundtrackStyle}
                      </span>
                      <span className="bg-pink-900/40 text-pink-200 text-[10px] px-2 py-0.5 rounded-full">
                        Filtro recomendado: {lastGeneratedScript.suggestedFilter}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 5. Audio and Video Filters Tab View */}
            {activeTab === "filters" && (
              <div className="flex flex-col gap-4 flex-1">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 mb-1">Filtros de Cor Sombria & Custom</h3>
                  <p className="text-xs text-zinc-400">Aplique o estilo perfeito de cores de estúdio com um único toque.</p>
                </div>

                {/* Video Filters Selector */}
                <div className="grid grid-cols-2 gap-2 max-h-[170px] overflow-y-auto pr-1">
                  {BUILTIN_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSettings(prev => ({ ...prev, selectedFilter: f.id }))}
                      className={`p-3 rounded-xl border text-left text-xs transition relative overflow-hidden ${
                        settings.selectedFilter === f.id
                          ? "bg-purple-950/30 border-purple-500 text-purple-200"
                          : "bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400"
                      }`}
                    >
                      <span className="font-bold block mb-1">{f.name}</span>
                      <span className="text-[10px] text-zinc-500 font-mono italic truncate">{f.filter}</span>
                      {settings.selectedFilter === f.id && (
                        <div className="absolute top-2 right-2 bg-purple-500 text-white p-0.5 rounded-full">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Transitions Selector Panel */}
                <div className="mt-2 pt-4 border-t border-zinc-900">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Transição de Clipes (Efeito)</h4>
                    <span className="bg-purple-950/50 border border-purple-800 text-purple-300 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold tracking-tight">
                      {settings.transitionStyle || "none"}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mb-3">Defina o efeito de passagem que ocorre automaticamente a cada 5 segundos.</p>

                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: "none", name: "Nenhum", desc: "Corte seco", icon: "🚫" },
                      { id: "fade", name: "Fade", desc: "Suave", icon: "🌙" },
                      { id: "slide", name: "Deslizar", desc: "Passagem linear", icon: "↔️" },
                      { id: "glitch", name: "Glitch", desc: "Ruído digital", icon: "⚡" }
                    ].map((t) => {
                      const isActive = (settings.transitionStyle || "none") === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setSettings(prev => ({ ...prev, transitionStyle: t.id as any }))}
                          className={`p-2 rounded-xl border text-center transition flex flex-col justify-between items-center gap-1 min-h-[75px] ${
                            isActive
                              ? "bg-purple-950/40 border-purple-500 text-purple-200 shadow-md shadow-purple-950/30"
                              : "bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400"
                          }`}
                        >
                          <span className="text-lg">{t.icon}</span>
                          <div>
                            <span className="font-bold block text-[10px] leading-tight text-zinc-200">{t.name}</span>
                            <span className="text-[9px] text-zinc-500 block leading-none font-mono mt-0.5">{t.desc}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Soundtrack selector block */}
                <div className="mt-4 pt-4 border-t border-zinc-800">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Trilha Sonora Kuduro & Synth</h4>
                    <span className="text-[10px] text-zinc-500">Volume Base</span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {audioTracks.map((track) => (
                      <button
                        key={track.id}
                        onClick={() => {
                          setAudioTracks(prev => prev.map(t => ({
                            ...t,
                            isActive: t.id === track.id ? !t.isActive : false
                          })));
                          triggerSynthSound(track.synthNote);
                        }}
                        className={`w-full text-left p-3 rounded-lg border text-xs flex justify-between items-center transition ${
                          track.isActive
                            ? "bg-purple-950/40 border-purple-500 text-purple-200"
                            : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                        }`}
                      >
                        <div>
                          <span className="font-bold text-zinc-200 block">{track.name}</span>
                          <span className="text-[10px] text-zinc-500">{track.vibe}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-zinc-500">Synth {track.synthNote}Hz</span>
                          {track.isActive && (
                            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Volume Slider controller */}
                  <div className="flex items-center gap-3 mt-4 bg-zinc-950 p-2.5 rounded-lg border border-zinc-850">
                    <Volume2 className="w-4 h-4 text-purple-400" />
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={audioVibeVolume}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setAudioVibeVolume(v);
                        if (gainNodeRef.current && audioCtxRef.current) {
                          gainNodeRef.current.gain.setValueAtTime(v * 0.15 * settings.volume, audioCtxRef.current.currentTime);
                        }
                      }}
                      className="flex-1 accent-purple-500 bg-zinc-900"
                    />
                    <span className="font-mono text-xs text-zinc-400">{(audioVibeVolume * 100).toFixed(0)}%</span>
                  </div>

                  {/* Auto-Audio-Duck Switcher & Active Indicator */}
                  <div className="mt-4 pt-4 border-t border-zinc-900 bg-zinc-950/40 p-3 rounded-xl border border-zinc-900">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                        ⚡ Auto-Audio-Duck (IA)
                      </span>
                      <label id="auto-ducking-switch" className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.autoDucking || false}
                          onChange={(e) => setSettings(prev => ({ ...prev, autoDucking: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600 peer-checked:after:bg-zinc-100"></div>
                      </label>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-snug">
                      Atenua automaticamente a trilha sonora em <strong className="text-purple-300">65%</strong> quando houver legendas ou figurinhas (efeitos) em exibição para máxima clareza da fala.
                    </p>

                    {settings.autoDucking && (
                      <div className="mt-2.5 flex items-center justify-between bg-zinc-950 px-2.5 py-1.5 rounded border border-zinc-850">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">Status em tempo-real:</span>
                        {(() => {
                          const hasSub = subtitles.some(sub => currentTime >= sub.startTime && currentTime <= sub.endTime);
                          const hasStik = stickers.some(st => currentTime >= st.startTime && currentTime <= st.endTime);
                          const isDucking = hasSub || hasStik;
                          return isDucking && isPlaying ? (
                            <span className="text-[9px] font-mono bg-purple-950/40 text-purple-300 px-2 py-0.5 rounded border border-purple-800 flex items-center gap-1 font-bold animate-pulse">
                              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping"></span>
                              🔈 REDUZIDO (-65%)
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono bg-zinc-900 text-zinc-500 px-2 py-0.5 rounded border border-zinc-800 font-bold">
                              🔊 TRILHA PLENA
                            </span>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                </div>

              </div>
            )}

            {/* 6. Voiceover Recording Tab View */}
            {activeTab === "voiceover" && (
              <div className="flex flex-col gap-4 flex-1">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 mb-1">Gravador de Voz & Narração</h3>
                  <p className="text-xs text-zinc-400">Adicione uma narração personalizada via microfone ao seu vídeo Kassongo.</p>
                </div>

                {/* Main Recording Console */}
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 flex flex-col items-center justify-center text-center relative overflow-hidden">
                  
                  {/* Subtle pulsing glow if recording */}
                  {isRecording && (
                    <div className="absolute inset-0 bg-red-950/10 pointer-events-none animate-pulse"></div>
                  )}

                  <div className="mb-3">
                    {isRecording ? (
                      <div className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center animate-pulse cursor-pointer shadow-lg shadow-red-900/40 border-4 border-red-950" onClick={stopVoiceRecording}>
                        <div className="w-5 h-5 bg-white rounded-sm"></div>
                      </div>
                    ) : (
                      <button
                        onClick={startVoiceRecording}
                        className="w-16 h-16 rounded-full bg-red-700 hover:bg-red-600 flex items-center justify-center cursor-pointer shadow-lg shadow-red-900/30 border-4 border-red-900 group transition-all transform hover:scale-105 active:scale-95"
                      >
                        <Mic className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                      </button>
                    )}
                  </div>

                  <div className="text-sm font-bold tracking-tight text-zinc-200">
                    {isRecording ? (
                      <span className="text-red-500 animate-pulse flex items-center justify-center gap-1.5 font-mono">
                        🔴 GRAVANDO: {recordingTime.toFixed(1)}s
                      </span>
                    ) : (
                      <span className="text-zinc-300">Gravar Narração</span>
                    )}
                  </div>

                  <div className="text-[10px] text-zinc-500 mt-1 max-w-[250px] leading-relaxed">
                    {isRecording ? (
                      "Fale no seu microfone. O vídeo está sendo reproduzido para te ajudar a sincronizar!"
                    ) : (
                      `Iniciará exatamente no tempo do marcador: ${currentTime.toFixed(1)}s`
                    )}
                  </div>

                  {/* Wave Visualizer Animation */}
                  {isRecording && (
                    <div className="flex items-center justify-center gap-1.5 mt-4 h-6 w-full px-4 select-none">
                      {[1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4].map((item, idx) => {
                        const heights = ["h-2", "h-4", "h-6", "h-3", "h-5"];
                        const hClass = heights[(idx + Math.floor(recordingTime * 5)) % heights.length];
                        return (
                          <div
                            key={idx}
                            className={`w-1 bg-red-500 rounded-full transition-all duration-100 ${hClass}`}
                          ></div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Voiceovers Management list */}
                <div className="mt-2 flex-1 flex flex-col gap-2">
                  <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex justify-between items-center">
                    <span>Narrações Gravadas ({audioTracks.filter(t => t.isVoiceover).length})</span>
                    {audioTracks.filter(t => t.isVoiceover).length > 0 && (
                      <button
                        onClick={() => setAudioTracks(prev => prev.filter(t => !t.isVoiceover))}
                        className="text-[9px] hover:text-red-400 transition-colors uppercase cursor-pointer font-bold"
                      >
                        Limpar Todas
                      </button>
                    )}
                  </h4>

                  <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1">
                    {audioTracks.filter(t => t.isVoiceover).map((track) => (
                      <div
                        key={track.id}
                        className={`p-3 rounded-xl border text-xs flex flex-col gap-2 transition ${
                          track.isActive
                            ? "bg-blue-950/20 border-blue-500/80 text-blue-200"
                            : "bg-zinc-950 border-zinc-800 text-zinc-400"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base select-none">🗣️</span>
                            <div>
                              <span className="font-bold text-zinc-200 block">{track.name}</span>
                              <span className="text-[9px] text-zinc-500 block font-mono">
                                Início: {track.startTime?.toFixed(1)}s • Duração: {track.duration?.toFixed(1)}s
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {/* Toggle active state */}
                            <button
                              onClick={() => {
                                setAudioTracks(prev => prev.map(t => t.id === track.id ? { ...t, isActive: !t.isActive } : t));
                              }}
                              className={`px-2 py-0.5 rounded text-[9px] font-mono leading-none border transition ${
                                track.isActive
                                  ? "bg-blue-600/30 border-blue-500 text-blue-300"
                                  : "bg-zinc-900 border-zinc-800 text-zinc-500"
                              }`}
                            >
                              {track.isActive ? "Ativo" : "Mudo"}
                            </button>

                            {/* Delete specific track */}
                            <button
                              onClick={() => {
                                setAudioTracks(prev => prev.filter(t => t.id !== track.id));
                              }}
                              className="text-zinc-500 hover:text-red-400 p-0.5 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Track individual Volume slider */}
                        <div className="flex items-center gap-2 bg-zinc-950/20 p-1.5 rounded border border-zinc-900/50 justify-between">
                          <Volume2 className="w-3 h-3 text-zinc-500 shrink-0" />
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.1}
                            value={track.volume}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setAudioTracks(prev => prev.map(t => t.id === track.id ? { ...t, volume: val } : t));
                            }}
                            className="flex-1 h-1 bg-zinc-800 accent-blue-500 mx-2"
                          />
                          <span className="font-mono text-[9px] text-zinc-500 shrink-0">{(track.volume * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}

                    {audioTracks.filter(t => t.isVoiceover).length === 0 && (
                      <div className="text-center py-6 text-[11px] text-zinc-500 border border-dashed border-zinc-850 rounded-xl leading-relaxed animate-fade-in">
                        Nenhuma narração criada ainda.<br />
                        Clique no <strong className="text-zinc-400">Botão Vermelho</strong> acima para gravar sua própria voz!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 7. Sound Effects (SFX) Tab View */}
            {activeTab === "sfx" && (
              <div className="flex flex-col gap-4 flex-1 animate-fade-in">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 mb-1">Efeitos Sonoros (SFX)</h3>
                  <p className="text-xs text-zinc-400">Adicione efeitos sonoros divertidos posicionados exatamente no cursor da linha do tempo.</p>
                </div>

                {/* Placement assistant banner */}
                <div className="bg-zinc-950 p-3 flex items-center justify-between text-xs rounded-xl border border-zinc-850">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse"></div>
                    <span className="text-zinc-300 font-bold">Cursor de Inserção:</span>
                  </div>
                  <span className="font-mono text-purple-400 font-bold bg-purple-950/40 px-2 py-0.5 rounded border border-purple-900/40">
                    {currentTime.toFixed(1)}s
                  </span>
                </div>

                {/* Gallery Grid */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Galeria de SFX</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { type: "woosh" as const, emoji: "💨", name: "Woosh", desc: "Transição de ar" },
                      { type: "pop" as const, emoji: "🎈", name: "Pop", desc: "Bolha/balão" },
                      { type: "risada" as const, emoji: "😂", name: "Risada", desc: "Meme engraçado" }
                    ].map((item) => (
                      <div 
                        key={item.type}
                        className="flex flex-col rounded-xl bg-zinc-900 border border-zinc-800 p-2 text-center relative group hover:border-zinc-700 transition"
                      >
                        <span className="text-2xl mb-1 group-hover:scale-110 transition-transform select-none">{item.emoji}</span>
                        <span className="text-xs font-bold text-zinc-200 block">{item.name}</span>
                        <span className="text-[9px] text-zinc-500 block mb-2 leading-none">{item.desc}</span>
                        
                        <div className="flex flex-col gap-1 mt-auto">
                          {/* Listen Preview */}
                          <button 
                            onClick={() => triggerSfx(item.type, 1.0)}
                            className="py-1 px-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-[10px] font-bold text-zinc-300 border border-zinc-800 transition cursor-pointer"
                          >
                            Ouvir
                          </button>
                          
                          {/* Insert at currentTime */}
                          <button 
                            onClick={() => {
                              triggerSfx(item.type, 1.0); // play sample feedback
                              const newSfx: SfxOverlay = {
                                id: `sfx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                                type: item.type,
                                name: item.name,
                                startTime: Number(currentTime.toFixed(1)),
                                duration: item.type === "risada" ? 0.8 : item.type === "woosh" ? 0.5 : 0.1,
                                volume: 1.0
                              };
                              setSfxList(prev => [...prev, newSfx].sort((a,b) => a.startTime - b.startTime));
                            }}
                            className="py-1 px-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Inserir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Placed SFX manager list */}
                <div className="flex-1 flex flex-col gap-2 mt-1">
                  <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex justify-between items-center pl-1">
                    <span>Sons na Linha do Tempo ({sfxList.length})</span>
                    {sfxList.length > 0 && (
                      <button 
                        onClick={() => setSfxList([])}
                        className="text-[9px] text-zinc-500 hover:text-red-400 font-bold uppercase cursor-pointer"
                      >
                        Limpar Todos
                      </button>
                    )}
                  </h4>

                  <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {sfxList.map((sfx) => (
                      <div 
                        key={sfx.id}
                        className="p-2 rounded-xl bg-zinc-950 border border-zinc-850 text-xs flex flex-col gap-1.5 hover:border-zinc-800 transition"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base select-none">
                              {sfx.type === "woosh" ? "💨" : sfx.type === "pop" ? "🎈" : "😂"}
                            </span>
                            <div>
                              <span className="font-bold text-zinc-200">{sfx.name}</span>
                              <span className="text-[9px] text-zinc-500 block font-mono">
                                Pos: {sfx.startTime.toFixed(1)}s
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {/* Nudge buttons for exact fine-tuning on playhead */}
                            <button
                              onClick={() => {
                                const nextTime = Math.max(0, Number((sfx.startTime - 0.1).toFixed(1)));
                                setSfxList(prev => prev.map(item => item.id === sfx.id ? { ...item, startTime: nextTime } : item));
                              }}
                              className="w-4 h-4 rounded bg-zinc-900 border border-zinc-800 hover:text-white flex items-center justify-center text-[10px] hover:bg-zinc-800 font-bold cursor-pointer"
                              title="Ajustar -0.1s"
                            >
                              -
                            </button>
                            <button
                              onClick={() => {
                                const nextTime = Math.min(settings.duration, Number((sfx.startTime + 0.1).toFixed(1)));
                                setSfxList(prev => prev.map(item => item.id === sfx.id ? { ...item, startTime: nextTime } : item));
                              }}
                              className="w-4 h-4 rounded bg-zinc-900 border border-zinc-800 hover:text-white flex items-center justify-center text-[10px] hover:bg-zinc-800 font-bold cursor-pointer"
                              title="Ajustar +0.1s"
                            >
                              +
                            </button>
                            
                            {/* Manual direct time input */}
                            <input 
                              type="number"
                              min={0}
                              max={settings.duration}
                              step={0.1}
                              value={sfx.startTime}
                              onChange={(e) => {
                                const val = Math.max(0, Math.min(settings.duration, parseFloat(e.target.value) || 0));
                                setSfxList(prev => prev.map(item => item.id === sfx.id ? { ...item, startTime: Number(val.toFixed(1)) } : item));
                              }}
                              className="w-8 h-4 text-center text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono rounded"
                              title="Editar tempo em segundos"
                            />

                            {/* Instant play preview button */}
                            <button 
                              onClick={() => triggerSfx(sfx.type, sfx.volume)}
                              className="text-zinc-500 hover:text-purple-400 p-0.5 transition-colors cursor-pointer text-[10.5px]"
                              title="Testar som"
                            >
                              🔊
                            </button>

                            {/* Delete button */}
                            <button 
                              onClick={() => setSfxList(prev => prev.filter(item => item.id !== sfx.id))}
                              className="text-zinc-500 hover:text-red-400 p-0.5 transition-colors cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Individual Sound Volume slider */}
                        <div className="flex items-center gap-1.5 bg-zinc-900 bg-opacity-30 px-1.5 py-1 rounded border border-zinc-900 justify-between">
                          <Volume2 className="w-3 h-3 text-zinc-500 shrink-0" />
                          <input 
                            type="range"
                            min={0} 
                            max={1} 
                            step={0.1}
                            value={sfx.volume}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setSfxList(prev => prev.map(item => item.id === sfx.id ? { ...item, volume: val } : item));
                            }}
                            className="flex-1 h-1 bg-zinc-800 accent-purple-500 mx-1.5"
                          />
                          <span className="font-mono text-[9px] text-zinc-500 shrink-0">{(sfx.volume * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}

                    {sfxList.length === 0 && (
                      <div className="text-center py-5 text-[11px] text-zinc-500 border border-dashed border-zinc-800 rounded-xl leading-relaxed">
                        Nenhum efeito na linha do tempo.<br />
                        Clique em <strong className="text-purple-400 hover:underline cursor-pointer font-bold" onClick={() => triggerSfx("woosh", 1)}>Inserir</strong> acima para adicionar na posição atual!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom active feedback overlay parameters */}
            <div className="mt-auto pt-4 border-t border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-zinc-500">
                <Layers className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Tracks</span>
              </div>
              <div className="flex gap-2">
                <span className="bg-zinc-950 text-zinc-400 px-2 py-0.5 rounded text-[10px] font-mono border border-zinc-850">
                  {subtitles.length} Subtitles
                </span>
                <span className="bg-zinc-950 text-zinc-400 px-2 py-0.5 rounded text-[10px] font-mono border border-zinc-850">
                  {stickers.length} Stickers
                </span>
              </div>
            </div>

          </div>
        </div>

      </main>

      {/* 3. Aesthetic comparison features & documentation footer of why Kassongo is better */}
      <section id="comparison-section" className="bg-zinc-900 border-t border-zinc-800/80 p-8 lg:p-12 mt-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[10px] text-pink-500 uppercase tracking-widest font-extrabold bg-pink-950/40 px-3 py-1 rounded-full">Kassongo Cut VS CapCut</span>
            <h2 className="text-2xl font-black tracking-tight text-white mt-3">Por que construímos o melhor estúdio mobile?</h2>
            <p className="text-sm text-zinc-400 mt-2">Diferente de alternativas pagas e restritas no mercado, o Kassongo Cut te dá liberdade de design e integra inteligência artificial real gratuita.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-850/50 flex flex-col gap-2">
              <span className="text-xl">🚀</span>
              <h4 className="font-bold text-zinc-200">Exportação Livre e Segura</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">Não há telas de login ocultas para capturar dados sensíveis ou forçar assinaturas mensais abusivas. Crie e exporte seus templates de mídia livremente.</p>
            </div>
            <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-850/50 flex flex-col gap-2">
              <span className="text-xl">🤖</span>
              <h4 className="font-bold text-zinc-200">Tríplice de Inteligência</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">Gerador de roteiro duplo, legendagem automática baseada em conceitos livres e indicação de stickers temáticos dinamicamente em segundos com Gemini API.</p>
            </div>
            <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-850/50 flex flex-col gap-2">
              <span className="text-xl">🎹</span>
              <h4 className="font-bold text-zinc-200">Sintetizador Integrado</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">Controle focado em áudio Kuduro e Synth, que permite disparos de timbres eletrônicos proceduralmente enquanto a animação se movimenta nas faixas.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer credits bar */}
      <footer className="bg-zinc-950 border-t border-zinc-900 py-6 px-4 text-center text-xs text-zinc-600">
        <p className="tracking-wide">Kassongo Cut © 2026. Feito com ❤️ e Inteligência Artificial Avançada.</p>
      </footer>

      {/* Simulation Export Modal Popup overlay */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in animate-duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative flex flex-col">
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle className="w-5.5 h-5.5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Projeto Renderizado</h3>
                <p className="text-[11px] text-zinc-400">Os dados foram otimizados com sucesso para Reels e TikTok</p>
              </div>
            </div>

            {/* Layout meta stats */}
            <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-850 flex flex-col gap-2.5 mb-5 text-xs text-zinc-300">
              <div className="flex justify-between">
                <span className="text-zinc-500">Nome do Arquivo</span>
                <span className="font-bold text-white max-w-[180px] truncate">
                  {selectedTemplateId ? `${selectedTemplateId}-kassongo-cut.mp4` : "meu-video-kassongo.mp4"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Aspecto de Tela</span>
                <span className="font-mono text-pink-400 font-bold">{settings.aspectRatio}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Mídia de Fundo</span>
                <span className="text-zinc-300 truncate">Sabor procedimental</span>
              </div>
              <div className="flex justify-between border-t border-zinc-900 pt-2">
                <span className="text-zinc-500">Faixas de Subtitles</span>
                <span className="font-semibold text-amber-400">{subtitles.length} triggers ativos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Filtro Visual</span>
                <span className="uppercase text-purple-400 font-bold">{settings.selectedFilter}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  alert("Download Simulado: Seu arquivo Kassongo Cut .mp4 premium foi transmitido com sucesso!");
                  setShowExportModal(false);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wide transition transform hover:scale-102"
              >
                BAIXAR MEU ARQUIVO MP4 COMPILADO
              </button>

              <button
                onClick={() => setShowExportModal(false)}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-2.5 px-4 rounded-xl text-xs transition"
              >
                Voltar ao Estúdio
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
