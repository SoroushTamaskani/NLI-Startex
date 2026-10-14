export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type Topic = 'ai' | 'facts' | 'tricks' | 'sources' | 'ads' | 'opinion' | 'safety';

export const TOPIC_LABELS: Record<Topic, string> = {
  ai: 'Robot or real?',
  facts: 'Myth buster',
  tricks: 'Spot the trick',
  sources: 'Good sources',
  ads: 'Ads in disguise',
  opinion: 'Fact or opinion',
  safety: 'Stay safe',
};

interface BaseChallenge {
  id: string;
  difficulty: Difficulty;
  topic: Topic;
  title: string;
  /**
   * What the player is "looking at", described in words with an emoji picture.
   * Described scenes are honest: random stock photos never matched the questions.
   */
  scene?: { emoji: string; description: string };
  question: string;
  hint: string;
}

export interface ChoiceChallenge extends BaseChallenge {
  kind: 'choice';
  options: { id: string; text: string; isCorrect: boolean; feedback: string }[];
}

/** Tap every suspicious detail. */
export interface CluesChallenge extends BaseChallenge {
  kind: 'clues';
  clues: { id: string; text: string; suspicious: boolean; why: string }[];
  explain: string;
}

/** Put each statement in one of two groups. */
export interface SortChallenge extends BaseChallenge {
  kind: 'sort';
  groups: [string, string];
  items: { id: string; text: string; group: 0 | 1; why: string }[];
  explain: string;
}

export type Challenge = ChoiceChallenge | CluesChallenge | SortChallenge;

export const CHALLENGES: Challenge[] = [
  // ───────────── EASY ─────────────
  {
    id: 'e-cat-guitar',
    kind: 'choice',
    topic: 'ai',
    difficulty: 'Easy',
    title: 'Robot or human? 🤖',
    scene: { emoji: '🐱🎸', description: 'A picture shows a cat playing a guitar. One paw has six toes, and the guitar strings disappear into its fur.' },
    question: 'What is the best clue that a computer made this picture?',
    hint: 'Real things follow the rules of real life. Which detail breaks those rules?',
    options: [
      { id: 'a', text: 'The extra toe and the melting strings 🔎', isCorrect: true, feedback: 'Great job! AI often makes mistakes with small details like paws, fingers and strings.' },
      { id: 'b', text: 'The cat looks happy 😺', isCorrect: false, feedback: 'Happy cats are real! The real clue is the six toes and the strings melting into the fur.' },
      { id: 'c', text: 'The picture is very colourful 🌈', isCorrect: false, feedback: 'Colours don’t tell us much. Look for details that couldn’t happen in real life, like extra toes.' },
    ],
  },
  {
    id: 'e-chocolate-milk',
    kind: 'choice',
    topic: 'facts',
    difficulty: 'Easy',
    title: 'True or false? 🥛',
    question: 'Someone tells you: "Chocolate milk comes from brown cows." Is that true?',
    hint: 'What colour is the milk from every cow you have ever seen?',
    options: [
      { id: 'a', text: 'True! 🐄', isCorrect: false, feedback: 'All cows give white milk, whatever colour they are. People add the chocolate later.' },
      { id: 'b', text: 'False! 🥛', isCorrect: true, feedback: 'You’re a smart detective! Chocolate milk is regular milk with cocoa and sugar mixed in.' },
    ],
  },
  {
    id: 'e-flying-dog',
    kind: 'choice',
    topic: 'tricks',
    difficulty: 'Easy',
    title: 'Spot the trick! 🎩',
    scene: { emoji: '🐕☁️', description: 'A video shows a dog flapping its ears and flying high over the rooftops like a bird.' },
    question: 'Is this a real video or a trick?',
    hint: 'Think about what dogs can really do in real life.',
    options: [
      { id: 'a', text: 'It’s a trick! ✨', isCorrect: true, feedback: 'Exactly! Dogs are amazing runners, but they can’t fly. Someone edited this video.' },
      { id: 'b', text: 'It’s real! 🐕', isCorrect: false, feedback: 'It looks fun, but dogs can’t fly. Video editing can make almost anything look real.' },
    ],
  },
  {
    id: 'e-chef-hands',
    kind: 'choice',
    topic: 'ai',
    difficulty: 'Easy',
    title: 'The chef’s hands 👨‍🍳',
    scene: { emoji: '👨‍🍳🍕', description: 'A photo shows a chef tossing pizza dough. If you count carefully, one of his hands has seven fingers.' },
    question: 'Is this a real photo?',
    hint: 'Count the fingers! How many do people usually have on one hand?',
    options: [
      { id: 'a', text: 'A real chef 🍕', isCorrect: false, feedback: 'Look closer! People have five fingers on each hand. AI often gets counting fingers wrong.' },
      { id: 'b', text: 'A robot trick 🤖', isCorrect: true, feedback: 'Bingo! AI often struggles to draw hands and fingers correctly.' },
    ],
  },
  {
    id: 'e-talking-dog',
    kind: 'choice',
    topic: 'tricks',
    difficulty: 'Easy',
    title: 'The talking dog 🐶',
    scene: { emoji: '🐶💬', description: 'A video shows a dog that seems to say "I love bacon!" in a clear human voice.' },
    question: 'Is the dog really talking?',
    hint: 'Can a dog’s mouth make the same shapes as yours when you talk?',
    options: [
      { id: 'a', text: 'Yes, a real talking dog! 🗣️', isCorrect: false, feedback: 'Dogs can bark, howl and whine, but they can’t shape their mouths and tongues to say human words.' },
      { id: 'b', text: 'No, a voice was added 🎤', isCorrect: true, feedback: 'Right! Someone recorded a voice and added it to the video. That’s called dubbing, and AI can do it too.' },
    ],
  },
  {
    id: 'e-fact-opinion',
    kind: 'sort',
    topic: 'opinion',
    difficulty: 'Easy',
    title: 'Fact or opinion? 🤔',
    question: 'Sort each sentence. A fact can be checked. An opinion is what someone thinks or feels.',
    hint: 'Could you prove it with a book or an experiment? Then it’s a fact.',
    groups: ['Fact', 'Opinion'],
    items: [
      { id: '1', text: 'Dogs are mammals.', group: 0, why: 'You can check this in any animal book.' },
      { id: '2', text: 'Dogs are the best pets.', group: 1, why: 'Some people love cats or fish more. It’s a feeling.' },
      { id: '3', text: 'The Sun is a star.', group: 0, why: 'Scientists have measured this. It can be checked.' },
      { id: '4', text: 'Summer is the most fun season.', group: 1, why: 'Someone else might love winter best!' },
    ],
    explain: 'Facts can be checked and proven. Opinions are what people think, and that’s okay! Just don’t mix them up.',
  },
  {
    id: 'e-prize-scam',
    kind: 'clues',
    topic: 'safety',
    difficulty: 'Easy',
    title: 'You won a prize?! 🎁',
    scene: {
      emoji: '📱🎁',
      description: 'A message pops up: "CONGRATULATIONS!!! You WON a free tablet! Type your home address and password here to get it NOW!"',
    },
    question: 'Tap every clue that this message is a trick.',
    hint: 'Would a real prize need your password?',
    clues: [
      { id: '1', text: 'It says you won a prize you never entered', suspicious: true, why: 'You can’t win a contest you didn’t enter.' },
      { id: '2', text: 'It asks for your password', suspicious: true, why: 'Never share your password. Real companies never ask for it like this.' },
      { id: '3', text: 'It asks for your home address', suspicious: true, why: 'Strangers should never get your address.' },
      { id: '4', text: 'It shouts "NOW!!!" to rush you', suspicious: true, why: 'Tricksters rush you so you don’t stop and think.' },
      { id: '5', text: 'It appeared on a phone', suspicious: false, why: 'Lots of real messages appear on phones. That alone isn’t a clue.' },
    ],
    explain: 'This is a scam: a trick to steal information. Don’t tap anything. Close it and tell a grown-up.',
  },
  {
    id: 'e-stranger-photo',
    kind: 'choice',
    topic: 'safety',
    difficulty: 'Easy',
    title: 'A new game friend 🎮',
    scene: { emoji: '🎮💬', description: 'Someone you’ve never met in real life chats with you in a game. They ask for a photo of you and the name of your school.' },
    question: 'What should you do?',
    hint: 'Would you give this to a stranger on the street?',
    options: [
      { id: 'a', text: 'Don’t share, and tell a grown-up you trust 🛡️', isCorrect: true, feedback: 'Exactly right. Never share photos or where you live or go to school with people you only know online.' },
      { id: 'b', text: 'Send it, they seem really nice 😊', isCorrect: false, feedback: 'People online aren’t always who they say they are. Keep your photos and details private, and tell a grown-up.' },
      { id: 'c', text: 'Just send the school name 🏫', isCorrect: false, feedback: 'Your school name can help a stranger find you. Keep it private and tell a grown-up you trust.' },
    ],
  },
  {
    id: 'e-gum',
    kind: 'choice',
    topic: 'facts',
    difficulty: 'Easy',
    title: 'The gum myth 🍬',
    question: 'If you swallow chewing gum, does it stay in your tummy for 7 years?',
    hint: 'Your body moves everything you swallow along, even things it can’t break down.',
    options: [
      { id: 'a', text: 'Yes, for 7 whole years! 😮', isCorrect: false, feedback: 'That’s a myth! Your body can’t digest gum, but it still moves it along and it comes out in a few days.' },
      { id: 'b', text: 'No, it passes through in a few days 🚽', isCorrect: true, feedback: 'Right! Gum isn’t digested, but it moves through like other food. (It’s still better not to swallow it!)' },
    ],
  },
  {
    id: 'e-party-picture',
    kind: 'clues',
    topic: 'ai',
    difficulty: 'Easy',
    title: 'The birthday picture 🎂',
    scene: {
      emoji: '🎂🎈',
      description: 'A girl at a birthday party holds a cake. Her hand has six fingers, each candle has two flames, the balloons look normal, and the banner says "HAPPY BRITHDYA".',
    },
    question: 'Tap every clue that a computer made this picture.',
    hint: 'Count, read, and look at the small things.',
    clues: [
      { id: '1', text: 'Six fingers on one hand', suspicious: true, why: 'People have five fingers. AI often adds extra ones.' },
      { id: '2', text: 'Two flames on each candle', suspicious: true, why: 'A real candle has one flame.' },
      { id: '3', text: 'The banner says "HAPPY BRITHDYA"', suspicious: true, why: 'AI pictures often get writing wrong.' },
      { id: '4', text: 'The balloons look normal', suspicious: false, why: 'Normal-looking parts don’t prove anything either way.' },
      { id: '5', text: 'The girl is smiling', suspicious: false, why: 'Smiles are normal at parties!' },
    ],
    explain: 'AI pictures often look great at first, but small details like fingers, writing and flames give them away.',
  },

  // ───────────── MEDIUM ─────────────
  {
    id: 'm-bats',
    kind: 'choice',
    topic: 'facts',
    difficulty: 'Medium',
    title: 'Nature mystery 🦇',
    question: 'Is it true that bats are completely blind?',
    hint: 'Bats have eyes. Why would they have eyes if they couldn’t use them?',
    options: [
      { id: 'a', text: 'True, they’re blind! 🌑', isCorrect: false, feedback: 'Bats can see! Many also use echolocation (sending out sounds and listening for echoes) to hunt in the dark.' },
      { id: 'b', text: 'False, they can see! 👁️', isCorrect: true, feedback: 'Correct! All bats can see. Echolocation is an extra superpower for flying at night.' },
    ],
  },
  {
    id: 'm-portrait',
    kind: 'choice',
    topic: 'ai',
    difficulty: 'Medium',
    title: 'The perfect portrait 👤',
    scene: {
      emoji: '👩🏽‍🦱✨',
      description: 'A very realistic photo of a woman. Her left earring is a gold hoop, her right earring is a silver star, and the background looks oddly smudgy.',
    },
    question: 'What do the clues suggest?',
    hint: 'People usually wear matching earrings. Do these match?',
    options: [
      { id: 'a', text: 'A real photo 📷', isCorrect: false, feedback: 'It could be real, but mismatched earrings and smudgy backgrounds are classic AI mistakes.' },
      { id: 'b', text: 'Probably made by AI 🤖', isCorrect: true, feedback: 'Sharp eyes! Mismatched details on each side of a face are a common sign of AI pictures.' },
    ],
  },
  {
    id: 'm-strawberry',
    kind: 'choice',
    topic: 'tricks',
    difficulty: 'Medium',
    title: 'Giant fruit! 🍓',
    scene: { emoji: '🍓🚗', description: 'A picture shows a strawberry as big as a car, parked in a parking space.' },
    question: 'Could a strawberry really grow that big?',
    hint: 'What’s the biggest strawberry you have ever seen?',
    options: [
      { id: 'a', text: 'Yes, with special seeds! 🌱', isCorrect: false, feedback: 'Record strawberries are about the size of a big apple, not a car. This picture was edited or made by AI.' },
      { id: 'b', text: 'No, it’s a trick! ❌', isCorrect: true, feedback: 'Right! It’s a fun picture, but strawberries can’t grow anywhere near that big.' },
    ],
  },
  {
    id: 'm-goldfish',
    kind: 'choice',
    topic: 'facts',
    difficulty: 'Medium',
    title: 'Goldfish memory 🐠',
    question: 'Do goldfish only have a 3-second memory?',
    hint: 'Scientists have trained goldfish to do tricks. Could they do that if they forgot everything?',
    options: [
      { id: 'a', text: 'True, they forget fast! 💨', isCorrect: false, feedback: 'Experiments show goldfish can remember things for months, and can even learn tricks.' },
      { id: 'b', text: 'False, they remember! 🧠', isCorrect: true, feedback: 'Correct! Goldfish have much better memories than the myth says.' },
    ],
  },
  {
    id: 'm-park-sign',
    kind: 'choice',
    topic: 'ai',
    difficulty: 'Medium',
    title: 'The sign in the park 🌳',
    scene: { emoji: '🌳🪧', description: 'A photo of a sunny park. The wooden sign says "WELCMOE TO GERRN PRAK", and some letters melt into each other.' },
    question: 'What does the sign tell you?',
    hint: 'Try reading the sign out loud. Do the words make sense?',
    options: [
      { id: 'a', text: 'It’s a real park sign 🪧', isCorrect: false, feedback: 'Real signs are usually spelled correctly. AI pictures often have jumbled, melting letters.' },
      { id: 'b', text: 'It’s an AI mess-up 🤖', isCorrect: true, feedback: 'Great catch! AI picture tools are often bad at drawing readable writing.' },
    ],
  },
  {
    id: 'm-carrots',
    kind: 'choice',
    topic: 'facts',
    difficulty: 'Medium',
    title: 'Super carrots? 🥕',
    question: 'If you eat lots of carrots, will you be able to see in the dark?',
    hint: 'Being healthy and having a superpower are two different things.',
    options: [
      { id: 'a', text: 'Yes, enough carrots give you night vision 🌙', isCorrect: false, feedback: 'Sadly not! Carrots have vitamin A, which your eyes need to stay healthy, but they won’t give you night vision.' },
      { id: 'b', text: 'No, but they help keep your eyes healthy 👀', isCorrect: true, feedback: 'Exactly! Carrots are good for your eyes, but the "see in the dark" story is a myth that spread during World War II.' },
    ],
  },
  {
    id: 'm-fact-opinion',
    kind: 'sort',
    topic: 'opinion',
    difficulty: 'Medium',
    title: 'Fact or opinion? 📏',
    question: 'Sort each sentence into Fact or Opinion.',
    hint: 'Words like "best", "boring" and "funniest" are clues for opinions.',
    groups: ['Fact', 'Opinion'],
    items: [
      { id: '1', text: 'Water freezes at 0 °C (32 °F).', group: 0, why: 'You can test this with a thermometer.' },
      { id: '2', text: 'Maths is the most boring subject.', group: 1, why: 'Lots of people love maths! "Boring" is a feeling.' },
      { id: '3', text: 'Wild penguins live mostly in the southern half of the world.', group: 0, why: 'Scientists have mapped where penguins live.' },
      { id: '4', text: 'This is the funniest movie ever made.', group: 1, why: '"Funniest" depends on who’s watching.' },
    ],
    explain: 'Words like "best", "worst", "boring" and "funniest" usually mean you’re reading an opinion.',
  },
  {
    id: 'm-clickbait',
    kind: 'clues',
    topic: 'tricks',
    difficulty: 'Medium',
    title: 'The shouting headline 📰',
    scene: { emoji: '😱📰', description: 'A headline says: "SHOCKING!!! Scientists HATE this one weird trick! Share before it gets DELETED!!!"' },
    question: 'Tap every warning sign in this headline.',
    hint: 'Real news usually tells you who, what and where, calmly.',
    clues: [
      { id: '1', text: 'Lots of CAPITAL letters and !!!', suspicious: true, why: 'Shouting is used to grab you, not to inform you.' },
      { id: '2', text: '"Share before it gets deleted"', suspicious: true, why: 'This tries to rush you into sharing without checking.' },
      { id: '3', text: 'No scientist or study is named', suspicious: true, why: 'Real science news says who did the research.' },
      { id: '4', text: '"One weird trick"', suspicious: true, why: 'Mystery phrases make you click without telling you anything.' },
      { id: '5', text: 'It mentions scientists', suspicious: false, why: 'Mentioning scientists isn’t a problem by itself. Not naming them is.' },
    ],
    explain: 'This is clickbait: a headline made to get clicks, not to tell the truth. Calm, specific headlines are more trustworthy.',
  },
  {
    id: 'm-sponsored',
    kind: 'choice',
    topic: 'ads',
    difficulty: 'Medium',
    title: 'Your favourite creator 📹',
    scene: { emoji: '👟📹', description: 'A video creator you love says: "These sneakers changed my life! Use my code SPEEDY for 20% off!"' },
    question: 'What is this most likely to be?',
    hint: 'Why would someone have their own discount code?',
    options: [
      { id: 'a', text: 'An ad: they may be paid to say it 💰', isCorrect: true, feedback: 'Yes! Discount codes usually mean the creator earns money. Look for words like "ad", "sponsored" or "#ad".' },
      { id: 'b', text: 'Just their honest opinion 💬', isCorrect: false, feedback: 'Maybe they do like them, but a discount code is a sign they’re being paid. It’s an ad.' },
      { id: 'c', text: 'A news report 📰', isCorrect: false, feedback: 'News reports don’t come with discount codes! This is an ad.' },
    ],
  },
  {
    id: 'm-good-sources',
    kind: 'sort',
    topic: 'sources',
    difficulty: 'Medium',
    title: 'Where should you check? 🔍',
    question: 'Sort these into good places to check a fact, and not-so-good places.',
    hint: 'Good sources have experts and explain how they know.',
    groups: ['Good to check', 'Not so good'],
    items: [
      { id: '1', text: 'A science museum website', group: 0, why: 'Museums have experts who check their facts.' },
      { id: '2', text: 'A random comment under a video', group: 1, why: 'Anyone can write a comment, true or not.' },
      { id: '3', text: 'An encyclopedia', group: 0, why: 'Encyclopedias are checked and list their sources.' },
      { id: '4', text: 'A post that says "trust me, I just know"', group: 1, why: 'Good sources explain how they know.' },
    ],
    explain: 'The best sources have real experts, explain how they know, and get the same answer as other trusted sources.',
  },

  // ───────────── HARD ─────────────
  {
    id: 'h-great-wall',
    kind: 'choice',
    topic: 'facts',
    difficulty: 'Hard',
    title: 'Space facts 🛰️',
    question: 'Can you see the Great Wall of China from the Moon with your own eyes?',
    hint: 'The Wall is very long, but how wide is it? And how far away is the Moon?',
    options: [
      { id: 'a', text: 'Yes, it’s huge! 🧱', isCorrect: false, feedback: 'The Wall is long but narrow. Astronauts say it’s very hard to see even from low orbit, and impossible from the Moon.' },
      { id: 'b', text: 'No, it’s too far! 🌕', isCorrect: true, feedback: 'Correct! From the Moon, you can’t see any single human-made building with your eyes.' },
    ],
  },
  {
    id: 'h-reflection',
    kind: 'choice',
    topic: 'ai',
    difficulty: 'Hard',
    title: 'Dreamy landscape 🏔️',
    scene: { emoji: '🏔️🌊', description: 'A postcard-perfect mountain lake. The mountains have three peaks, but the reflection in the water shows four.' },
    question: 'Is this a real place, photographed by a camera?',
    hint: 'A reflection is like a mirror. Should it match what’s above it?',
    options: [
      { id: 'a', text: 'A real place 🗺️', isCorrect: false, feedback: 'A real reflection always matches. Three peaks above and four in the water is a sign of AI.' },
      { id: 'b', text: 'Made by AI 💻', isCorrect: true, feedback: 'Expert level! You caught the reflection mistake, a classic AI slip.' },
    ],
  },
  {
    id: 'h-deepfake',
    kind: 'choice',
    topic: 'tricks',
    difficulty: 'Hard',
    title: 'Deepfake detective 🎭',
    scene: { emoji: '🎤😴', description: 'A video shows a famous singer saying they hate music and want to become a professional sleeper. No news website mentions it.' },
    question: 'Is this video likely to be real?',
    hint: 'If a famous person said something this surprising, where else would you expect to hear about it?',
    options: [
      { id: 'a', text: 'Maybe they changed their mind 🤔', isCorrect: false, feedback: 'Big news like this would be everywhere. It’s likely a deepfake: a video where AI makes someone say things they never said.' },
      { id: 'b', text: 'Probably a deepfake 🤖', isCorrect: true, feedback: 'Spot on! AI can copy faces and voices. Checking trusted news sites is a great way to find out.' },
    ],
  },
  {
    id: 'h-moon-flag',
    kind: 'choice',
    topic: 'facts',
    difficulty: 'Hard',
    title: 'The Moon landing 🚀',
    scene: { emoji: '🇺🇸🌕', description: 'A photo of the US flag on the Moon. It looks as if it is waving in the wind.' },
    question: 'Some people say this proves the Moon landing was fake, because there’s no wind on the Moon. Are they right?',
    hint: 'What would happen to a flag if something was holding it out sideways?',
    options: [
      { id: 'a', text: 'Yes, it’s a trick! 🚩', isCorrect: false, feedback: 'The flag had a metal rod along the top to hold it out, and it was wrinkled from being folded. It only moved when astronauts touched it.' },
      { id: 'b', text: 'No, it’s explained! 🌕', isCorrect: true, feedback: 'Correct! It’s a famous myth, but science explains exactly why the flag looks that way.' },
    ],
  },
  {
    id: 'h-old-photo',
    kind: 'choice',
    topic: 'sources',
    difficulty: 'Hard',
    title: 'Old photo, new story 📷',
    scene: { emoji: '🦈🛣️', description: 'A post says "Shark swimming down a flooded highway TODAY!" The same photo has been shared after many different storms.' },
    question: 'What is the best way to check it?',
    hint: 'Where did the photo first appear, and when?',
    options: [
      { id: 'a', text: 'Search for the photo to find where it first appeared 🔍', isCorrect: true, feedback: 'Yes! A reverse image search shows where a picture came from. Old photos are often reshared as if they were new.' },
      { id: 'b', text: 'Lots of people shared it, so it’s true 👥', isCorrect: false, feedback: 'Lots of shares don’t make something true. False stories can spread faster than true ones.' },
      { id: 'c', text: 'Check how many likes it has ❤️', isCorrect: false, feedback: 'Likes show something is popular, not that it’s true. Find out where the photo came from instead.' },
    ],
  },
  {
    id: 'h-brain',
    kind: 'choice',
    topic: 'facts',
    difficulty: 'Hard',
    title: 'Brain power 🧠',
    question: 'People sometimes say we only use 10% of our brains. Is that true?',
    hint: 'Doctors can take pictures of brains working. What do you think they see?',
    options: [
      { id: 'a', text: 'True, 90% is asleep 😴', isCorrect: false, feedback: 'It’s a myth! Brain scans show we use nearly all of our brain, just different parts for different jobs.' },
      { id: 'b', text: 'False, we use almost all of it ⚡', isCorrect: true, feedback: 'Correct! Different parts handle seeing, moving, remembering and more. Over a day, almost all of it gets used.' },
    ],
  },
  {
    id: 'h-voice-scam',
    kind: 'clues',
    topic: 'safety',
    difficulty: 'Hard',
    title: 'The famous voice 🎙️',
    scene: {
      emoji: '🎙️💸',
      description: 'A voice message sounds just like your favourite singer. It asks fans to send money for a "secret concert" and says not to tell anyone.',
    },
    question: 'Tap every warning sign.',
    hint: 'AI can copy voices. So what else should make you suspicious?',
    clues: [
      { id: '1', text: 'It asks for money', suspicious: true, why: 'Messages that ask kids for money are a big warning sign.' },
      { id: '2', text: 'It says to keep it a secret', suspicious: true, why: 'Tricksters ask for secrets so no grown-up can help you check.' },
      { id: '3', text: 'It isn’t on the singer’s official page', suspicious: true, why: 'Real announcements are posted where everyone can see them.' },
      { id: '4', text: 'The voice sounds exactly like the singer', suspicious: false, why: 'AI can copy voices, so sounding right doesn’t prove anything either way.' },
      { id: '5', text: 'It mentions a concert', suspicious: false, why: 'Singers do have concerts. The money and the secret are the real clues.' },
    ],
    explain: 'AI can clone voices from short clips. A familiar voice is not proof. Never send money, and tell a grown-up.',
  },
  {
    id: 'h-true-myth',
    kind: 'sort',
    topic: 'facts',
    difficulty: 'Hard',
    title: 'True or myth? 🐂',
    question: 'Sort each sentence into True or Myth.',
    hint: 'Some of these sound surprising but are true!',
    groups: ['True', 'Myth'],
    items: [
      { id: '1', text: 'Lightning can strike the same place twice.', group: 0, why: 'Tall buildings get struck many times every year.' },
      { id: '2', text: 'Bulls get angry when they see the colour red.', group: 1, why: 'Bulls can’t see red well. They react to the cape moving.' },
      { id: '3', text: 'Octopuses have three hearts.', group: 0, why: 'Two hearts pump blood to the gills, and one to the rest of the body.' },
      { id: '4', text: 'If you touch a baby bird, its parents will leave it.', group: 1, why: 'Most birds can’t smell people on their babies. But it’s still best to leave wild babies alone!' },
    ],
    explain: 'Surprising things can be true, and things everyone says can be myths. That’s why we check!',
  },
  {
    id: 'h-fake-site',
    kind: 'choice',
    topic: 'sources',
    difficulty: 'Hard',
    title: 'The copycat website 🕸️',
    scene: { emoji: '📺🕸️', description: 'A video looks like it’s from a big news channel, but the web address is "bbc-news-real-today.co".' },
    question: 'What is the biggest clue that something is wrong?',
    hint: 'Look carefully at the address, not the video.',
    options: [
      { id: 'a', text: 'The strange web address 🔗', isCorrect: true, feedback: 'Yes! Copycat sites use names that look real. The real BBC uses bbc.co.uk and bbc.com.' },
      { id: 'b', text: 'The news reader wears a suit 👔', isCorrect: false, feedback: 'Real news readers wear suits too. The web address is the real clue.' },
      { id: 'c', text: 'The video is in colour 🎨', isCorrect: false, feedback: 'Almost all videos are in colour! Check the web address instead.' },
    ],
  },
  {
    id: 'h-satire',
    kind: 'choice',
    topic: 'tricks',
    difficulty: 'Hard',
    title: 'Funny news 🗞️',
    scene: { emoji: '🐱🌕', description: 'A website called "The Silly Times" has a story: "Cat elected mayor of the Moon, promises free tuna for all."' },
    question: 'What kind of story is this?',
    hint: 'Look at the name of the website.',
    options: [
      { id: 'a', text: 'A joke story made up on purpose 😂', isCorrect: true, feedback: 'Yes! It’s satire: made-up stories written to be funny. They’re fine as jokes, but trouble starts when people share them as real news.' },
      { id: 'b', text: 'Real news 📰', isCorrect: false, feedback: 'There’s no mayor of the Moon! Some websites write joke stories on purpose. That’s called satire.' },
      { id: 'c', text: 'A new science discovery 🔬', isCorrect: false, feedback: 'Science news names real scientists and studies. This is satire: a joke story.' },
    ],
  },
];

export function challengesFor(difficulty: Difficulty): Challenge[] {
  return CHALLENGES.filter(c => c.difficulty === difficulty);
}
