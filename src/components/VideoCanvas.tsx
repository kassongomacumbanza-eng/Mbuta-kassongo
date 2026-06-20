import React, { useRef, useEffect, useState } from "react";
import { VideoClip, TextOverlay, StickerOverlay, ProjectSettings } from "../types";
import { Play, Pause, RotateCcw, Video, Smile, Type as TypeIcon, Sparkles, Sliders, Volume2, Camera, CameraOff, MonitorPlay } from "lucide-react";

interface VideoCanvasProps {
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  clips: VideoClip[];
  subtitles: TextOverlay[];
  stickers: StickerOverlay[];
  settings: ProjectSettings;
  setIsPlaying: (playing: boolean) => void;
  selectedTemplateId: string | null;
  intervalTransitions?: Record<number, "fade" | "slide" | "glitch" | "none">;
  intervalDurations?: Record<number, number>;
  transitionTimes?: number[];
}

export const VideoCanvas: React.FC<VideoCanvasProps> = ({
  currentTime,
  isPlaying,
  onTimeUpdate,
  clips,
  subtitles,
  stickers,
  settings,
  setIsPlaying,
  selectedTemplateId,
  intervalTransitions,
  intervalDurations,
  transitionTimes,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);

  const [canvasDimensions, setCanvasDimensions] = useState({ width: 720, height: 1280 });
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Initialize webcam if requested
  useEffect(() => {
    if (cameraActive) {
      navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 480 }, audio: false })
        .then((stream) => {
          if (webcamVideoRef.current) {
            webcamVideoRef.current.srcObject = stream;
            webcamVideoRef.current.play().catch(e => console.error("Error playing webcam video stream:", e));
          }
        })
        .catch((err) => {
          console.error("Camera access denied or unavailable:", err);
          setStreamError("Câmera indisponível ou permissão negada.");
          setCameraActive(false);
        });
    } else {
      if (webcamVideoRef.current && webcamVideoRef.current.srcObject) {
        const stream = webcamVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        webcamVideoRef.current.srcObject = null;
      }
    }

    return () => {
      if (webcamVideoRef.current && webcamVideoRef.current.srcObject) {
        const stream = webcamVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraActive]);

  // Adjust canvas display dimensions based on Aspect Ratio
  useEffect(() => {
    let width = 640;
    let height = 360;

    if (settings.aspectRatio === "9:16") {
      width = 360;
      height = 640;
    } else if (settings.aspectRatio === "16:9") {
      width = 640;
      height = 360;
    } else if (settings.aspectRatio === "1:1") {
      width = 480;
      height = 480;
    }

    setCanvasDimensions({ width, height });
  }, [settings.aspectRatio]);

  // Animation cycle
  useEffect(() => {
    const render = (time: number) => {
      if (previousTimeRef.current !== null && isPlaying) {
        const delta = (time - previousTimeRef.current) / 1000;
        const nextTime = currentTime + delta * settings.speed;
        
        if (nextTime >= settings.duration) {
          onTimeUpdate(0); // loop or stop
          setIsPlaying(false);
        } else {
          onTimeUpdate(nextTime);
        }
      }
      previousTimeRef.current = time;

      drawCanvas();
      requestRef.current = requestAnimationFrame(render);
    };

    if (isPlaying) {
      previousTimeRef.current = performance.now();
      requestRef.current = requestAnimationFrame(render);
    } else {
      drawCanvas();
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isPlaying, currentTime, clips, subtitles, stickers, settings, cameraActive]);

  const toggleCamera = () => {
    setStreamError(null);
    setCameraActive(!cameraActive);
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvasDimensions;
    ctx.clearRect(0, 0, width, height);

    // Filter application
    let filterString = "none";
    if (settings.selectedFilter === "noir") {
      filterString = "grayscale(100%) contrast(140%) brightness(90%)";
    } else if (settings.selectedFilter === "cyberneon") {
      filterString = "hue-rotate(150deg) saturate(220%) contrast(110%)";
    } else if (settings.selectedFilter === "vintage") {
      filterString = "sepia(45%) contrast(95%) brightness(95%) saturate(140%)";
    } else if (settings.selectedFilter === "warm") {
      filterString = "saturate(150%) hue-rotate(-12deg) brightness(105%)";
    } else if (settings.selectedFilter === "cool") {
      filterString = "saturate(130%) hue-rotate(160deg) brightness(90%)";
    } else if (settings.selectedFilter === "rainbow") {
      filterString = "hue-rotate(" + (currentTime * 45) + "deg) saturate(250%) contrast(125%)";
    }
    ctx.filter = filterString;

    // 1. Draw Background Clips
    ctx.fillStyle = "#0c0a0f";
    ctx.fillRect(0, 0, width, height);

    // Procedural rendering based on active video styles
    // Find what style we require (either from selected template or stock clips active at current time)
    let activeStyle = "synthwave-grid";
    if (selectedTemplateId === "luanda-dance") {
      activeStyle = "pulsing-circles";
    } else if (selectedTemplateId === "drake-yes-no") {
      activeStyle = "drake-meme-split";
    } else if (selectedTemplateId === "synth-chill-vlog") {
      activeStyle = "synthwave-grid";
    } else {
      // Find clip in clips array that covers current playtime
      const activeClip = clips.find(c => {
        // Find if clips overlap this exact timeframe
        return true; // Simple default
      });
      if (activeClip) {
        // Determine style from ID
        if (activeClip.id === "clip-matrix") activeStyle = "matrix-streams";
        else if (activeClip.id === "clip-particles") activeStyle = "city-lights";
        else if (activeClip.id === "clip-kawaii") activeStyle = "kawaii-dream";
        else if (activeClip.id === "clip-rainbow") activeStyle = "rainbow-pop";
        else if (activeClip.id === "clip-grid") activeStyle = "synthwave-grid";
      }
    }

    // Drawing background generator
    ctx.save();
    if (activeStyle === "synthwave-grid") {
      // Draw retro sunset
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#2e0854");
      gradient.addColorStop(0.5, "#800080");
      gradient.addColorStop(0.8, "#ff007f");
      gradient.addColorStop(1, "#110022");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Sun
      ctx.beginPath();
      ctx.arc(width / 2, height / 2 - 20, Math.min(width, height) * 0.25, 0, Math.PI * 2);
      const sunGradient = ctx.createLinearGradient(0, height / 2 - 80, 0, height / 2 + 50);
      sunGradient.addColorStop(0, "#facc15");
      sunGradient.addColorStop(1, "#ec4899");
      ctx.fillStyle = sunGradient;
      ctx.fill();

      // Sun lines (vintage style)
      ctx.fillStyle = "#2e0854";
      for (let y = height / 2 - 10; y < height / 2 + 70; y += 12) {
        const lw = 3 + (y - (height / 2 - 10)) * 0.12;
        ctx.fillRect(0, y, width, lw);
      }

      // Scrolling grid
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.5;
      const horizonY = height / 2 + 30;
      const step = 20;
      const timeOffset = (currentTime * settings.speed * 40) % step;

      // Draw horizontal lines with perspective narrowing
      for (let y = horizonY; y < height; y += 15) {
        const ratio = (y - horizonY) / (height - horizonY);
        ctx.globalAlpha = ratio;
        ctx.beginPath();
        ctx.moveTo(0, y + timeOffset * ratio);
        ctx.lineTo(width, y + timeOffset * ratio);
        ctx.stroke();
      }

      // Vertical lines radiating
      ctx.globalAlpha = 0.5;
      for (let x = -width; x < width * 2; x += 40) {
        ctx.beginPath();
        ctx.moveTo(width / 2, horizonY);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;

    } else if (activeStyle === "matrix-streams") {
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = "#22c55e";
      ctx.font = "bold 13px 'JetBrains Mono', monospace";
      for (let col = 0; col < width; col += 20) {
        // Seeded coordinate calculations
        const speed = 100 + (col % 7) * 40;
        const offset = (currentTime * speed) % (height + 150);
        
        ctx.fillText(String.fromCharCode(33 + (col % 90)), col, offset);
        ctx.fillStyle = "rgba(34,197,94,0.4)";
        ctx.fillText(String.fromCharCode(33 + ((col + 2) % 90)), col, Math.max(0, offset - 25));
        ctx.fillText(String.fromCharCode(33 + ((col + 4) % 90)), col, Math.max(0, offset - 50));
        ctx.fillStyle = "rgba(220,252,231,0.9)"; // Bright head particle
        ctx.fillText(String.fromCharCode(33 + ((col + 7) % 90)), col, offset + 15);
        ctx.fillStyle = "#22c55e";
      }

    } else if (activeStyle === "city-lights") {
      const gradCity = ctx.createLinearGradient(0, 0, width, height);
      gradCity.addColorStop(0, "#090514");
      gradCity.addColorStop(1, "#1f1235");
      ctx.fillStyle = gradCity;
      ctx.fillRect(0, 0, width, height);

      // Bokeh circles
      for (let i = 0; i < 15; i++) {
        const oscX = (Math.sin(currentTime * 0.5 + i) * 60) + (width / 2) + Math.cos(i) * 120;
        const oscY = (Math.cos(currentTime * 0.4 + i) * 80) + (height / 2) + Math.sin(i * 2) * 120;
        const radius = 25 + (i % 4) * 15 + Math.sin(currentTime + i) * 5;
        
        const bGrad = ctx.createRadialGradient(oscX, oscY, 0, oscX, oscY, radius);
        const colorPalette = ["rgba(251,191,36,0.15)", "rgba(236,72,153,0.15)", "rgba(59,130,246,0.15)", "rgba(168,85,247,0.1)"];
        bGrad.addColorStop(0, colorPalette[i % colorPalette.length]);
        bGrad.addColorStop(1, "rgba(0,0,0,0)");
        
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.arc(oscX, oscY, radius, 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (activeStyle === "kawaii-dream") {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#fecdd3");
      gradient.addColorStop(1, "#fed7aa");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw floating clouds and hearts
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      for (let c = 0; c < 5; c++) {
        const cx = ((currentTime * 15 + c * 100) % (width + 120)) - 60;
        const cy = 40 + c * 60;
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.arc(cx + 12, cy - 8, 22, 0, Math.PI * 2);
        ctx.arc(cx + 24, cy, 18, 0, Math.PI * 2);
        ctx.fill();
      }

      // Rotating spinning pastel stars
      for (let s = 0; s < 6; s++) {
        const sx = (Math.cos(currentTime * 0.8 + s) * 70) + (width / 2) + (s - 3) * 60;
        const sy = (Math.sin(currentTime * 0.8 + s) * 70) + (height / 2);
        const rot = currentTime * (1 + s * 0.2);
        
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(rot);
        ctx.fillStyle = s % 2 === 0 ? "#f43f5e" : "#fbbf24";
        ctx.beginPath();
        for (let j = 0; j < 5; j++) {
          ctx.lineTo(0, -12);
          ctx.rotate(Math.PI / 5);
          ctx.lineTo(0, -5);
          ctx.rotate(Math.PI / 5);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

    } else if (activeStyle === "rainbow-pop") {
      ctx.fillStyle = "#1e1b4b";
      ctx.fillRect(0, 0, width, height);

      // concentric flashing neon circles matching current play speed
      const baseRadius = (currentTime * 70) % 250;
      ctx.lineWidth = 14;
      for (let r = 0; r < 4; r++) {
        const radius = (baseRadius + r * 65) % 250;
        const hueVal = (currentTime * 40 + r * 60) % 360;
        ctx.strokeStyle = `hsla(${hueVal}, 85%, 60%, ${Math.max(0, 1 - radius / 250)})`;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

    } else if (activeStyle === "pulsing-circles") {
      ctx.fillStyle = "#0c0a09";
      ctx.fillRect(0, 0, width, height);

      // Pulsing grid system with energetic yellow center matching Kuduro challenge
      const flexScale = 1.0 + Math.sin(currentTime * 8) * 0.15;
      const lightGrad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, 180 * flexScale);
      lightGrad.addColorStop(0, "#fbbf24");
      lightGrad.addColorStop(0.3, "#f43f5e");
      lightGrad.addColorStop(1, "rgba(12,10,9,0)");
      ctx.fillStyle = lightGrad;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 200 * flexScale, 0, Math.PI * 2);
      ctx.fill();

      // Equalizer bars responding dynamically
      ctx.fillStyle = "#10b981";
      for (let xNum = 0; xNum < 15; xNum++) {
        const barHeight = 25 + Math.sin(currentTime * 12 + xNum) * 40 + Math.cos(currentTime * 6 + xNum) * 20;
        const bX = (width / 15) * xNum + 2;
        ctx.fillRect(bX, height - barHeight, (width / 15) - 4, barHeight);
      }

    } else if (activeStyle === "drake-meme-split") {
      ctx.fillStyle = "#222";
      ctx.fillRect(0, 0, width, height);

      const splitY = height / 2;

      // Top box background (dissatisfied / no)
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(0, 0, width * 0.4, splitY - 2);
      ctx.fillStyle = "#faf5ff";
      ctx.fillRect(width * 0.4, 0, width * 0.6, splitY - 2);

      // Bottom box background (satisfied / yes)
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(0, splitY + 2, width * 0.4, height - splitY - 2);
      ctx.fillStyle = "#f0fdf4";
      ctx.fillRect(width * 0.4, splitY + 2, width * 0.6, height - splitY - 2);

      // Drake Face Simulation top
      ctx.fillStyle = "#78350f"; // brownish clothes
      ctx.beginPath();
      ctx.arc(width * 0.2, splitY * 0.5, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000000";
      ctx.fillRect(width * 0.1, splitY * 0.5 - 2, 16, 5); // frown eyes
      ctx.fillRect(width * 0.22, splitY * 0.5 - 2, 16, 5);
      
      // Hand pushing back rejection
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(width * 0.32, splitY * 0.6, 12, 0, Math.PI * 2);
      ctx.fill();

      // Drake Face Simulation bottom
      ctx.fillStyle = "#d97706"; // orange sweater
      ctx.beginPath();
      ctx.arc(width * 0.2, splitY * 1.5, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffe4e6"; // glowing mouth open
      ctx.beginPath();
      ctx.ellipse(width * 0.2, splitY * 1.58, 12, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Joy pointing finger
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(width * 0.32, splitY * 1.45, 12, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Dynamic Segment Transition Effects Overlay ---
    const transitionPoints = transitionTimes && transitionTimes.length > 0
      ? transitionTimes
      : (() => {
          const segmentDuration = settings.duration > 15 ? 6 : 5;
          const pts: number[] = [];
          for (let t = segmentDuration; t < settings.duration; t += segmentDuration) {
            pts.push(t);
          }
          return pts;
        })();

    let activeTransitionPoint: number | undefined = undefined;
    let transitionDuration = 0.8;
    let transitionHalfWidth = 0.4;

    for (const point of transitionPoints) {
      const customDur = intervalDurations && intervalDurations[point] !== undefined
        ? intervalDurations[point]
        : 0.8;
      const halfWidth = customDur / 2;
      if (Math.abs(currentTime - point) <= halfWidth) {
        activeTransitionPoint = point;
        transitionDuration = customDur;
        transitionHalfWidth = halfWidth;
        break;
      }
    }

    const resolvedStyle = activeTransitionPoint !== undefined && intervalTransitions && intervalTransitions[activeTransitionPoint] !== undefined
      ? intervalTransitions[activeTransitionPoint]
      : settings.transitionStyle;

    if (activeTransitionPoint !== undefined && resolvedStyle && resolvedStyle !== "none") {
      const relativeTime = currentTime - (activeTransitionPoint - transitionHalfWidth);
      const progress = Math.max(0, Math.min(1, relativeTime / transitionDuration)); // 0 to 1

      ctx.save();
      if (resolvedStyle === "fade") {
        // Fade to black/dark purple to simulate movie clip segment passage
        const opacity = Math.sin(progress * Math.PI); // Peak is 1.0 at midpoint (phase alignment)
        ctx.fillStyle = `rgba(12, 10, 15, ${opacity})`;
        ctx.fillRect(0, 0, width, height);
      } else if (resolvedStyle === "slide") {
        // Diagonal wipe curtain
        let slideX = 0;
        if (progress < 0.5) {
          const subProgress = progress / 0.5;
          slideX = width * (1 - subProgress);
        } else {
          const subProgress = (progress - 0.5) / 0.5;
          slideX = -width * subProgress;
        }

        ctx.fillStyle = "#8b5cf6"; // Kassongo Purple template cover
        ctx.fillRect(slideX, 0, width, height);

        // Neon design edge indicators
        ctx.strokeStyle = "#f43f5e";
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.moveTo(slideX, 0);
        ctx.lineTo(slideX, height);
        ctx.stroke();

        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(slideX, 0);
        ctx.lineTo(slideX, height);
        ctx.stroke();
      } else if (resolvedStyle === "glitch") {
        // Horizontal scanline teardown, chromatic digital noise
        const sliceCount = 10;
        ctx.fillStyle = "rgba(244, 63, 94, 0.25)";
        
        for (let i = 0; i < sliceCount; i++) {
          const sliceH = height / sliceCount;
          const shiftDir = Math.sin(progress * 50 + i) * 35;
          const sliceY = i * sliceH;
          
          ctx.drawImage(canvas, 0, sliceY, width, sliceH, shiftDir, sliceY, width, sliceH);
          
          if (Math.random() > 0.5) {
            ctx.fillStyle = Math.random() > 0.5 ? "rgba(56, 189, 248, 0.55)" : "rgba(251, 191, 36, 0.55)";
            ctx.fillRect(Math.random() * width - 40, sliceY, Math.random() * 140 + 50, sliceH * 0.3);
          }
        }

        // Glitch watermark label alert
        ctx.font = "bold 26px 'Space Grotesk', system-ui";
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.textAlign = "center";
        ctx.fillText("⚡ TRANSITION ⚡", width / 2 + (Math.random() - 0.5) * 12, height / 2 + (Math.random() - 0.5) * 12);
      }
      ctx.restore();
    }

    // 2. Overlay camera stream if active
    if (cameraActive && webcamVideoRef.current && webcamVideoRef.current.readyState >= 2) {
      // Draw webcam in bottom overlay quadrant, or fit full container depending on project settings
      const camW = 120;
      const camH = 120;
      const camX = width - camW - 15;
      const camY = 15;

      ctx.save();
      ctx.filter = "none"; // camera stays un-tinted to capture correct skin-tones
      ctx.beginPath();
      ctx.arc(camX + camW / 2, camY + camH / 2, camW / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(webcamVideoRef.current, camX, camY, camW, camH);
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#a855f7";
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore(); // reset filters for graphics and texts

    // 3. Render Stickers Overlay
    stickers.forEach((sticker) => {
      if (currentTime >= sticker.startTime && currentTime <= sticker.endTime) {
        ctx.save();
        const drawX = (sticker.x / 100) * width;
        const drawY = (sticker.y / 100) * height;

        ctx.translate(drawX, drawY);
        ctx.rotate((sticker.rotation * Math.PI) / 180);
        ctx.scale(sticker.scale, sticker.scale);

        // Draw pill bubble
        ctx.fillStyle = sticker.color;
        ctx.shadowColor = sticker.color;
        ctx.shadowBlur = 10;
        
        ctx.font = "bold 14px 'Space Grotesk', system-ui";
        const txtWidth = ctx.measureText(sticker.text).width;
        
        const padX = 14;
        const padY = 8;
        
        ctx.beginPath();
        ctx.roundRect(-txtWidth / 2 - padX, -10 - padY, txtWidth + padX * 2, 20 + padY * 2, 10);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = "#000000";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(sticker.text, 0, 2);
        ctx.restore();
      }
    });

    // 4. Render Captions Track
    subtitles.forEach((sub) => {
      if (currentTime >= sub.startTime && currentTime <= sub.endTime) {
        ctx.save();

        let posX = (sub.x / 100) * width;
        let posY = (sub.y / 100) * height;

        // Fonts mapping
        let fontFamilyStr = "system-ui, sans-serif";
        if (sub.fontFamily === "Space Grotesk") fontFamilyStr = "'Space Grotesk', sans-serif";
        else if (sub.fontFamily === "JetBrains Mono") fontFamilyStr = "'JetBrains Mono', monospace";
        else if (sub.fontFamily === "Playfair Display") fontFamilyStr = "'Playfair Display', serif";
        else if (sub.fontFamily === "Inter") fontFamilyStr = "'Inter', sans-serif";

        let finalFontSize = sub.fontSize;
        let animatedY = posY;

        // Animations calculations
        const animDuration = sub.endTime - sub.startTime;
        const elapsed = currentTime - sub.startTime;

        if (sub.animation === "bounce") {
          animatedY -= Math.abs(Math.sin(elapsed * 8)) * 14;
        } else if (sub.animation === "zoom") {
          const progress = Math.min(1, elapsed / 0.3); // first 300ms zoom in
          finalFontSize *= (0.5 + 0.5 * progress);
        } else if (sub.animation === "pulse") {
          finalFontSize *= (1.0 + Math.sin(elapsed * 6) * 0.08);
        } else if (sub.animation === "fade") {
          const fadeProgress = elapsed < 0.3 ? (elapsed / 0.3) : (sub.endTime - currentTime < 0.3 ? (sub.endTime - currentTime) / 0.3 : 1);
          ctx.globalAlpha = Math.max(0, Math.min(1, fadeProgress));
        }

        ctx.font = `bold ${finalFontSize}px ${fontFamilyStr}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const textLines = sub.text.split("\n");
        const fontHeight = finalFontSize * 1.25;

        textLines.forEach((line, index) => {
          const currentLineY = animatedY + (index - (textLines.length - 1) / 2) * fontHeight;
          const measurement = ctx.measureText(line);
          const lineW = measurement.width;

          if (sub.fontStyle === "neon") {
            ctx.shadowColor = sub.color;
            ctx.shadowBlur = 12;
            
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 4;
            ctx.strokeText(line, posX, currentLineY);

            ctx.fillStyle = sub.color;
            ctx.fillText(line, posX, currentLineY);
          } else if (sub.fontStyle === "bubble-gum") {
            ctx.fillStyle = "rgba(236,72,153,0.85)"; // hot pink badge base
            ctx.beginPath();
            ctx.roundRect(posX - lineW / 2 - 12, currentLineY - finalFontSize / 2 - 6, lineW + 24, finalFontSize + 12, 8);
            ctx.fill();

            ctx.fillStyle = "#ffffff";
            ctx.fillText(line, posX, currentLineY);
          } else if (sub.fontStyle === "ransom-note") {
            ctx.fillStyle = "#facc15"; // yellow offset card
            ctx.fillRect(posX - lineW / 2 - 8, currentLineY - finalFontSize / 2 - 4, lineW + 16, finalFontSize + 8);
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 2;
            ctx.strokeRect(posX - lineW / 2 - 8, currentLineY - finalFontSize / 2 - 4, lineW + 16, finalFontSize + 8);

            ctx.fillStyle = "#000000";
            ctx.fillText(line, posX, currentLineY);
          } else if (sub.fontStyle === "vhs-bold") {
            ctx.fillStyle = "#ff007f";
            ctx.fillText(line, posX - 2, currentLineY + 2); // skew magenta shadow
            ctx.fillStyle = "#38bdf8";
            ctx.fillText(line, posX + 2, currentLineY - 1); // cyan skew shadow
            
            ctx.fillStyle = "#ffffff";
            ctx.fillText(line, posX, currentLineY);
          } else {
            // Clean simple overlay with readable black outline
            ctx.shadowBlur = 0;
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 5;
            ctx.strokeText(line, posX, currentLineY);

            ctx.fillStyle = sub.color || "#ffffff";
            ctx.fillText(line, posX, currentLineY);
          }
        });

        ctx.restore();
      }
    });

    // 5. Draw Watermark
    ctx.font = "bold 11px system-ui";
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.textAlign = "left";
    ctx.fillText("Kassongo Cut", 10, height - 12);
  };

  const handleBackward = () => {
    onTimeUpdate(Math.max(0, currentTime - 2));
  };

  const handleForward = () => {
    onTimeUpdate(Math.min(settings.duration, currentTime + 2));
  };

  const resetProjectPlayhead = () => {
    onTimeUpdate(0);
    setIsPlaying(false);
  };

  return (
    <div id="canvas-card" className="flex flex-col items-center bg-zinc-900 rounded-2xl border border-zinc-800 p-5 shadow-2xl overflow-hidden max-w-full">
      
      {/* View Header */}
      <div className="w-full flex justify-between items-center mb-4 pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <MonitorPlay className="w-5 h-5 text-purple-400" />
          <span className="font-semibold text-zinc-100 text-sm tracking-tight uppercase">Estúdio de Visualização</span>
        </div>
        
        {/* Aspect Ratio Display badge */}
        <div className="flex items-center gap-2 bg-purple-950/40 border border-purple-900/50 rounded-full px-3 py-1 text-xs text-purple-300">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Tela {settings.aspectRatio}</span>
        </div>
      </div>

      {/* Video stream viewport container */}
      <div 
        ref={containerRef} 
        className="relative flex justify-center items-center bg-black rounded-lg border border-zinc-950 shadow-inner overflow-hidden mb-5 aspect-video w-full"
        style={{
          maxHeight: "380px",
          height: settings.aspectRatio === "9:16" ? "340px" : "100%",
        }}
      >
        <canvas
          id="mainCanvas"
          ref={canvasRef}
          width={canvasDimensions.width}
          height={canvasDimensions.height}
          className="rounded shadow-lg block max-h-full max-w-full object-contain"
        />

        {/* Floating Recording indicator */}
        {cameraActive && (
          <div className="absolute top-3 left-3 bg-red-600 border border-red-500 rounded-full px-3 py-1 flex items-center gap-2 animate-pulse text-[10px] text-white font-bold tracking-widest uppercase shadow">
            <span className="w-2.5 h-2.5 rounded-full bg-white block"></span>
            <span>Gravação Ativa</span>
          </div>
        )}

        <video
          ref={webcamVideoRef}
          className="hidden"
          playsInline
          muted
        />
      </div>

      {/* Stream Controls */}
      <div className="w-full flex flex-col gap-3">
        {/* Timeline Slider Navigation preview */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-zinc-400 min-w-[32px] text-right">
            {currentTime.toFixed(1)}s
          </span>
          <input
            id="playhead-preview-slider"
            type="range"
            min={0}
            max={settings.duration}
            step={0.1}
            value={currentTime}
            onChange={(e) => onTimeUpdate(parseFloat(e.target.value))}
            className="flex-1 accent-purple-500 bg-zinc-800 h-1.5 rounded-lg cursor-ew-resize focus:outline-none"
          />
          <span className="font-mono text-[11px] text-zinc-400 min-w-[32px]">
            {settings.duration.toFixed(0)}s
          </span>
        </div>

        {/* Master Control buttons panel */}
        <div className="flex justify-between items-center bg-zinc-950 rounded-xl p-3 border border-zinc-800">
          <div className="flex items-center gap-2">
            <button
              id="btn-toggle-camera"
              onClick={toggleCamera}
              className={`p-2 rounded-lg border transition duration-200 ${
                cameraActive 
                  ? "bg-purple-900 border-purple-700 text-purple-200" 
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
              }`}
              title={cameraActive ? "Desativar Câmera" : "Ativar Câmera"}
            >
              {cameraActive ? <CameraOff className="w-4.5 h-4.5" /> : <Camera className="w-4.5 h-4.5" />}
            </button>
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">
              {cameraActive ? "Câmera On" : "Gravar Vlog"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="playback-backward-button"
              onClick={handleBackward}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"
              title="Voltar 2s"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              id="playback-toggle-button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`h-11 w-11 flex justify-center items-center rounded-full transition transform hover:scale-105 shadow-md ${
                isPlaying 
                  ? "bg-red-600 hover:bg-red-500 text-white" 
                  : "bg-purple-600 hover:bg-purple-500 text-white"
              }`}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            <button
              id="playback-reset-button"
              onClick={resetProjectPlayhead}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"
              title="Resetar"
            >
              <span className="text-xs font-mono font-bold">0.0s</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-zinc-400">
            <Volume2 className="w-4 h-4 text-purple-400" />
            <select
              id="playback-speed-selector"
              value={settings.speed}
              onChange={(e) => {}}
              disabled
              className="bg-zinc-900 border border-zinc-800 rounded px-1 py-0.5 text-[11px] text-zinc-400 cursor-not-allowed font-mono"
              title="Velocidade"
            >
              <option value={1}>1.0x</option>
            </select>
          </div>
        </div>
      </div>

      {streamError && (
        <span className="text-xs text-red-400 mt-2 font-medium">{streamError}</span>
      )}
    </div>
  );
};
