/**
 * Проверка учебного контента без запуска Telegram.
 * Запуск: npm run check
 */

const { TOPICS, SECTIONS } = require('../src/content/topics');
const {
  QUESTIONS,
  MIXED_QUESTION_IDS,
  getQuestionsByTopic,
} = require('../src/content/questions');

let errors = 0;

function fail(message) {
  console.error(`✗ ${message}`);
  errors += 1;
}

function ok(message) {
  console.log(`✓ ${message}`);
}

const topicIds = Object.keys(TOPICS);
for (const section of Object.values(SECTIONS)) {
  for (const topicId of section.topics) {
    if (!TOPICS[topicId]) {
      fail(`Секция ${section.id} ссылается на неизвестную тему ${topicId}`);
    }
  }
}

const ids = new Set();
for (const q of QUESTIONS) {
  if (!q.id) fail('Вопрос без id');
  if (ids.has(q.id)) fail(`Дубликат id вопроса: ${q.id}`);
  ids.add(q.id);

  if (!TOPICS[q.topicId]) fail(`Вопрос ${q.id}: неизвестная тема ${q.topicId}`);
  if (!q.text || !q.text.trim()) fail(`Вопрос ${q.id}: пустой текст`);
  if (!Array.isArray(q.options) || q.options.length < 2) {
    fail(`Вопрос ${q.id}: нужно минимум 2 варианта`);
  }
  if (
    typeof q.correctIndex !== 'number' ||
    q.correctIndex < 0 ||
    q.correctIndex >= q.options.length
  ) {
    fail(`Вопрос ${q.id}: некорректный correctIndex`);
  }
  if (!q.explainCorrect || !q.explainWrong) {
    fail(`Вопрос ${q.id}: нет объяснений`);
  }
}

for (const id of MIXED_QUESTION_IDS) {
  if (!ids.has(id)) fail(`mixed ссылается на неизвестный вопрос ${id}`);
}

for (const topicId of topicIds) {
  const topic = TOPICS[topicId];
  if (topic.practiceTopicId) {
    const linked = getQuestionsByTopic(topic.practiceTopicId);
    if (linked.length < 5) {
      fail(
        `Лекция ${topicId}: связанная тема ${topic.practiceTopicId} имеет мало вопросов (${linked.length})`,
      );
    } else {
      ok(`Лекция ${topicId} → практика «${topic.practiceTopicId}»: ${linked.length} вопросов`);
    }
    continue;
  }

  const list = getQuestionsByTopic(topicId);
  if (list.length < 5) {
    fail(`Тема ${topicId}: меньше 5 вопросов (${list.length})`);
  } else {
    ok(`Тема ${topicId}: ${list.length} вопросов`);
  }
}

ok(`Всего вопросов в банке: ${QUESTIONS.length}`);
ok(`Тем: ${topicIds.length}`);

if (errors > 0) {
  console.error(`\nПроверка не пройдена: ошибок ${errors}`);
  process.exit(1);
}

console.log('\nПроверка контента пройдена.');
