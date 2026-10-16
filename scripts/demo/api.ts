/**
 * Demo replacement for src/lib/api.ts. Used only for the published preview:
 * it never calls a server and answers with clearly labelled sample results.
 */
import type {
  ApiError,
  ErrorCode,
  HealthResponse,
  Source,
  UploadRef,
  VerificationResult,
  VerifyRequest,
  VerifyStage,
} from '../../src/types';

export class RequestError extends Error implements ApiError {
  constructor(public code: ErrorCode, message: string) {
    super(message);
  }
  toJSON(): ApiError {
    return { code: this.code, message: this.message };
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof RequestError) return error.toJSON();
  if ((error as Error)?.name === 'AbortError') return { code: 'CANCELLED', message: 'You stopped this check.' };
  return { code: 'UPSTREAM', message: 'Something went wrong in the demo.' };
}

export async function getHealth(): Promise<HealthResponse> {
  return { ok: true, hasApiKey: true, models: { deep: 'demo', quick: 'demo' }, maxUploadMb: 100 };
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    }, { once: true });
  });
}

export async function uploadFile(
  file: Blob,
  _name: string,
  mimeType: string,
  options: { onProgress: (fraction: number) => void; signal: AbortSignal },
): Promise<UploadRef> {
  for (let i = 1; i <= 10; i++) {
    await wait(90, options.signal);
    options.onProgress(i / 10);
  }
  await wait(400, options.signal);
  if (mimeType === 'text/plain') {
    const text = await file.text();
    return { kind: 'text', text: text.slice(0, 60000), truncated: text.length > 60000 };
  }
  return { kind: 'file', fileUri: 'https://generativelanguage.googleapis.com/v1beta/files/demo', mimeType };
}

const DEMO_NOTICE =
  'This is the NLI demo, so this is a saved sample answer. In the real app, every check is researched live with Google Search.';

const wiki = (title: string, path: string, supports: string[], id: number): Source => ({
  id,
  title,
  domain: 'en.wikipedia.org',
  url: `https://en.wikipedia.org/wiki/${path}`,
  supports,
  origin: 'search',
});

type Sample = Omit<VerificationResult, 'notices' | 'model' | 'durationMs' | 'sharedLinks' | 'searchSuggestionsHtml'> & {
  /** Summaries for the other ages; simpleSummary is the 9–12 version. */
  young: string;
  teen: string;
};

const NO_AI = { applicable: false, assessment: 'UNCERTAIN' as const, confidence: 0, signals: [] };
const MYTHS = 'List_of_common_misconceptions';

const SAMPLES: { match: RegExp; result: Sample }[] = [
  {
    match: /gum/i,
    result: {
      verdict: 'FALSE',
      headline: "Swallowed gum doesn't stay in your tummy for 7 years",
      simpleSummary: "Your body can't break gum down, but it still moves it along like other food. It comes out in a few days.",
      young: "Gum does not stay in your tummy. It comes out in a few days.",
      teen: "Gum base isn't digested, but it passes through the digestive system like other indigestible material, usually within days. The 7-year claim is a myth.",
      credibilityScore: 4,
      claims: [
        { claim: 'Swallowed gum stays in your stomach for 7 years', verdict: 'FALSE', explanation: 'It moves through your body and comes out within days.' },
        { claim: 'Your body cannot digest gum', verdict: 'TRUE', explanation: "The gum part can't be broken down, but it still passes through." },
      ],
      aiCheck: NO_AI,
      lesson: 'When something sounds scary and oddly exact, like "7 years", check it. Myths often use big numbers to sound true.',
      glossary: [{ word: 'digest', meaning: 'when your body breaks food down to use it' }],
      sensitive: false,
      reassurance: '',
      tips: ['Look it up on a health or science website.', "Ask a doctor or school nurse. They'll know!"],
      report: `## Verdict
FALSE: swallowed gum does not stay in your stomach for seven years.
## What was claimed
- Gum you swallow stays in your stomach for 7 years.
## What the evidence shows
The gum base in chewing gum can't be digested, but it still moves through the digestive system and passes out of the body. [1](#cite-1) The idea that it stays in the stomach for seven years is a well-known misconception. [2](#cite-2)
## Was it made by AI?
Not applicable: there was no media or writing to examine.
## Bottom line
Gum doesn't stay inside you for years. Your body moves it along and it comes out in a few days. It's still better to spit it out!`,
      sources: [
        wiki('Chewing gum', 'Chewing_gum', ["The gum base in chewing gum can't be digested, but it still moves through the digestive system and passes out of the body."], 1),
        wiki('List of common misconceptions', MYTHS, ['The idea that it stays in the stomach for seven years is a well-known misconception.'], 2),
      ],
      searchQueries: ['does swallowed gum stay in stomach 7 years', 'chewing gum digestion'],
      citationCoverage: 0.64,
    },
  },
  {
    match: /carrot/i,
    result: {
      verdict: 'MISLEADING',
      headline: "Carrots help keep eyes healthy, but they don't give night vision",
      simpleSummary: "Carrots have vitamin A, which your eyes need. But eating lots of them won't let you see in the dark. That story spread during World War II.",
      young: "Carrots are good for your eyes. But they can't make you see in the dark.",
      teen: "Carrots contain beta-carotene, which the body turns into vitamin A, needed for healthy vision. Extra carrots don't give night vision; the idea was popularised by British wartime propaganda.",
      credibilityScore: 30,
      claims: [
        { claim: 'Carrots let you see in the dark', verdict: 'FALSE', explanation: "No food gives you night vision." },
        { claim: 'Carrots are good for your eyes', verdict: 'TRUE', explanation: 'They have what your body needs to make vitamin A.' },
      ],
      aiCheck: NO_AI,
      lesson: 'A little bit of truth can hide a big myth. Ask which part is really true.',
      glossary: [{ word: 'vitamin A', meaning: 'something in food that helps your eyes work well' }],
      sensitive: false,
      reassurance: '',
      tips: ['Check a health website for kids.', 'Ask: which part is true, and which part is exaggerated?'],
      report: `## Verdict
MISLEADING: carrots support healthy eyes, but they don't give you night vision.
## What was claimed
- Eating carrots helps you see in the dark.
## What the evidence shows
Carrots contain beta-carotene, which the body turns into vitamin A, and vitamin A is needed for healthy eyesight. [1](#cite-1)[2](#cite-2) Eating extra carrots does not give people the ability to see in the dark. [3](#cite-3) The idea was spread by British propaganda during World War II. [1](#cite-1)[3](#cite-3)
## Was it made by AI?
Not applicable: there was no media or writing to examine.
## Bottom line
Carrots are good for your eyes, but they won't give you night vision. That part is a myth from a long time ago!`,
      sources: [
        wiki('Carrot', 'Carrot', ['Carrots contain beta-carotene, which the body turns into vitamin A, and vitamin A is needed for healthy eyesight.', 'The idea was spread by British propaganda during World War II.'], 1),
        wiki('Vitamin A', 'Vitamin_A', ['Carrots contain beta-carotene, which the body turns into vitamin A, and vitamin A is needed for healthy eyesight.'], 2),
        wiki('List of common misconceptions', MYTHS, ['Eating extra carrots does not give people the ability to see in the dark.', 'The idea was spread by British propaganda during World War II.'], 3),
      ],
      searchQueries: ['do carrots help you see in the dark', 'carrots night vision myth world war 2'],
      citationCoverage: 0.68,
    },
  },
  {
    match: /brain|10 ?%/i,
    result: {
      verdict: 'FALSE',
      headline: 'We use almost all of our brain, not just 10%',
      simpleSummary: 'Brain scans show that we use nearly every part of our brain. Different parts do different jobs, like seeing, moving and remembering.',
      young: 'We use all of our brain! Each part has its own job.',
      teen: 'Brain imaging shows activity across virtually the whole brain over a day, with different regions specialised for different functions. The 10% figure has no scientific basis.',
      credibilityScore: 5,
      claims: [{ claim: 'People only use 10% of their brains', verdict: 'FALSE', explanation: 'Scans show almost all of the brain is active over a day.' }],
      aiCheck: NO_AI,
      lesson: 'If a "fact" would be amazing news, ask how scientists know it. Real facts come with proof.',
      glossary: [{ word: 'brain scan', meaning: 'a special picture doctors take to see a brain working' }],
      sensitive: false,
      reassurance: '',
      tips: ['Look for the topic on a science museum website.', 'Ask: who measured this, and how?'],
      report: `## Verdict
FALSE: people use virtually all of their brain.
## What was claimed
- Humans only use 10% of their brains.
## What the evidence shows
Brain imaging shows that almost every part of the brain is active, with different areas handling different tasks. [1](#cite-1) Scientists describe the 10% idea as a myth with no evidence behind it. [1](#cite-1)[2](#cite-2)
## Was it made by AI?
Not applicable: there was no media or writing to examine.
## Bottom line
Your whole brain is busy helping you see, move, think and remember. The 10% idea is a myth!`,
      sources: [
        wiki('Ten percent of the brain myth', 'Ten_percent_of_the_brain_myth', ['Brain imaging shows that almost every part of the brain is active, with different areas handling different tasks.', 'Scientists describe the 10% idea as a myth with no evidence behind it.'], 1),
        wiki('List of common misconceptions', MYTHS, ['Scientists describe the 10% idea as a myth with no evidence behind it.'], 2),
      ],
      searchQueries: ['do we only use 10 percent of our brain', 'ten percent brain myth'],
      citationCoverage: 0.62,
    },
  },
  {
    match: /goldfish/i,
    result: {
      verdict: 'FALSE',
      headline: 'Goldfish remember things for months, not seconds',
      simpleSummary: 'Goldfish have much better memories than people think. Scientists have trained them to remember sounds and colours for months.',
      young: 'Goldfish can remember things for a long time!',
      teen: 'Studies show goldfish retain learned associations for at least three months. The "3-second memory" is a popular misconception.',
      credibilityScore: 6,
      claims: [
        { claim: 'Goldfish only have a 3-second memory', verdict: 'FALSE', explanation: 'Experiments show goldfish can remember things for at least three months.' },
        { claim: 'Goldfish can be trained', verdict: 'TRUE', explanation: 'They have been trained to respond to sounds, lights and colours.' },
      ],
      aiCheck: NO_AI,
      lesson: 'A saying everyone repeats can still be wrong. Look for experiments, not just sayings.',
      glossary: [{ word: 'myth', meaning: 'a story lots of people believe that is not true' }],
      sensitive: false,
      reassurance: '',
      tips: ['Look for the fact on a science or university website.', 'Ask who did the experiment, and when.'],
      report: `## Verdict
FALSE: goldfish can remember things for months, not seconds.
## What was claimed
- Goldfish only have a 3-second memory.
## What the evidence shows
Goldfish have a memory span of at least three months. [1](#cite-1)[2](#cite-2) They can be trained to respond to sounds, lights and colours, for example to come to a certain spot at feeding time. [1](#cite-1) The "3-second memory" is listed among popular misconceptions about animals. [2](#cite-2)
## Was it made by AI?
Not applicable: there was no media or writing to examine.
## Bottom line
Goldfish are smarter than people think! They can remember things for months, so the 3-second memory story isn't true.`,
      sources: [
        wiki('Goldfish', 'Goldfish', ['Goldfish have a memory span of at least three months.', 'They can be trained to respond to sounds, lights and colours, for example to come to a certain spot at feeding time.'], 1),
        wiki('List of common misconceptions', MYTHS, ['Goldfish have a memory span of at least three months.', 'The "3-second memory" is listed among popular misconceptions about animals.'], 2),
      ],
      searchQueries: ['goldfish memory span study', 'goldfish 3 second memory myth'],
      citationCoverage: 0.62,
    },
  },
  {
    match: /bats?\b/i,
    result: {
      verdict: 'FALSE',
      headline: 'Bats are not blind: every kind of bat can see',
      simpleSummary: 'All bats have working eyes. Many also use echolocation, which is like "seeing" with sound.',
      young: 'Bats can see! Many can also find things by listening.',
      teen: 'No bat species is blind. Many bats also echolocate, and some fruit bats rely mainly on vision.',
      credibilityScore: 5,
      claims: [
        { claim: 'Bats are blind', verdict: 'FALSE', explanation: 'No kind of bat is blind.' },
        { claim: 'Many bats use echolocation', verdict: 'TRUE', explanation: 'They make calls and listen to the echoes to find their way.' },
      ],
      aiCheck: NO_AI,
      lesson: 'Old sayings like "blind as a bat" aren\'t proof. Check what scientists have found.',
      glossary: [{ word: 'echolocation', meaning: 'finding things by making sounds and listening to the echoes' }],
      sensitive: false,
      reassurance: '',
      tips: ['Look for an animal encyclopedia or a zoo website.', 'Ask: if they were blind, why would they have eyes?'],
      report: `## Verdict
FALSE: no species of bat is blind.
## What was claimed
- Bats are blind.
## What the evidence shows
All bats can see, and some fruit bats rely mostly on their eyesight. [1](#cite-1)[3](#cite-3) Many bats also use echolocation: they make calls and listen to the echoes to find their way in the dark. [2](#cite-2) The saying "blind as a bat" is a common misconception. [3](#cite-3)
## Was it made by AI?
Not applicable: there was no media or writing to examine.
## Bottom line
Bats can see! Many of them also have a sound superpower called echolocation.`,
      sources: [
        wiki('Bat', 'Bat', ['All bats can see, and some fruit bats rely mostly on their eyesight.'], 1),
        wiki('Animal echolocation', 'Animal_echolocation', ['Many bats also use echolocation: they make calls and listen to the echoes to find their way in the dark.'], 2),
        wiki('List of common misconceptions', MYTHS, ['All bats can see, and some fruit bats rely mostly on their eyesight.', 'The saying "blind as a bat" is a common misconception.'], 3),
      ],
      searchQueries: ['are bats blind', 'bat eyesight echolocation'],
      citationCoverage: 0.66,
    },
  },
  {
    match: /lightning/i,
    result: {
      verdict: 'FALSE',
      headline: 'Lightning often strikes the same place more than once',
      simpleSummary: 'Tall, pointy things get hit by lightning again and again. Some tall buildings are struck many times every year.',
      young: 'Lightning can hit the same place many times!',
      teen: 'Lightning favours tall, isolated structures and frequently strikes them repeatedly; the Empire State Building is hit around 20 times a year.',
      credibilityScore: 7,
      claims: [{ claim: 'Lightning never strikes the same place twice', verdict: 'FALSE', explanation: 'Tall buildings are struck again and again.' }],
      aiCheck: NO_AI,
      lesson: 'Sayings can be about luck, not facts. Look for real examples to test them.',
      glossary: [],
      sensitive: true,
      reassurance: 'Storms can feel scary, but buildings have lightning rods to keep people safe. Staying indoors during a storm is the safest place to be.',
      tips: ['Check a weather service or science museum website.', 'Look for real examples, like famous tall buildings.'],
      report: `## Verdict
FALSE: lightning can and does strike the same place many times.
## What was claimed
- Lightning never strikes the same place twice.
## What the evidence shows
Lightning tends to hit the tallest objects around, so the same tall places are struck again and again. [1](#cite-1) The Empire State Building in New York is struck by lightning around 20 times a year. [2](#cite-2) The saying is listed as a common misconception. [3](#cite-3)
## Was it made by AI?
Not applicable: there was no media or writing to examine.
## Bottom line
Lightning likes tall things and can hit them over and over. So the saying is not true!`,
      sources: [
        wiki('Lightning', 'Lightning', ['Lightning tends to hit the tallest objects around, so the same tall places are struck again and again.'], 1),
        wiki('Empire State Building', 'Empire_State_Building', ['The Empire State Building in New York is struck by lightning around 20 times a year.'], 2),
        wiki('List of common misconceptions', MYTHS, ['The saying is listed as a common misconception.'], 3),
      ],
      searchQueries: ['does lightning strike the same place twice', 'empire state building lightning strikes per year'],
      citationCoverage: 0.6,
    },
  },
];

function fallback(request: VerifyRequest): Sample {
  const hasFiles = request.attachments.length > 0;
  return {
    verdict: 'UNVERIFIABLE',
    headline: hasFiles ? "The demo can't look at your file" : "The demo can't research new questions",
    simpleSummary: hasFiles
      ? 'This preview has no connection to Gemini, so it cannot examine photos, videos, audio or documents. Run NLI with a Gemini API key to check real files.'
      : 'This preview only has sample answers for the example questions. Run NLI with a Gemini API key to check anything you like.',
    credibilityScore: 50,
    claims: [],
    aiCheck: NO_AI,
    lesson: 'When you can\'t check something yet, it\'s okay to say "I\'m not sure" and wait before sharing.',
    glossary: [],
    sensitive: false,
    reassurance: '',
    young: '',
    teen: '',
    tips: ['Try one of the example questions on the start screen.', 'To run NLI for real, add GEMINI_API_KEY to .env.local and run npm run dev.'],
    report: `## Verdict
UNVERIFIABLE: this is a demo without a live connection to Gemini.
## What happens in the real app
NLI would search the web with Google Search, read any links you shared, examine attached media for signs of AI, and then show its verdict with numbered sources.`,
    sources: [],
    searchQueries: [],
    citationCoverage: 0,
  };
}

export async function verify(
  request: VerifyRequest,
  options: { signal: AbortSignal; onStage: (stage: VerifyStage) => void },
): Promise<VerificationResult> {
  const started = Date.now();
  const sample =
    request.attachments.length === 0 ? SAMPLES.find(s => s.match.test(request.text))?.result : undefined;
  const result = sample ?? fallback(request);

  await wait(400, options.signal);
  options.onStage('researching');
  await wait(sample ? (request.mode === 'quick' ? 1600 : 3200) : 900, options.signal);
  options.onStage('structuring');
  await wait(sample ? 900 : 300, options.signal);

  const { young, teen, ...rest } = result;
  const simpleSummary = (request.audience === 'young' && young) || (request.audience === 'teen' && teen) || rest.simpleSummary;
  return {
    ...rest,
    simpleSummary,
    notices: [DEMO_NOTICE],
    sharedLinks: [],
    model: 'NLI demo (sample answer)',
    durationMs: Date.now() - started,
  };
}
