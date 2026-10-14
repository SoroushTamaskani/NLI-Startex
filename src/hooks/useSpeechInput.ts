import { useCallback, useEffect, useRef, useState } from 'react';

// The Web Speech API isn't in TypeScript's DOM types yet.
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

function recognitionClass(): (new () => Recognition) | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/** Voice typing. What you say is added after the text already in the box instead of replacing it. */
export function useSpeechInput(onText: (text: string) => void, onError: (message: string) => void) {
  const [listening, setListening] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const callbacks = useRef({ onText, onError });
  callbacks.current = { onText, onError };
  const supported = !!recognitionClass();

  useEffect(() => () => recognition.current?.abort(), []);

  const start = useCallback((existingText: string) => {
    const Ctor = recognitionClass();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = navigator.language || 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    const prefix = existingText.trim() ? `${existingText.trimEnd()} ` : '';

    rec.onresult = event => {
      let spoken = '';
      for (let i = 0; i < event.results.length; i++) spoken += event.results[i][0].transcript;
      callbacks.current.onText(prefix + spoken.trimStart());
    };
    rec.onerror = event => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        callbacks.current.onError('NLI needs permission to use the microphone. Check your browser settings.');
      } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
        callbacks.current.onError('Voice typing stopped. Please try again.');
      }
    };
    rec.onend = () => setListening(false);

    recognition.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, []);

  const stop = useCallback(() => recognition.current?.stop(), []);

  return { supported, listening, start, stop };
}
