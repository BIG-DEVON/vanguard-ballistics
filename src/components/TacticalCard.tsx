"use client";
import { motion } from "framer-motion";

interface TacticalCardProps {
  label: string;
  value: string | number;
  unit?: string;
  isWarning?: boolean;
}

export default function TacticalCard({ label, value, unit, isWarning }: TacticalCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative p-6 rounded-xl border ${
        isWarning ? "border-vanguard-warning bg-vanguard-warning/5" : "border-vanguard-border bg-vanguard-surface"
      }`}
    >
      <div className="text-xs uppercase tracking-[0.2em] text-vanguard-muted mb-2 font-bold">
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-4xl font-mono font-medium tracking-tighter ${
          isWarning ? "text-vanguard-warning" : "text-vanguard-accent"
        }`}>
          {value}
        </span>
        {unit && <span className="text-sm text-vanguard-muted">{unit}</span>}
      </div>
    </motion.div>
  );
}