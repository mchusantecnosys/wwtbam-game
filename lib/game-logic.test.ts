import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONCEPT_TIME_SECONDS,
  EXERCISE_TIME_SECONDS,
  QUESTIONS_PER_ROUND,
  getTimeLimitForQuestion,
  selectRoundQuestions,
  evaluateAnswer,
  evaluateGameSession,
  computeFiftyFiftyEliminated,
  computeAudiencePoll,
} from './game-logic';
import { DEFAULT_QUESTIONS_DB } from './questions-db';

test('getTimeLimitForQuestion assigns 30s to concepto and 180s to ejercicio', () => {
  assert.equal(getTimeLimitForQuestion({ type: 'concepto' }), 30);
  assert.equal(getTimeLimitForQuestion({ type: 'concepto' }), CONCEPT_TIME_SECONDS);
  assert.equal(getTimeLimitForQuestion({ type: 'ejercicio' }), 180);
  assert.equal(getTimeLimitForQuestion({ type: 'ejercicio' }), EXERCISE_TIME_SECONDS);
});

test('selectRoundQuestions always returns 40 randomized questions for any subject and difficulty', () => {
  const subjects = ['Matemáticas', 'Física', 'Lenguaje', 'Todos'] as const;
  const difficulties = ['Fácil', 'Difícil', 'God Mode'] as const;

  for (const subject of subjects) {
    for (const difficulty of difficulties) {
      const round = selectRoundQuestions(DEFAULT_QUESTIONS_DB, subject, difficulty);
      assert.equal(
        round.length,
        QUESTIONS_PER_ROUND,
        `Expected 40 questions for ${subject} / ${difficulty}`
      );
      if (subject !== 'Todos') {
        assert.ok(
          round.every((q) => q.subject === subject),
          `All questions must match subject ${subject}`
        );
      }
      // Verify options and correctIndex integrity after option shuffling
      for (const q of round) {
        assert.equal(q.options.length, 4);
        assert.ok(q.correctIndex >= 0 && q.correctIndex <= 3);
      }
    }
  }
});

test('evaluateAnswer awards 1 point for correct answer and 0 for wrong or timeout', () => {
  const sampleQuestion = DEFAULT_QUESTIONS_DB[0];
  const right = evaluateAnswer(sampleQuestion, sampleQuestion.correctIndex, 12);
  assert.equal(right.isCorrect, true);
  assert.equal(right.pointsEarned, 1);

  const wrongIdx = (sampleQuestion.correctIndex + 1) % 4;
  const wrong = evaluateAnswer(sampleQuestion, wrongIdx, 18);
  assert.equal(wrong.isCorrect, false);
  assert.equal(wrong.pointsEarned, 0);

  const timeout = evaluateAnswer(sampleQuestion, null, 30);
  assert.equal(timeout.isCorrect, false);
  assert.equal(timeout.pointsEarned, 0);
});

test('evaluateGameSession classifies <70% as lost, >=70% as won, and >90% as star student', () => {
  const makeRecords = (correctCount: number, total: number = 40) => {
    const q = DEFAULT_QUESTIONS_DB[0];
    return Array.from({ length: total }, (_, idx) =>
      evaluateAnswer(q, idx < correctCount ? q.correctIndex : (q.correctIndex + 1) % 4, 10)
    );
  };

  // 27 / 40 = 67.5% -> Perdió (< 70%)
  const evalLost = evaluateGameSession(makeRecords(27), 40);
  assert.equal(evalLost.percentage, 67.5);
  assert.equal(evalLost.won, false);
  assert.equal(evalLost.isStarStudent, false);
  assert.equal(evalLost.tier, 'PERDIO');

  // 28 / 40 = 70.0% -> Ganó (= o > 70%)
  const evalWon70 = evaluateGameSession(makeRecords(28), 40);
  assert.equal(evalWon70.percentage, 70);
  assert.equal(evalWon70.won, true);
  assert.equal(evalWon70.isStarStudent, false);
  assert.equal(evalWon70.tier, 'GANO');

  // 36 / 40 = 90.0% -> Ganó, pero aún no supera 90%
  const evalWon90 = evaluateGameSession(makeRecords(36), 40);
  assert.equal(evalWon90.percentage, 90);
  assert.equal(evalWon90.won, true);
  assert.equal(evalWon90.isStarStudent, false);

  // 37 / 40 = 92.5% -> Superó 90%: Estudiante Estrella
  const evalStar = evaluateGameSession(makeRecords(37), 40);
  assert.equal(evalStar.percentage, 92.5);
  assert.equal(evalStar.won, true);
  assert.equal(evalStar.isStarStudent, true);
  assert.equal(evalStar.tier, 'ESTUDIANTE_ESTRELLA');
});

test('lifelines compute valid 50:50 eliminations and audience poll summing to 100%', () => {
  for (let correct = 0; correct < 4; correct++) {
    const [e1, e2] = computeFiftyFiftyEliminated(correct);
    assert.notEqual(e1, e2);
    assert.notEqual(e1, correct);
    assert.notEqual(e2, correct);

    const poll = computeAudiencePoll(correct, 'Difícil', [e1, e2]);
    assert.equal(poll[e1], 0);
    assert.equal(poll[e2], 0);
    assert.equal(poll[0] + poll[1] + poll[2] + poll[3], 100);
  }
});
