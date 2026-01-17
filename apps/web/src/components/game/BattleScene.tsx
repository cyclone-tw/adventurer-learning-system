import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Heart, Zap, X, Check, Shield, Timer } from 'lucide-react';
import { MonsterEncounter, BattleQuestion } from '../../services/gameMap';
import { Button, Card, ProgressBar } from '../ui';
import { haptics } from '../../utils/haptics';
import { playSound } from '../../utils/soundManager';

interface BattleSceneProps {
  encounter: MonsterEncounter;
  playerName: string;
  playerLevel: number;
  playerImageUrl?: string;
  onBattleEnd: (victory: boolean, correctAnswers: number, totalQuestions: number) => void;
  onFlee: () => void;
}

type BattleState = 'intro' | 'question' | 'attack' | 'damage' | 'victory' | 'defeat';

const DIFFICULTY_COLORS = {
  easy: 'text-green-500',
  medium: 'text-yellow-500',
  hard: 'text-red-500',
  boss: 'text-purple-500',
};

export const BattleScene: React.FC<BattleSceneProps> = ({
  encounter,
  playerName,
  playerLevel,
  onBattleEnd,
  onFlee,
}) => {
  const { monster, questions } = encounter;

  const [battleState, setBattleState] = useState<BattleState>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [monsterHp, setMonsterHp] = useState(monster.hp);
  const [playerHp, setPlayerHp] = useState(3); // Player can make 3 mistakes
  const [selectedAnswer, setSelectedAnswer] = useState<string | string[]>('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [damageNumbers, setDamageNumbers] = useState<Array<{ id: number; value: number; x: number; y: number; isPlayer: boolean }>>([]);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [isTimerActive, setIsTimerActive] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  // Timer effect
  useEffect(() => {
    if (!isTimerActive || battleState !== 'question') return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up - treat as wrong answer
          handleTimeUp();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerActive, battleState]);

  const handleTimeUp = useCallback(() => {
    // Time's up - wrong answer
    playSound('wrong');
    haptics.hurt();

    setIsCorrect(false);
    setShowResult(true);
    setBattleState('damage');
    setPlayerHp((prev) => prev - 1);
    showDamage(1, true);

    setTimeout(() => {
      if (playerHp - 1 <= 0) {
        playSound('defeat');
        haptics.error();
        setBattleState('defeat');
      } else {
        nextQuestion();
      }
    }, 1500);
  }, [playerHp]);

  // Start battle after intro
  const startBattle = () => {
    playSound('button_click');
    haptics.medium();
    setBattleState('question');
    setIsTimerActive(true);
    setTimeRemaining(60);
  };

  // Show damage number animation
  const showDamage = (value: number, isPlayer: boolean) => {
    const id = Date.now();
    setDamageNumbers((prev) => [
      ...prev,
      {
        id,
        value,
        x: isPlayer ? 30 : 70,
        y: 40,
        isPlayer,
      },
    ]);

    setTimeout(() => {
      setDamageNumbers((prev) => prev.filter((d) => d.id !== id));
    }, 1000);
  };

  // Submit answer
  const submitAnswer = async () => {
    if (!selectedAnswer || (Array.isArray(selectedAnswer) && selectedAnswer.length === 0)) return;

    setIsTimerActive(false);
    playSound('button_click');

    // For demo purposes, we'll simulate answer checking
    // In real implementation, this would call the API
    const correct = Math.random() > 0.3; // 70% chance of correct for demo
    setIsCorrect(correct);
    setShowResult(true);

    if (correct) {
      // Correct answer - attack!
      playSound('correct');
      playSound('attack');
      haptics.attack();

      setCorrectAnswers((prev) => prev + 1);
      setBattleState('attack');
      setMonsterHp((prev) => Math.max(0, prev - 1));
      showDamage(1, false);

      // Monster hurt sound after a brief delay
      setTimeout(() => playSound('monster_hurt'), 300);

      setTimeout(() => {
        if (monsterHp - 1 <= 0) {
          playSound('victory');
          haptics.levelUp();
          setBattleState('victory');
        } else {
          nextQuestion();
        }
      }, 1500);
    } else {
      // Wrong answer - take damage
      playSound('wrong');
      haptics.hurt();

      setBattleState('damage');
      setPlayerHp((prev) => prev - 1);
      showDamage(1, true);

      setTimeout(() => {
        if (playerHp - 1 <= 0) {
          playSound('defeat');
          haptics.error();
          setBattleState('defeat');
        } else {
          nextQuestion();
        }
      }, 1500);
    }
  };

  // Move to next question
  const nextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;

    if (nextIndex >= totalQuestions) {
      // No more questions - check victory condition
      if (monsterHp <= 0) {
        setBattleState('victory');
      } else {
        setBattleState('defeat');
      }
    } else {
      setCurrentQuestionIndex(nextIndex);
      setSelectedAnswer('');
      setShowResult(false);
      setBattleState('question');
      setIsTimerActive(true);
      setTimeRemaining(60);
    }
  };

  // Handle answer selection
  const handleAnswerSelect = (answerId: string) => {
    if (showResult) return;

    if (currentQuestion?.type === 'multiple_choice') {
      const current = Array.isArray(selectedAnswer) ? selectedAnswer : [];
      if (current.includes(answerId)) {
        setSelectedAnswer(current.filter((id) => id !== answerId));
      } else {
        setSelectedAnswer([...current, answerId]);
      }
    } else {
      setSelectedAnswer(answerId);
    }
  };

  // End battle
  const endBattle = (victory: boolean) => {
    onBattleEnd(victory, correctAnswers, currentQuestionIndex + 1);
  };

  // Render intro screen
  const renderIntro = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6"
    >
      <div className="text-6xl mb-4">⚔️</div>
      <h2 className="text-2xl font-bold text-gray-800">遭遇怪物！</h2>

      <div className="p-6 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl">
        <div className="text-6xl mb-3">{monster.imageUrl ? '👾' : '👾'}</div>
        <h3 className="text-xl font-bold text-gray-800">{monster.name}</h3>
        {monster.description && (
          <p className="text-gray-600 mt-2">{monster.description}</p>
        )}
        <div className="flex justify-center gap-4 mt-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${DIFFICULTY_COLORS[monster.difficulty]}`}>
            {monster.difficulty === 'easy' ? '簡單' : monster.difficulty === 'medium' ? '普通' : monster.difficulty === 'hard' ? '困難' : 'BOSS'}
          </span>
          <span className="px-3 py-1 bg-gray-100 rounded-full text-sm">
            ❤️ HP: {monster.hp}
          </span>
        </div>
      </div>

      <div className="flex gap-4 justify-center">
        <Button variant="secondary" onClick={onFlee}>
          逃跑
        </Button>
        <Button
          variant="primary"
          onClick={startBattle}
          className="bg-gradient-to-r from-red-500 to-orange-500"
        >
          <Swords className="w-5 h-5 mr-2" />
          開始戰鬥！
        </Button>
      </div>
    </motion.div>
  );

  // Render battle UI
  const renderBattle = () => (
    <div className="space-y-4">
      {/* Battle Status Bar */}
      <div className="grid grid-cols-2 gap-4">
        {/* Player Status */}
        <Card variant="outlined" padding="sm" className="bg-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-xl">
              🧙
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-800">{playerName}</p>
              <p className="text-sm text-gray-500">Lv.{playerLevel}</p>
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Heart
                    key={i}
                    className={`w-4 h-4 ${
                      i < playerHp ? 'text-red-500 fill-red-500' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Monster Status */}
        <Card variant="outlined" padding="sm" className="bg-red-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-orange-500 rounded-full flex items-center justify-center text-2xl">
              👾
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-800">{monster.name}</p>
              <div className="mt-1">
                <ProgressBar
                  value={monsterHp}
                  max={monster.hp}
                  color="red"
                  showLabel
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Battle Arena */}
      <div className="relative h-40 bg-gradient-to-b from-purple-100 to-pink-100 rounded-xl overflow-hidden">
        {/* Player Character */}
        <motion.div
          className="absolute left-8 bottom-8"
          animate={
            battleState === 'attack'
              ? { x: [0, 100, 0], transition: { duration: 0.5 } }
              : battleState === 'damage'
              ? { x: [0, -10, 10, -10, 10, 0], transition: { duration: 0.3 } }
              : {}
          }
        >
          <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-3xl shadow-lg">
            🧙
          </div>
        </motion.div>

        {/* Monster */}
        <motion.div
          className="absolute right-8 bottom-8"
          animate={
            battleState === 'attack'
              ? {
                  x: [0, -10, 10, -10, 10, 0],
                  filter: ['brightness(1)', 'brightness(2)', 'brightness(1)'],
                  transition: { duration: 0.3, delay: 0.3 },
                }
              : battleState === 'damage'
              ? { x: [0, -50, 0], transition: { duration: 0.4 } }
              : {}
          }
        >
          <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-orange-500 rounded-full flex items-center justify-center text-4xl shadow-lg">
            👾
          </div>
        </motion.div>

        {/* Damage Numbers */}
        <AnimatePresence>
          {damageNumbers.map((damage) => (
            <motion.div
              key={damage.id}
              initial={{ opacity: 1, y: 0, scale: 0.5 }}
              animate={{ opacity: 0, y: -50, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className={`absolute text-2xl font-bold ${
                damage.isPlayer ? 'text-red-600' : 'text-yellow-500'
              }`}
              style={{ left: `${damage.x}%`, top: `${damage.y}%` }}
            >
              -{damage.value}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* VS Badge */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center font-bold text-yellow-900 shadow-lg">
            VS
          </div>
        </div>
      </div>

      {/* Question Area */}
      {battleState === 'question' && currentQuestion && (
        <Card variant="elevated" padding="lg">
          {/* Timer */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">
              題目 {currentQuestionIndex + 1} / {totalQuestions}
            </span>
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-gray-500" />
              <span className={`font-mono font-bold ${timeRemaining <= 10 ? 'text-red-500' : 'text-gray-700'}`}>
                {timeRemaining}s
              </span>
            </div>
          </div>

          {/* Question Content */}
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            {currentQuestion.content.text}
          </h3>

          {/* Answer Options */}
          <div className="space-y-3">
            {currentQuestion.type === 'fill_blank' ? (
              <input
                type="text"
                value={typeof selectedAnswer === 'string' ? selectedAnswer : ''}
                onChange={(e) => setSelectedAnswer(e.target.value)}
                placeholder="請輸入答案..."
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:outline-none"
                disabled={showResult}
              />
            ) : currentQuestion.type === 'true_false' ? (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'true', label: '⭕ 正確' },
                  { id: 'false', label: '❌ 錯誤' },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleAnswerSelect(option.id)}
                    disabled={showResult}
                    className={`p-4 rounded-xl border-2 text-lg font-medium transition-all ${
                      selectedAnswer === option.id
                        ? 'border-purple-500 bg-purple-100'
                        : 'border-gray-200 hover:border-purple-300'
                    } ${showResult ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : (
              currentQuestion.options?.map((option) => {
                const isSelected = Array.isArray(selectedAnswer)
                  ? selectedAnswer.includes(option.id)
                  : selectedAnswer === option.id;

                return (
                  <button
                    key={option.id}
                    onClick={() => handleAnswerSelect(option.id)}
                    disabled={showResult}
                    className={`w-full p-4 text-left rounded-xl border-2 transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'border-purple-500 bg-purple-100'
                        : 'border-gray-200 hover:border-purple-300'
                    } ${showResult ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-gray-300'
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <span>{option.text}</span>
                  </button>
                );
              })
            )}
          </div>

          {/* Result Display */}
          {showResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 p-4 rounded-xl ${
                isCorrect ? 'bg-green-100' : 'bg-red-100'
              }`}
            >
              <div className="flex items-center gap-2">
                {isCorrect ? (
                  <>
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="font-bold text-green-700">答對了！造成傷害！</span>
                  </>
                ) : (
                  <>
                    <X className="w-5 h-5 text-red-600" />
                    <span className="font-bold text-red-700">答錯了！受到攻擊！</span>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* Submit Button */}
          {!showResult && (
            <Button
              variant="primary"
              onClick={submitAnswer}
              disabled={!selectedAnswer || (Array.isArray(selectedAnswer) && selectedAnswer.length === 0)}
              className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600"
            >
              <Zap className="w-5 h-5 mr-2" />
              攻擊！
            </Button>
          )}
        </Card>
      )}
    </div>
  );

  // Render victory screen
  const renderVictory = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6"
    >
      <div className="text-6xl">🎉</div>
      <h2 className="text-3xl font-bold text-green-600">勝利！</h2>
      <p className="text-gray-600">你成功打敗了 {monster.name}！</p>

      <Card variant="elevated" padding="lg" className="bg-gradient-to-br from-green-50 to-emerald-50">
        <h3 className="font-bold text-lg mb-4">戰鬥結果</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-white rounded-xl">
            <div className="text-2xl font-bold text-green-600">
              {correctAnswers}/{currentQuestionIndex + 1}
            </div>
            <div className="text-sm text-gray-500">正確題數</div>
          </div>
          <div className="text-center p-4 bg-white rounded-xl">
            <div className="text-2xl font-bold text-blue-600">
              {Math.round((correctAnswers / (currentQuestionIndex + 1)) * 100)}%
            </div>
            <div className="text-sm text-gray-500">正確率</div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 rounded-xl">
          <h4 className="font-bold text-yellow-700 mb-2">獲得獎勵</h4>
          <div className="flex justify-center gap-6">
            <div className="text-center">
              <span className="text-2xl">✨</span>
              <p className="font-bold text-blue-600">+{monster.rewards.exp} EXP</p>
            </div>
            <div className="text-center">
              <span className="text-2xl">💰</span>
              <p className="font-bold text-yellow-600">+{monster.rewards.gold} 金幣</p>
            </div>
          </div>
        </div>
      </Card>

      <Button
        variant="primary"
        onClick={() => endBattle(true)}
        className="bg-gradient-to-r from-green-500 to-emerald-500"
      >
        繼續探索
      </Button>
    </motion.div>
  );

  // Render defeat screen
  const renderDefeat = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6"
    >
      <div className="text-6xl">😢</div>
      <h2 className="text-3xl font-bold text-red-600">戰鬥失敗</h2>
      <p className="text-gray-600">別灰心，再接再厲！</p>

      <Card variant="elevated" padding="lg" className="bg-gradient-to-br from-red-50 to-orange-50">
        <h3 className="font-bold text-lg mb-4">戰鬥結果</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-white rounded-xl">
            <div className="text-2xl font-bold text-orange-600">
              {correctAnswers}/{currentQuestionIndex + 1}
            </div>
            <div className="text-sm text-gray-500">正確題數</div>
          </div>
          <div className="text-center p-4 bg-white rounded-xl">
            <div className="text-2xl font-bold text-red-600">
              {Math.round((correctAnswers / (currentQuestionIndex + 1)) * 100)}%
            </div>
            <div className="text-sm text-gray-500">正確率</div>
          </div>
        </div>
      </Card>

      <Button
        variant="primary"
        onClick={() => endBattle(false)}
        className="bg-gradient-to-r from-orange-500 to-red-500"
      >
        返回地圖
      </Button>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-4">
      <div className="max-w-lg mx-auto">
        <Card variant="elevated" padding="lg">
          {battleState === 'intro' && renderIntro()}
          {['question', 'attack', 'damage'].includes(battleState) && renderBattle()}
          {battleState === 'victory' && renderVictory()}
          {battleState === 'defeat' && renderDefeat()}
        </Card>
      </div>
    </div>
  );
};

export default BattleScene;
