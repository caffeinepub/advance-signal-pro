import { useEffect, useRef } from 'react';

interface ChartOverlayProps {
  analysis: any;
}

export default function ChartOverlay({ analysis }: ChartOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !imageRef.current || !analysis) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    if (!ctx) return;

    const drawOverlay = () => {
      // Set canvas size to match image
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;

      // Draw the image
      ctx.drawImage(img, 0, 0);

      // Draw support/resistance levels
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

      analysis.resistanceLevels?.forEach((level: any, idx: number) => {
        const y = (canvas.height / (analysis.resistanceLevels.length + 1)) * (idx + 1);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();

        // Label
        ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
        ctx.font = '14px sans-serif';
        ctx.fillText(`$${level.price.toFixed(2)}`, 10, y - 5);
      });

      // Draw trend arrow
      ctx.setLineDash([]);
      if (analysis.direction === 'bullish') {
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
        ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
      } else if (analysis.direction === 'bearish') {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
      }

      if (analysis.direction !== 'sideways') {
        const startX = canvas.width * 0.2;
        const endX = canvas.width * 0.8;
        const startY = analysis.direction === 'bullish' ? canvas.height * 0.7 : canvas.height * 0.3;
        const endY = analysis.direction === 'bullish' ? canvas.height * 0.3 : canvas.height * 0.7;

        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Arrow head
        const angle = Math.atan2(endY - startY, endX - startX);
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - 15 * Math.cos(angle - Math.PI / 6),
          endY - 15 * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          endX - 15 * Math.cos(angle + Math.PI / 6),
          endY - 15 * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      }
    };

    if (img.complete) {
      drawOverlay();
    } else {
      img.onload = drawOverlay;
    }
  }, [analysis]);

  const imageData = sessionStorage.getItem('chartImage');

  return (
    <div className="relative w-full">
      <img
        ref={imageRef}
        src={imageData || ''}
        alt="Chart"
        className="w-full rounded-lg"
        style={{ display: 'none' }}
      />
      <canvas
        ref={canvasRef}
        className="w-full rounded-lg border border-border"
      />
    </div>
  );
}
