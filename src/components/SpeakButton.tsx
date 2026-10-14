import { Square, Volume2 } from 'lucide-react';
import { useSpeak } from '../hooks/useSpeak';
import { cn } from '../lib/utils';

/** "Read it to me" button. Hidden when the browser has no speech voice. */
export function SpeakButton({ id, text, label = 'Read it to me', className }: { id: string; text: string; label?: string; className?: string }) {
  const { supported, speakingId, speak, stop } = useSpeak();
  if (!supported) return null;
  const speaking = speakingId === id;
  return (
    <button
      type="button"
      onClick={() => (speaking ? stop() : speak(id, text))}
      aria-pressed={speaking}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-bold transition-colors',
        speaking ? 'border-brand-500 bg-brand-500 text-white' : 'border-white/70 bg-white/80 text-ink hover:bg-white',
        className,
      )}
    >
      {speaking ? <Square size={12} fill="currentColor" aria-hidden /> : <Volume2 size={15} aria-hidden />}
      {speaking ? 'Stop reading' : label}
    </button>
  );
}
