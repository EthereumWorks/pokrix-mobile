const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Получаем имя пользователя из URL-параметров
const urlParams = new URLSearchParams(window.location.search);
const playerName = urlParams.get('username') || 'Player'; // Используем имя из Telegram или "Player" по умолчанию

// Устанавливаем размеры канваса с учетом уменьшенной области управления
canvas.width = 360;
canvas.height = 640 - 100; // Высота канваса без учета панели управления

const rectHeight = canvas.height;
const leftWidth = (canvas.width / 3) * 2; // Две трети ширины для левой части
const rightWidth = canvas.width / 3; // Одна треть ширины для правой части

// Размеры для левой части (игровое поле)
const gridWidth = leftWidth;
const gridHeight = rectHeight;
const gridX = 0; // Начало отрисовки по оси X
const gridY = 0; // Отрисовка начинается с верха

// Размеры для правой части (информация)
const infoX = leftWidth;
const infoY = 0;
const infoWidth = rightWidth;
const infoHeight = rectHeight;

// Вычисляем размеры клеток для сетки
const cellWidth = gridWidth / 5;  // 5 колонок на всю ширину левой части
const cellHeight = gridHeight / 8;  // 8 рядов на всю высоту левой части

// Определяем масти и номиналы карт
const suits = [
    { name: 'hearts', color: 'red' },
    { name: 'spades', color: 'black' },
    { name: 'diamonds', color: 'blue' },
    { name: 'clubs', color: 'green' }
];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

// Создаем колоду карт
const deck = suits.flatMap(suit => values.map(value => ({ suit, value })));

// Хранение упавших карт, чтобы избежать повторов
let usedCards = [];

// Хранение падающих карт (вместо квадратиков)
let squares = [];

// Переменные для счета
let playerScore = 0;

// Переменная для хранения состояния игры
let isGameOver = false;

// Переменные для контроля времени падения
let fallInterval = 700; // Обычный интервал падения (0.7 секунды)
let fastFallInterval = 100; // Ускоренный интервал падения (0.1 секунда)
let currentInterval = fallInterval; // Текущий интервал падения
let lastFallTime = 0; // Время последнего падения

// Переменная для хранения следующей карты
let nextCard = getRandomCard();

// Переменная для хранения состояния паузы
let isPaused = false;

// Переменные для отображения информации о комбинации
let removedLineInfo = null;

const LINES_PER_LEVEL = 10; // Количество удаленных линий для увеличения уровня
const ACCELERATION_FACTOR = 0.8; // Коэффициент ускорения (уменьшение интервала на 20%)

let currentLevel = 1; // Текущий уровень, начинается с 1
let linesRemoved = 0; // Количество удаленных линий

// Переход от главного меню к игре
document.getElementById('playButton').addEventListener('click', () => {
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'flex';
    startGame();
});

// Функция для начала игры
function startGame() {
    usedCards = [];
    squares = [];
    playerScore = 0;
    isGameOver = false;
    currentLevel = 1;
    linesRemoved = 0;
    nextCard = getRandomCard();
    removedLineInfo = null;
    isPaused = false;
    currentInterval = fallInterval; // Сбрасываем интервал падения на обычный
    squares.push(createNewSquare());
    document.getElementById('playAgainButton').style.display = 'none'; // Скрываем кнопку "Play Again"
    document.getElementById('controls').style.display = 'flex'; // Показываем кнопки управления
    requestAnimationFrame(updateGame);
}

// Функция для получения случайной карты, не используемой на игровом поле
function getRandomCard() {
    const availableCards = deck.filter(card => !usedCards.some(usedCard => usedCard.suit.name === card.suit.name && usedCard.value === card.value));
    if (availableCards.length === 0) {
        return null; // Все карты использованы, игра должна завершиться
    }
    const randomIndex = Math.floor(Math.random() * availableCards.length);
    const card = availableCards[randomIndex];
    usedCards.push(card);
    return card;
}

// Функция для создания новой карты
function createNewSquare() {
    const card = nextCard;
    if (!card) {
        isGameOver = true; // Если не осталось доступных карт, игра завершена
        return null;
    }
    nextCard = getRandomCard(); // Подготовим следующую карту
    return {
        x: gridX + 2 * cellWidth, // центрируем по оси X
        y: gridY, // самая верхняя строка
        card // информация о карте (масть и номинал)
    };
}

// Обработка нажатий на кнопки управления
document.getElementById('leftButton').addEventListener('touchstart', moveLeft);
document.getElementById('rightButton').addEventListener('touchstart', moveRight);

// Обработка зажатия кнопки "вниз"
document.getElementById('downButton').addEventListener('touchstart', () => {
    currentInterval = fastFallInterval; // Устанавливаем ускоренный интервал при зажатии
});

document.getElementById('downButton').addEventListener('touchend', () => {
    currentInterval = fallInterval; // Возвращаем обычный интервал после отпускания
});

function moveLeft() {
    const currentSquare = squares[squares.length - 1];
    if (!isGameOver && !isPaused && currentSquare.x > gridX && !checkCollisionSide(currentSquare, 'left')) {
        currentSquare.x -= cellWidth;
    }
}

function moveRight() {
    const currentSquare = squares[squares.length - 1];
    if (!isGameOver && !isPaused && currentSquare.x < gridX + 4 * cellWidth && !checkCollisionSide(currentSquare, 'right')) {
        currentSquare.x += cellWidth;
    }
}

// Функция для проверки коллизии с другими картами по вертикали
function checkCollision(square) {
    for (let i = 0; i < squares.length - 1; i++) {
        const otherSquare = squares[i];
        if (
            square.x === otherSquare.x &&
            square.y + cellHeight === otherSquare.y
        ) {
            return true;
        }
    }
    return false;
}

// Функция для проверки коллизии с другими картами по бокам
function checkCollisionSide(square, direction) {
    for (let i = 0; i < squares.length - 1; i++) {
        const otherSquare = squares[i];
        if (
            direction === 'left' &&
            square.x - cellWidth === otherSquare.x &&
            square.y === otherSquare.y
        ) {
            return true;
        }
        if (
            direction === 'right' &&
            square.x + cellWidth === otherSquare.x &&
            square.y === otherSquare.y
        ) {
            return true;
        }
    }
    return false;
}

// Функция для вычисления покерной комбинации и начисления очков
function calculateScoreForLine(line) {
    const cardValues = line.map(square => square.card.value);
    const cardSuits = line.map(square => square.card.suit.name);

    // Конвертация номиналов в числовые значения для проверки комбинаций
    const valueMap = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
    const numericValues = cardValues.map(value => valueMap[value]).sort((a, b) => a - b);

    const isFlush = cardSuits.every(suit => suit === cardSuits[0]);
    const isStraight = numericValues.every((value, index) => index === 0 || value === numericValues[index - 1] + 1);

    const valueCounts = numericValues.reduce((acc, value) => {
        acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {});

    const counts = Object.values(valueCounts).sort((a, b) => b - a);

    if (isStraight && isFlush && numericValues[0] === 10) return { name: 'Royal Flush', points: 1000 };
    if (isStraight && isFlush) return { name: 'Straight Flush', points: 500 };
    if (counts[0] === 4) return { name: 'Four of a Kind', points: 250 };
    if (counts[0] === 3 && counts[1] === 2) return { name: 'Full House', points: 150 };
    if (isFlush) return { name: 'Flush', points: 100 };
    if (isStraight) return { name: 'Straight', points: 80 };
    if (counts[0] === 3) return { name: 'Three of a Kind', points: 60 };
    if (counts[0] === 2 && counts[1] === 2) return { name: 'Two Pairs', points: 40 };
    if (counts[0] === 2) return { name: 'One Pair', points: 20 };

    return { name: 'No Combination', points: 0 }; // Нет комбинации
}

// Функция для проверки заполненности линий и их удаления
function checkAndRemoveFullLines() {
    const lines = Array(8).fill(0); // 8 линий по вертикали

    // Считаем количество карт в каждой строке
    squares.forEach(square => {
        const row = (square.y - gridY) / cellHeight;
        lines[row]++;
    });

    let lineRemoved = false;
    let firstLineRemoved = false;
    let secondLineRemoved = false;
    let firstRemovedRow = null;

    // Ищем полные линии и проверяем покерные комбинации
    lines.forEach((count, row) => {
        if (count === 5) { // Если линия заполнена
            const line = squares.filter(square => (square.y - gridY) / cellHeight === row);
            const scoreInfo = calculateScoreForLine(line);

            if (scoreInfo.points > 0) {
                playerScore += scoreInfo.points; // Начисляем очки

                // Увеличиваем счетчик удаленных линий
                linesRemoved++;

                // Удаляем карты из этой линии
                squares = squares.filter(square => (square.y - gridY) / cellHeight !== row);

                // Возвращаем удаленные карты обратно в колоду
                line.forEach(card => {
                    usedCards = usedCards.filter(usedCard => usedCard !== card.card);
                });

                // Запоминаем информацию о первой удаленной линии
                if (!firstLineRemoved) {
                    removedLineInfo = { row, ...scoreInfo };
                    firstRemovedRow = row;
                    firstLineRemoved = true;
                }

                // Если комбинация "Flush" или выше и линия не в самом низу, сжигаем линию ниже
                if (scoreInfo.name === 'Flush' || scoreInfo.name === 'Full House' || scoreInfo.name === 'Four of a Kind' || scoreInfo.name === 'Straight Flush' || scoreInfo.name === 'Royal Flush') {
                    if (row < 7 && lines[row + 1] > 0) { // Проверяем, что линия не в самом низу и ниже есть карты
                        const lineBelow = squares.filter(square => (square.y - gridY) / cellHeight === row + 1);
                        squares = squares.filter(square => (square.y - gridY) / cellHeight !== row + 1);

                        // Возвращаем удаленные карты обратно в колоду
                        lineBelow.forEach(card => {
                            usedCards = usedCards.filter(usedCard => usedCard !== card.card);
                        });

                        secondLineRemoved = true;

                        // Увеличиваем счетчик удаленных линий
                        linesRemoved++;

                        // Сбрасываем счетчик строк для линии ниже, чтобы не удалять дополнительные строки
                        lines[row + 1] = 0;
                    }
                }

                // Пересчитываем текущий уровень
                const newLevel = Math.floor(linesRemoved / LINES_PER_LEVEL) + 1;

                // Если уровень изменился, обновляем интервал падения
                if (newLevel > currentLevel) {
                    currentLevel = newLevel;
                    fallInterval = Math.max(100, fallInterval * ACCELERATION_FACTOR); // Уменьшаем интервал падения, но не меньше 100 мс
                    currentInterval = fallInterval; // Обновляем текущий интервал падения
                }

                // Ставим флаг, что линия была удалена
                lineRemoved = true;
            }
        }
    });

    if (lineRemoved) {
        // Ставим игру на паузу на 1 секунду
        isPaused = true;

        // Отображаем сообщение о комбинации и набранных очках
        drawGame();
        drawRemovedLineInfo();

        setTimeout(() => {
            // Опускаем блоки после удаления первой линии
            if (firstLineRemoved) {
                squares.forEach(square => {
                    if ((square.y - gridY) / cellHeight < firstRemovedRow) {
                        square.y += cellHeight;
                    }
                });
            }

            // Опускаем блоки после удаления второй линии
            if (secondLineRemoved) {
                squares.forEach(square => {
                    if ((square.y - gridY) / cellHeight < firstRemovedRow + 1) {
                        square.y += cellHeight;
                    }
                });
            }

            // Если поле пустое, создаем новую карту
            if (squares.length === 0) {
                squares.push(createNewSquare());
            }

            removedLineInfo = null; // Убираем информацию о комбинации после паузы
            isPaused = false; // Снимаем паузу и продолжаем игру

            requestAnimationFrame(updateGame); // Возобновляем игру после паузы

        }, 1000);
    }

    return lineRemoved;
}

// Функция для проверки условия окончания игры
function checkGameOver() {
    const currentSquare = squares[squares.length - 1];
    if (currentSquare.y === gridY && checkCollision(currentSquare)) {
        isGameOver = true;
        document.getElementById('playAgainButton').style.display = 'block'; // Показываем кнопку "Play Again"
        document.getElementById('controls').style.display = 'none'; // Скрываем кнопки управления

        // Сохранение результатов после окончания игры
        saveGameResult(playerName, playerScore, currentLevel, linesRemoved);
    }
}

// Функция для отображения сообщения "Game Over"
async function drawGameOver() {  // Сделали функцию асинхронной
    ctx.fillStyle = 'darkgray';
    ctx.font = '48px "Honk", system-ui'; // Размер шрифта для надписи "Game Over"
    ctx.textAlign = 'center';

    // Центрируем текст относительно игрового поля
    const centerX = gridX + gridWidth / 2; // Центр по горизонтали относительно игрового поля
    const centerY = gridY + gridHeight / 2 - 80; // Центр по вертикали выше на 80 пикселей

    ctx.fillText('GAME OVER', centerX, centerY);

    // Настройки тени
    ctx.shadowColor = 'black'; // Цвет тени
    ctx.shadowOffsetX = 3; // Смещение тени по оси X
    ctx.shadowOffsetY = 3; // Смещение тени по оси Y
    ctx.shadowBlur = 4; // Размытие тени

    // Добавляем текст "You scored:" под надписью "Game Over" (сдвинул на 20 пикселей вниз)
    ctx.font = '32px "Arial Black", sans-serif'; // Шрифт для выделения текста
    ctx.fillStyle = 'white'; // Белый цвет текста для контраста
    ctx.fillText('You scored:', centerX, centerY + 60); // Смещение вниз на 60 пикселей

    // Отображаем количество очков на новой строке с тенью (сдвинул на 20 пикселей вниз)
    ctx.fillText(`${playerScore} points`, centerX, centerY + 100); // Смещение вниз на 100 пикселей

    if (playerScore > 0) {
        try {
            const response = await fetch('/api/top1000'); // Асинхронный запрос
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const leaderboard = await response.json(); // Парсинг ответа

            // Сортируем результаты по очкам и времени добавления (чем раньше, тем выше)
            leaderboard.sort((a, b) => b.score - a.score || new Date(a.date) - new Date(b.date));
            
            // Определяем общее количество результатов
            const totalResults = leaderboard.length;
            
            // Находим позицию текущего результата среди всех
            const resultRank = leaderboard.findIndex(player => player.player_name === playerName && player.score === playerScore) + 1;

            if (resultRank > 0) {
                // Отображаем позицию результата (сдвинул на 20 пикселей вниз)
                ctx.fillText('Your rank:', centerX, centerY + 140); // Смещение вниз на 140 пикселей
                ctx.fillText(`${resultRank} of ${totalResults}`, centerX, centerY + 180); // Смещение вниз на 180 пикселей
            }
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
            ctx.font = '24px "Verdana", system-ui'; // Шрифт для текста ошибки
            ctx.fillStyle = 'red'; // Красный цвет текста для ошибки
            ctx.fillText('Failed to get rank', centerX, centerY + 140); // Смещение вниз на 140 пикселей
        }
    }

    // Отключаем тень для последующих элементов, если они будут рисоваться
    ctx.shadowColor = 'transparent'; // Убираем тень
}

function drawNextCard() {
    if (nextCard) {
        // Устанавливаем шрифт для текста
        ctx.font = '22px "Honk", system-ui'; // Уменьшили размер шрифта для надписи
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.fillText('Next card:', infoX + infoWidth / 2, infoY + 30);

        // Увеличиваем отступ между текстом и картой
        const nextCardX = infoX + infoWidth / 2 - cellWidth / 2;
        const nextCardY = infoY + 70; // Разместили значок карты ниже

        // Рисуем прямоугольник карты
        ctx.fillStyle = nextCard.suit.color; // Цвет в зависимости от масти
        ctx.fillRect(nextCardX, nextCardY, cellWidth, cellHeight);

        // Рисуем номинал карты в центре квадрата
        ctx.fillStyle = 'white';
        ctx.font = '20px Verdana'; // Уменьшили размер шрифта для номинала карты
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(nextCard.value, nextCardX + cellWidth / 2, nextCardY + cellHeight / 2);

        // Рисуем масть карты в правом верхнем углу квадрата
        ctx.font = '16px Verdana'; // Уменьшили размер шрифта для масти карты
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(getSuitSymbol(nextCard.suit.name), nextCardX + cellWidth - 4, nextCardY + 4);
    }
}

function drawScore() {
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';

    const offsetY = 140; // Отступ после карты

    // Рисуем надпись Level размером 24px и номер уровня ниже размером 32px
    ctx.font = '22px "Honk", system-ui'; // Размер шрифта для надписи
    ctx.fillText('Level', infoX + infoWidth / 2, infoY + offsetY + 30);
    ctx.font = '36px "Honk", system-ui'; // Размер шрифта для цифр
    ctx.fillText(`${currentLevel}`, infoX + infoWidth / 2, infoY + offsetY + 60);

    // Рисуем надпись Score размером 24px и количество очков ниже размером 32px
    ctx.font = '22px "Honk", system-ui'; // Размер шрифта для надписи
    ctx.fillText('Score', infoX + infoWidth / 2, infoY + offsetY + 130);
    ctx.font = '36px "Honk", system-ui'; // Размер шрифта для цифр
    ctx.fillText(`${playerScore}`, infoX + infoWidth / 2, infoY + offsetY + 160);

    // Рисуем надпись Lines размером 24px и количество линий ниже размером 32px
    ctx.font = '22px "Honk", system-ui'; // Размер шрифта для надписи
    ctx.fillText('Lines', infoX + infoWidth / 2, infoY + offsetY + 230);
    ctx.font = '36px "Honk", system-ui'; // Размер шрифта для цифр
    ctx.fillText(`${linesRemoved}`, infoX + infoWidth / 2, infoY + offsetY + 260);
}

function drawRemovedLineInfo() {
    if (removedLineInfo) {
        // Используем шрифт Honk для отображения информации о комбинации и очках
        ctx.font = '24px "Honk", system-ui'; // Изменили размер шрифта на 20px
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';

        // Отображаем текст чуть выше, по центру удаленной линии
        ctx.fillText(
            `${removedLineInfo.name} +${removedLineInfo.points} points`,
            gridX + gridWidth / 2,
            gridY + removedLineInfo.row * cellHeight + cellHeight / 3 // Сдвигаем текст выше
        );
    }
}

function drawGame() {
    // Очищаем canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Рисуем игровое поле в левой части
    ctx.fillStyle = 'lightgray';
    ctx.fillRect(gridX, gridY, gridWidth, gridHeight);

    // Рисуем сетку на игровой части
    ctx.strokeStyle = '#E6E6FA';
    ctx.lineWidth = 1;

    // Вертикальные линии
    for (let i = 1; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(gridX + i * cellWidth, gridY);
        ctx.lineTo(gridX + i * cellWidth, gridY + gridHeight);
        ctx.stroke();
    }

    // Горизонтальные линии
    for (let i = 1; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(gridX, gridY + i * cellHeight);
        ctx.lineTo(gridX + gridWidth, gridY + i * cellHeight);
        ctx.stroke();
    }

    // Рисуем все карты
    squares.forEach(square => {
        ctx.fillStyle = square.card.suit.color; // Цвет в зависимости от масти
        ctx.fillRect(square.x, square.y, cellWidth, cellHeight);

        // Рисуем номинал карты в центре квадрата
        ctx.fillStyle = 'white';
        ctx.font = '20px Verdana'; // Уменьшили размер шрифта для номинала карты
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(square.card.value, square.x + cellWidth / 2, square.y + cellHeight / 2);

        // Рисуем масть карты в правом верхнем углу квадрата
        ctx.font = '16px Verdana'; // Уменьшили размер шрифта для масти карты
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(getSuitSymbol(square.card.suit.name), square.x + cellWidth - 4, square.y + 4);
    });

    drawNextCard(); // Рисуем следующую карту
    drawScore(); // Рисуем счет игрока
    drawRemovedLineInfo(); // Рисуем информацию о удаленной линии

    if (isGameOver) {
        drawGameOver();
    }
}

function getSuitSymbol(suit) {
    switch (suit) {
        case 'hearts':
            return '♥';
        case 'spades':
            return '♠';
        case 'diamonds':
            return '♦';
        case 'clubs':
            return '♣';
        default:
            return '';
    }
}

function updateGame(time) {
    if (isGameOver || isPaused) return; // Останавливаем обновление игры, если она окончена или на паузе

    const currentSquare = squares[squares.length - 1];

    if (time - lastFallTime > currentInterval) { // Если прошло достаточно времени
        if (currentSquare.y + cellHeight < gridY + gridHeight && !checkCollision(currentSquare)) {
            currentSquare.y += cellHeight; // передвигаем карту вниз на одну клетку
        } else {
            // Если карта достигла дна или упала на другую карту
            if (!checkAndRemoveFullLines()) {
                squares.push(createNewSquare()); // Создаем новую карту, если линия не была удалена
            }
            checkGameOver(); // Проверяем, окончена ли игра
        }
        lastFallTime = time;
    }

    drawGame();
    if (!isPaused) {
        requestAnimationFrame(updateGame); // Продолжаем игру только если не на паузе
    }
}

// Функция для сохранения результатов игры
async function saveGameResult(playerName, score, level, linesRemoved) {
    try {
        const response = await fetch('/api/scores', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ player_name: playerName, score, level, lines_removed: linesRemoved }),
        });
        if (!response.ok) {
            throw new Error('Failed to save score');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Обработчик для кнопки "Play Again"
document.getElementById('playAgainButton').addEventListener('click', () => {
    startGame();
});
