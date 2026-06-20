import React, { useRef, useEffect } from "react";
import { VideoClip, ProjectSettings } from "../types";

interface TransitionFramePreviewProps {
  time: number;
  selectedTemplateId: string | null;
  clips: VideoClip[];
  settings: ProjectSettings;
  width?: number; // default 96
  height?: number; // default 54
}

export const TransitionFramePreview: React.FC<TransitionFramePreviewProps> = ({
  time,
  selectedTemplateId,
  clips,
  settings,
  width = 96,
  height = 54,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear background
    ctx.clearRect(0, 0, width, height);

    // Apply color filter representation
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
      filterString = `hue-rotate(${time * 45}deg) saturate(250%) contrast(125%)`;
    }
    ctx.filter = filterString;

    // Draw solid backplate
    ctx.fillStyle = "#0c0a0f";
    ctx.fillRect(0, 0, width, height);

    // Determine visual style corresponding to this timestamp
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
        // Simple fallback calculation
        return true;
      });
      if (activeClip) {
        if (activeClip.id === "clip-matrix") activeStyle = "matrix-streams";
        else if (activeClip.id === "clip-particles") activeStyle = "city-lights";
        else if (activeClip.id === "clip-kawaii") activeStyle = "kawaii-dream";
        else if (activeClip.id === "clip-rainbow") activeStyle = "rainbow-pop";
        else if (activeClip.id === "clip-grid") activeStyle = "synthwave-grid";
      }
    }

    ctx.save();
    if (activeStyle === "synthwave-grid") {
      // Sunset gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#2e0854");
      gradient.addColorStop(0.5, "#800080");
      gradient.addColorStop(0.8, "#ff007f");
      gradient.addColorStop(1, "#110022");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Sun
      ctx.beginPath();
      ctx.arc(width / 2, height / 2 - 4, Math.min(width, height) * 0.25, 0, Math.PI * 2);
      const sunGradient = ctx.createLinearGradient(0, height / 2 - 16, 0, height / 2 + 10);
      sunGradient.addColorStop(0, "#facc15");
      sunGradient.addColorStop(1, "#ec4899");
      ctx.fillStyle = sunGradient;
      ctx.fill();

      // Sun lines (vintage style)
      ctx.fillStyle = "#2e0854";
      for (let y = height / 2 - 2; y < height / 2 + 14; y += 3) {
        const lw = 1 + (y - (height / 2 - 2)) * 0.1;
        ctx.fillRect(0, y, width, lw);
      }

      // Scrolling grid
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1;
      const horizonY = height / 2 + 6;
      const step = 6;
      const timeOffset = (time * settings.speed * 10) % step;

      for (let y = horizonY; y < height; y += 4) {
        const ratio = (y - horizonY) / (height - horizonY);
        ctx.globalAlpha = ratio;
        ctx.beginPath();
        ctx.moveTo(0, y + timeOffset * ratio);
        ctx.lineTo(width, y + timeOffset * ratio);
        ctx.stroke();
      }

      ctx.globalAlpha = 0.4;
      for (let x = -width; x < width * 2; x += 12) {
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
      ctx.font = "bold 5px 'JetBrains Mono', monospace";
      for (let col = 0; col < width; col += 6) {
        const speed = 20 + (col % 7) * 8;
        const offset = (time * speed) % (height + 30);
        
        ctx.fillText(String.fromCharCode(33 + (col % 90)), col, offset);
        ctx.fillStyle = "rgba(34,197,94,0.4)";
        ctx.fillText(String.fromCharCode(33 + ((col + 2) % 90)), col, Math.max(0, offset - 6));
        ctx.fillStyle = "rgba(220,252,231,0.9)";
        ctx.fillText(String.fromCharCode(33 + ((col + 4) % 90)), col, offset + 3);
        ctx.fillStyle = "#22c55e";
      }

    } else if (activeStyle === "city-lights") {
      const gradCity = ctx.createLinearGradient(0, 0, width, height);
      gradCity.addColorStop(0, "#090514");
      gradCity.addColorStop(1, "#1f1235");
      ctx.fillStyle = gradCity;
      ctx.fillRect(0, 0, width, height);

      // Bokeh circles
      for (let i = 0; i < 8; i++) {
        const oscX = (Math.sin(time * 0.5 + i) * 12) + (width / 2) + Math.cos(i) * 20;
        const oscY = (Math.cos(time * 0.4 + i) * 16) + (height / 2) + Math.sin(i * 2) * 20;
        const radius = 6 + (i % 3) * 4 + Math.sin(time + i) * 1.5;
        
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

      // Floating pastel circles/clouds
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      for (let c = 0; c < 3; c++) {
        const cx = ((time * 4 + c * 30) % (width + 30)) - 15;
        const cy = 10 + c * 15;
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.arc(cx + 3, cy - 2, 6, 0, Math.PI * 2);
        ctx.arc(cx + 6, cy, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Rotating stars scaled representing time
      for (let s = 0; s < 3; s++) {
        const sx = (Math.cos(time * 0.8 + s) * 15) + (width / 2) + (s - 1.5) * 20;
        const sy = (Math.sin(time * 0.8 + s) * 15) + (height / 2);
        const rot = time * (1 + s * 0.2);
        
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(rot);
        ctx.fillStyle = s % 2 === 0 ? "#f43f5e" : "#fbbf24";
        ctx.beginPath();
        for (let j = 0; j < 5; j++) {
          ctx.lineTo(0, -3);
          ctx.rotate(Math.PI / 5);
          ctx.lineTo(0, -1);
          ctx.rotate(Math.PI / 5);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

    } else if (activeStyle === "rainbow-pop") {
      ctx.fillStyle = "#1e1b4b";
      ctx.fillRect(0, 0, width, height);

      const baseRadius = (time * 15) % 50;
      ctx.lineWidth = 3;
      for (let r = 0; r < 3; r++) {
        const radius = (baseRadius + r * 15) % 50;
        const hueVal = (time * 40 + r * 60) % 360;
        ctx.strokeStyle = `hsla(${hueVal}, 85%, 60%, ${Math.max(0, 1 - radius / 50)})`;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

    } else if (activeStyle === "pulsing-circles") {
      ctx.fillStyle = "#0c0a09";
      ctx.fillRect(0, 0, width, height);

      const flexScale = 1.0 + Math.sin(time * 8) * 0.15;
      const lightGrad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, 40 * flexScale);
      lightGrad.addColorStop(0, "#fbbf24");
      lightGrad.addColorStop(0.3, "#f43f5e");
      lightGrad.addColorStop(1, "rgba(12,10,9,0)");
      ctx.fillStyle = lightGrad;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 40 * flexScale, 0, Math.PI * 2);
      ctx.fill();

      // Equalizer bars responding dynamically
      ctx.fillStyle = "#10b981";
      for (let xNum = 0; xNum < 8; xNum++) {
        const barHeight = 5 + Math.sin(time * 12 + xNum) * 10 + Math.cos(time * 6 + xNum) * 4;
        const bX = (width / 8) * xNum + 1;
        ctx.fillRect(bX, height - barHeight, (width / 8) - 2, barHeight);
      }

    } else if (activeStyle === "drake-meme-split") {
      ctx.fillStyle = "#222";
      ctx.fillRect(0, 0, width, height);

      const splitY = height / 2;

      ctx.fillStyle = "#ef4444";
      ctx.fillRect(0, 0, width * 0.4, splitY - 1);
      ctx.fillStyle = "#faf5ff";
      ctx.fillRect(width * 0.4, 0, width * 0.6, splitY - 1);

      ctx.fillStyle = "#22c55e";
      ctx.fillRect(0, splitY + 1, width * 0.4, height - splitY - 1);
      ctx.fillStyle = "#f0fdf4";
      ctx.fillRect(width * 0.4, splitY + 1, width * 0.6, height - splitY - 1);

      // Drake face dot
      ctx.fillStyle = "#78350f";
      ctx.beginPath();
      ctx.arc(width * 0.2, splitY * 0.5, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(width * 0.2, splitY * 1.5, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }, [time, selectedTemplateId, clips, settings, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded border border-zinc-700/60 shadow bg-zinc-950 pointer-events-none"
      style={{ imageRendering: "pixelated" }}
      title={`Prévia do frame em ${time.toFixed(1)}s`}
    />
  );
};
