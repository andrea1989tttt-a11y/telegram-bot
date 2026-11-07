/**
 * Диалоги пользователей хранятся в памяти процесса.
 * После перезапуска бота состояние сбрасывается.
 */

/** @typedef {{
 *   mode: 'menu' | 'topic' | 'quiz',
 *   topicId: string | null,
 *   shownQuestionIds: string[],
 *   quiz: null | {
 *     questionIds: string[],
 *     index: number,
 *     correct: number,
 *   }
 * }} UserSession */

/** @type {Map<number, UserSession>} */
const sessions = new Map();

/** @returns {UserSession} */
function createEmptySession() {
  return {
    mode: 'menu',
    topicId: null,
    shownQuestionIds: [],
    quiz: null,
  };
}

/**
 * @param {number} userId
 * @returns {UserSession}
 */
function getSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, createEmptySession());
  }
  return /** @type {UserSession} */ (sessions.get(userId));
}

/**
 * @param {number} userId
 */
function resetToMenu(userId) {
  const session = getSession(userId);
  session.mode = 'menu';
  session.topicId = null;
  session.quiz = null;
  // shownQuestionIds сохраняем по желанию внутри темы; при уходе в меню
  // оставляем историю показанного, чтобы «Ещё задания» работала между заходами
  // в ту же тему до перезапуска. При смене темы очищаем в startTopic.
}

/**
 * @param {number} userId
 * @param {string} topicId
 */
function startTopic(userId, topicId) {
  const session = getSession(userId);
  if (session.topicId !== topicId) {
    session.shownQuestionIds = [];
  }
  session.mode = 'topic';
  session.topicId = topicId;
  session.quiz = null;
}

/**
 * @param {number} userId
 * @param {string[]} questionIds
 */
function startQuiz(userId, questionIds) {
  const session = getSession(userId);
  session.mode = 'quiz';
  session.quiz = {
    questionIds,
    index: 0,
    correct: 0,
  };
  for (const id of questionIds) {
    if (!session.shownQuestionIds.includes(id)) {
      session.shownQuestionIds.push(id);
    }
  }
}

/**
 * @param {number} userId
 */
function endQuiz(userId) {
  const session = getSession(userId);
  session.quiz = null;
  session.mode = session.topicId ? 'topic' : 'menu';
}

module.exports = {
  getSession,
  resetToMenu,
  startTopic,
  startQuiz,
  endQuiz,
};
