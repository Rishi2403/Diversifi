import { useEffect, useState } from "react";

interface Props {
  score: number;
  label: string;
  sublabel?: string;
  size?: number;
}

function getColor(score: number) {
  if (score >= 70) return "#4ade80";
  if (score >= 45) return "#facc15";
  return "#f87171";
}

export function HealthScoreCard({ score, label, sublabel, size = 160 }: Props) {
  const [animated, setAnimated] = useState(0);
  const radius = size * 0.38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animated / 100) * circumference;
  const color = getColor(score);
  const cx = size / 2;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(score), 100);
    return () => clearTimeout(t);
  }, [score]);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle cx={cx} cy={cx} r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={size * 0.075} />
        {/* Progress */}
        <circle
          cx={cx} cy={cx} r={radius} fill="none"
          stroke={color} strokeWidth={size * 0.075}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cx})`}
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)" }}
        />
        {/* Score text */}
        <text x={cx} y={cx - 6} textAnchor="middle" fill="white"
          fontSize={size * 0.22} fontWeight="bold" fontFamily="Roboto Mono, monospace">
          {animated}
        </text>
        <text x={cx} y={cx + size * 0.14} textAnchor="middle" fill="rgba(255,255,255,0.45)"
          fontSize={size * 0.085} fontFamily="Roboto Mono, monospace">
          /100
        </text>
      </svg>
      <div className="text-center">
        <p className="text-sm font-bold text-white/90">{label}</p>
        {sublabel && <p className="text-xs text-white/45 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}
