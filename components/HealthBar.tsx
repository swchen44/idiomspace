import React from 'react';

interface HealthBarProps {
  current: number;
  max: number;
  label?: string;
  color?: string;
  isPlayer?: boolean;
}

export const HealthBar: React.FC<HealthBarProps> = ({ 
  current, 
  max, 
  label, 
  color = "bg-green-500",
  isPlayer = false
}) => {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  
  return (
    <div className={`w-full max-w-md ${isPlayer ? 'order-first' : 'order-last'}`}>
      <div className="flex justify-between mb-1">
        <span className="text-sm font-bold text-white shadow-black drop-shadow-md">{label}</span>
        <span className="text-sm font-bold text-white shadow-black drop-shadow-md">{current}/{max}</span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-6 border-2 border-slate-900 shadow-inner relative overflow-hidden">
        {/* Background flash for damage effect could go here */}
        <div 
          className={`h-full rounded-full transition-all duration-500 ease-out ${color} relative`}
          style={{ width: `${percentage}%` }}
        >
            <div className="absolute top-0 left-0 w-full h-1/2 bg-white opacity-20 rounded-t-full"></div>
        </div>
      </div>
    </div>
  );
};