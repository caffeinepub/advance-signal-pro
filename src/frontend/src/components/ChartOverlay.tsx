import type React from "react";
import { useEffect, useRef } from "react";

interface ChartOverlayProps {
  imageFile?: File | null;
  imageUrl?: string | null;
  sinal?: string;
  signal?: string;
  suportes?: number[];
  resistencias?: number[];
  className?: string;
}

const ChartOverlay: React.FC<ChartOverlayProps> = ({
  imageFile,
  imageUrl,
  sinal,
  signal,
  suportes = [],
  resistencias = [],
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const effectiveSignal = sinal ?? signal;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let objectUrl: string | null = null;
    let src: string | null = null;

    if (imageFile) {
      objectUrl = URL.createObjectURL(imageFile);
      src = objectUrl;
    } else if (imageUrl) {
      src = imageUrl;
    }

    if (!src) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();

    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);

      const w = canvas.width;
      const h = canvas.height;
      const lineWidth = Math.max(2, h * 0.004);
      const labelFontSize = Math.max(11, Math.round(h * 0.028));
      const labelPad = 6;
      const labelW = labelFontSize * 1.8 + labelPad * 2;
      const labelH = labelFontSize + labelPad * 2;

      // ── Support lines (green) ──
      if (suportes.length > 0) {
        for (const pct of suportes) {
          const y = Math.round((pct / 100) * h);

          // Shaded band
          ctx.save();
          ctx.globalAlpha = 0.12;
          ctx.fillStyle = "#16a34a";
          ctx.fillRect(0, y - lineWidth * 2, w, lineWidth * 5);
          ctx.restore();

          // Line with glow
          ctx.save();
          ctx.shadowColor = "#16a34a";
          ctx.shadowBlur = 6;
          ctx.strokeStyle = "#16a34a";
          ctx.lineWidth = lineWidth;
          ctx.setLineDash([10, 6]);
          ctx.globalAlpha = 0.9;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w - labelW - 8, y);
          ctx.stroke();
          ctx.restore();

          // Label box
          ctx.save();
          ctx.globalAlpha = 0.95;
          const lx = w - labelW - 4;
          const ly = y - labelH / 2;
          ctx.fillStyle = "#16a34a";
          ctx.beginPath();
          // rounded rect
          const r = 4;
          ctx.moveTo(lx + r, ly);
          ctx.lineTo(lx + labelW - r, ly);
          ctx.quadraticCurveTo(lx + labelW, ly, lx + labelW, ly + r);
          ctx.lineTo(lx + labelW, ly + labelH - r);
          ctx.quadraticCurveTo(
            lx + labelW,
            ly + labelH,
            lx + labelW - r,
            ly + labelH,
          );
          ctx.lineTo(lx + r, ly + labelH);
          ctx.quadraticCurveTo(lx, ly + labelH, lx, ly + labelH - r);
          ctx.lineTo(lx, ly + r);
          ctx.quadraticCurveTo(lx, ly, lx + r, ly);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${labelFontSize}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(
            `S ${(pct).toFixed(0)}%`,
            lx + labelW / 2,
            ly + labelH / 2,
          );
          ctx.restore();
        }
      }

      // ── Resistance lines (red) ──
      if (resistencias.length > 0) {
        for (const pct of resistencias) {
          const y = Math.round((pct / 100) * h);

          // Shaded band
          ctx.save();
          ctx.globalAlpha = 0.12;
          ctx.fillStyle = "#dc2626";
          ctx.fillRect(0, y - lineWidth * 2, w, lineWidth * 5);
          ctx.restore();

          // Line with glow
          ctx.save();
          ctx.shadowColor = "#dc2626";
          ctx.shadowBlur = 6;
          ctx.strokeStyle = "#dc2626";
          ctx.lineWidth = lineWidth;
          ctx.setLineDash([10, 6]);
          ctx.globalAlpha = 0.9;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w - labelW - 8, y);
          ctx.stroke();
          ctx.restore();

          // Label box
          ctx.save();
          ctx.globalAlpha = 0.95;
          const lx = w - labelW - 4;
          const ly = y - labelH / 2;
          ctx.fillStyle = "#dc2626";
          ctx.beginPath();
          const r = 4;
          ctx.moveTo(lx + r, ly);
          ctx.lineTo(lx + labelW - r, ly);
          ctx.quadraticCurveTo(lx + labelW, ly, lx + labelW, ly + r);
          ctx.lineTo(lx + labelW, ly + labelH - r);
          ctx.quadraticCurveTo(
            lx + labelW,
            ly + labelH,
            lx + labelW - r,
            ly + labelH,
          );
          ctx.lineTo(lx + r, ly + labelH);
          ctx.quadraticCurveTo(lx, ly + labelH, lx, ly + labelH - r);
          ctx.lineTo(lx, ly + r);
          ctx.quadraticCurveTo(lx, ly, lx + r, ly);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${labelFontSize}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(
            `R ${(pct).toFixed(0)}%`,
            lx + labelW / 2,
            ly + labelH / 2,
          );
          ctx.restore();
        }
      }

      // ── Directional arrow ──
      if (effectiveSignal === "COMPRA" || effectiveSignal === "VENDA") {
        const arrowX = w - Math.round(w * 0.06);
        const arrowY = h / 2;
        const arrowSize = Math.max(16, Math.round(h * 0.06));
        const isUp = effectiveSignal === "COMPRA";

        ctx.save();
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = isUp ? "#16a34a" : "#dc2626";
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.shadowColor = isUp ? "#16a34a" : "#dc2626";
        ctx.shadowBlur = 8;

        ctx.beginPath();
        if (isUp) {
          ctx.moveTo(arrowX, arrowY - arrowSize);
          ctx.lineTo(arrowX + arrowSize * 0.5, arrowY);
          ctx.lineTo(arrowX + arrowSize * 0.2, arrowY);
          ctx.lineTo(arrowX + arrowSize * 0.2, arrowY + arrowSize);
          ctx.lineTo(arrowX - arrowSize * 0.2, arrowY + arrowSize);
          ctx.lineTo(arrowX - arrowSize * 0.2, arrowY);
          ctx.lineTo(arrowX - arrowSize * 0.5, arrowY);
          ctx.closePath();
        } else {
          ctx.moveTo(arrowX, arrowY + arrowSize);
          ctx.lineTo(arrowX + arrowSize * 0.5, arrowY);
          ctx.lineTo(arrowX + arrowSize * 0.2, arrowY);
          ctx.lineTo(arrowX + arrowSize * 0.2, arrowY - arrowSize);
          ctx.lineTo(arrowX - arrowSize * 0.2, arrowY - arrowSize);
          ctx.lineTo(arrowX - arrowSize * 0.2, arrowY);
          ctx.lineTo(arrowX - arrowSize * 0.5, arrowY);
          ctx.closePath();
        }
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };

    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };

    img.src = src;

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile, imageUrl, effectiveSignal, suportes, resistencias]);

  if (!imageFile && !imageUrl) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-auto rounded-lg ${className}`}
      style={{ display: "block" }}
    />
  );
};

export default ChartOverlay;
