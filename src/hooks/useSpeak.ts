import { useCallback, useEffect, useState } from 'react';

/** Removes emoji and markdown so the voice reads only the words. */
export function speakableText(text: string): string {
  return text
    .replace(/\[(\d+)\]\(#cite-\d+\)/g, '')
    .replace(/[*_#>`]/g, '')
    .replace(/\p{Extended_Pictographic}|️|‍/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Reads text aloud with the browser's built-in voice, for kids who are still
 * learning to read. Only one thing is read at a time across the app.
 */
export function useSpeak() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  useEffect(() => {
    if (!supported) return;
    return () => window.speechSynthesis.cancel();
  }, [supported]);

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, [supported]);

  const speak = useCallback(
    (id: string, text: string) => {
      if (!supported) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(speakableText(text));
      utterance.lang = navigator.language || 'en-US';
      utterance.rate = 0.92;
      utterance.pitch = 1.05;
      utterance.onend = utterance.onerror = () => setSpeakingId(current => (current === id ? null : current));
      setSpeakingId(id);
      synth.speak(utterance);
    },
    [supported],
  );

  return { supported, speakingId, speak, stop };
}
