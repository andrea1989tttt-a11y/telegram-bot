require('dotenv').config();

const { Telegraf } = require('telegraf');
const {
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
} = require('./handlers');

const token = process.env.BOT_TOKEN;

if (!token || token === 'вставьте_токен_сюда') {
  console.error(
    'Не задан BOT_TOKEN. Скопируйте .env.example в .env и укажите токен от @BotFather.',
  );
  process.exit(1);
}

const bot = new Telegraf(token);

bot.start(async (ctx) => {
  await sendWelcome(ctx);
});

bot.command('menu', async (ctx) => {
  await goMenu(ctx);
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    [
      'Этот бот помогает повторять нотную грамоту, ритм и музыкальные термины.',
      '',
      'Команды:',
      '/start — приветствие и меню',
      '/menu — открыть меню',
      '/help — эта подсказка',
      '',
      'Дальше удобнее пользоваться кнопками.',
    ].join('\n'),
  );
});

bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery?.data;
  if (!data) {
    await ctx.answerCbQuery();
    return;
  }

  await ctx.answerCbQuery();

  if (data === 'menu') {
    await goMenu(ctx);
    return;
  }

  if (data.startsWith('section:')) {
    await openSection(ctx, data.slice('section:'.length));
    return;
  }

  if (data.startsWith('topic:')) {
    await openTopic(ctx, data.slice('topic:'.length));
    return;
  }

  if (data === 'practice') {
    await startPractice(ctx);
    return;
  }

  if (data === 'next') {
    await handleNext(ctx);
    return;
  }

  if (data === 'repeat_topic') {
    await repeatTopic(ctx);
    return;
  }

  if (data === 'more') {
    await moreQuestions(ctx);
    return;
  }

  if (data.startsWith('answer:')) {
    const parts = data.split(':');
    const questionIndex = Number(parts[1]);
    const optionIndex = Number(parts[2]);
    if (Number.isNaN(questionIndex) || Number.isNaN(optionIndex)) {
      await goMenu(ctx);
      return;
    }
    await handleAnswer(ctx, questionIndex, optionIndex);
    return;
  }

  await goMenu(ctx);
});

bot.on('text', async (ctx) => {
  await handleUnexpectedText(ctx);
});

bot.catch(async (error, ctx) => {
  await handleError(ctx, error);
});

bot
  .launch({ dropPendingUpdates: true })
  .catch((error) => {
    const message = error instanceof Error ? error.message : 'неизвестная ошибка';
    console.error('Не удалось запустить бота:', message);
    process.exit(1);
  });

// У Telegraf Promise от launch() завершается только при остановке,
// поэтому сообщение о старте печатаем сразу после вызова.
bot.telegram
  .getMe()
  .then((me) => {
    console.log(`Музыкальный помощник запущен (@${me.username}). Остановка: Ctrl+C`);
  })
  .catch((error) => {
    const message = error instanceof Error ? error.message : 'неизвестная ошибка';
    console.error('Не удалось проверить бота:', message);
  });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
