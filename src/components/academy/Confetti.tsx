import { motion } from 'motion/react';
import { useMemo } from 'react';

const COLORS = ['#ff85a2', '#70d6ff', '#ffd670', '#99ff88', '#e4c1f9', '#f97316'];

/** A short burst of falling confetti for perfect rounds. Turned off for reduced motion by MotionConfig. */
export function Confetti({ pieces = 40 }: { pieces?: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        left: (i * 37) % 100,
        delay: (i % 10) * 0.08,
        duration: 1.8 + ((i * 13) % 10) / 10,
        rotate: (i * 47) % 360,
        color: COLORS[i % COLORS.length],
        size: 6 + (i % 4) * 2,
      })),
    [pieces],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-[130] overflow-hidden" aria-hidden>
      {bits.map((bit, i) => (
        <motion.span
          key={i}
          initial={{ y: -40, opacity: 1, rotate: 0 }}
          animate={{ y: '105vh', opacity: [1, 1, 0], rotate: bit.rotate + 360 }}
          transition={{ duration: bit.duration, delay: bit.delay, ease: 'easeIn' }}
          className="absolute top-0 rounded-sm"
          style={{ left: `${bit.left}%`, width: bit.size, height: bit.size * 1.6, backgroundColor: bit.color }}
        />
      ))}
    </div>
  );
}
