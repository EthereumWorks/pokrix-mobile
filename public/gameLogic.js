const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Устанавливаем размеры canvas
canvas.width = 1200;
canvas.height = 800;

// Задаем размеры и координаты исходного прямоугольника
const rectWidth = 960;
const rectHeight = 600;
const rectX = (canvas.width - rectWidth) / 2;
const rectY = (canvas.height - rectHeight) / 2;

// Вычисляем ширину каждой из трех частей
const partWidth = rectWidth / 3;

// Вычисляем размеры клеток для сетки
const cellWidth = partWidth / 5;
const cellHeight = rectHeight / 10;

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
let fallInterval = 700; // Обычный интервал падения (1 секунда)
let fastFallInterval = 100; // Ускоренный интервал падения (0.1 секунда)
let lastFallTime = 0; // Время последнего падения
let isFastFalling = false; // Флаг для контроля ускоренного падения

// Переменная для хранения следующей карты
let nextCard = getRandomCard();

// Переменная для хранения состояния паузы
let isPaused = false;

// Переменные для отображения информации о комбинации
let removedLineInfo = null;

const LINES_PER_LEVEL = 5; // Количество удаленных линий для увеличения уровня
const ACCELERATION_FACTOR = 0.8; // Коэффициент ускорения (уменьшение интервала на 20%)

let currentLevel = 1; // Текущий уровень, начинается с 1
let linesRemoved = 0; // Количество удаленных линий


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
        x: rectX + partWidth + 2 * cellWidth, // центральная колонка
        y: rectY, // самая верхняя строка
        card // информация о карте (масть и номинал)
    };
}

// Начинаем с одной карты
squares.push(createNewSquare());

// Добавляем обработчик событий для нажатия клавиш
document.addEventListener('keydown', (event) => {
    if (isGameOver || isPaused) return; // Останавливаем управление, если игра окончена или на паузе

    const currentSquare = squares[squares.length - 1];
    if (event.key === 'ArrowLeft' && currentSquare.x > rectX + partWidth && !checkCollisionSide(currentSquare, 'left')) {
        currentSquare.x -= cellWidth; // двигаем карту влево
    } else if (event.key === 'ArrowRight' && currentSquare.x < rectX + partWidth + 4 * cellWidth && !checkCollisionSide(currentSquare, 'right')) {
        currentSquare.x += cellWidth; // двигаем карту вправо
    } else if (event.key === 'ArrowDown') {
        isFastFalling = true; // Устанавливаем флаг ускоренного падения
    }
});

// Добавляем обработчик для отпускания клавиши вниз
document.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowDown') {
        isFastFalling = false; // Сбрасываем флаг ускоренного падения
    }
});

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
    const lines = Array(10).fill(0); // 10 линий по вертикали

    // Считаем количество карт в каждой строке
    squares.forEach(square => {
        const row = (square.y - rectY) / cellHeight;
        lines[row]++;
    });

    let lineRemoved = false;
    let firstLineRemoved = false;
    let secondLineRemoved = false;
    let firstRemovedRow = null;

    // Ищем полные линии и проверяем покерные комбинации
    lines.forEach((count, row) => {
        if (count === 5) { // Если линия заполнена
            const line = squares.filter(square => (square.y - rectY) / cellHeight === row);
            const scoreInfo = calculateScoreForLine(line);

            if (scoreInfo.points > 0) {
                playerScore += scoreInfo.points; // Начисляем очки

                // Увеличиваем счетчик удаленных линий
                linesRemoved++;

                // Удаляем карты из этой линии
                squares = squares.filter(square => (square.y - rectY) / cellHeight !== row);

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
                    if (row < 9 && lines[row + 1] > 0) { // Проверяем, что линия не в самом низу и ниже есть карты
                        const lineBelow = squares.filter(square => (square.y - rectY) / cellHeight === row + 1);
                        squares = squares.filter(square => (square.y - rectY) / cellHeight !== row + 1);

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
                    if ((square.y - rectY) / cellHeight < firstRemovedRow) {
                        square.y += cellHeight;
                    }
                });
            }

            // Опускаем блоки после удаления второй линии
            if (secondLineRemoved) {
                squares.forEach(square => {
                    if ((square.y - rectY) / cellHeight < firstRemovedRow + 1) {
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
    if (currentSquare.y === rectY && checkCollision(currentSquare)) {
        isGameOver = true;
    }
}

// Функция для отображения сообщения "Game Over"
function drawGameOver() {
    ctx.fillStyle = 'darkgray';
    ctx.font = '96px "Honk", system-ui'; // Устанавливаем шрифт Honk и увеличиваем размер
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
}

function drawNextCard() {
    if (nextCard) {
        // Устанавливаем шрифт для текста
        ctx.font = '48px "Honk", system-ui';
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.fillText('Next card:', rectX + partWidth * 2.5, rectY + 30);

        // Увеличиваем отступ между текстом и картой
        const nextCardX = rectX + partWidth * 2.5 - cellWidth / 2;
        const nextCardY = rectY + 120; // Опустили значок карты еще ниже

        // Рисуем прямоугольник карты
        ctx.fillStyle = nextCard.suit.color; // Цвет в зависимости от масти
        ctx.fillRect(nextCardX, nextCardY, cellWidth, cellHeight);

        // Рисуем номинал карты в центре квадрата
        ctx.fillStyle = 'white';
        ctx.font = '32px Arial'; // Размер шрифта для номинала карты
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(nextCard.value, nextCardX + cellWidth / 2, nextCardY + cellHeight / 2);

        // Рисуем масть карты в правом верхнем углу квадрата
        ctx.font = '16px Arial';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(getSuitSymbol(nextCard.suit.name), nextCardX + cellWidth - 4, nextCardY + 4);
    }
}

function drawScore() {
    ctx.font = '48px "Honk", system-ui'; // Увеличили размер шрифта до 48px
    ctx.fillStyle = 'black';
    ctx.textAlign = 'left';

    ctx.fillText(`Level: ${currentLevel}`, rectX + 20, rectY + 30);
    ctx.fillText(`Lines: ${linesRemoved}`, rectX + 20, rectY + 80); // Сдвинули вниз, чтобы разместить текст
    ctx.fillText(`Score: ${playerScore}`, rectX + 20, rectY + 130); // Сдвинули вниз, чтобы разместить текст
}

function drawRemovedLineInfo() {
    if (removedLineInfo) {
        // Используем шрифт Honk для отображения информации о комбинации и очках
        ctx.font = '32px "Honk", system-ui'; // Уменьшаем размер шрифта
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';

        // Отображаем текст чуть выше, по центру удаленной линии
        ctx.fillText(
            `${removedLineInfo.name} +${removedLineInfo.points} points`,
            rectX + partWidth + partWidth / 2,
            rectY + removedLineInfo.row * cellHeight + cellHeight / 3 // Сдвигаем текст выше
        );
    }
}


function drawGame() {
    // Очищаем canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Рисуем левую часть прямоугольника
    ctx.fillStyle = '#E6E6FA';
    ctx.fillRect(rectX, rectY, partWidth, rectHeight);

    // Рисуем среднюю, более светлую часть прямоугольника
    ctx.fillStyle = 'lightgray';
    ctx.fillRect(rectX + partWidth, rectY, partWidth, rectHeight);

    // Рисуем правую часть прямоугольника
    ctx.fillStyle = '#E6E6FA';
    ctx.fillRect(rectX + 2 * partWidth, rectY, partWidth, rectHeight);

    // Рисуем сетку на средней части
    ctx.strokeStyle = '#E6E6FA';
    ctx.lineWidth = 1;

    // Вертикальные линии
    for (let i = 1; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(rectX + partWidth + i * cellWidth, rectY);
        ctx.lineTo(rectX + partWidth + i * cellWidth, rectY + rectHeight);
        ctx.stroke();
    }

    // Горизонтальные линии
    for (let i = 1; i < 10; i++) {
        ctx.beginPath();
        ctx.moveTo(rectX + partWidth, rectY + i * cellHeight);
        ctx.lineTo(rectX + 2 * partWidth, rectY + i * cellHeight);
        ctx.stroke();
    }

    // Рисуем все карты
    squares.forEach(square => {
        ctx.fillStyle = square.card.suit.color; // Цвет в зависимости от масти
        ctx.fillRect(square.x, square.y, cellWidth, cellHeight);

        // Рисуем номинал карты в центре квадрата
        ctx.fillStyle = 'white';
        ctx.font = '32px Arial'; // Увеличен размер шрифта для номинала карты
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(square.card.value, square.x + cellWidth / 2, square.y + cellHeight / 2);

        // Рисуем масть карты в правом верхнем углу квадрата
        ctx.font = '16px Arial';
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

// Функция для получения символа масти карты
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
    const interval = isFastFalling ? fastFallInterval : fallInterval; // Определяем текущий интервал

    if (time - lastFallTime > interval) { // Если прошло достаточно времени
        if (currentSquare.y + cellHeight < rectY + rectHeight && !checkCollision(currentSquare)) {
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

// Запускаем игру
requestAnimationFrame(updateGame);
