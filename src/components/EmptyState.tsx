import { FileText, Image as ImageIcon, Link2, MessageSquareQuote, Mic, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

const EXAMPLES = [
  'Do goldfish really only remember things for 3 seconds?',
  'Can you see the Great Wall of China from space?',
  'Are bats blind?',
  'Does lightning never strike the same place twice?',
];

const CAPABILITIES = [
  { icon: MessageSquareQuote, title: 'Claims', text: 'Something you heard or read', color: 'bg-kids-blue/30' },
  { icon: Link2, title: 'Links', text: 'News stories and posts', color: 'bg-kids-yellow/40' },
  { icon: ImageIcon, title: 'Photos & videos', text: 'Real, edited or AI-made?', color: 'bg-kids-pink/30' },
  { icon: Mic, title: 'Voices & audio', text: 'Spot cloned voices', color: 'bg-kids-purple/50' },
  { icon: FileText, title: 'Documents', text: 'PDF, Word or text files', color: 'bg-kids-green/40' },
];

export function EmptyState({ onExample, onAttach }: { onExample: (text: string) => void; onAttach: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto flex max-w-2xl flex-col items-center px-2 py-6 text-center sm:py-10">
      <div className="relative">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="flex h-24 w-24 items-center justify-center rounded-[32px] bg-kids-blue text-5xl shadow-lift"
          aria-hidden
        >
          🤖
        </motion.div>
        <span className="absolute -right-3 -top-2 flex h-10 w-10 items-center justify-center rounded-full bg-kids-yellow text-xl shadow-bubble" aria-hidden>
          🔍
        </span>
      </div>
      <h2 className="mt-6 font-display text-3xl font-bold text-ink sm:text-4xl">Hi! I'm NLI 👋</h2>
      <p className="mt-2 max-w-lg text-base leading-relaxed text-ink-soft sm:text-lg">
        Show me something you're not sure about. I'll search the web for real evidence, tell you if it's true, and show you
        exactly where I checked.
      </p>

      <ul className="mt-8 grid w-full grid-cols-2 gap-2 sm:grid-cols-5">
        {CAPABILITIES.map(({ icon: Icon, title, text, color }) => (
          <li key={title} className="rounded-2xl border-2 border-cream-200 bg-white p-3 text-left sm:text-center">
            <span className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl ${color} text-ink`}>
              <Icon size={18} aria-hidden />
            </span>
            <p className="text-sm font-bold text-ink">{title}</p>
            <p className="text-[11px] leading-snug text-ink-soft">{text}</p>
          </li>
        ))}
      </ul>

      <div className="mt-8 w-full">
        <p className="mb-3 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest text-brand-700">
          <Sparkles size={14} aria-hidden /> Try one of these
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {EXAMPLES.map(example => (
            <button
              key={example}
              type="button"
              onClick={() => onExample(example)}
              className="rounded-full border-2 border-brand-100 bg-white px-4 py-2 text-sm font-semibold text-ink shadow-bubble transition-colors hover:border-brand-500 hover:bg-cream-100"
            >
              {example}
            </button>
          ))}
          <button
            type="button"
            onClick={onAttach}
            className="rounded-full border-2 border-dashed border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition-colors hover:border-brand-500 hover:bg-cream-100"
          >
            📸 Check a picture or video…
          </button>
        </div>
      </div>
    </motion.div>
  );
}
