const { Markup } = require('telegraf');
const { SECTIONS, TOPICS } = require('./content/topics');

function mainMenuKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback(SECTIONS.lecture.title, 'section:lecture')],
    [Markup.button.callback(SECTIONS.review.title, 'section:review')],
    [Markup.button.callback(SECTIONS.notation.title, 'section:notation')],
    [Markup.button.callback(SECTIONS.rhythm.title, 'section:rhythm')],
    [Markup.button.callback(SECTIONS.terms.title, 'section:terms')],
    [Markup.button.callback(SECTIONS.practice.title, 'section:practice')],
  ]);
}

/**
 * @param {string} sectionId
 */
function sectionKeyboard(sectionId) {
  const section = SECTIONS[sectionId];
  if (!section) {
    return mainMenuKeyboard();
  }

  const rows = section.topics.map((topicId) => {
    const topic = TOPICS[topicId];
    return [Markup.button.callback(topic.title, `topic:${topicId}`)];
  });
  rows.push([Markup.button.callback('⬅️ В меню', 'menu')]);
  return Markup.inlineKeyboard(rows);
}

/**
 * @param {{ practiceLabel?: string }} [options]
 */
function topicKeyboard(options = {}) {
  const practiceLabel = options.practiceLabel || '✏️ Потренироваться';
  return Markup.inlineKeyboard([
    [Markup.button.callback(practiceLabel, 'practice')],
    [Markup.button.callback('⬅️ В меню', 'menu')],
  ]);
}

/**
 * @param {string[]} options
 * @param {number} questionIndex
 */
function quizOptionsKeyboard(options, questionIndex) {
  const rows = options.map((label, optionIndex) => [
    Markup.button.callback(label, `answer:${questionIndex}:${optionIndex}`),
  ]);
  rows.push([Markup.button.callback('⬅️ В меню', 'menu')]);
  return Markup.inlineKeyboard(rows);
}

function afterAnswerKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('➡️ Дальше', 'next')],
    [Markup.button.callback('⬅️ В меню', 'menu')],
  ]);
}

function quizResultKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔁 Повторить тему', 'repeat_topic')],
    [Markup.button.callback('🧩 Ещё задания', 'more')],
    [Markup.button.callback('⬅️ В меню', 'menu')],
  ]);
}

function exhaustedKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔁 Повторить тему', 'repeat_topic')],
    [Markup.button.callback('⬅️ В меню', 'menu')],
  ]);
}

function hintMenuKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📋 Открыть меню', 'menu')],
  ]);
}

module.exports = {
  mainMenuKeyboard,
  sectionKeyboard,
  topicKeyboard,
  quizOptionsKeyboard,
  afterAnswerKeyboard,
  quizResultKeyboard,
  exhaustedKeyboard,
  hintMenuKeyboard,
};
