import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Swords,
  Check,
  X,
  ChevronRight,
  Sparkles,
  ChevronLeft,
  Lock,
  Trophy,
  Star,
  Map as MapIcon,
  Lightbulb,
  SkipForward,
  Zap,
} from 'lucide-react';
import { StudentLayout } from '../../components/layout';
import { Card, Button, ProgressBar } from '../../components/ui';
import { useUserStore } from '../../stores/userStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { attemptsService, AnswerResult } from '../../services/attempts';
import { stageService, StageForStudent, StageQuestion, StageSessionResult } from '../../services/stages';
import { shopService, QuizItem, ActiveEffect, RARITY_CONFIG } from '../../services/shop';

type GameState = 'map' | 'stage-intro' | 'loading' | 'question' | 'result' | 'session-complete';

const difficultyLabels = {
  easy: { name: '簡單', color: 'text-green-600 bg-green-100' },
  medium: { name: '普通', color: 'text-yellow-600 bg-yellow-100' },
  hard: { name: '困難', color: 'text-red-600 bg-red-100' },
};

// Subject display names
const SUBJECT_NAMES: Record<string, string> = {
  math: '數學',
  chinese: '國語',
  english: '英語',
  science: '自然',
};

const Adventure = () => {
  const [searchParams] = useSearchParams();
  const subjectFilter = searchParams.get('subject'); // e.g., 'math', 'chinese'
  const subjectName = subjectFilter ? SUBJECT_NAMES[subjectFilter] || subjectFilter : null;

  const { refreshUser } = useUserStore();
  const { addAchievementNotification, addTaskNotification } = useNotificationStore();
  const [gameState, setGameState] = useState<GameState>('map');

  // Stage data
  const [stages, setStages] = useState<StageForStudent[]>([]);
  const [loadingStages, setLoadingStages] = useState(true);
  const [selectedStage, setSelectedStage] = useState<StageForStudent | null>(null);

  // Session state
  const [sessionProgress, setSessionProgress] = useState({
    sessionCorrect: 0,
    sessionTotal: 0,
    questionsPerSession: 5,
  });

  // Quiz state
  const [question, setQuestion] = useState<StageQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | string[]>('');
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [sessionResult, setSessionResult] = useState<StageSessionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);

  // Item system state
  const [quizItems, setQuizItems] = useState<QuizItem[]>([]);
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);
  const [showHint, setShowHint] = useState<string | null>(null);
  const [usingItem, setUsingItem] = useState<string | null>(null);
  const [skippedQuestion, setSkippedQuestion] = useState<{ correctAnswer: string } | null>(null);

  // Load stages on mount or when subject filter changes
  useEffect(() => {
    loadStages();
  }, [subjectFilter]);

  // Load quiz items when entering question state
  useEffect(() => {
    if (gameState === 'question') {
      loadQuizItems();
    }
  }, [gameState]);

  const loadQuizItems = async () => {
    try {
      const data = await shopService.getQuizItems();
      setQuizItems(data.quizItems);
      setActiveEffects(data.activeEffects);
    } catch (err) {
      console.error('Failed to load quiz items:', err);
    }
  };

  const loadStages = async () => {
    setLoadingStages(true);
    try {
      const data = await stageService.listForStudent(subjectFilter || undefined);
      setStages(data);
    } catch (err) {
      console.error('Failed to load stages:', err);
      setError('無法載入關卡資料');
    } finally {
      setLoadingStages(false);
    }
  };

  // Select and start stage
  const selectStage = (stage: StageForStudent) => {
    if (!stage.isUnlocked) return;
    setSelectedStage(stage);
    setGameState('stage-intro');
  };

  // Start stage session
  const startStageSession = async () => {
    if (!selectedStage) return;

    setGameState('loading');
    setError(null);

    try {
      const sessionData = await stageService.startSession(selectedStage._id);
      setSessionProgress({
        sessionCorrect: sessionData.progress.sessionCorrect,
        sessionTotal: sessionData.progress.sessionTotal,
        questionsPerSession: sessionData.questionsPerSession,
      });
      await fetchStageQuestion(true); // First question of the session
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '無法開始關卡';
      setError(errorMessage);
      setGameState('stage-intro');
    }
  };

  // Fetch next question from stage
  const fetchStageQuestion = async (isFirstQuestion = false) => {
    if (!selectedStage) {
      console.error('fetchStageQuestion: selectedStage is null');
      setError('關卡資料遺失，請重新選擇關卡');
      setGameState('map');
      return;
    }

    setGameState('loading');
    setSelectedAnswer('');
    setShowHint(null);
    setSkippedQuestion(null);

    try {
      console.log('Fetching question for stage:', selectedStage._id);
      const q = await stageService.getQuestion(selectedStage._id);
      console.log('Question fetched successfully:', q._id);

      setQuestion(q);
      setResult(null); // Clear previous result only after successful fetch

      // Only use server progress for the first question of a session
      // For subsequent questions, preserve local progress (server doesn't track per-answer updates)
      if (isFirstQuestion) {
        setSessionProgress({
          sessionCorrect: q.currentProgress.sessionCorrect,
          sessionTotal: q.currentProgress.sessionTotal,
          questionsPerSession: q.questionsPerSession,
        });
      } else {
        // Just update questionsPerSession in case it changed
        setSessionProgress(prev => ({
          ...prev,
          questionsPerSession: q.questionsPerSession,
        }));
      }

      setStartTime(Date.now());
      setGameState('question');
    } catch (err: unknown) {
      console.error('fetchStageQuestion error:', err);
      const errorMessage = err instanceof Error ? err.message : '無法載入題目';
      setError(errorMessage);
      // Stay on result screen if we have a result, otherwise go to stage-intro
      if (result) {
        setGameState('result');
      } else {
        setGameState('stage-intro');
      }
    }
  };

  // Submit answer
  const submitAnswer = async () => {
    if (!question || !selectedAnswer) return;

    console.log('submitAnswer called, current progress:', sessionProgress);
    setIsSubmitting(true);
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    try {
      console.log('Submitting answer for question:', question._id);
      const answerResult = await attemptsService.submitAnswer(
        question._id,
        selectedAnswer,
        timeSpent
      );
      console.log('Answer result:', answerResult);
      setResult(answerResult);

      // Update session progress
      const newSessionTotal = sessionProgress.sessionTotal + 1;
      const newSessionCorrect = answerResult.isCorrect
        ? sessionProgress.sessionCorrect + 1
        : sessionProgress.sessionCorrect;

      console.log('Updating session progress:', { newSessionCorrect, newSessionTotal });
      setSessionProgress({
        ...sessionProgress,
        sessionCorrect: newSessionCorrect,
        sessionTotal: newSessionTotal,
      });

      await refreshUser();
      console.log('Setting gameState to result');
      setGameState('result');

      // Show achievement notifications if any
      if (answerResult.unlockedAchievements && answerResult.unlockedAchievements.length > 0) {
        setTimeout(() => {
          answerResult.unlockedAchievements!.forEach((achievement) => {
            addAchievementNotification(achievement);
          });
        }, 500);
      }

      // Show task completion notifications if any
      if (answerResult.completedTasks && answerResult.completedTasks.length > 0) {
        setTimeout(() => {
          answerResult.completedTasks!.forEach((task) => {
            addTaskNotification(task);
          });
        }, 1000); // Show after achievements
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '提交答案失敗';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Continue to next question or complete session
  const continueSession = async () => {
    console.log('continueSession called, sessionProgress:', sessionProgress);

    // If question was skipped, update progress first
    if (skippedQuestion) {
      const newSessionTotal = sessionProgress.sessionTotal + 1;
      setSessionProgress(prev => ({
        ...prev,
        sessionTotal: newSessionTotal,
      }));

      if (newSessionTotal >= sessionProgress.questionsPerSession) {
        // Session complete - call complete endpoint
        await completeSession();
        return;
      }
    }

    if (sessionProgress.sessionTotal >= sessionProgress.questionsPerSession) {
      // Session complete - call complete endpoint
      console.log('Session complete, calling completeSession');
      await completeSession();
    } else {
      // Fetch next question
      console.log('Fetching next question');
      await fetchStageQuestion();
    }
  };

  // Complete stage session
  const completeSession = async () => {
    if (!selectedStage) return;

    setGameState('loading');
    try {
      const result = await stageService.completeSession(
        selectedStage._id,
        sessionProgress.sessionCorrect,
        sessionProgress.sessionTotal
      );
      setSessionResult(result);
      await refreshUser();
      await loadStages(); // Reload to update progress
      setGameState('session-complete');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '完成關卡失敗';
      setError(errorMessage);
      setGameState('result');
    }
  };

  // Go back to map
  const backToMap = () => {
    setGameState('map');
    setSelectedStage(null);
    setQuestion(null);
    setResult(null);
    setSessionResult(null);
    setSessionProgress({
      sessionCorrect: 0,
      sessionTotal: 0,
      questionsPerSession: 5,
    });
  };

  // Handle answer selection
  const handleAnswerSelect = (answerId: string) => {
    if (question?.type === 'multiple_choice') {
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

  // Handle using quiz item (hint/skip)
  const handleUseQuizItem = async (item: QuizItem) => {
    if (!question || usingItem) return;

    setUsingItem(item._id);
    try {
      const result = await shopService.useQuizItem(item._id, question._id);

      // Update item quantity
      setQuizItems(prev =>
        prev.map(i =>
          i._id === item._id
            ? { ...i, quantity: result.remainingQuantity }
            : i
        ).filter(i => i.quantity > 0)
      );

      // Handle hint
      if (result.hint) {
        setShowHint(result.hint);
      }

      // Handle skip
      if (result.skip && result.correctAnswer) {
        setSkippedQuestion({ correctAnswer: result.correctAnswer });
      }
    } catch (err) {
      console.error('Failed to use item:', err);
    } finally {
      setUsingItem(null);
    }
  };

  // Get item effect type for display
  const getItemEffectType = (item: QuizItem): 'hint' | 'skip' | null => {
    const effect = item.effects.find(e => ['hint', 'skip'].includes(e.type));
    return effect?.type as 'hint' | 'skip' | null;
  };

  // Render stage map
  const renderStageMap = () => (
    <div className="space-y-6">
      <Card
        variant="elevated"
        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              {subjectName ? `${subjectName}練習` : '冒險地圖'}
            </h1>
            <p className="text-white/80">
              {subjectName ? `選擇${subjectName}關卡開始練習！` : '挑戰關卡，獲得獎勵！'}
            </p>
          </div>
          <div className="hidden sm:block">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <MapIcon className="w-8 h-8" />
            </div>
          </div>
        </div>
      </Card>

      {loadingStages ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent mx-auto mb-2" />
          <p className="text-gray-500">載入關卡中...</p>
        </div>
      ) : error ? (
        <Card variant="outlined" className="bg-red-50 border-red-200 text-center py-8">
          <p className="text-red-600">{error}</p>
          <Button variant="secondary" onClick={loadStages} className="mt-4">
            重新載入
          </Button>
        </Card>
      ) : stages.length === 0 ? (
        <Card variant="elevated" className="text-center py-12">
          <MapIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            {subjectName ? `尚無${subjectName}關卡` : '尚未有關卡'}
          </h3>
          <p className="text-gray-500">
            {subjectName
              ? `老師還沒有設定${subjectName}科目的關卡，請稍後再來！`
              : '老師還沒有設定任何關卡，請稍後再來！'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stages.map((stage, index) => {
            const isLocked = !stage.isUnlocked;
            const isCompleted = stage.isCompleted;

            return (
              <Card
                key={stage._id}
                variant="elevated"
                className={`relative overflow-hidden transition-all ${
                  isLocked
                    ? 'opacity-60 cursor-not-allowed'
                    : 'hover:scale-[1.02] cursor-pointer hover:shadow-lg'
                } ${isCompleted ? 'ring-2 ring-green-400' : ''}`}
                onClick={() => selectStage(stage)}
              >
                {/* Stage Number Badge */}
                <div className="absolute top-3 right-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    isCompleted
                      ? 'bg-green-100 text-green-600'
                      : isLocked
                        ? 'bg-gray-200 text-gray-500'
                        : 'bg-purple-100 text-purple-600'
                  }`}>
                    {index + 1}
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  {/* Stage Icon */}
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl ${
                    isLocked
                      ? 'bg-gray-100'
                      : 'bg-gradient-to-br from-purple-100 to-pink-100'
                  }`}>
                    {isLocked ? <Lock className="w-8 h-8 text-gray-400" /> : stage.icon}
                  </div>

                  {/* Stage Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-gray-800 truncate">{stage.name}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                      {stage.description || '挑戰這個關卡！'}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <span className="flex items-center gap-1 text-gray-600">
                        <Swords className="w-4 h-4" />
                        {stage.questionsPerSession} 題
                      </span>
                      {isCompleted && (
                        <span className="flex items-center gap-1 text-green-600">
                          <Trophy className="w-4 h-4" />
                          最佳 {stage.bestScore}%
                        </span>
                      )}
                    </div>

                    {/* Rewards Preview */}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full">
                        +{stage.rewards.bonusExp} EXP
                      </span>
                      <span className="text-xs px-2 py-1 bg-yellow-50 text-yellow-600 rounded-full">
                        +{stage.rewards.bonusGold} 金幣
                      </span>
                    </div>
                  </div>
                </div>

                {/* Completion Badge */}
                {isCompleted && (
                  <div className="absolute bottom-3 right-3">
                    <div className="flex items-center gap-1 text-green-600">
                      <Check className="w-5 h-5" />
                      <span className="text-sm font-medium">已通關</span>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  // Render stage intro
  const renderStageIntro = () => {
    if (!selectedStage) return null;

    return (
      <div className="space-y-6">
        <Card
          variant="elevated"
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={backToMap}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedStage.icon}</span>
                <h1 className="text-xl font-bold">{selectedStage.name}</h1>
              </div>
              <p className="text-white/80 mt-1">
                {selectedStage.description || '準備好開始挑戰了嗎？'}
              </p>
            </div>
          </div>
        </Card>

        {error && (
          <Card variant="outlined" className="bg-red-50 border-red-200">
            <p className="text-red-600">{error}</p>
          </Card>
        )}

        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-bold mb-4">關卡資訊</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">題目數量</span>
              <span className="font-bold">{selectedStage.questionsPerSession} 題</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">挑戰次數</span>
              <span className="font-bold">{selectedStage.totalAttempts} 次</span>
            </div>

            {selectedStage.isCompleted && (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-green-600">最佳成績</span>
                <span className="font-bold text-green-600">{selectedStage.bestScore}%</span>
              </div>
            )}
          </div>
        </Card>

        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-bold mb-4">通關獎勵</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <div className="text-3xl mb-2">✨</div>
              <div className="text-xl font-bold text-blue-600">
                +{selectedStage.rewards.bonusExp}
              </div>
              <div className="text-sm text-gray-500">經驗值</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-xl">
              <div className="text-3xl mb-2">💰</div>
              <div className="text-xl font-bold text-yellow-600">
                +{selectedStage.rewards.bonusGold}
              </div>
              <div className="text-sm text-gray-500">金幣</div>
            </div>
          </div>

          {selectedStage.rewards.firstClearBonus && !selectedStage.isCompleted && (
            <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-purple-500" />
                <span className="font-bold text-purple-700">首次通關額外獎勵</span>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-purple-600">
                  +{selectedStage.rewards.firstClearBonus.exp} 經驗
                </span>
                <span className="text-purple-600">
                  +{selectedStage.rewards.firstClearBonus.gold} 金幣
                </span>
              </div>
            </div>
          )}
        </Card>

        <Button
          variant="primary"
          onClick={startStageSession}
          rightIcon={<Swords className="w-5 h-5" />}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          開始挑戰
        </Button>
      </div>
    );
  };

  // Render loading screen
  const renderLoadingScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mb-4" />
      <p className="text-purple-600 font-medium text-lg">正在準備題目...</p>
    </div>
  );

  // Render question screen
  const renderQuestionScreen = () => {
    if (!question || !selectedStage) return null;

    const difficultyInfo = difficultyLabels[question.difficulty];
    const progress = (sessionProgress.sessionTotal / sessionProgress.questionsPerSession) * 100;

    return (
      <div className="space-y-4">
        {/* Active Effects Banner */}
        {activeEffects.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeEffects.map((effect) => (
              <div
                key={effect._id}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-300 rounded-full text-sm"
              >
                <Zap className="w-4 h-4 text-yellow-600" />
                <span className="font-medium text-yellow-800">
                  {effect.effectType === 'exp_boost' ? '經驗加倍' : effect.effectType === 'gold_boost' ? '金幣加倍' : effect.effectType}
                </span>
                <span className="text-yellow-600">({effect.remainingMinutes}分)</span>
              </div>
            ))}
          </div>
        )}

        {/* Header */}
        <Card variant="elevated" className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedStage.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{selectedStage.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${difficultyInfo.color}`}>
                    {difficultyInfo.name}
                  </span>
                </div>
                {question.unitId && (
                  <p className="text-white/80 text-sm">
                    {question.unitId.name}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/80">進度</div>
              <div className="font-bold">
                {sessionProgress.sessionTotal + 1} / {sessionProgress.questionsPerSession}
              </div>
            </div>
          </div>
          <ProgressBar value={progress} max={100} color="white" />
        </Card>

        {/* Question Content */}
        <Card variant="elevated" padding="lg">
          <h2 className="text-xl font-bold mb-4 text-gray-800">
            {question.content.text}
          </h2>

          {question.content.media && question.content.media.type === 'image' && (
            <img
              src={question.content.media.url}
              alt="題目圖片"
              className="max-w-full h-auto rounded-lg mb-4"
            />
          )}

          {/* Answer Options */}
          <div className="space-y-3">
            {question.type === 'fill_blank' ? (
              <input
                type="text"
                value={typeof selectedAnswer === 'string' ? selectedAnswer : ''}
                onChange={(e) => setSelectedAnswer(e.target.value)}
                placeholder="請輸入答案..."
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:outline-none text-lg"
              />
            ) : question.type === 'true_false' ? (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'true', label: '⭕ 正確' },
                  { id: 'false', label: '❌ 錯誤' },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleAnswerSelect(option.id)}
                    className={`p-4 rounded-xl border-2 text-lg font-medium transition-all ${
                      selectedAnswer === option.id
                        ? 'border-purple-500 bg-purple-100 text-purple-700'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : (
              question.options?.map((option) => {
                const isSelected =
                  question.type === 'multiple_choice'
                    ? Array.isArray(selectedAnswer) && selectedAnswer.includes(option.id)
                    : selectedAnswer === option.id;

                return (
                  <button
                    key={option.id}
                    onClick={() => handleAnswerSelect(option.id)}
                    className={`w-full p-4 text-left rounded-xl border-2 transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'border-purple-500 bg-purple-100'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                    }`}
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
                    <span className="text-lg">{option.text}</span>
                  </button>
                );
              })
            )}
          </div>

          {question.type === 'multiple_choice' && (
            <p className="text-sm text-gray-500 mt-3">
              💡 提示：此題為複選題，可選擇多個答案
            </p>
          )}

          {/* Hint Display */}
          {showHint && (
            <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <span className="font-bold text-amber-700">提示</span>
              </div>
              <p className="text-amber-800">{showHint}</p>
            </div>
          )}

          {/* Skipped Question Display */}
          {skippedQuestion && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <SkipForward className="w-5 h-5 text-blue-500" />
                <span className="font-bold text-blue-700">題目已跳過</span>
              </div>
              <p className="text-blue-800">正確答案：{skippedQuestion.correctAnswer}</p>
              <p className="text-sm text-blue-600 mt-2">點擊下一題繼續</p>
            </div>
          )}
        </Card>

        {/* Item Toolbar */}
        {quizItems.length > 0 && !skippedQuestion && (
          <Card variant="outlined" padding="md">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span className="font-medium text-gray-700">可用道具</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {quizItems.map((item) => {
                const effectType = getItemEffectType(item);
                const rarityConfig = RARITY_CONFIG[item.rarity];
                const isUsing = usingItem === item._id;

                return (
                  <button
                    key={item._id}
                    onClick={() => handleUseQuizItem(item)}
                    disabled={isUsing || (effectType === 'hint' && !!showHint)}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all
                      ${isUsing ? 'opacity-50 cursor-wait' : ''}
                      ${effectType === 'hint' && showHint ? 'opacity-50 cursor-not-allowed' : ''}
                      ${rarityConfig.bgColor} border-transparent hover:border-purple-300 hover:shadow
                    `}
                    title={item.description}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <div className="text-left">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-sm">{item.name}</span>
                        <span className="text-xs px-1.5 py-0.5 bg-white/50 rounded-full">{item.quantity}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {effectType === 'hint' && (
                          <span className="flex items-center gap-1">
                            <Lightbulb className="w-3 h-3" /> 獲得提示
                          </span>
                        )}
                        {effectType === 'skip' && (
                          <span className="flex items-center gap-1">
                            <SkipForward className="w-3 h-3" /> 跳過此題
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="ghost" onClick={backToMap} className="flex-1">
            放棄關卡
          </Button>
          {skippedQuestion ? (
            <Button
              variant="primary"
              onClick={continueSession}
              rightIcon={<ChevronRight className="w-5 h-5" />}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              下一題
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={submitAnswer}
              disabled={
                !selectedAnswer ||
                (Array.isArray(selectedAnswer) && selectedAnswer.length === 0) ||
                isSubmitting
              }
              loading={isSubmitting}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              提交答案
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Render result screen
  const renderResultScreen = () => {
    if (!result || !question) {
      console.error('renderResultScreen: result or question is null', { result, question });
      // Show error instead of blank screen
      return (
        <div className="space-y-4">
          <Card variant="outlined" className="border-red-300 bg-red-50">
            <div className="text-red-600 text-center py-4">
              <p className="font-medium">發生錯誤</p>
              <p className="text-sm">題目資料遺失，請返回重試</p>
              <Button
                variant="primary"
                onClick={backToMap}
                className="mt-4"
              >
                返回關卡選擇
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    const isLastQuestion = sessionProgress.sessionTotal >= sessionProgress.questionsPerSession;

    return (
      <div className="space-y-4">
        {/* Error display */}
        {error && (
          <Card variant="outlined" className="border-red-300 bg-red-50">
            <div className="text-red-600 text-center py-2">
              <p className="font-medium">發生錯誤</p>
              <p className="text-sm">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="mt-2"
              >
                關閉
              </Button>
            </div>
          </Card>
        )}

        {/* Result Banner */}
        <Card
          variant="elevated"
          className={`${
            result.isCorrect
              ? 'bg-gradient-to-r from-green-500 to-emerald-500'
              : 'bg-gradient-to-r from-red-500 to-orange-500'
          } text-white`}
        >
          <div className="flex items-center justify-center py-4">
            <div className="text-center">
              <div className="text-6xl mb-2">
                {result.isCorrect ? '🎉' : '😢'}
              </div>
              <h2 className="text-2xl font-bold">
                {result.isCorrect ? '答對了！' : '答錯了...'}
              </h2>
            </div>
          </div>
        </Card>

        {/* Rewards */}
        {result.isCorrect && (
          <Card variant="elevated" padding="lg">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <h3 className="text-lg font-bold">獲得獎勵</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <div className="text-3xl mb-1">✨</div>
                <div className="text-2xl font-bold text-blue-600">
                  +{result.rewards.exp}
                </div>
                <div className="text-sm text-gray-500">經驗值</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-xl">
                <div className="text-3xl mb-1">💰</div>
                <div className="text-2xl font-bold text-yellow-600">
                  +{result.rewards.gold}
                </div>
                <div className="text-sm text-gray-500">金幣</div>
              </div>
            </div>
          </Card>
        )}

        {/* Correct Answer & Explanation */}
        <Card variant="elevated" padding="lg">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            {result.isCorrect ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : (
              <X className="w-5 h-5 text-red-500" />
            )}
            正確答案
          </h3>
          <div className="p-3 bg-green-50 rounded-lg mb-4">
            <p className="text-green-700 font-medium">
              {Array.isArray(result.correctAnswer)
                ? result.correctAnswer.join(', ')
                : result.correctAnswer}
            </p>
          </div>

          {result.explanation && (
            <>
              <h3 className="font-bold mb-2">📚 解說</h3>
              <p className="text-gray-600">{result.explanation}</p>
            </>
          )}
        </Card>

        {/* Progress */}
        <Card variant="outlined" padding="md">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">關卡進度</span>
            <span className="font-bold">
              {sessionProgress.sessionCorrect} / {sessionProgress.sessionTotal} 題答對
            </span>
          </div>
          <div className="mt-2">
            <ProgressBar
              value={sessionProgress.sessionCorrect}
              max={sessionProgress.sessionTotal}
              color="purple"
            />
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="ghost" onClick={backToMap} className="flex-1">
            放棄關卡
          </Button>
          <Button
            variant="primary"
            onClick={continueSession}
            rightIcon={<ChevronRight className="w-5 h-5" />}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {isLastQuestion ? '查看結果' : '下一題'}
          </Button>
        </div>
      </div>
    );
  };

  // Render session complete screen
  const renderSessionComplete = () => {
    if (!sessionResult || !selectedStage) return null;

    const correctRate = Math.round(
      (sessionProgress.sessionCorrect / sessionProgress.sessionTotal) * 100
    );

    return (
      <div className="space-y-4">
        {/* Result Banner */}
        <Card
          variant="elevated"
          className={`${
            sessionResult.isPassed
              ? 'bg-gradient-to-r from-green-500 to-emerald-500'
              : 'bg-gradient-to-r from-orange-500 to-red-500'
          } text-white`}
        >
          <div className="flex items-center justify-center py-6">
            <div className="text-center">
              <div className="text-6xl mb-3">
                {sessionResult.isPassed ? '🏆' : '💪'}
              </div>
              <h2 className="text-2xl font-bold">
                {sessionResult.isPassed ? '關卡通過！' : '再接再厲！'}
              </h2>
              {sessionResult.isFirstClear && (
                <p className="text-white/90 mt-2">
                  🎊 首次通關達成！
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Score Summary */}
        <Card variant="elevated" padding="lg">
          <div className="text-center mb-6">
            <div className="text-5xl font-bold text-purple-600 mb-2">
              {correctRate}%
            </div>
            <p className="text-gray-500">
              {sessionProgress.sessionCorrect} / {sessionProgress.sessionTotal} 題答對
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-gray-700">
                {sessionProgress.sessionTotal}
              </div>
              <div className="text-sm text-gray-500">作答題數</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">
                {sessionProgress.sessionCorrect}
              </div>
              <div className="text-sm text-gray-500">答對題數</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">
                {sessionResult.progress.totalAttempts}
              </div>
              <div className="text-sm text-gray-500">累計挑戰</div>
            </div>
          </div>
        </Card>

        {/* Rewards */}
        {sessionResult.isPassed && (
          <Card variant="elevated" padding="lg">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <h3 className="text-lg font-bold">通關獎勵</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <div className="text-3xl mb-1">✨</div>
                <div className="text-2xl font-bold text-blue-600">
                  +{sessionResult.rewards.bonusExp}
                </div>
                <div className="text-sm text-gray-500">經驗值</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-xl">
                <div className="text-3xl mb-1">💰</div>
                <div className="text-2xl font-bold text-yellow-600">
                  +{sessionResult.rewards.bonusGold}
                </div>
                <div className="text-sm text-gray-500">金幣</div>
              </div>
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={backToMap} className="flex-1">
            返回地圖
          </Button>
          <Button
            variant="primary"
            onClick={startStageSession}
            rightIcon={<Swords className="w-5 h-5" />}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            再次挑戰
          </Button>
        </div>
      </div>
    );
  };

  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto pb-20 md:pb-6">
        {gameState === 'map' && renderStageMap()}
        {gameState === 'stage-intro' && renderStageIntro()}
        {gameState === 'loading' && renderLoadingScreen()}
        {gameState === 'question' && renderQuestionScreen()}
        {gameState === 'result' && renderResultScreen()}
        {gameState === 'session-complete' && renderSessionComplete()}
      </div>
    </StudentLayout>
  );
};

export default Adventure;
