const { getQuestionsByTopic } = require('./content/questions');
const { getSession } = require('./session');

const QUIZ_SIZE = 5;

/**
 * Перемешивает массив (копию).
 * @template T
 * @param {T[]} list
 * @returns {T[]}
 */
function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Подбирает до 5 вопросов без повторов внутри одной тренировки.
 * При preferUnseen=true берёт только ещё не показанные.
 *
 * @param {number} userId
 * @param {string} topicId
 * @param {{ preferUnseen?: boolean }} [options]
 * @returns {{ questionIds: string[], exhausted: boolean }}
 */
function pickQuizQuestions(userId, topicId, options = {}) {
  const preferUnseen = options.preferUnseen !== false;
  const session = getSession(userId);
  const pool = getQuestionsByTopic(topicId);
  const allIds = pool.map((q) => q.id);

  if (allIds.length === 0) {
    return { questionIds: [], exhausted: true };
  }

  const shown = new Set(session.shownQuestionIds);
  const unseen = shuffle(allIds.filter((id) => !shown.has(id)));

  if (preferUnseen) {
    if (unseen.length === 0) {
      return { questionIds: [], exhausted: true };
    }
    return {
      questionIds: unseen.slice(0, Math.min(QUIZ_SIZE, unseen.length)),
      exhausted: false,
    };
  }

  return {
    questionIds: shuffle(allIds).slice(0, Math.min(QUIZ_SIZE, allIds.length)),
    exhausted: false,
  };
}

/**
 * Старт «Ещё задания»: только из ещё не показанных.
 * @param {number} userId
 * @param {string} topicId
 */
function pickMoreQuestions(userId, topicId) {
  const session = getSession(userId);
  const pool = getQuestionsByTopic(topicId);
  const shown = new Set(session.shownQuestionIds);
  const unseen = shuffle(pool.map((q) => q.id).filter((id) => !shown.has(id)));

  if (unseen.length === 0) {
    return { questionIds: [], exhausted: true };
  }

  return {
    questionIds: unseen.slice(0, Math.min(QUIZ_SIZE, unseen.length)),
    exhausted: false,
  };
}

module.exports = {
  QUIZ_SIZE,
  shuffle,
  pickQuizQuestions,
  pickMoreQuestions,
};
