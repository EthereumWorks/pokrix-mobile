const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Получаем имя пользователя из URL-параметров
const urlParams = new URLSearchParams(window.location.search);
const playerName = urlParams.get('username') || 'Player';

const cardImages = {}; // Объект для хранения изображений всех карт

// Устанавливаем размеры канваса с учетом уменьшенной области управления
canvas.width = 360;
canvas.height = 640 - 100;

const rectHeight = canvas.height;
const leftWidth = (canvas.width / 3) * 2;
const rightWidth = canvas.width / 3;

// Размеры для левой части (игровое поле)
const gridWidth = leftWidth;
const gridHeight = rectHeight;
const gridX = 0;
const gridY = 0;

// Размеры для правой части (информация)
const infoX = leftWidth;
const infoY = 0;
const infoWidth = rightWidth;
const infoHeight = rectHeight;

// Определяем размеры прямоугольников для информации
const rectCount = 4; // Количество прямоугольников
const rectMargin = 10; // Отступ между прямоугольниками
const infoRectHeight = (infoHeight - (rectMargin * (rectCount + 1))) / rectCount;
const rectWidth = infoWidth - 20; // Отступ по 10px с каждой стороны
const borderRadius = 15; // Радиус закругления углов

// Вычисляем размеры клеток для сетки
const cellWidth = gridWidth / 5;
const cellHeight = gridHeight / 8;

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
let fallInterval = 700;
let fastFallInterval = 100;
let currentInterval = fallInterval;
let lastFallTime = 0;

// Переменная для хранения следующей карты
let nextCard = getRandomCard();

// Переменная для хранения состояния паузы
let isPaused = false;

// Переменные для отображения информации о комбинации
let removedLineInfo = null;

const LINES_PER_LEVEL = 10;
const ACCELERATION_FACTOR = 0.8;

let currentLevel = 1;
let linesRemoved = 0;


// Определение устройства
const isMobile = /Mobi|Android/i.test(navigator.userAgent);

// Переход от главного меню к игре
document.getElementById('playButton').addEventListener('click', () => {
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('gameWrapper').style.display = 'flex';
    startGame();
});

// Функция для начала игры
// Модифицированная функция для начала игры
function startGame() {
    preloadCardImages().then(() => {
        usedCards = [];
        squares = [];
        playerScore = 0;
        isGameOver = false;
        currentLevel = 1;
        linesRemoved = 0;
        nextCard = getRandomCard();
        removedLineInfo = null;
        isPaused = false;
        fallInterval = 700;
        currentInterval = fallInterval;
        lastFallTime = 0;
        squares.push(createNewSquare());
        document.getElementById('playAgainButton').style.display = 'none';
        document.getElementById('controls').style.display = 'flex';
        requestAnimationFrame(updateGame); // Запуск игрового цикла после полной загрузки изображений
    });
}

// Функция для рисования закругленного прямоугольника с обводкой и градиентной заливкой
function drawRoundedRectWithBorder(x, y, width, height, radius, borderWidth, gradient) {
    // Сохраняем текущее состояние контекста
    ctx.save();

    // Сначала рисуем обводку. Сжимаем область рисования на размер borderWidth, чтобы обводка рисовалась внутрь
    const innerX = x + borderWidth / 2;
    const innerY = y + borderWidth / 2;
    const innerWidth = width - borderWidth;
    const innerHeight = height - borderWidth;
    const innerRadius = radius - borderWidth / 2;

    // Создаем градиент для обводки
    const borderGradient = ctx.createLinearGradient(innerX, innerY + innerHeight, innerX + innerWidth, innerY);
    borderGradient.addColorStop(0, '#232323'); // Левый нижний угол
    borderGradient.addColorStop(1, '#898989'); // Правый верхний угол

    // Настройки обводки
    ctx.strokeStyle = borderGradient;
    ctx.lineWidth = borderWidth;

    // Начинаем рисовать прямоугольник с обводкой и закругленными углами
    ctx.beginPath();
    ctx.moveTo(innerX + innerRadius, innerY);
    ctx.lineTo(innerX + innerWidth - innerRadius, innerY);
    ctx.quadraticCurveTo(innerX + innerWidth, innerY, innerX + innerWidth, innerY + innerRadius);
    ctx.lineTo(innerX + innerWidth, innerY + innerHeight - innerRadius);
    ctx.quadraticCurveTo(innerX + innerWidth, innerY + innerHeight, innerX + innerWidth - innerRadius, innerY + innerHeight);
    ctx.lineTo(innerX + innerRadius, innerY + innerHeight);
    ctx.quadraticCurveTo(innerX, innerY + innerHeight, innerX, innerY + innerHeight - innerRadius);
    ctx.lineTo(innerX, innerY + innerRadius);
    ctx.quadraticCurveTo(innerX, innerY, innerX + innerRadius, innerY);
    ctx.closePath();

    // Заливаем прозрачным цветом внутри (можно настроить как вам нужно)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fill();

    // Рисуем обводку
    ctx.stroke();

    // Восстанавливаем состояние контекста
    ctx.restore();
}

// Функция для отрисовки прямоугольников информации с обводкой и градиентом
function drawInfoRectangles() {
    const texts = ['Next card', `Level: ${currentLevel}`, `Score: ${playerScore}`, `Lines: ${linesRemoved}`];
    const borderRadius = 10; // Радиус закругления углов
    const borderWidth = 2; // Толщина обводки

    for (let i = 0; i < rectCount; i++) {
        const rectX = infoX + 10; // Отступ слева и справа
        const rectY = infoY + rectMargin * (i + 1) + infoRectHeight * i; // Отступ сверху
        const text = texts[i]; // Текст для каждого прямоугольника

        // Рисуем закругленный прямоугольник с обводкой и градиентом
        drawRoundedRectWithBorder(rectX, rectY, rectWidth, infoRectHeight, borderRadius, borderWidth);

        // Рисуем текст
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, rectX + rectWidth / 2, rectY + infoRectHeight / 2);
    }
}

// Функция для получения случайной карты, не используемой на игровом поле
function getRandomCard() {
    const availableCards = deck.filter(card => !usedCards.some(usedCard => usedCard.suit.name === card.suit.name && usedCard.value === card.value));
    if (availableCards.length === 0) {
        return null;
    }
    const randomIndex = Math.floor(Math.random() * availableCards.length);
    const card = availableCards[randomIndex];
    usedCards.push(card);
    return card;
}


// Предварительная загрузка всех изображений карт
function preloadCardImages() {
    return new Promise((resolve) => {
        let loadedImagesCount = 0;
        const totalImages = deck.length;

        deck.forEach(card => {
            const img = new Image();
            img.src = getCardImagePath(card);

            img.onload = () => {
                loadedImagesCount++;
                if (loadedImagesCount === totalImages) {
                    resolve(); // Все изображения загружены
                }
            };

            cardImages[`${card.value}${card.suit.name[0]}`] = img;
        });
    });
}

// Функция для получения изображения карты из загруженных
function getCardImage(card) {
    return cardImages[`${card.value}${card.suit.name[0]}`];
}

// Добавление обработчиков событий в зависимости от устройства
if (isMobile) {
    document.getElementById('leftButton').addEventListener('touchstart', () => {
        moveLeft();
        document.getElementById('leftButton').querySelector('img').src = 'assets/images/BUTTONLEFTPRESSED.png';
        document.getElementById('leftButton').classList.add('pressed');
    });
    document.getElementById('leftButton').addEventListener('touchend', () => {
        document.getElementById('leftButton').querySelector('img').src = 'assets/images/BUTTONLEFT.png';
        document.getElementById('leftButton').classList.remove('pressed');
    });

    document.getElementById('rightButton').addEventListener('touchstart', () => {
        moveRight();
        document.getElementById('rightButton').querySelector('img').src = 'assets/images/BUTTONRIGHTPRESSED.png';
        document.getElementById('rightButton').classList.add('pressed');
    });
    document.getElementById('rightButton').addEventListener('touchend', () => {
        document.getElementById('rightButton').querySelector('img').src = 'assets/images/BUTTONRIGHT.png';
        document.getElementById('rightButton').classList.remove('pressed');
    });

    document.getElementById('downButton').addEventListener('touchstart', () => {
        currentInterval = fastFallInterval;
        document.getElementById('downButton').querySelector('img').src = 'assets/images/BUTTONDOWNPRESSED.png';
        document.getElementById('downButton').classList.add('pressed');
    });
    document.getElementById('downButton').addEventListener('touchend', () => {
        currentInterval = fallInterval;
        document.getElementById('downButton').querySelector('img').src = 'assets/images/BUTTONDOWN.png';
        document.getElementById('downButton').classList.remove('pressed');
    });
} else {
    document.getElementById('leftButton').addEventListener('mousedown', () => {
        moveLeft();
        document.getElementById('leftButton').querySelector('img').src = 'assets/images/BUTTONLEFTPRESSED.png';
        document.getElementById('leftButton').classList.add('pressed');
    });
    document.getElementById('leftButton').addEventListener('mouseup', () => {
        document.getElementById('leftButton').querySelector('img').src = 'assets/images/BUTTONLEFT.png';
        document.getElementById('leftButton').classList.remove('pressed');
    });

    document.getElementById('rightButton').addEventListener('mousedown', () => {
        moveRight();
        document.getElementById('rightButton').querySelector('img').src = 'assets/images/BUTTONRIGHTPRESSED.png';
        document.getElementById('rightButton').classList.add('pressed');
    });
    document.getElementById('rightButton').addEventListener('mouseup', () => {
        document.getElementById('rightButton').querySelector('img').src = 'assets/images/BUTTONRIGHT.png';
        document.getElementById('rightButton').classList.remove('pressed');
    });

    document.getElementById('downButton').addEventListener('mousedown', () => {
        currentInterval = fastFallInterval;
        document.getElementById('downButton').querySelector('img').src = 'assets/images/BUTTONDOWNPRESSED.png';
        document.getElementById('downButton').classList.add('pressed');
    });
    document.getElementById('downButton').addEventListener('mouseup', () => {
        currentInterval = fallInterval;
        document.getElementById('downButton').querySelector('img').src = 'assets/images/BUTTONDOWN.png';
        document.getElementById('downButton').classList.remove('pressed');
    });
}


// Обработка событий нажатия клавиш
document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'ArrowLeft':
            document.getElementById('leftButton').classList.add('pressed');
            moveLeft();
            break;
        case 'ArrowRight':
            document.getElementById('rightButton').classList.add('pressed');
            moveRight();
            break;
        case 'ArrowDown':
            document.getElementById('downButton').classList.add('pressed');
            currentInterval = fastFallInterval;
            break;
    }
});

// Обработка событий отпускания клавиш
document.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'ArrowLeft':
            document.getElementById('leftButton').classList.remove('pressed');
            break;
        case 'ArrowRight':
            document.getElementById('rightButton').classList.remove('pressed');
            break;
        case 'ArrowDown':
            document.getElementById('downButton').classList.remove('pressed');
            currentInterval = fallInterval;
            break;
    }
});



// Функция для перемещения влево
function moveLeft() {
    const currentSquare = squares[squares.length - 1];
    if (!isGameOver && !isPaused && currentSquare.x > gridX && !checkCollisionSide(currentSquare, 'left')) {
        currentSquare.x -= cellWidth;
    }
}

// Функция для перемещения вправо
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

    const valueMap = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
    const numericValues = cardValues.map(value => valueMap[value]).sort((a, b) => a - b);

    const isFlush = cardSuits.every(suit => suit === cardSuits[0]);

    const isStraight = numericValues.every((value, index) => {
        if (index === 0) return true;
        return value === numericValues[index - 1] + 1;
    });

    // Проверка на низкий стрит с тузом (A-2-3-4-5)
    const isLowStraight = numericValues.join(',') === '2,3,4,5,14';

    const valueCounts = numericValues.reduce((acc, value) => {
        acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {});

    const counts = Object.values(valueCounts).sort((a, b) => b - a);

    if ((isStraight || isLowStraight) && isFlush) {
        if (numericValues[0] === 10 || isLowStraight) {
            return { name: 'Royal Flush', points: 1000 };
        } else {
            return { name: 'Straight Flush', points: 500 };
        }
    }
    if (counts[0] === 4) return { name: '4 of a Kind', points: 250 };
    if (counts[0] === 3 && counts[1] === 2) return { name: 'Full House', points: 150 };
    if (isFlush) return { name: 'Flush', points: 100 };
    if (isStraight || isLowStraight) return { name: 'Straight', points: 80 };
    if (counts[0] === 3) return { name: '3 of a Kind', points: 60 };
    if (counts[0] === 2 && counts[1] === 2) return { name: 'Two Pairs', points: 40 };
    if (counts[0] === 2) return { name: 'One Pair', points: 20 };

    return { name: 'No Combination', points: 0 };
}

// Функция для проверки заполненности линий и их удаления
function checkAndRemoveFullLines() {
    const lines = Array(8).fill(0);

    squares.forEach(square => {
        const row = (square.y - gridY) / cellHeight;
        lines[row]++;
    });

    let lineRemoved = false;
    let firstLineRemoved = false;
    let secondLineRemoved = false;
    let firstRemovedRow = null;

    lines.forEach((count, row) => {
        if (count === 5) {
            const line = squares.filter(square => (square.y - gridY) / cellHeight === row);
            const scoreInfo = calculateScoreForLine(line);

            if (scoreInfo.points > 0) {
                playerScore += scoreInfo.points;
                linesRemoved++;

                squares = squares.filter(square => (square.y - gridY) / cellHeight !== row);

                line.forEach(card => {
                    usedCards = usedCards.filter(usedCard => usedCard !== card.card);
                });

                if (!firstLineRemoved) {
                    removedLineInfo = { row, ...scoreInfo };
                    firstRemovedRow = row;
                    firstLineRemoved = true;
                }

                if (scoreInfo.name === 'Flush' || scoreInfo.name === 'Full House' || scoreInfo.name === '4 of a Kind' || scoreInfo.name === 'Straight Flush' || scoreInfo.name === 'Royal Flush') {
                    if (row < 7 && lines[row + 1] > 0) {
                        const lineBelow = squares.filter(square => (square.y - gridY) / cellHeight === row + 1);
                        squares = squares.filter(square => (square.y - gridY) / cellHeight !== row + 1);

                        lineBelow.forEach(card => {
                            usedCards = usedCards.filter(usedCard => usedCard !== card.card);
                        });

                        secondLineRemoved = true;
                        linesRemoved++;
                        lines[row + 1] = 0;
                    }
                }

                lineRemoved = true;
            }
        }
    });

    if (lineRemoved) {
        // Проверяем, не пора ли поднять уровень
        const newLevel = Math.floor(linesRemoved / LINES_PER_LEVEL) + 1;

        if (newLevel > currentLevel) {
            currentLevel = newLevel;
            fallInterval = Math.max(100, fallInterval * ACCELERATION_FACTOR);
            currentInterval = fallInterval;
        }

        isPaused = true;
        drawGame();
        drawRemovedLineInfo();

        setTimeout(() => {
            if (firstLineRemoved) {
                squares.forEach(square => {
                    if ((square.y - gridY) / cellHeight < firstRemovedRow) {
                        square.y += cellHeight;
                    }
                });
            }

            if (secondLineRemoved) {
                squares.forEach(square => {
                    if ((square.y - gridY) / cellHeight < firstRemovedRow + 1) {
                        square.y += cellHeight;
                    }
                });
            }

            // Проверка на конец игры перемещена сюда
            checkGameOver();

            if (!isGameOver) {
                if (squares.length === 0) {
                    squares.push(createNewSquare());
                }
                removedLineInfo = null;
                isPaused = false;
                requestAnimationFrame(updateGame);
            }
        }, 1000);
    }

    return lineRemoved;
}

// Функция для проверки условия окончания игры
function checkGameOver() {
    const middleColumnX = gridX + 2 * cellWidth; // Координата X для среднего столбца (если нумерация столбцов начинается с 0)

    // Проверяем, есть ли карты в верхнем ряду в среднем столбце
    const isMiddleColumnFull = squares.some(square => 
        square.x === middleColumnX && 
        square.y === gridY &&
        checkCollision(square)
    );

    if (isMiddleColumnFull) {
        isGameOver = true;
        document.getElementById('playAgainButton').style.display = 'block';
        document.getElementById('controls').style.display = 'none';

        saveGameResult(playerName, playerScore, currentLevel, linesRemoved);
    }
}

// Функция для отображения сообщения "Game Over"
async function drawGameOver() {
    ctx.fillStyle = 'darkgray';
    ctx.font = '36px "Verdana", system-ui';
    ctx.textAlign = 'center';

    const centerX = gridX + gridWidth / 2;
    const centerY = gridY + gridHeight / 2 - 80;

    ctx.fillText('GAME OVER', centerX, centerY);

    ctx.shadowColor = 'black';
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    ctx.shadowBlur = 4;

    ctx.font = '32px "Arial Black", sans-serif';
    ctx.fillStyle = 'white';
    ctx.fillText('You scored:', centerX, centerY + 60);
    ctx.fillText(`${playerScore} points`, centerX, centerY + 100);

    if (playerScore > 0) {
        try {
            const response = await fetch('/api/top1000');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const leaderboard = await response.json();
            leaderboard.sort((a, b) => b.score - a.score || new Date(a.date) - new Date(b.date));
            const totalResults = leaderboard.length;
            const resultRank = leaderboard.findIndex(player => player.player_name === playerName && player.score === playerScore) + 1;

            if (resultRank > 0) {
                ctx.fillText('Your rank:', centerX, centerY + 140);
                ctx.fillText(`${resultRank} of ${totalResults}`, centerX, centerY + 180);
            }
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
            ctx.font = '24px "Arial Black", sans-serif';
            ctx.fillStyle = 'red';
            ctx.fillText('Failed to get rank', centerX, centerY + 140);
        }
    }

    ctx.shadowColor = 'transparent';
}


function drawScore() {
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';

    const offsetY = 140;

    ctx.font = '20px "Arial Black", system-ui';
    ctx.fillText('Level', infoX + infoWidth / 2, infoY + offsetY + 30);
    ctx.font = '36px "Arial Black", system-ui';
    ctx.fillText(`${currentLevel}`, infoX + infoWidth / 2, infoY + offsetY + 60);

    ctx.font = '20px "Arial Black", system-ui';
    ctx.fillText('Score', infoX + infoWidth / 2, infoY + offsetY + 130);
    ctx.font = '36px "Arial Black", system-ui';
    ctx.fillText(`${playerScore}`, infoX + infoWidth / 2, infoY + offsetY + 160);

    ctx.font = '20px "Arial Black", system-ui';
    ctx.fillText('Lines', infoX + infoWidth / 2, infoY + offsetY + 230);
    ctx.font = '36px "Arial Black", system-ui';
    ctx.fillText(`${linesRemoved}`, infoX + infoWidth / 2, infoY + offsetY + 260);
}

function drawRemovedLineInfo() {
    if (removedLineInfo) {
        ctx.font = '18px "Arial Black", system-ui';
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';

        ctx.fillText(
            `${removedLineInfo.name} +${removedLineInfo.points} points`,
            gridX + gridWidth / 2,
            gridY + removedLineInfo.row * cellHeight + cellHeight / 3
        );
    }
}

// Загружаем изображение ячейки
const cellImage = new Image();
cellImage.src = 'assets/images/cell.png'; // Укажите правильный путь к изображению

// Отрисовка сетки с использованием изображения ячейки
function drawGrid() {
    for (let row = 0; row < 8; row++) { // 8 строк
        for (let col = 0; col < 5; col++) { // 5 столбцов
            ctx.drawImage(cellImage, gridX + col * cellWidth, gridY + row * cellHeight, cellWidth, cellHeight);
        }
    }
}

// Функция для получения пути к картинке карты (формат .png)
function getCardImagePath(card) {
    const value = card.value;  // Достоинство карты ('2', '3', ..., 'A')
    const suit = card.suit.name[0];  // Первая буква масти ('d', 's', 'c', 'h')
    return `assets/images/cards/Card${value}${suit}.png`;  // Формируем путь к PNG-файлу
}

// Функция для создания новой карты - R
function createNewSquare() {
    const card = nextCard;
    if (!card) {
        isGameOver = true;
        return null;
    }
    nextCard = getRandomCard();
    
    // Загружаем PNG изображение карты
    const cardImage = new Image();
    cardImage.src = getCardImagePath(card);

    return {
        x: gridX + 2 * cellWidth,
        y: gridY,
        card,
        image: cardImage  // Сохраняем PNG изображение в объекте карты
    };
}

// Функция для получения пути к картинке карты (формат .png)
function getCardImagePath(card) {
    const value = card.value;  // Достоинство карты ('2', '3', ..., 'A')
    const suit = card.suit.name[0];  // Первая буква масти ('d', 's', 'c', 'h')
    return `assets/images/cards/Card${value}${suit}.png`;  // Формируем путь к PNG-файлу
}

// Модифицируем функцию drawGame() для отрисовки информации
function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Отрисовка сетки
    drawGrid();

    // Отрисовка карт с использованием PNG, оставляя по 1px отступ с каждой стороны
    squares.forEach(square => {
        if (square.image && square.image.complete) {
            // Растягиваем изображение карты с отступом 1px с каждой стороны
            ctx.drawImage(square.image, square.x + 1, square.y + 1, cellWidth - 2, cellHeight - 2);
        } else {
            // Запасной вариант для отрисовки, если изображение еще не загружено или отсутствует
            ctx.fillStyle = square.card.suit.color;
            ctx.fillRect(square.x + 1, square.y + 1, cellWidth - 2, cellHeight - 2);
        }
    });

    // Отрисовка информации в прямоугольниках с закругленными углами
    drawInfoRectangles();

    drawRemovedLineInfo();

    if (isGameOver) {
        drawGameOver();
    }
}

// Функция для отрисовки следующей карты с отступом
function drawNextCard() {
    if (nextCard) {
        ctx.font = '20px "Arial Black", system-ui';
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.fillText('Next card:', infoX + infoWidth / 2, infoY + 30);

        const nextCardX = infoX + infoWidth / 2 - cellWidth / 2;
        const nextCardY = infoY + 70;

        // Растягиваем изображение следующей карты с отступом 1px
        const nextCardImage = getCardImage(nextCard);
        if (nextCardImage && nextCardImage.complete) {
            ctx.drawImage(nextCardImage, nextCardX + 1, nextCardY + 1, cellWidth - 2, cellHeight - 2);
        }
    }
}

// Функция для получения символа масти
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

// Вызываем функцию отрисовки в игровом цикле
function updateGame(time) {
    if (isGameOver || isPaused) return;

    const currentSquare = squares[squares.length - 1];

    if (time - lastFallTime > currentInterval) {
        if (currentSquare.y + cellHeight < gridY + gridHeight && !checkCollision(currentSquare)) {
            currentSquare.y += cellHeight;
        } else {
            if (!checkAndRemoveFullLines()) {
                squares.push(createNewSquare());
            }
            checkGameOver();
        }
        lastFallTime = time;
    }

    drawGame();
    if (!isPaused) {
        requestAnimationFrame(updateGame);
    }
}

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

// Переход от главного меню к игре
document.getElementById('playButton').addEventListener('click', () => {
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('gameWrapper').style.display = 'flex';
    startGame(); // Запуск игры
});