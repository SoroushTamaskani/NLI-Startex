import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { useEscape } from '../hooks/useMisc';

const SECTIONS = [
  {
    emoji: '🔎',
    title: 'What NLI does',
    body: 'Children can ask about a claim, a link, a photo, a video, a voice clip or a document. NLI researches it with Google Search, gives a verdict in words that suit their age, and shows the websites it used.',
  },
  {
    emoji: '📚',
    title: 'How answers are checked',
    body: 'Every website listed under "Where I found the proof" was actually returned by Google Search or opened from a link you shared. NLI never shows links the AI made up. If it finds no websites, it says "Can\'t confirm" instead of guessing.',
  },
  {
    emoji: '🤖',
    title: 'What it can get wrong',
    body: 'NLI uses Google\'s Gemini AI, which can misunderstand things. The "made by a computer?" check is a best guess from visible clues, not a scientific test. Treat every answer as a starting point and look at the sources together.',
  },
  {
    emoji: '🔒',
    title: 'Privacy',
    body: 'Past checks are saved only in this browser on this device. Messages and attached files are sent to Google\'s Gemini API to be checked, and uploaded files are deleted by Google after about 48 hours. Remind children not to share photos of themselves or personal details.',
  },
  {
    emoji: '💬',
    title: 'Using it together',
    body: 'Ask your child to explain the "Detective tip" in their own words, open one of the sources together, and talk about how something made them feel. Truth Academy has short lessons and quizzes that work well for a 10-minute session.',
  },
];

export function GrownUpsGuide({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEscape(true, onClose);
  useEffect(() => closeRef.current?.focus(), []);

  return (
    <div className="fixed inset-0 z-[115] flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="grownups-title">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-ink/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] border-4 border-cream-200 bg-white shadow-2xl sm:rounded-[28px]"
      >
        <div className="flex items-start justify-between gap-3 border-b-4 border-cream-200 bg-cream-100 px-5 py-4">
          <div>
            <h2 id="grownups-title" className="font-display text-2xl font-bold text-ink">
              For parents and teachers
            </h2>
            <p className="text-sm text-ink-soft">How NLI works, what it can get wrong, and how to use it with children.</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="rounded-xl p-2 text-brand-700 hover:bg-white" aria-label="Close">
            <X size={22} />
          </button>
        </div>
        <div className="custom-scrollbar space-y-4 overflow-y-auto px-5 py-5">
          {SECTIONS.map(section => (
            <section key={section.title} className="flex gap-3">
              <span className="text-2xl leading-none" aria-hidden>
                {section.emoji}
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">{section.title}</h3>
                <p className="mt-0.5 max-w-prose text-sm leading-relaxed text-ink-soft">{section.body}</p>
              </div>
            </section>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
