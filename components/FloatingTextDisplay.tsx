import React from 'react';
import { FloatingText } from '../types';

interface FloatingTextDisplayProps {
  items: FloatingText[];
}

export const FloatingTextDisplay: React.FC<FloatingTextDisplayProps> = ({ items }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {items.map((item) => (
        <div
          key={item.id}
          className={`absolute font-black text-4xl stroke-2 drop-shadow-xl float-up select-none
            ${item.type === 'damage' ? 'text-red-500' : ''}
            ${item.type === 'heal' ? 'text-green-400' : ''}
            ${item.type === 'miss' ? 'text-gray-400' : ''}
          `}
          style={{ 
            left: `${item.x}%`, 
            top: `${item.y}%`,
            textShadow: '2px 2px 0px black'
          }}
        >
          {item.type === 'damage' ? `-${item.text}` : item.text}
        </div>
      ))}
    </div>
  );
};