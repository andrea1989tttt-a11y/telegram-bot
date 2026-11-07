const { SECTIONS, TOPICS } = require('./content/topics');
const { getQuestionById } = require('./content/questions');
const {
  getSession,
  resetToMenu,
  startTopic,
  startQuiz,
  endQuiz,
} = require('./session');
const { pickQuizQuestions, pickMoreQuestions, QUIZ_SIZE } = require('./quiz');
const {
  mainMenuKeyboard,
  sectionKeyboard,
  topicKeyboard,
  quizOptionsKeyboard,
  afterAnswerKeyboard,
  quizResultKeyboard,
  exhaustedKeyboard,
  hintMenuKeyboard,
} = require('./keyboards');

const WELCOME =
  'Привет! 🥁 Давай разбираться в музыке и тренировать ритм. Что сегодня позанимаемся?';

const RESTART_HINT =
  'Кажется, бот недавно перезапускался или мы ещё не начали. Давай откроем меню и выберем тему.';

/**
 * @param {import('telegraf').Context} ctx
 */
async function sendWelcome(ctx) {
  const userId = ctx.from.id;
  resetToMenu(userId);
  getSession(userId).shownQuestionIds = [];
  await ctx.reply(WELCOME, mainMenuKeyboard());
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {string} text
 * @param {object} [extra]
 */
async function replyOrEdit(ctx, text, extra) {
  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text, extra);
      return;
    } catch {
      // Если нельзя отредактировать — отправим новое сообщение.
    }
  }
  await ctx.reply(text, extra);
}

/**
 * @param {import('telegraf').Context} ctx
 */
async function goMenu(ctx) {
  const userId = ctx.from.id;
  resetToMenu(userId);
  await replyOrEdit(ctx, WELCOME, mainMenuKeyboard());
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {string} sectionId
 */
async function openSection(ctx, sectionId) {
  const section = SECTIONS[sectionId];
  if (!section) {
    await goMenu(ctx);
    return;
  }

  resetToMenu(ctx.from.id);
  await replyOrEdit(
    ctx,
    `${section.title}\n\nВыбери тему:`,
    sectionKeyboard(sectionId),
  );
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {string} topicId
 */
async function openTopic(ctx, topicId) {
  const topic = TOPICS[topicId];
  if (!topic) {
    await goMenu(ctx);
    return;
  }

  startTopic(ctx.from.id, topicId);
  const text = `📖 ${topic.title}\n\n${topic.text}`;
  await replyOrEdit(ctx, text, topicKeyboard());
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {string[]} questionIds
 * @param {string} [intro]
 */
async function beginQuiz(ctx, questionIds, intro) {
  const userId = ctx.from.id;
  if (!questionIds.length) {
    await replyOrEdit(
      ctx,
      'По этой теме задания пока закончились. Можно повторить тему или вернуться в меню.',
      exhaustedKeyboard(),
    );
    return;
  }

  startQuiz(userId, questionIds);
  if (intro) {
    await replyOrEdit(ctx, intro);
  }
  await sendCurrentQuestion(ctx, { forceNewMessage: Boolean(intro) });
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {{ forceNewMessage?: boolean }} [options]
 */
async function sendCurrentQuestion(ctx, options = {}) {
  const session = getSession(ctx.from.id);
  if (!session.quiz) {
    await goMenu(ctx);
    return;
  }

  const { questionIds, index } = session.quiz;
  const question = getQuestionById(questionIds[index]);
  if (!question) {
    await finishQuiz(ctx);
    return;
  }

  const number = index + 1;
  const total = questionIds.length;
  const text = `Вопрос ${number} из ${total}\n\n${question.text}`;
  const keyboard = quizOptionsKeyboard(question.options, index);

  if (options.forceNewMessage || !ctx.callbackQuery) {
    await ctx.reply(text, keyboard);
  } else {
    await replyOrEdit(ctx, text, keyboard);
  }
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {number} questionIndex
 * @param {number} optionIndex
 */
async function handleAnswer(ctx, questionIndex, optionIndex) {
  const session = getSession(ctx.from.id);
  if (!session.quiz || session.mode !== 'quiz') {
    await replyOrEdit(ctx, RESTART_HINT, hintMenuKeyboard());
    return;
  }

  if (questionIndex !== session.quiz.index) {
    await ctx.answerCbQuery('Этот вопрос уже пройден');
    return;
  }

  const questionId = session.quiz.questionIds[questionIndex];
  const question = getQuestionById(questionId);
  if (!question) {
    await finishQuiz(ctx);
    return;
  }

  if (optionIndex < 0 || optionIndex >= question.options.length) {
    await ctx.answerCbQuery('Неизвестный вариант');
    return;
  }

  const isCorrect = optionIndex === question.correctIndex;
  if (isCorrect) {
    session.quiz.correct += 1;
  }

  const mark = isCorrect ? '✅ Верно!' : '❌ Пока мимо.';
  const explanation = isCorrect ? question.explainCorrect : question.explainWrong;
  const isLast = questionIndex >= session.quiz.questionIds.length - 1;

  const text = `${mark}\n\n${explanation}`;

  if (isLast) {
    await replyOrEdit(ctx, text);
    await finishQuiz(ctx, { afterMessage: true });
  } else {
    await replyOrEdit(ctx, `${text}\n\nНажми «Дальше», когда будешь готов.`, afterAnswerKeyboard());
  }
}

/**
 * @param {import('telegraf').Context} ctx
 */
async function handleNext(ctx) {
  const session = getSession(ctx.from.id);
  if (!session.quiz) {
    await replyOrEdit(ctx, RESTART_HINT, hintMenuKeyboard());
    return;
  }

  session.quiz.index += 1;
  if (session.quiz.index >= session.quiz.questionIds.length) {
    await finishQuiz(ctx);
    return;
  }

  await sendCurrentQuestion(ctx);
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {{ afterMessage?: boolean }} [options]
 */
async function finishQuiz(ctx, options = {}) {
  const session = getSession(ctx.from.id);
  if (!session.quiz) {
    await goMenu(ctx);
    return;
  }

  const { correct, questionIds } = session.quiz;
  const total = questionIds.length || QUIZ_SIZE;
  endQuiz(ctx.from.id);

  const text = [
    '🏁 Тренировка закончена.',
    '',
    `Результат: ${correct} из ${total}.`,
    '',
    'Можно повторить тему, взять ещё задания или вернуться в меню.',
  ].join('\n');

  if (options.afterMessage) {
    await ctx.reply(text, quizResultKeyboard());
  } else {
    await replyOrEdit(ctx, text, quizResultKeyboard());
  }
}

/**
 * @param {import('telegraf').Context} ctx
 */
async function startPractice(ctx) {
  const session = getSession(ctx.from.id);
  const topicId = session.topicId;
  if (!topicId || !TOPICS[topicId]) {
    await replyOrEdit(ctx, RESTART_HINT, hintMenuKeyboard());
    return;
  }

  const { questionIds } = pickQuizQuestions(ctx.from.id, topicId, {
    preferUnseen: true,
  });

  if (!questionIds.length) {
    await replyOrEdit(
      ctx,
      'По этой теме задания закончились. Можно повторить уже пройденные вопросы или вернуться в меню.',
      exhaustedKeyboard(),
    );
    return;
  }

  await beginQuiz(
    ctx,
    questionIds,
    `✏️ Тренировка: ${TOPICS[topicId].title}\nОтветь на ${questionIds.length} вопросов.`,
  );
}

/**
 * @param {import('telegraf').Context} ctx
 */
async function repeatTopic(ctx) {
  const session = getSession(ctx.from.id);
  const topicId = session.topicId;
  if (!topicId || !TOPICS[topicId]) {
    await replyOrEdit(ctx, RESTART_HINT, hintMenuKeyboard());
    return;
  }

  // Повтор: можно снова брать любые вопросы темы.
  session.shownQuestionIds = [];
  const { questionIds } = pickQuizQuestions(ctx.from.id, topicId, {
    preferUnseen: true,
  });
  await beginQuiz(
    ctx,
    questionIds,
    `🔁 Повторяем тему: ${TOPICS[topicId].title}`,
  );
}

/**
 * @param {import('telegraf').Context} ctx
 */
async function moreQuestions(ctx) {
  const session = getSession(ctx.from.id);
  const topicId = session.topicId;
  if (!topicId || !TOPICS[topicId]) {
    await replyOrEdit(ctx, RESTART_HINT, hintMenuKeyboard());
    return;
  }

  const { questionIds, exhausted } = pickMoreQuestions(ctx.from.id, topicId);
  if (exhausted || !questionIds.length) {
    await replyOrEdit(
      ctx,
      'Новых заданий по этой теме пока нет. Можно повторить тему или выбрать другую в меню.',
      exhaustedKeyboard(),
    );
    return;
  }

  await beginQuiz(
    ctx,
    questionIds,
    `🧩 Ещё задания по теме «${TOPICS[topicId].title}»`,
  );
}

/**
 * @param {import('telegraf').Context} ctx
 */
async function handleUnexpectedText(ctx) {
  await ctx.reply(
    'Я лучше всего работаю с кнопками. Открой меню и выбери, чем заняться.',
    hintMenuKeyboard(),
  );
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {unknown} error
 */
async function handleError(ctx, error) {
  console.error('Bot error:', error instanceof Error ? error.message : 'unknown');
  try {
    if (ctx?.reply) {
      await ctx.reply(
        'Что-то пошло не так. Давай вернёмся в меню и попробуем ещё раз.',
        hintMenuKeyboard(),
      );
    }
  } catch {
    // Не раскрываем детали и секреты.
  }
}

module.exports = {
  sendWelcome,
  goMenu,
  openSection,
  openTopic,
  handleAnswer,
  handleNext,
  startPractice,
  repeatTopic,
  moreQuestions,
  handleUnexpectedText,
  handleError,
};
