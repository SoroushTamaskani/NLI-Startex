import { motion } from 'motion/react';
import type { Audience } from '../types';
import { AgePicker } from './AgePicker';

/** Myths kids actually hear at school and online. */
const EXAMPLES = [
  { emoji: '🍬', text: 'If you swallow gum, does it stay in your tummy for 7 years?' },
  { emoji: '🥕', text: 'Do carrots help you see in the dark?' },
  { emoji: '🧠', text: 'Do we only use 10% of our brains?' },
  { emoji: '🐠', text: 'Do goldfish really only remember things for 3 seconds?' },
  { emoji: '🦇', text: 'Are bats blind?' },
  { emoji: '⚡', text: 'Does lightning never strike the same place twice?' },
];

const STEPS = [
  { emoji: '📨', title: 'Show me', text: 'Type something you heard, paste a link, or add a picture, video or sound.' },
  { emoji: '🔎', title: 'I hunt for clues', text: 'I search trusted websites and look for computer-made tricks.' },
  { emoji: '✅', title: 'You get the answer', text: 'True or not, explained simply, with the websites where I found the proof.' },
];

export function EmptyState({
  audience,
  onAudienceChange,
  onExample,
  onAttach,
  onOpenGuide,
}: {
  audience: Audience;
  onAudienceChange: (audience: Audience) => void;
  onExample: (text: string) => void;
  onAttach: () => void;
  onOpenGuide: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto flex max-w-2xl flex-col items-center gap-8 py-4 text-center sm:py-8">
      <div className="flex flex-col items-center">
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
        <h2 className="mt-5 font-display text-3xl font-bold text-ink [text-wrap:balance] sm:text-4xl">Hi! I'm NLI, the No Lie robot 👋</h2>
        <p className="mt-2 max-w-lg text-lg leading-relaxed text-ink-soft">
          Heard something surprising? Saw a weird picture? Ask me, and we'll find out together if it's true.
        </p>
      </div>

      <AgePicker value={audience} onChange={onAudienceChange} />

      <ol className="grid w-full gap-2 text-left sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-3 rounded-2xl border-2 border-cream-200 bg-white p-3 sm:flex-col sm:gap-1">
            <span className="text-2xl leading-none" aria-hidden>
              {step.emoji}
            </span>
            <span>
              <span className="block text-sm font-bold text-ink">
                {i + 1}. {step.title}
              </span>
              <span className="block text-xs leading-snug text-ink-soft">{step.text}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="w-full">
        <h3 className="mb-3 text-sm font-bold text-brand-700">Things kids often hear. Are they true?</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {EXAMPLES.map(example => (
            <button
              key={example.text}
              type="button"
              onClick={() => onExample(example.text)}
              className="flex items-center gap-3 rounded-2xl border-2 border-brand-100 bg-white px-4 py-3 text-left text-sm font-semibold text-ink shadow-bubble transition-colors hover:border-brand-500 hover:bg-cream-100"
            >
              <span className="text-2xl leading-none" aria-hidden>
                {example.emoji}
              </span>
              {example.text}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onAttach}
          className="mt-2 w-full rounded-2xl border-2 border-dashed border-brand-200 bg-white px-4 py-3 text-sm font-bold text-brand-700 transition-colors hover:border-brand-500 hover:bg-cream-100"
        >
          📸 Is a picture, video or voice real? Add it here
        </button>
      </div>

      <button type="button" onClick={onOpenGuide} className="text-xs font-bold text-ink-soft underline decoration-dotted underline-offset-4 hover:text-ink">
        Parent or teacher? Read how NLI works
      </button>
    </motion.div>
  );
}
