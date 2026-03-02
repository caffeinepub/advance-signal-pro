import React, { useEffect, useRef } from 'react';

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
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Resolve the effective signal label from either prop
  const effectiveSignal = sinal ?? signal;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Determine image source: prefer imageFile, fall back to imageUrl
    let objectUrl: string | null = null;
    let src: string | null = null;

    if (imageFile) {
      objectUrl = URL.createObjectURL(imageFile);
      src = objectUrl;
    } else if (imageUrl) {
      src = imageUrl;
    }

    if (!src) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();

    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      ctx.drawImage(img, 0, 0);

      const w = canvas.width;
      const h = canvas.height;

      // Draw support lines (green dashed)
      if (suportes && suportes.length > 0) {
        ctx.save();
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = Math.max(1.5, h * 0.003);
        ctx.setLineDash([8, 5]);
        ctx.globalAlpha = 0.85;
        for (const pct of suportes) {
          const y = Math.round((pct / 100) * h);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w * 0.88, y);
          ctx.stroke();
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = '#22c55e';
          ctx.font = `bold ${Math.max(10, Math.round(h * 0.025))}px sans-serif`;
          ctx.fillText('S', w * 0.89, y + 4);
          ctx.globalAlpha = 0.85;
        }
        ctx.restore();
      }

      // Draw resistance lines (red dashed)
      if (resistencias && resistencias.length > 0) {
        ctx.save();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = Math.max(1.5, h * 0.003);
        ctx.setLineDash([8, 5]);
        ctx.globalAlpha = 0.85;
        for (const pct of resistencias) {
          const y = Math.round((pct / 100) * h);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w * 0.88, y);
          ctx.stroke();
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = '#ef4444';
          ctx.font = `bold ${Math.max(10, Math.round(h * 0.025))}px sans-serif`;
          ctx.fillText('R', w * 0.89, y + 4);
          ctx.globalAlpha = 0.85;
        }
        ctx.restore();
      }

      // Draw directional arrow on right edge
      if (effectiveSignal === 'COMPRA' || effectiveSignal === 'VENDA') {
        const arrowX = w - Math.round(w * 0.06);
        const arrowY = h / 2;
        const arrowSize = Math.max(16, Math.round(h * 0.06));
        const isUp = effectiveSignal === 'COMPRA';

        ctx.save();
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = isUp ? '#22c55e' : '#ef4444';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;

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
      style={{ display: 'block' }}
    />
  );
};

export default ChartOverlay;
