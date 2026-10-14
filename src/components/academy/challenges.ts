export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Challenge {
  id: number;
  type: 'ai-vs-human' | 'fact-vs-fiction' | 'spot-the-trick';
  difficulty: Difficulty;
  title: string;
  /**
   * An illustrated description of what the player is "looking at". Earlier
   * versions used random stock photos that didn't match the questions; a
   * described scene is honest and teaches what to look for.
   */
  scene?: { emoji: string; description: string };
  question: string;
  hint: string;
  options: { id: string; text: string; isCorrect: boolean; feedback: string }[];
}

export const CHALLENGES: Challenge[] = [
  // EASY
  {
    id: 1,
    type: 'ai-vs-human',
    difficulty: 'Easy',
    title: 'Robot or Human? 🤖',
    scene: {
      emoji: '🐱🎸',
      description: 'A picture shows a cat playing a guitar. Look closely: one paw has six toes, and the guitar strings disappear into its fur.',
    },
    question: 'What is the best clue that a computer made this picture?',
    hint: 'Real things follow the rules of real life. Which detail breaks those rules?',
    options: [
      { id: 'a', text: 'The extra toe and the melting strings 🔎', isCorrect: true, feedback: 'Great job! AI often makes mistakes with small details like paws, fingers and strings.' },
      { id: 'b', text: 'The cat looks happy 😺', isCorrect: false, feedback: 'Happy cats are real! The real clue is the six toes and the strings melting into the fur.' },
      { id: 'c', text: 'The picture is very colourful 🌈', isCorrect: false, feedback: 'Colours don’t tell us much. Look for details that couldn’t happen in real life, like extra toes.' },
    ],
  },
  {
    id: 2,
    type: 'fact-vs-fiction',
    difficulty: 'Easy',
    title: 'True or False? 🕵️',
    question: 'Someone tells you: "Chocolate milk comes from brown cows." Is that true?',
    hint: 'What colour is the milk from every cow you have ever seen?',
    options: [
      { id: 'a', text: 'True! 🐄', isCorrect: false, feedback: 'All cows give white milk, whatever colour they are. Chocolate is added later by people.' },
      { id: 'b', text: 'False! 🥛', isCorrect: true, feedback: 'You’re a smart detective! Chocolate milk is regular milk with cocoa and sugar mixed in.' },
    ],
  },
  {
    id: 3,
    type: 'spot-the-trick',
    difficulty: 'Easy',
    title: 'Spot the Trick! 🎩',
    scene: { emoji: '🐕☁️', description: 'A video shows a dog flapping its ears and flying high over the rooftops like a bird.' },
    question: 'Is this a real video or a trick?',
    hint: 'Think about what dogs can really do in real life.',
    options: [
      { id: 'a', text: 'It’s a trick! ✨', isCorrect: true, feedback: 'Exactly! Dogs are amazing runners, but they can’t fly. Someone edited this video.' },
      { id: 'b', text: 'It’s real! 🐕', isCorrect: false, feedback: 'It looks fun, but dogs can’t fly. Video editing can make almost anything look real.' },
    ],
  },
  {
    id: 4,
    type: 'ai-vs-human',
    difficulty: 'Easy',
    title: 'The Chef’s Hands 👨‍🍳',
    scene: { emoji: '👨‍🍳🍕', description: 'A photo shows a chef tossing pizza dough. If you count carefully, one of his hands has seven fingers.' },
    question: 'Is this a real photo?',
    hint: 'Count the fingers! How many do people usually have on one hand?',
    options: [
      { id: 'a', text: 'A real chef 🍕', isCorrect: false, feedback: 'Look closer! People have five fingers on each hand. AI often gets counting fingers wrong.' },
      { id: 'b', text: 'A robot trick 🤖', isCorrect: true, feedback: 'Bingo! AI often struggles to draw hands and fingers correctly.' },
    ],
  },
  {
    id: 5,
    type: 'spot-the-trick',
    difficulty: 'Easy',
    title: 'The Talking Dog 🐕‍🦺',
    scene: { emoji: '🐶💬', description: 'A video shows a dog that seems to say "I love bacon!" in a clear human voice.' },
    question: 'Is the dog really talking?',
    hint: 'Can a dog’s mouth make the same shapes as yours when you talk?',
    options: [
      { id: 'a', text: 'Yes, a real talking dog! 🗣️', isCorrect: false, feedback: 'Dogs can bark, howl and whine, but they can’t shape their mouths and tongues to say human words.' },
      { id: 'b', text: 'No, a voice was added 🎤', isCorrect: true, feedback: 'Right! Someone recorded a voice and added it to the video. That’s called dubbing, and AI can do it too.' },
    ],
  },

  // MEDIUM
  {
    id: 6,
    type: 'fact-vs-fiction',
    difficulty: 'Medium',
    title: 'Nature Mystery 🦇',
    question: 'Is it true that bats are completely blind?',
    hint: 'Bats have eyes. Why would they have eyes if they couldn’t use them?',
    options: [
      { id: 'a', text: 'True, they’re blind! 🌑', isCorrect: false, feedback: 'Bats can see! Many also use echolocation (sending out sounds and listening for echoes) to hunt in the dark.' },
      { id: 'b', text: 'False, they can see! 👁️', isCorrect: true, feedback: 'Correct! All bats can see. Echolocation is an extra superpower for flying at night.' },
    ],
  },
  {
    id: 7,
    type: 'ai-vs-human',
    difficulty: 'Medium',
    title: 'The Perfect Portrait 👤',
    scene: {
      emoji: '👩🏽‍🦱✨',
      description: 'A very realistic photo of a woman. Her left earring is a gold hoop, her right earring is a silver star, and the background looks oddly smudgy.',
    },
    question: 'What do the clues suggest?',
    hint: 'People usually wear matching earrings. Do these match?',
    options: [
      { id: 'a', text: 'A real photo 📷', isCorrect: false, feedback: 'It could be a real photo, but mismatched earrings and smudgy backgrounds are classic AI mistakes.' },
      { id: 'b', text: 'Probably made by AI 🤖', isCorrect: true, feedback: 'Sharp eyes! Mismatched details on each side of a face are a common sign of AI pictures.' },
    ],
  },
  {
    id: 8,
    type: 'spot-the-trick',
    difficulty: 'Medium',
    title: 'Giant Fruit! 🍓',
    scene: { emoji: '🍓🚗', description: 'A picture shows a strawberry as big as a car, parked in a parking space.' },
    question: 'Could a strawberry really grow that big?',
    hint: 'What’s the biggest strawberry you have ever seen?',
    options: [
      { id: 'a', text: 'Yes, with special seeds! 🌱', isCorrect: false, feedback: 'Record strawberries are about the size of a large apple, not a car. This picture was edited or made by AI.' },
      { id: 'b', text: 'No, it’s a trick! ❌', isCorrect: true, feedback: 'Right! It’s a fun picture, but strawberries can’t grow anywhere near that big.' },
    ],
  },
  {
    id: 9,
    type: 'fact-vs-fiction',
    difficulty: 'Medium',
    title: 'Goldfish Memory 🐠',
    question: 'Do goldfish only have a 3-second memory?',
    hint: 'Scientists have trained goldfish to do tricks. Could they do that if they forgot everything?',
    options: [
      { id: 'a', text: 'True, they forget fast! 💨', isCorrect: false, feedback: 'Experiments show goldfish can remember things for months, and can even learn tricks.' },
      { id: 'b', text: 'False, they remember! 🧠', isCorrect: true, feedback: 'Correct! Goldfish have much better memories than the myth says.' },
    ],
  },
  {
    id: 10,
    type: 'ai-vs-human',
    difficulty: 'Medium',
    title: 'The Sign in the Park 🌳',
    scene: { emoji: '🌳🪧', description: 'A photo of a sunny park. The wooden sign says "WELCMOE TO GERRN PRAK", and some letters melt into each other.' },
    question: 'What does the sign tell you?',
    hint: 'Try reading the sign out loud. Do the words make sense?',
    options: [
      { id: 'a', text: 'It’s a real park sign 🪧', isCorrect: false, feedback: 'Real signs are usually spelled correctly. AI pictures often have jumbled, melting letters.' },
      { id: 'b', text: 'It’s an AI mess-up 🤖', isCorrect: true, feedback: 'Great catch! AI picture tools are often bad at drawing readable writing.' },
    ],
  },

  // HARD
  {
    id: 11,
    type: 'fact-vs-fiction',
    difficulty: 'Hard',
    title: 'Space Facts 🛰️',
    question: 'Can you see the Great Wall of China from the Moon with your own eyes?',
    hint: 'The Wall is very long, but how wide is it? And how far away is the Moon?',
    options: [
      { id: 'a', text: 'Yes, it’s huge! 🧱', isCorrect: false, feedback: 'The Wall is long but narrow. Astronauts say it’s very hard to see even from low orbit, and impossible from the Moon.' },
      { id: 'b', text: 'No, it’s too far! 🌕', isCorrect: true, feedback: 'Correct! From the Moon, you can’t see any single human-made building with your eyes.' },
    ],
  },
  {
    id: 12,
    type: 'ai-vs-human',
    difficulty: 'Hard',
    title: 'Dreamy Landscape 🏔️',
    scene: { emoji: '🏔️🌊', description: 'A postcard-perfect mountain lake. The mountains have three peaks, but the reflection in the water shows four.' },
    question: 'Is this a real place, photographed by a camera?',
    hint: 'A reflection is like a mirror. Should it match what’s above it?',
    options: [
      { id: 'a', text: 'A real place 🗺️', isCorrect: false, feedback: 'A real reflection always matches. Three peaks above and four in the water is a sign of AI.' },
      { id: 'b', text: 'Made by AI 💻', isCorrect: true, feedback: 'Expert level! You caught the reflection mistake, a classic AI slip.' },
    ],
  },
  {
    id: 13,
    type: 'spot-the-trick',
    difficulty: 'Hard',
    title: 'Deepfake Detective 🎭',
    scene: { emoji: '🎤😴', description: 'A video shows a famous singer saying they hate music and want to become a professional sleeper. No news website mentions it.' },
    question: 'Is this video likely to be real?',
    hint: 'If a famous person said something this surprising, where else would you expect to hear about it?',
    options: [
      { id: 'a', text: 'Maybe they changed their mind 🤔', isCorrect: false, feedback: 'Big news like this would be everywhere. It’s likely a deepfake: a video where AI makes someone say things they never said.' },
      { id: 'b', text: 'Probably a deepfake 🤖', isCorrect: true, feedback: 'Spot on! AI can copy faces and voices. Checking trusted news sites is a great way to find out.' },
    ],
  },
  {
    id: 14,
    type: 'fact-vs-fiction',
    difficulty: 'Hard',
    title: 'The Moon Landing 🚀',
    scene: { emoji: '🇺🇸🌕', description: 'A photo of the US flag on the Moon. It looks as if it is waving in the wind.' },
    question: 'Some people say this proves the Moon landing was fake, because there’s no wind on the Moon. Are they right?',
    hint: 'What would happen to a flag if something was holding it out sideways?',
    options: [
      { id: 'a', text: 'Yes, it’s a trick! 🚩', isCorrect: false, feedback: 'The flag had a metal rod along the top to hold it out, and it wrinkled when it was put up. It only moved when astronauts touched it.' },
      { id: 'b', text: 'No, it’s explained! 🌕', isCorrect: true, feedback: 'Correct! It’s a famous myth, but science explains exactly why the flag looks that way.' },
    ],
  },
  {
    id: 15,
    type: 'spot-the-trick',
    difficulty: 'Hard',
    title: 'Old Photo, New Story 📷',
    scene: { emoji: '🦈🛣️', description: 'A post says "Shark swimming down a flooded highway TODAY!" The same photo has been shared after many different storms.' },
    question: 'What is the best way to check it?',
    hint: 'Where did the photo first appear, and when?',
    options: [
      { id: 'a', text: 'Search for the photo to find where it first appeared 🔍', isCorrect: true, feedback: 'Yes! A reverse image search shows where a picture came from. Old photos are often reshared as if they were new.' },
      { id: 'b', text: 'Lots of people shared it, so it’s true 👥', isCorrect: false, feedback: 'Lots of shares don’t make something true. False stories often spread faster than true ones.' },
      { id: 'c', text: 'Check how many likes it has ❤️', isCorrect: false, feedback: 'Likes show something is popular, not that it’s true. Find out where the photo came from instead.' },
    ],
  },
];
