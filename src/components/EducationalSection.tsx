import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Trophy, 
  Star, 
  Brain, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  RotateCcw,
  Sparkles,
  Gamepad2,
  Bot,
  User,
  ThumbsUp,
  ThumbsDown,
  Medal,
  Award,
  Shield,
  Zap,
  Camera,
  Play,
  Info,
  ImageIcon
} from 'lucide-react';
import { cn } from '../lib/utils';

type Difficulty = 'Easy' | 'Medium' | 'Hard';

interface Challenge {
  id: number;
  type: 'ai-vs-human' | 'fact-vs-fiction' | 'spot-the-trick';
  difficulty: Difficulty;
  title: string;
  question: string;
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
    feedback: string;
  }[];
  image?: string;
  video?: string;
  hint?: string;
  analysisData?: {
    aiProbability: number;
    reason: string;
  };
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  unlocked: boolean;
}

const CHALLENGES: Challenge[] = [
  // EASY
  {
    id: 1,
    type: 'ai-vs-human',
    difficulty: 'Easy',
    title: "Robot or Human? 🤖",
    question: "Look at this picture of a cat playing a guitar. Do you think a human took this photo, or did a robot (AI) make it?",
    image: "https://picsum.photos/seed/ai-cat-guitar/800/600",
    hint: "Look closely at the cat's paws! Do they look like real paws or do they have extra toes?",
    analysisData: { aiProbability: 98, reason: "The cat has 6 toes on one paw and the guitar strings disappear into its fur!" },
    options: [
      { id: 'a', text: "A Robot made it! 🤖", isCorrect: true, feedback: "Great job! Robots sometimes make mistakes with small details like paws and strings." },
      { id: 'b', text: "A Human took it! 📸", isCorrect: false, feedback: "Not quite! Real cats usually don't play guitars, and the strings look a bit funny here." }
    ]
  },
  {
    id: 2,
    type: 'fact-vs-fiction',
    difficulty: 'Easy',
    title: "True or False? 🕵️‍♂️",
    question: "Someone tells you that 'Chocolate milk comes from brown cows.' Is this true or false?",
    options: [
      { id: 'a', text: "True! 🐄", isCorrect: false, feedback: "Actually, all cows give white milk! Chocolate is added later by people." },
      { id: 'b', text: "False! 🥛", isCorrect: true, feedback: "You're a smart detective! Chocolate milk is just regular milk with cocoa and sugar added." }
    ]
  },
  {
    id: 3,
    type: 'spot-the-trick',
    difficulty: 'Easy',
    title: "Spot the Trick! 🎩",
    question: "You see a video of a dog flying like a bird. Is this a real video or a trick?",
    image: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZ3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKMGpxx66aV5D1C/giphy.gif",
    hint: "Think about what dogs can really do in real life!",
    options: [
      { id: 'a', text: "It's a Trick! ✨", isCorrect: true, feedback: "Exactly! Dogs are great at running, but they don't have wings to fly." },
      { id: 'b', text: "It's Real! 🐕", isCorrect: false, feedback: "While it looks cool, dogs can't actually fly. It's a clever video trick!" }
    ]
  },
  {
    id: 10,
    type: 'ai-vs-human',
    difficulty: 'Easy',
    title: "The Multi-Handed Chef 👨‍🍳",
    question: "This chef is making a giant pizza! Look at his hands. Is this a real photo?",
    image: "https://picsum.photos/seed/ai-chef-hands/800/600",
    hint: "Count the fingers on the chef's right hand!",
    analysisData: { aiProbability: 95, reason: "The chef has 7 fingers on one hand and the pizza dough is floating in the air!" },
    options: [
      { id: 'a', text: "Real Chef 🍕", isCorrect: false, feedback: "Look closer! Humans only have 5 fingers. AI sometimes gets confused with counting!" },
      { id: 'b', text: "Robot Trick 🤖", isCorrect: true, feedback: "Bingo! AI often struggles with drawing hands and fingers correctly." }
    ]
  },
  {
    id: 13,
    type: 'spot-the-trick',
    difficulty: 'Easy',
    title: "The Talking Dog 🐕‍🦺",
    question: "You see a video where a dog says 'I love bacon!' in a human voice. Is this real?",
    video: "https://www.w3schools.com/html/mov_bbb.mp4", 
    options: [
      { id: 'a', text: "Real Talking Dog! 🗣️", isCorrect: false, feedback: "Dogs can make sounds that sound like words, but they don't have vocal cords like humans to speak English!" },
      { id: 'b', text: "Voice Dubbing Trick 🎤", isCorrect: true, feedback: "Right! Someone recorded their own voice and put it over the dog's video." }
    ]
  },
  // MEDIUM
  {
    id: 4,
    type: 'fact-vs-fiction',
    difficulty: 'Medium',
    title: "Nature Mystery 🦇",
    question: "Is it true that bats are completely blind and can't see anything?",
    options: [
      { id: 'a', text: "True, they are blind! 🌑", isCorrect: false, feedback: "Actually, bats can see quite well! They just use sound (echolocation) to help them hunt in the dark." },
      { id: 'b', text: "False, they can see! 👁️", isCorrect: true, feedback: "Correct! Bats have eyes and can see, but their 'sonic ears' are their superpower for night flying." }
    ]
  },
  {
    id: 5,
    type: 'ai-vs-human',
    difficulty: 'Medium',
    title: "The Perfect Portrait 👤",
    question: "This person looks very real. Do you think this is a real photo of a person or an AI creation?",
    image: "https://picsum.photos/seed/ai-face-subtle/800/600",
    hint: "Look at the earrings and the background. Do they match on both sides?",
    analysisData: { aiProbability: 85, reason: "The earrings are slightly different shapes, and the background blur looks a bit 'smudgy' in a way real cameras don't do." },
    options: [
      { id: 'a', text: "Real Person 👤", isCorrect: false, feedback: "It's a trick! AI is getting really good at making faces, but it still struggles with matching jewelry." },
      { id: 'b', text: "AI Creation 🤖", isCorrect: true, feedback: "Sharp eyes! You noticed the tiny mistakes the robot made." }
    ]
  },
  {
    id: 6,
    type: 'spot-the-trick',
    difficulty: 'Medium',
    title: "Giant Fruit! 🍓",
    question: "You see a picture of a strawberry as big as a car. Is this possible in real life?",
    image: "https://picsum.photos/seed/giant-strawberry/800/600",
    options: [
      { id: 'a', text: "Yes, with special seeds! 🌱", isCorrect: false, feedback: "Strawberries can grow big, but never as big as a car! This is definitely an edited photo." },
      { id: 'b', text: "No, it's a trick! ❌", isCorrect: true, feedback: "Right! This is a fun photo edit, but you won't find strawberries that big at the store." }
    ]
  },
  {
    id: 11,
    type: 'fact-vs-fiction',
    difficulty: 'Medium',
    title: "Goldfish Memory 🐠",
    question: "Is it true that goldfish only have a 3-second memory?",
    options: [
      { id: 'a', text: "True, they forget fast! 💨", isCorrect: false, feedback: "Scientists have shown that goldfish can remember things for months! They can even be trained to do tricks." },
      { id: 'b', text: "False, they remember! 🧠", isCorrect: true, feedback: "Correct! Goldfish are actually quite smart and have much better memories than people think." }
    ]
  },
  {
    id: 14,
    type: 'ai-vs-human',
    difficulty: 'Medium',
    title: "The Sign in the Park 🌳",
    question: "Look at the sign in the background of this park photo. Does the text look right to you?",
    image: "https://picsum.photos/seed/ai-park-sign/800/600",
    hint: "Try to read the letters on the wooden sign. Do they form real words?",
    analysisData: { aiProbability: 88, reason: "The text on the sign is gibberish and the letters are melting into each other!" },
    options: [
      { id: 'a', text: "Real Park Sign 🪧", isCorrect: false, feedback: "Look closer at the letters. They don't make sense! AI often struggles with writing readable text." },
      { id: 'b', text: "AI Mess-up 🤖", isCorrect: true, feedback: "Great catch! AI is good at pictures but bad at spelling and writing." }
    ]
  },
  // HARD
  {
    id: 7,
    type: 'fact-vs-fiction',
    difficulty: 'Hard',
    title: "Space Facts 🛰️",
    question: "Can you see the Great Wall of China from the Moon with your own eyes?",
    options: [
      { id: 'a', text: "Yes, it's huge! 🧱", isCorrect: false, feedback: "Actually, astronauts say it's very hard to see even from low orbit, and impossible from the Moon without a telescope!" },
      { id: 'b', text: "No, it's too far! 🌕", isCorrect: true, feedback: "Correct! The Moon is very far away, and the Wall is actually quite thin when seen from space." }
    ]
  },
  {
    id: 8,
    type: 'ai-vs-human',
    difficulty: 'Hard',
    title: "Dreamy Landscape 🏔️",
    question: "This beautiful mountain lake looks like a postcard. Is it a real place on Earth?",
    image: "https://picsum.photos/seed/ai-landscape-hard/800/600",
    hint: "Look at the reflection in the water. Does it perfectly match the mountains above?",
    analysisData: { aiProbability: 92, reason: "The reflection in the water has a different number of peaks than the mountains above it!" },
    options: [
      { id: 'a', text: "Real Place 🗺️", isCorrect: false, feedback: "It's AI! If you look at the reflection, the mountains don't quite match up. Nature always gets the reflection right!" },
      { id: 'b', text: "AI Generated 💻", isCorrect: true, feedback: "Expert level! You caught the reflection error. That's a classic AI mistake." }
    ]
  },
  {
    id: 9,
    type: 'spot-the-trick',
    difficulty: 'Hard',
    title: "Deepfake Detective 🎭",
    question: "A video shows a famous singer saying they actually hate music and want to be a professional sleeper. Is this likely real?",
    options: [
      { id: 'a', text: "Maybe they changed their mind? 🤔", isCorrect: false, feedback: "This is likely a 'Deepfake'—a video where AI makes someone say something they never actually said!" },
      { id: 'b', text: "It's a Deepfake trick! 🤖", isCorrect: true, feedback: "Spot on! AI can now copy people's voices and faces to make them say silly or mean things." }
    ]
  },
  {
    id: 12,
    type: 'spot-the-trick',
    difficulty: 'Hard',
    title: "The Moon Landing 🚀",
    question: "You see a photo of the US flag waving on the Moon. Some say this proves it was a trick because there's no wind on the Moon. Is this true?",
    image: "https://picsum.photos/seed/moon-flag/800/600",
    options: [
      { id: 'a', text: "Yes, it's a trick! 🚩", isCorrect: false, feedback: "Actually, the flag had a metal rod at the top to keep it spread out! It only 'waved' when the astronauts were touching it." },
      { id: 'b', text: "No, it's real! 🌕", isCorrect: true, feedback: "Correct! It's a common myth, but science explains why the flag looked that way in space." }
    ]
  }
];

interface EducationalSectionProps {
  onClose: () => void;
}

export default function EducationalSection({ onClose }: EducationalSectionProps) {
  const [currentStep, setCurrentStep] = useState<'intro' | 'difficulty' | 'quiz' | 'result' | 'achievements'>('intro');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [points, setPoints] = useState(() => {
    const saved = localStorage.getItem('nli_points');
    return saved ? parseInt(saved) : 0;
  });
  const [aiSpots, setAiSpots] = useState(() => {
    const saved = localStorage.getItem('nli_ai_spots');
    return saved ? parseInt(saved) : 0;
  });
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [badges, setBadges] = useState<Badge[]>(() => {
    const saved = localStorage.getItem('nli_badges');
    const initialBadges = [
      { id: 'rookie', name: 'Truth Rookie', description: 'Complete your first challenge!', icon: <Medal />, color: 'bg-blue-400', unlocked: false },
      { id: 'detective', name: 'Junior Detective', description: 'Get a perfect score on Easy!', icon: <Zap />, color: 'bg-green-400', unlocked: false },
      { id: 'ai-expert', name: 'Robot Spotter', description: 'Identify 3 AI images correctly!', icon: <Bot />, color: 'bg-purple-400', unlocked: false },
      { id: 'master', name: 'Truth Master', description: 'Complete a Hard challenge!', icon: <Award />, color: 'bg-yellow-400', unlocked: false },
      { id: 'hero', name: 'Ultimate Hero', description: 'Earn 500 points!', icon: <Shield />, color: 'bg-red-400', unlocked: false },
    ];
    if (saved) {
      const unlockedIds = JSON.parse(saved);
      return initialBadges.map(b => ({ ...b, unlocked: unlockedIds.includes(b.id) }));
    }
    return initialBadges;
  });

  useEffect(() => {
    localStorage.setItem('nli_points', points.toString());
  }, [points]);

  useEffect(() => {
    localStorage.setItem('nli_ai_spots', aiSpots.toString());
  }, [aiSpots]);

  useEffect(() => {
    const unlockedIds = badges.filter(b => b.unlocked).map(b => b.id);
    localStorage.setItem('nli_badges', JSON.stringify(unlockedIds));
  }, [badges]);

  const filteredChallenges = CHALLENGES.filter(c => c.difficulty === selectedDifficulty);
  const currentChallenge = filteredChallenges[currentChallengeIndex];

  const unlockBadge = (id: string) => {
    setBadges(prev => prev.map(b => b.id === id ? { ...b, unlocked: true } : b));
  };

  const handleStart = () => {
    setCurrentStep('difficulty');
  };

  const selectDifficulty = (diff: Difficulty) => {
    setSelectedDifficulty(diff);
    setCurrentStep('quiz');
    setCurrentChallengeIndex(0);
    setScore(0);
    setSelectedOption(null);
    setShowFeedback(false);
    setShowAnalysis(false);
  };

  const handleOptionSelect = (optionId: string) => {
    if (showFeedback) return;
    
    setSelectedOption(optionId);
    setShowFeedback(true);
    
    const option = currentChallenge.options.find(o => o.id === optionId);
    if (option?.isCorrect) {
      setScore(prev => prev + 1);
      const pointsEarned = selectedDifficulty === 'Easy' ? 50 : selectedDifficulty === 'Medium' ? 100 : 150;
      setPoints(prev => prev + pointsEarned);
      
      if (currentChallenge.type === 'ai-vs-human') {
        setAiSpots(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) unlockBadge('ai-expert');
          return newCount;
        });
      }

      // Badge checks
      unlockBadge('rookie');
    }
  };

  const handleNext = () => {
    if (currentChallengeIndex < filteredChallenges.length - 1) {
      setCurrentChallengeIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowFeedback(false);
      setShowAnalysis(false);
    } else {
      // End of quiz checks
      if (score + 1 === filteredChallenges.length && selectedDifficulty === 'Easy') unlockBadge('detective');
      if (selectedDifficulty === 'Hard') unlockBadge('master');
      if (points >= 500) unlockBadge('hero');
      
      setCurrentStep('result');
    }
  };

  const runAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowAnalysis(true);
    }, 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#fffaf0] flex flex-col overflow-hidden font-sans"
    >
      {/* Header */}
      <header className="px-6 py-4 border-b-4 border-[#fef3c7] bg-white flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setCurrentStep('intro')}
            className="w-12 h-12 rounded-2xl bg-[#ffd670] flex items-center justify-center text-[#4338ca] shadow-lg shadow-[#ffd670]/20 hover:scale-105 transition-transform"
          >
            <Brain size={28} />
          </button>
          <div>
            <h1 className="text-2xl font-display font-bold text-[#4338ca]">Truth Academy 🎓</h1>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-[#f97316] uppercase tracking-widest">Points: {points} ✨</p>
              <button 
                onClick={() => setCurrentStep('achievements')}
                className="text-[10px] font-bold bg-[#e4c1f9] text-[#4338ca] px-2 py-0.5 rounded-full uppercase"
              >
                My Badges 🏆
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onClose}
            className="p-3 hover:bg-[#fff7ed] rounded-2xl text-[#f97316] transition-colors border-2 border-transparent hover:border-[#ffedd5]"
          >
            <X size={28} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {currentStep === 'intro' && (
            <motion.div 
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-8"
            >
              <div className="relative inline-block">
                <div className="w-32 h-32 rounded-[40px] bg-[#70d6ff] flex items-center justify-center text-white shadow-xl mx-auto rotate-3">
                  <Gamepad2 size={64} />
                </div>
                <motion.div 
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-[#ff85a2] flex items-center justify-center text-white shadow-lg"
                >
                  <Sparkles size={24} />
                </motion.div>
              </div>
              
              <div className="space-y-4">
                <h2 className="text-4xl font-display font-bold text-[#4338ca]">Ready to become a Truth Hero? 🦸‍♂️</h2>
                <p className="text-xl text-[#4338ca]/80 max-w-lg mx-auto leading-relaxed">
                  The internet is full of fun things, but sometimes people (and robots!) try to trick us. 
                  Choose your level and start your training!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={handleStart}
                  className="px-12 py-5 bg-[#f97316] text-white rounded-[32px] font-display font-bold text-2xl flex items-center gap-3 hover:bg-[#ea580c] transition-all shadow-xl hover:scale-105 active:scale-95"
                >
                  Start Training! 🚀
                </button>
                <button 
                  onClick={() => setCurrentStep('achievements')}
                  className="px-12 py-5 bg-[#70d6ff] text-white rounded-[32px] font-display font-bold text-2xl flex items-center gap-3 hover:bg-[#0ea5e9] transition-all shadow-xl hover:scale-105 active:scale-95"
                >
                  My Badges 🏆
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 'difficulty' && (
            <motion.div 
              key="difficulty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-2xl space-y-8 text-center"
            >
              <h2 className="text-3xl font-display font-bold text-[#4338ca]">Choose Your Rank! 🎖️</h2>
              <div className="grid grid-cols-1 gap-4">
                {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => selectDifficulty(diff)}
                    className={cn(
                      "p-8 rounded-[32px] border-4 transition-all text-left flex items-center justify-between group",
                      diff === 'Easy' ? "bg-[#99ff88]/10 border-[#99ff88] hover:bg-[#99ff88]/20" :
                      diff === 'Medium' ? "bg-[#ffd670]/10 border-[#ffd670] hover:bg-[#ffd670]/20" :
                      "bg-[#ff85a2]/10 border-[#ff85a2] hover:bg-[#ff85a2]/20"
                    )}
                  >
                    <div className="space-y-1">
                      <h3 className="text-2xl font-display font-bold text-[#4338ca]">{diff} Rank</h3>
                      <p className="text-[#4338ca]/70">
                        {diff === 'Easy' ? "Perfect for new recruits! 👶" :
                         diff === 'Medium' ? "For experienced detectives! 🕵️" :
                         "Only for Truth Masters! 🧙‍♂️"}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#4338ca] shadow-sm group-hover:translate-x-2 transition-transform">
                      <ArrowRight />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {currentStep === 'quiz' && (
            <motion.div 
              key="quiz"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full space-y-8"
            >
              {/* Progress */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold text-white",
                    selectedDifficulty === 'Easy' ? "bg-[#99ff88]" :
                    selectedDifficulty === 'Medium' ? "bg-[#ffd670]" : "bg-[#ff85a2]"
                  )}>
                    {selectedDifficulty}
                  </span>
                </div>
                <div className="flex-1 h-4 bg-[#fff7ed] rounded-full overflow-hidden border-2 border-[#fef3c7]">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentChallengeIndex + 1) / filteredChallenges.length) * 100}%` }}
                    className="h-full bg-[#99ff88]"
                  />
                </div>
                <span className="font-display font-bold text-[#4338ca]">
                  {currentChallengeIndex + 1} / {filteredChallenges.length}
                </span>
              </div>

              <div className="bg-white rounded-[40px] border-4 border-[#fef3c7] p-8 shadow-xl space-y-6 relative overflow-hidden">
                <div className="space-y-2">
                  <div className="inline-block px-4 py-1 rounded-full bg-[#e4c1f9]/20 text-[#4338ca] text-sm font-bold uppercase tracking-widest">
                    {currentChallenge.title}
                  </div>
                  <h3 className="text-2xl font-display font-bold text-[#4338ca]">
                    {currentChallenge.question}
                  </h3>
                </div>

                {(currentChallenge.image || currentChallenge.video) && (
                  <div className="rounded-3xl overflow-hidden border-4 border-[#fff7ed] shadow-inner aspect-video relative group bg-black/5">
                    {currentChallenge.video ? (
                      <video 
                        src={currentChallenge.video} 
                        autoPlay 
                        loop 
                        muted 
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img 
                        src={currentChallenge.image} 
                        alt="Challenge" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    
                    {currentChallenge.type === 'ai-vs-human' && !showFeedback && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                          onClick={runAnalysis}
                          disabled={isAnalyzing}
                          className="px-6 py-3 bg-[#70d6ff] text-white rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-transform"
                        >
                          {isAnalyzing ? (
                            <>
                              <RotateCcw className="animate-spin" size={20} />
                              Scanning...
                            </>
                          ) : (
                            <>
                              <Zap size={20} />
                              Robot Scan
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    <AnimatePresence>
                      {showAnalysis && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 20 }}
                          className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur p-4 rounded-2xl border-2 border-[#70d6ff] shadow-lg"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-[#4338ca] uppercase">Robot Scan Results</span>
                            <span className="text-xs font-bold text-[#f97316]">{currentChallenge.analysisData?.aiProbability}% AI Likely</span>
                          </div>
                          <p className="text-xs text-[#4338ca]/80 italic">
                            "{currentChallenge.analysisData?.reason}"
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {currentChallenge.options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleOptionSelect(option.id)}
                      disabled={showFeedback}
                      className={cn(
                        "p-6 rounded-[28px] text-xl font-display font-bold transition-all border-4 text-left flex items-center justify-between",
                        selectedOption === option.id
                          ? option.isCorrect 
                            ? "bg-[#99ff88]/20 border-[#99ff88] text-[#4338ca]" 
                            : "bg-[#ff85a2]/20 border-[#ff85a2] text-[#4338ca]"
                          : showFeedback && option.isCorrect
                            ? "bg-[#99ff88]/10 border-[#99ff88]/50 text-[#4338ca]"
                            : "bg-[#fff7ed] border-[#ffedd5] text-[#4338ca] hover:border-[#f97316] hover:bg-white"
                      )}
                    >
                      {option.text}
                      {showFeedback && option.isCorrect && <CheckCircle2 className="text-[#99ff88]" />}
                      {showFeedback && selectedOption === option.id && !option.isCorrect && <AlertCircle className="text-[#ff85a2]" />}
                    </button>
                  ))}
                </div>

                {showFeedback && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-6 rounded-[28px] border-4 flex items-start gap-4",
                      currentChallenge.options.find(o => o.id === selectedOption)?.isCorrect
                        ? "bg-[#99ff88]/10 border-[#99ff88] text-[#4338ca]"
                        : "bg-[#ff85a2]/10 border-[#ff85a2] text-[#4338ca]"
                    )}
                  >
                    <div className="p-2 rounded-full bg-white shadow-sm">
                      {currentChallenge.options.find(o => o.id === selectedOption)?.isCorrect ? (
                        <ThumbsUp className="text-[#99ff88]" />
                      ) : (
                        <ThumbsDown className="text-[#ff85a2]" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-lg">
                        {currentChallenge.options.find(o => o.id === selectedOption)?.isCorrect ? "Yay! Correct!" : "Oops! Not quite."}
                      </p>
                      <p className="text-base opacity-90">
                        {currentChallenge.options.find(o => o.id === selectedOption)?.feedback}
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>

              {showFeedback && (
                <div className="flex justify-end">
                  <button 
                    onClick={handleNext}
                    className="px-8 py-4 bg-[#4338ca] text-white rounded-[24px] font-display font-bold text-xl flex items-center gap-2 hover:bg-[#3730a3] transition-all shadow-lg hover:translate-x-1"
                  >
                    {currentChallengeIndex < filteredChallenges.length - 1 ? "Next Challenge" : "See My Score!"}
                    <ArrowRight size={24} />
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {currentStep === 'result' && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-8"
            >
              <div className="relative inline-block">
                <div className="w-40 h-40 rounded-[50px] bg-[#ffd670] flex items-center justify-center text-white shadow-2xl mx-auto">
                  <Trophy size={80} />
                </div>
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      y: [0, -20, 0],
                      rotate: [0, 360],
                      scale: [1, 1.2, 1]
                    }}
                    transition={{ 
                      duration: 2 + i, 
                      repeat: Infinity,
                      delay: i * 0.2
                    }}
                    className="absolute"
                    style={{
                      top: `${Math.random() * 100}%`,
                      left: `${Math.random() * 100}%`,
                    }}
                  >
                    <Star className="text-[#ffd670] fill-[#ffd670]" size={24} />
                  </motion.div>
                ))}
              </div>

              <div className="space-y-4">
                <h2 className="text-5xl font-display font-bold text-[#4338ca]">Amazing Job! 🌟</h2>
                <p className="text-2xl text-[#4338ca]/80">
                  You got <span className="text-[#f97316] font-bold">{score} out of {filteredChallenges.length}</span> correct!
                </p>
                <p className="text-xl font-bold text-[#4338ca]">
                  Total Points: <span className="text-[#99ff88]">{points}</span>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={() => setCurrentStep('difficulty')}
                  className="w-full sm:w-auto px-10 py-4 bg-[#fff7ed] text-[#f97316] border-4 border-[#ffedd5] rounded-[24px] font-display font-bold text-xl flex items-center justify-center gap-2 hover:bg-white transition-all shadow-lg"
                >
                  <RotateCcw size={24} />
                  Try Another Rank
                </button>
                <button 
                  onClick={() => setCurrentStep('achievements')}
                  className="w-full sm:w-auto px-10 py-4 bg-[#ffd670] text-[#4338ca] rounded-[24px] font-display font-bold text-xl flex items-center justify-center gap-2 hover:bg-[#ffc107] transition-all shadow-lg"
                >
                  <Medal size={24} />
                  View My Badges
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 'achievements' && (
            <motion.div 
              key="achievements"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-4xl font-display font-bold text-[#4338ca]">My Achievements 🏆</h2>
                <p className="text-lg text-[#4338ca]/70">Collect them all to become a Truth Legend!</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {badges.map((badge) => (
                  <div 
                    key={badge.id}
                    className={cn(
                      "p-6 rounded-[40px] border-4 flex flex-col items-center text-center space-y-4 transition-all",
                      badge.unlocked 
                        ? "bg-white border-[#fef3c7] shadow-xl scale-100" 
                        : "bg-slate-100 border-slate-200 opacity-50 grayscale scale-95"
                    )}
                  >
                    <div className={cn(
                      "w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-lg",
                      badge.unlocked ? badge.color : "bg-slate-300"
                    )}>
                      {React.cloneElement(badge.icon as React.ReactElement, { size: 40 })}
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-display font-bold text-[#4338ca] text-xl">{badge.name}</h3>
                      <p className="text-sm text-[#4338ca]/70 leading-tight">{badge.description}</p>
                    </div>
                    {badge.unlocked && (
                      <div className="px-3 py-1 rounded-full bg-[#99ff88]/20 text-[#4338ca] text-[10px] font-bold uppercase tracking-widest">
                        Unlocked! ✨
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-center">
                <button 
                  onClick={() => setCurrentStep('intro')}
                  className="px-10 py-4 bg-[#4338ca] text-white rounded-[24px] font-display font-bold text-xl flex items-center justify-center gap-2 hover:bg-[#3730a3] transition-all shadow-lg"
                >
                  Back to Training
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Tip */}
      <footer className="p-6 bg-white border-t-4 border-[#fef3c7] text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#70d6ff]/10 text-[#4338ca] text-sm font-bold">
          <Sparkles size={16} className="text-[#70d6ff]" />
          Tip: Look for tiny mistakes in pictures to spot the robots! 🤖
        </div>
      </footer>
    </motion.div>
  );
}
