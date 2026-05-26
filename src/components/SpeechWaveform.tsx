/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';

interface SpeechWaveformProps {
  isActive: boolean;
}

export function SpeechWaveform({ isActive }: SpeechWaveformProps) {
  const [dots, setDots] = useState<number[]>([15, 20, 25, 18, 12, 16, 22, 28, 15, 10, 18, 25, 30, 20, 15]);

  useEffect(() => {
    let interval: any;
    if (isActive) {
      interval = setInterval(() => {
        setDots(prev =>
          prev.map(() => Math.floor(Math.random() * 32) + 8)
        );
      }, 95);
    } else {
      setDots([12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12]);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="flex items-center justify-center gap-1.5 h-16 w-full max-w-xs mx-auto">
      {dots.map((height, i) => (
        <div
          key={i}
          id={`waveform-bar-${i}`}
          style={{ height: `${height}px` }}
          className={`w-1 rounded-full transition-all duration-100 ${
            isActive
              ? 'bg-gradient-to-t from-blue-600 to-indigo-400 shadow-[0_0_12px_rgba(59,130,246,0.6)]'
              : 'bg-white/10'
          }`}
        />
      ))}
    </div>
  );
}
