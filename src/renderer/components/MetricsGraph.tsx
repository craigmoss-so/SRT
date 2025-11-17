import React, { useRef, useEffect } from 'react';

interface MetricsGraphProps {
  data: number[];
  label: string;
  color: string;
  max?: number;
  unit?: string;
}

const MetricsGraph: React.FC<MetricsGraphProps> = ({ data, label, color, max, unit = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Vertical grid lines
    const gridSpacing = width / 10;
    for (let i = 0; i <= 10; i++) {
      const x = gridSpacing * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    if (data.length < 2) return;

    // Calculate max value
    const maxValue = max || Math.max(...data, 1);

    // Draw graph line
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const pointSpacing = width / (data.length - 1);

    data.forEach((value, index) => {
      const x = index * pointSpacing;
      const y = height - (value / maxValue) * height;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, color + '40');
    gradient.addColorStop(1, color + '00');

    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw current value indicator
    if (data.length > 0) {
      const lastValue = data[data.length - 1];
      const lastX = width;
      const lastY = height - (lastValue / maxValue) * height;

      // Glow effect
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(lastX - 2, lastY, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Value label
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 12px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const valueText = lastValue.toFixed(1) + unit;
      ctx.fillText(valueText, width - 10, lastY);
    }
  }, [data, color, max, unit]);

  const currentValue = data[data.length - 1] || 0;
  const previousValue = data[data.length - 2] || 0;
  const change = currentValue - previousValue;
  const changePercent = previousValue !== 0 ? (change / previousValue) * 100 : 0;

  return (
    <div className="metric-card rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide mb-1">
            {label}
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="metric-value text-2xl font-bold text-white">
              {currentValue.toFixed(1)}{unit}
            </span>
            {change !== 0 && (
              <span
                className={`text-xs font-medium ${
                  change > 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                }`}
              >
                {change > 0 ? '↑' : '↓'} {Math.abs(changePercent).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        <div className="w-3 h-3 rounded-full animate-pulse-glow" style={{ backgroundColor: color }} />
      </div>
      <div className="graph-container rounded overflow-hidden" style={{ height: '100px' }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: 'block' }}
        />
      </div>
    </div>
  );
};

export default MetricsGraph;
