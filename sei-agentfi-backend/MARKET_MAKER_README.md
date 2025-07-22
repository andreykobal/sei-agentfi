# Market Maker Bot Service

## Обзор

Market Maker Bot - это автоматизированный торговый бот для создания ликвидности и объема торгов токенов на платформе Sei AgentFi. Бот использует стратегию микро-покупок и продаж для поддержания активности торгов и плавного роста цены токена.

## 🔍 Источники данных о балансах

Бот использует **реальные балансы из блокчейна** через `WalletService`:

### Получение балансов:

- **При создании бота**: Получает текущие USDT и токены из кошелька пользователя
- **При каждой торговой сессии**: Загружает актуальные балансы перед принятием решения
- **После каждой сделки**: Обновляет балансы из блокчейна после успешной транзакции
- **При запросе статуса**: Показывает реальные балансы, обновляя данные в базе

### Синхронизация с блокчейном:

```typescript
// Получение балансов через WalletService
const realBalances = await WalletService.getUsdtAndTokenBalances(
  userWalletAddress,
  tokenAddress
);

// Обновление данных в базе после получения реальных балансов
await MarketMakerModel.updateBot(botId, {
  currentUsdtBalance: realBalances.usdtBalance,
  currentTokenBalance: realBalances.tokenBalance,
});
```

## 🧠 Анализ эффективности и обучение

Бот анализирует влияние каждой своей сделки на цену токена и корректирует стратегию для достижения целевого роста:

### 📊 Анализ влияния на цену:

- **После каждой покупки**: Проверяет, выросла ли цена (ожидаемое поведение)
- **После каждой продажи**: Проверяет влияние на цену (должно быть минимальным)
- **Расчет эффективности**: Сравнивает фактическое изменение цены с ожидаемым
- **Рекомендации**: Генерирует предложения по корректировке стратегии

### 🎯 Отслеживание прогресса:

- **Общий рост**: Измеряет рост цены с момента старта бота
- **Почасовой темп**: Вычисляет фактический темп роста vs целевой
- **Целевая цена**: Рассчитывает ожидаемую цену на текущий момент
- **Статус выполнения**: Определяет, находится ли бот в рамках целевых показателей (±20%)

### ⚡ Автоматическая корректировка:

#### Корректировка роста (Growth Bias):

- **Слабый эффект покупок**: Увеличивает bias покупок до 10%
- **Сильный эффект покупок**: Уменьшает bias до 0.5% (избегание подозрений)
- **Неожиданное направление цены**: Усиливает bias для коррекции

#### Корректировка частоты торгов:

- **Медленный рост** (< 80% от цели): Ускоряет торги (минимум 20-40 сек)
- **Быстрый рост** (> 120% от цели): Замедляет торги (максимум 60-120 сек)

### 🔄 Примеры работы анализа:

```typescript
// Покупка за $10 → цена выросла на 0.05%
📊 [PRICE ANALYSIS] Action: buy
📊 [PRICE ANALYSIS] Price change: +0.0500%
📊 [PRICE ANALYSIS] Expected direction: ✅
📊 [PRICE ANALYSIS] Recommendation: continue

// Рост отстает от цели 1%/час
🎯 [GROWTH ANALYSIS] Hourly rate: 0.7%/h (target: 1.0%/h)
🎯 [GROWTH ANALYSIS] On target: ❌
⚡ [STRATEGY ADJUST] Increasing trade frequency: 35-65s
⚡ [STRATEGY ADJUST] Increasing growth bias to 0.025
```

## ⏳ Обработка задержек индексации

Поскольку события блокчейна индексируются не мгновенно, бот использует умный механизм ожидания обновления цены:

### 🔄 Процесс обновления цены:

1. **Выполнение сделки**: BuyTokensCommand/SellTokensCommand завершается
2. **Транзакция в блокчейне**: Смарт-контракт эмитирует событие
3. **Индексация**: Ponder обрабатывает событие (может занять несколько секунд)
4. **Обновление базы**: TokenProjection обновляет цену в MongoDB
5. **Получение новой цены**: Бот видит актуальную цену

### ⏰ Таймаут ожидания (30 секунд):

- **Проверка каждые 500мс**: Запрашивает цену из базы данных
- **Обнаружение изменения**: Сравнивает с ценой до сделки
- **Успешное обновление**: Возвращает новую цену
- **Таймаут**: Использует старую цену если обновление не произошло

### 📊 Логирование процесса:

```typescript
⏳ [PRICE WAIT] Waiting for price update from 0.1000 USDT...
✅ [PRICE WAIT] Price updated to 0.1005 USDT after 1247ms

// Или в случае таймаута:
⏰ [PRICE WAIT] Timeout reached (30000ms), using current price 0.1000 USDT
```

### 🛡️ Защита от сбоев:

- **Таймаут**: Не блокирует бота если индексация медленная
- **Повторные попытки**: Продолжает проверки при ошибках
- **Fallback**: Использует старую цену при проблемах

## Основные функции

### 1. Создание бота

```http
POST /market-maker/create
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "tokenAddress": "0x...",
  "targetGrowthPerHour": 1,
  "budget": "1000"
}
```

### 2. Запустить бота

```http
POST /market-maker/start
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "tokenAddress": "0x..."
}
```

### 3. Остановить бота

```http
POST /market-maker/stop
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "tokenAddress": "0x..."
}
```

### 4. Получить статус бота

```http
GET /market-maker/status/:tokenAddress
Authorization: Bearer <jwt_token>
```

### 5. Получить всех ботов пользователя

```http
GET /market-maker/bots
Authorization: Bearer <jwt_token>
```

### 6. Получить логи торговли

```http
GET /market-maker/logs/:tokenAddress?limit=100
Authorization: Bearer <jwt_token>
```

### 7. Удалить бота

```http
DELETE /market-maker/:tokenAddress
Authorization: Bearer <jwt_token>
```

## 🗄️ Структура базы данных

### MarketMakerBot Collection

```javascript
{
  userEmail: String,
  tokenAddress: String,
  targetGrowthPerHour: Number,
  budget: String, // wei
  isActive: Boolean,
  currentUsdtBalance: String, // wei
  currentTokenBalance: String, // wei
  minTradePercentage: Number,
  maxTradePercentage: Number,
  minPauseBetweenTrades: Number,
  maxPauseBetweenTrades: Number,
  growthBuyBias: Number,
  totalTrades: Number,
  totalBuyVolume: String, // wei
  totalSellVolume: String, // wei
  lastTradeAt: Date,
  nextTradeAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### MarketMakerLog Collection

```javascript
{
  botId: String,
  userEmail: String,
  tokenAddress: String,
  action: String, // "buy", "sell", "pause", "error", "start", "stop"
  amount: String, // wei
  priceBefore: String, // wei
  priceAfter: String, // wei
  transactionHash: String,
  usdtBalanceAfter: String, // wei
  tokenBalanceAfter: String, // wei
  success: Boolean,
  errorMessage: String,
  timestamp: Date,
  nextTradeScheduledAt: Date,
  metadata: Object
}
```

## 📊 Пример использования

```javascript
// 1. Создать бота для токена с бюджетом $1000 и ростом 1% в час
// Все остальные параметры рассчитываются автоматически!
const createResponse = await fetch("/market-maker/create", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + token,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    tokenAddress: "0x1234...",
    targetGrowthPerHour: 1, // 1% рост в час
    budget: "1000", // $1000 бюджет
  }),
});

// 2. Запустить бота
await fetch("/market-maker/start", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + token,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    tokenAddress: "0x1234...",
  }),
});

// 3. Проверить статус
const status = await fetch("/market-maker/status/0x1234...", {
  headers: { Authorization: "Bearer " + token },
});
```

## 🔒 Безопасность

### Ограничения:

- ✅ Бот не превышает заданный бюджет
- ✅ Предотвращает полный дисбаланс средств
- ✅ Аутентификация через JWT токены
- ✅ Валидация всех входных параметров
- ✅ Логирование всех операций
- ✅ Автоматическое восстановление при перезапуске сервера

### Максимальные лимиты:

- Бюджет: до 100,000 USDT
- Рост за час: до 100%
- Размер сделки: автоматически 1-3% от бюджета
- Пауза между сделками: автоматически 40-80 секунд (в среднем ~1 минута)

## 🛠️ Архитектура

### Компоненты:

1. **MarketMakerService** - основная логика ботов
2. **MarketMakerModel** - работа с базой данных
3. **MarketMakerAPI** - REST API endpoints
4. **BuyTokensCommand** - выполнение покупок
5. **SellTokensCommand** - выполнение продаж
6. **TokenProjection** - получение цен токенов

### Автоматическое восстановление:

- При перезапуске сервера все активные боты автоматически восстанавливаются
- Состояние ботов сохраняется в базе данных
- Таймеры пересоздаются для продолжения торговли

## 🎯 Стратегия торговли

### Принятие решений:

1. **Избыток USDT (>80%)** → предпочтение покупкам
2. **Избыток токенов (<20% USDT)** → предпочтение продажам
3. **Баланс (20-80%)** → случайное чередование с уклоном в покупки (55%)

### Размеры сделок:

- Автоматически случайные между 1-3% от бюджета
- Покупки увеличены на автоматически рассчитанный bias для роста цены:
  - Консервативный рост (0-2%): +2% bias
  - Умеренный рост (2-5%): +3% bias
  - Агрессивный рост (>5%): +5% bias
- Продажи остаются базового размера

### Паузы:

- Автоматические случайные интервалы 40-80 секунд (в среднем ~1 минута)
- Адаптивные паузы в зависимости от целевого роста:
  - Консервативный рост (0-2%): 40-80 секунд
  - Умеренный рост (2-5%): 35-70 секунд
  - Агрессивный рост (>5%): 30-60 секунд
- Более длинные паузы при ошибках (30-60 секунд)

## 📈 Мониторинг

Все действия ботов логируются с подробной информацией:

- Время и тип операции
- Цена до и после сделки
- Хэш транзакции
- Балансы после операции
- Ошибки и их причины
- Время следующей запланированной сделки

Это позволяет полностью отслеживать работу ботов и анализировать их эффективность.

## 🎉 Упрощенный интерфейс готов к использованию!

Бот автоматически:

- 📈 Будет делать ~60 сделок в час (примерно каждую минуту) по $10-30 каждая
- 🎯 Обеспечит заданный рост цены через микросдвиги
- 📊 Создаст естественную торговую активность
- 🔄 Восстановится после перезапуска сервера
- 📝 Будет логировать каждое действие
- ⚡ **Простота использования**: всего 3 параметра вместо 8!

Теперь создание market maker бота стало максимально простым - указываете только токен, желаемый рост и бюджет, все остальное рассчитывается автоматически для оптимальной торговли примерно раз в минуту.
