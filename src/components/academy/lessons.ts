import type { ChoiceChallenge } from './challenges';

export interface LessonSlide {
  emoji: string;
  title: string;
  text: string;
}

export interface Lesson {
  id: string;
  emoji: string;
  title: string;
  /** One line shown on the lesson card. */
  blurb: string;
  color: string;
  slides: LessonSlide[];
  /** A short check at the end. */
  quiz: ChoiceChallenge[];
}

const quiz = (id: string, question: string, options: ChoiceChallenge['options'], hint: string): ChoiceChallenge => ({
  id,
  kind: 'choice',
  topic: 'sources',
  difficulty: 'Easy',
  title: 'Quick check ✏️',
  question,
  hint,
  options,
});

export const LESSONS: Lesson[] = [
  {
    id: 'moves',
    emoji: '🕵️',
    title: 'The 4 detective moves',
    blurb: 'What to do before you believe or share something',
    color: 'bg-kids-blue/30',
    slides: [
      { emoji: '✋', title: '1. Stop', text: 'Before you believe or share something, take a breath. If it makes you feel very excited, angry or scared, that’s a sign to slow down.' },
      { emoji: '👤', title: '2. Who made it?', text: 'Is it from someone who knows about the topic, like a scientist, a museum or a news team? Or from someone you know nothing about?' },
      { emoji: '🔍', title: '3. Where else?', text: 'Look for the same story on two or three trusted websites. If nobody else is reporting it, be careful.' },
      { emoji: '🧭', title: '4. Where did it start?', text: 'Pictures and stories get copied and changed. Try to find where it first appeared, and when.' },
    ],
    quiz: [
      quiz(
        'moves-1',
        'You see a post that makes you really angry. What’s the first detective move?',
        [
          { id: 'a', text: 'Stop and slow down ✋', isCorrect: true, feedback: 'Yes! Strong feelings are a signal to pause before you believe or share.' },
          { id: 'b', text: 'Share it right away 📤', isCorrect: false, feedback: 'Tricky posts want you to share fast. Stop first!' },
        ],
        'Detectives don’t rush.',
      ),
      quiz(
        'moves-2',
        'Only one website has a surprising story. What should you do?',
        [
          { id: 'a', text: 'Look for it on other trusted websites 🔍', isCorrect: true, feedback: 'Right! If trusted websites don’t have it, be careful.' },
          { id: 'b', text: 'Believe it, websites are always right 🌐', isCorrect: false, feedback: 'Anyone can make a website. Check where else the story appears.' },
        ],
        'Think about move 3.',
      ),
    ],
  },
  {
    id: 'ai-pictures',
    emoji: '🖼️',
    title: 'Spot a computer-made picture',
    blurb: 'The tiny mistakes AI pictures often make',
    color: 'bg-kids-purple/40',
    slides: [
      { emoji: '🖐️', title: 'Count the fingers', text: 'AI often draws hands with too many or too few fingers, or fingers that bend in strange ways.' },
      { emoji: '🔤', title: 'Read the writing', text: 'Signs, shirts and labels in AI pictures often have jumbled or melting letters that don’t spell real words.' },
      { emoji: '🪞', title: 'Check reflections and shadows', text: 'Reflections should match what’s above them, and shadows should all point the same way.' },
      { emoji: '✨', title: 'Too perfect?', text: 'Super smooth skin, glowing light, mismatched earrings or a blurry, smudgy background can be clues. Remember: AI keeps getting better, so no clue is ever proof on its own.' },
    ],
    quiz: [
      quiz(
        'ai-pictures-1',
        'A picture shows a shop sign that says "BAKREY FRESH BRAED". What might this mean?',
        [
          { id: 'a', text: 'It could be made by AI 🤖', isCorrect: true, feedback: 'Yes! Jumbled writing is a common AI clue.' },
          { id: 'b', text: 'Bakeries always spell like that 🥖', isCorrect: false, feedback: 'Real shop signs are usually spelled right. Messy letters are an AI clue.' },
        ],
        'Read the sign out loud.',
      ),
      quiz(
        'ai-pictures-2',
        'A picture has NO mistakes you can spot. Does that prove it’s real?',
        [
          { id: 'a', text: 'No, AI can be very good. Check where it came from 🧭', isCorrect: true, feedback: 'Exactly. No clues doesn’t mean real. Find out who posted it first.' },
          { id: 'b', text: 'Yes, no mistakes means it’s real ✅', isCorrect: false, feedback: 'AI pictures can look perfect. Always check where a picture came from too.' },
        ],
        'AI keeps getting better.',
      ),
    ],
  },
  {
    id: 'deepfakes',
    emoji: '🎭',
    title: 'Fake voices and videos',
    blurb: 'What deepfakes are and how to stay one step ahead',
    color: 'bg-kids-pink/30',
    slides: [
      { emoji: '🎭', title: 'What is a deepfake?', text: 'A deepfake is a video or voice made by AI to look or sound like a real person, saying things they never said.' },
      { emoji: '👄', title: 'Watch the mouth', text: 'Sometimes the lips don’t match the words, the face looks blurry when it moves, or the person blinks strangely.' },
      { emoji: '🔊', title: 'Listen carefully', text: 'Cloned voices can sound flat, with odd pauses or no breathing. But good ones can sound perfect, so listening isn’t enough.' },
      { emoji: '📰', title: 'Check the real source', text: 'The best test: is it on the person’s official page, or reported by trusted news? If not, be suspicious.' },
    ],
    quiz: [
      quiz(
        'deepfakes-1',
        'A video shows a famous athlete saying something really strange. What’s the best check?',
        [
          { id: 'a', text: 'See if trusted news or their official page has it 📰', isCorrect: true, feedback: 'Yes! Real big news shows up in many trusted places.' },
          { id: 'b', text: 'If it looks real, it is real 👀', isCorrect: false, feedback: 'Deepfakes can look very real. Check the source instead.' },
        ],
        'Think about move 3: where else?',
      ),
      quiz(
        'deepfakes-2',
        'Someone calls with a voice that sounds like your cousin, asking you to send money fast. What do you do?',
        [
          { id: 'a', text: 'Don’t send anything, and tell a grown-up 🛡️', isCorrect: true, feedback: 'Exactly right. Voices can be copied. A grown-up can help check who it really is.' },
          { id: 'b', text: 'Send it, it’s their voice 💸', isCorrect: false, feedback: 'AI can copy voices from short clips. Never send money, and tell a grown-up.' },
        ],
        'Can AI copy voices?',
      ),
    ],
  },
  {
    id: 'headlines',
    emoji: '📰',
    title: 'Tricky headlines',
    blurb: 'Clickbait, shouting and "share before it’s deleted"',
    color: 'bg-kids-yellow/40',
    slides: [
      { emoji: '📢', title: 'SHOUTING!!!', text: 'Lots of CAPITAL LETTERS, "SHOCKING" and "!!!" are there to grab your attention, not to tell you facts.' },
      { emoji: '🎣', title: 'Clickbait', text: '"You won’t BELIEVE what happened next" hides the facts so you’ll click. Real news tells you what happened right away.' },
      { emoji: '⏰', title: 'Rushing you', text: '"Share before it gets deleted!" is a trick to make you share without checking. Real information doesn’t disappear.' },
      { emoji: '🧾', title: 'Missing details', text: 'Good stories say who, what, where and when. If a headline says "scientists say" but never names them, be careful.' },
    ],
    quiz: [
      quiz(
        'headlines-1',
        'Which headline is more trustworthy?',
        [
          { id: 'a', text: '"City opens new library on Main Street on Monday" 📚', isCorrect: true, feedback: 'Yes! It’s calm and tells you what, where and when.' },
          { id: 'b', text: '"You WON’T BELIEVE what this library did!!!" 😱', isCorrect: false, feedback: 'That’s clickbait: it hides the facts so you’ll click.' },
        ],
        'Which one tells you the facts?',
      ),
      quiz(
        'headlines-2',
        'A post says "Share this before they delete it!" What does that tell you?',
        [
          { id: 'a', text: 'It’s trying to rush me. Slow down 🐢', isCorrect: true, feedback: 'Exactly! Rushing you is a classic trick.' },
          { id: 'b', text: 'It must be a secret truth 🤫', isCorrect: false, feedback: 'Real information doesn’t need you to hurry. This is a warning sign.' },
        ],
        'Why would someone want you to hurry?',
      ),
    ],
  },
  {
    id: 'ads',
    emoji: '🛍️',
    title: 'Ads in disguise',
    blurb: 'When someone is paid to tell you something',
    color: 'bg-kids-green/40',
    slides: [
      { emoji: '💰', title: 'Paid to say it', text: 'Companies pay video creators and celebrities to talk about their products. That’s an ad, even if it looks like a normal video.' },
      { emoji: '🏷️', title: 'Look for labels', text: 'Words like "ad", "sponsored", "paid partnership" or "#ad" mean someone was paid.' },
      { emoji: '🎟️', title: 'Discount codes', text: '"Use my code for 20% off!" usually means the creator earns money when you buy.' },
      { emoji: '🤔', title: 'Ask yourself', text: 'Is this person telling me this because it’s true, or because they’re selling something? Both can happen, so it’s worth asking.' },
    ],
    quiz: [
      quiz(
        'ads-1',
        'A video has a small label that says "Paid partnership". What does it mean?',
        [
          { id: 'a', text: 'The creator was paid by a company 💰', isCorrect: true, feedback: 'Right! It’s an ad, so think carefully about what they say.' },
          { id: 'b', text: 'The video won a prize 🏆', isCorrect: false, feedback: '"Paid partnership" means a company paid for it. It’s an ad.' },
        ],
        'Look at the word "paid".',
      ),
      quiz(
        'ads-2',
        'Is it okay to enjoy a video that’s also an ad?',
        [
          { id: 'a', text: 'Yes, just know it’s an ad 👍', isCorrect: true, feedback: 'Yes! Ads can be fun. Knowing it’s an ad helps you decide for yourself.' },
          { id: 'b', text: 'No, ads are always lies 🙅', isCorrect: false, feedback: 'Ads aren’t always lies. They just want to sell something, so it’s smart to know.' },
        ],
        'Knowing is the superpower.',
      ),
    ],
  },
  {
    id: 'fact-opinion',
    emoji: '⚖️',
    title: 'Fact or opinion?',
    blurb: 'Things you can check, and things people feel',
    color: 'bg-kids-blue/20',
    slides: [
      { emoji: '📏', title: 'Facts can be checked', text: 'A fact can be proven with measuring, counting, experiments or trusted records. "Water boils at 100 °C at sea level" is a fact.' },
      { emoji: '💭', title: 'Opinions are feelings', text: 'An opinion is what someone thinks or likes. "Pizza is the best food" is an opinion. It can’t be true or false.' },
      { emoji: '🔑', title: 'Clue words', text: 'Words like "best", "worst", "beautiful", "boring" and "I think" usually mean an opinion.' },
      { emoji: '🤝', title: 'Both are okay', text: 'Opinions are fine! Trouble starts when someone says their opinion as if it were a fact.' },
    ],
    quiz: [
      quiz(
        'fact-opinion-1',
        'Which one is a fact?',
        [
          { id: 'a', text: 'A spider has eight legs 🕷️', isCorrect: true, feedback: 'Yes! You can count them.' },
          { id: 'b', text: 'Spiders are the creepiest animals 😱', isCorrect: false, feedback: '"Creepiest" is an opinion. Some people love spiders!' },
        ],
        'Can you count or measure it?',
      ),
      quiz(
        'fact-opinion-2',
        'Which word is a clue that you’re reading an opinion?',
        [
          { id: 'a', text: '"Best" ⭐', isCorrect: true, feedback: 'Right! "Best" depends on who’s talking.' },
          { id: 'b', text: '"Measured" 📏', isCorrect: false, feedback: '"Measured" is a clue for a fact. "Best" is the opinion word.' },
        ],
        'Which word is about feelings?',
      ),
    ],
  },
  {
    id: 'safety',
    emoji: '🛡️',
    title: 'Stay safe online',
    blurb: 'Scams, strangers and when to tell a grown-up',
    color: 'bg-kids-pink/20',
    slides: [
      { emoji: '🎁', title: 'Too good to be true', text: '"You won a free phone!" when you didn’t enter a contest is almost always a trick to steal information.' },
      { emoji: '🔐', title: 'Keep it private', text: 'Never share your password, home address, school name, phone number or photos of yourself with people you only know online.' },
      { emoji: '🤫', title: 'No secrets', text: 'If someone online asks you to keep a secret from your family, that’s a big warning sign.' },
      { emoji: '🙋', title: 'Tell a grown-up', text: 'If something online feels wrong, scary or confusing, it’s always okay to stop and tell a grown-up you trust. You won’t be in trouble.' },
    ],
    quiz: [
      quiz(
        'safety-1',
        'A message says you won a game prize. It asks for your password. What do you do?',
        [
          { id: 'a', text: 'Don’t reply, and tell a grown-up 🛡️', isCorrect: true, feedback: 'Perfect. Real prizes never need your password.' },
          { id: 'b', text: 'Type my password to get the prize 🔑', isCorrect: false, feedback: 'That’s how accounts get stolen. Never share your password.' },
        ],
        'Who should know your password?',
      ),
      quiz(
        'safety-2',
        'Someone online says "Don’t tell your parents we talk." What does that mean?',
        [
          { id: 'a', text: 'It’s a warning sign. Tell a grown-up you trust 🙋', isCorrect: true, feedback: 'Yes. Safe people don’t ask you to keep secrets from your family.' },
          { id: 'b', text: 'It’s fine, they’re my friend 🤐', isCorrect: false, feedback: 'Real friends don’t ask you to hide things from your family. Tell a grown-up you trust.' },
        ],
        'Would a safe person ask for secrets?',
      ),
    ],
  },
];
