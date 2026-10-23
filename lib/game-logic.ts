export type Subject = 'Matemáticas' | 'Física' | 'Lenguaje';
export type SubjectSelection = Subject | 'Todos';

export type Difficulty = 'Fácil' | 'Difícil' | 'God Mode';
export type QuestionType = 'concepto' | 'ejercicio';

export interface Question {
  id: string;
  subject: Subject;
  difficulty: Difficulty;
  type: QuestionType;
  topic: string;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number; // 0 = A, 1 = B, 2 = C, 3 = D
  explanation: string;
  formulaOrHint?: string;
  diagramType?:
    | 'positive-angles'
    | 'mrua-graphs'
    | 'v-t-minimoto'
    | 'v-t-8s'
    | 'pulley-ab'
    | 'incline-30'
    | 'incline-37'
    | 'venn-abc-1'
    | 'venn-abc-2'
    | 'func-graph-1'
    | 'discontinuity-graph'
    | 'histogram-ages';
  isCustom?: boolean;
}

export interface AnswerRecord {
  questionId: string;
  subject: Subject;
  difficulty: Difficulty;
  type: QuestionType;
  selectedIndex: number | null; // null if timed out
  correctIndex: number;
  isCorrect: boolean;
  timeSpent: number;
  pointsEarned: number;
}

export type OutcomeTier = 'PERDIO' | 'GANO' | 'ESTUDIANTE_ESTRELLA';

export interface GameEvaluation {
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  timeoutCount: number;
  totalPoints: number;
  percentage: number;
  won: boolean;
  isStarStudent: boolean;
  tier: OutcomeTier;
  title: string;
  subtitle: string;
  badgeText: string;
  bySubject: Record<Subject, { total: number; correct: number; percentage: number }>;
  byType: Record<QuestionType, { total: number; correct: number; avgTime: number }>;
}

export const QUESTIONS_PER_ROUND = 40;
export const CONCEPT_TIME_SECONDS = 30;
export const EXERCISE_TIME_SECONDS = 180;

/**
 * Returns the exact timer limit in seconds based on question type:
 * - 'concepto' (teoría): 30 seconds
 * - 'ejercicio' (cálculo matemático): 180 seconds
 * In 'God Mode', concept and exercise timers still respect the 30s / 180s rule.
 */
export function getTimeLimitForQuestion(question: Pick<Question, 'type'>): number {
  return question.type === 'ejercicio' ? EXERCISE_TIME_SECONDS : CONCEPT_TIME_SECONDS;
}

/**
 * Deterministic-friendly Fisher-Yates shuffle
 */
export function shuffleArray<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

/**
 * Shuffles the 4 options of a question while updating `correctIndex` accurately
 * so that players cannot memorize option letter positions across games.
 */
export function shuffleQuestionOptions(question: Question, rng: () => number = Math.random): Question {
  const indexed = question.options.map((opt, idx) => ({
    opt,
    isCorrect: idx === question.correctIndex,
  }));
  const shuffled = shuffleArray(indexed, rng);
  const newCorrectIndex = shuffled.findIndex((item) => item.isCorrect);
  return {
    ...question,
    options: [
      shuffled[0].opt,
      shuffled[1].opt,
      shuffled[2].opt,
      shuffled[3].opt,
    ],
    correctIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0,
  };
}

/**
 * Selects and shuffles 40 questions for a game round according to Subject and Difficulty.
 * Prioritizes exact subject + exact difficulty matches first. If the filtered pool has
 * fewer than `targetCount` (40) questions, it supplements from adjacent difficulties
 * within the same subject selection so a full 40-question round is always guaranteed.
 */
export function selectRoundQuestions(
  allQuestions: readonly Question[],
  subject: SubjectSelection,
  difficulty: Difficulty,
  targetCount: number = QUESTIONS_PER_ROUND,
  rng: () => number = Math.random
): Question[] {
  const subjectPool =
    subject === 'Todos'
      ? [...allQuestions]
      : allQuestions.filter((q) => q.subject === subject);

  if (subjectPool.length === 0) {
    return [];
  }

  const exactDifficulty = shuffleArray(
    subjectPool.filter((q) => q.difficulty === difficulty),
    rng
  );

  let selected: Question[] = [...exactDifficulty];

  if (selected.length < targetCount) {
    // Fallback order based on chosen difficulty
    const fallbackOrder: Difficulty[] =
      difficulty === 'God Mode'
        ? ['Difícil', 'Fácil']
        : difficulty === 'Difícil'
        ? ['God Mode', 'Fácil']
        : ['Difícil', 'God Mode'];

    for (const fbDiff of fallbackOrder) {
      if (selected.length >= targetCount) break;
      const remainingNeeded = targetCount - selected.length;
      const fbPool = shuffleArray(
        subjectPool.filter((q) => q.difficulty === fbDiff),
        rng
      );
      selected.push(...fbPool.slice(0, remainingNeeded));
    }
  }

  // If total questions in subjectPool is still < targetCount (e.g. user deleted many custom questions),
  // cycle shuffled copies with unique round IDs to guarantee 40 questions
  while (selected.length < targetCount && subjectPool.length > 0) {
    const extraBatch = shuffleArray(subjectPool, rng);
    for (const q of extraBatch) {
      if (selected.length >= targetCount) break;
      selected.push({
        ...q,
        id: `${q.id}-rep-${selected.length + 1}`,
      });
    }
  }

  const finalRound = shuffleArray(selected.slice(0, targetCount), rng).map((q) =>
    shuffleQuestionOptions(q, rng)
  );

  return finalRound;
}

/**
 * Evaluates a single answer and returns the AnswerRecord.
 * Each correct answer awards 1 point; incorrect or timed-out answers award 0 points.
 */
export function evaluateAnswer(
  question: Question,
  selectedIndex: number | null,
  timeSpent: number
): AnswerRecord {
  const isCorrect = selectedIndex !== null && selectedIndex === question.correctIndex;
  const maxTime = getTimeLimitForQuestion(question);
  const clampedTime = Math.max(0, Math.min(maxTime, Math.round(timeSpent)));

  return {
    questionId: question.id,
    subject: question.subject,
    difficulty: question.difficulty,
    type: question.type,
    selectedIndex,
    correctIndex: question.correctIndex,
    isCorrect,
    timeSpent: clampedTime,
    pointsEarned: isCorrect ? 1 : 0,
  };
}

/**
 * Evaluates the final game score across all 40 questions:
 * - < 70%: Perdió el juego
 * - >= 70%: Ganó el juego
 * - > 90%: Ganó el juego + Mención Especial por ser un Estudiante Estrella
 */
export function evaluateGameSession(
  records: readonly AnswerRecord[],
  totalRoundQuestions: number = QUESTIONS_PER_ROUND
): GameEvaluation {
  const denom = Math.max(1, totalRoundQuestions);
  const totalPoints = records.reduce((acc, r) => acc + r.pointsEarned, 0);
  const correctCount = records.filter((r) => r.isCorrect).length;
  const timeoutCount = records.filter((r) => r.selectedIndex === null).length;
  const incorrectCount = records.length - correctCount - timeoutCount;

  const rawPercentage = (totalPoints / denom) * 100;
  const percentage = Math.round(rawPercentage * 10) / 10;

  const won = percentage >= 70;
  const isStarStudent = percentage > 90;

  let tier: OutcomeTier = 'PERDIO';
  let title = 'Partida No Superada';
  let subtitle =
    'Obtuviste menos del 70% requerido. ¡Revisa las explicaciones de cada pregunta e inténtalo de nuevo!';
  let badgeText = 'MENOS DEL 70% · NO APROBADO';

  if (isStarStudent) {
    tier = 'ESTUDIANTE_ESTRELLA';
    title = '¡Felicidades! Ganaste el Juego';
    subtitle =
      'Superaste el 90% de aciertos en el desafío académico. Recibes la Mención Especial de Estudiante Estrella.';
    badgeText = 'MENCIÓN ESPECIAL · ESTUDIANTE ESTRELLA';
  } else if (won) {
    tier = 'GANO';
    title = '¡Ganaste el Juego!';
    subtitle =
      'Alcanzaste el 70% o más de respuestas correctas. ¡Excelente dominio del bloque de conocimiento!';
    badgeText = 'APROBADO · GANADOR DEL DESAFÍO';
  }

  const subjects: Subject[] = ['Matemáticas', 'Física', 'Lenguaje'];
  const bySubject = {} as Record<Subject, { total: number; correct: number; percentage: number }>;
  for (const s of subjects) {
    const subRecords = records.filter((r) => r.subject === s);
    const subCorrect = subRecords.filter((r) => r.isCorrect).length;
    bySubject[s] = {
      total: subRecords.length,
      correct: subCorrect,
      percentage:
        subRecords.length > 0 ? Math.round((subCorrect / subRecords.length) * 100) : 0,
    };
  }

  const types: QuestionType[] = ['concepto', 'ejercicio'];
  const byType = {} as Record<QuestionType, { total: number; correct: number; avgTime: number }>;
  for (const t of types) {
    const typeRecords = records.filter((r) => r.type === t);
    const typeCorrect = typeRecords.filter((r) => r.isCorrect).length;
    const totalTime = typeRecords.reduce((acc, r) => acc + r.timeSpent, 0);
    byType[t] = {
      total: typeRecords.length,
      correct: typeCorrect,
      avgTime: typeRecords.length > 0 ? Math.round(totalTime / typeRecords.length) : 0,
    };
  }

  return {
    totalQuestions: denom,
    correctCount,
    incorrectCount,
    timeoutCount,
    totalPoints,
    percentage,
    won,
    isStarStudent,
    tier,
    title,
    subtitle,
    badgeText,
    bySubject,
    byType,
  };
}

/**
 * 50:50 Lifeline: returns two incorrect option indices to eliminate.
 */
export function computeFiftyFiftyEliminated(
  correctIndex: number,
  rng: () => number = Math.random
): [number, number] {
  const wrongIndices = [0, 1, 2, 3].filter((i) => i !== correctIndex);
  const shuffledWrong = shuffleArray(wrongIndices, rng);
  return [shuffledWrong[0], shuffledWrong[1]];
}

/**
 * Audience Poll Lifeline: returns 4 percentages summing to 100%, weighted toward `correctIndex`
 * based on difficulty.
 */
export function computeAudiencePoll(
  correctIndex: number,
  difficulty: Difficulty,
  eliminatedIndices: readonly number[] = [],
  rng: () => number = Math.random
): [number, number, number, number] {
  const result: [number, number, number, number] = [0, 0, 0, 0];
  const activeIndices = [0, 1, 2, 3].filter((i) => !eliminatedIndices.includes(i));

  const baseCorrectShare =
    difficulty === 'Fácil' ? 72 : difficulty === 'Difícil' ? 56 : 44;
  const jitter = Math.floor((rng() - 0.5) * 12);
  const correctShare = Math.min(88, Math.max(38, baseCorrectShare + jitter));

  result[correctIndex] = correctShare;
  let remaining = 100 - correctShare;

  const otherActive = activeIndices.filter((i) => i !== correctIndex);
  otherActive.forEach((idx, pos) => {
    if (pos === otherActive.length - 1) {
      result[idx] = remaining;
    } else {
      const slice = Math.floor(remaining * (0.3 + rng() * 0.4));
      result[idx] = slice;
      remaining -= slice;
    }
  });

  return result;
}

/**
 * Prize / Milestone ladder for the 40-question Millionaire experience
 */
export function getMillionaireMilestoneValue(questionNumber: number): string {
  const points = questionNumber * 25000;
  return `$${points.toLocaleString('en-US')}`;
}
