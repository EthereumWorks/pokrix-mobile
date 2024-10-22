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

function drawLoadingScreen() {
    // Очищаем canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Настройка фона
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Рисуем текст "Loading"
    ctx.fillStyle = '#FFF';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Loading...', canvas.width / 2, canvas.height / 2 - 40);

    // Рисуем прогресс-бар (без процентов)
    const barWidth = canvas.width * 0.6;
    const barHeight = 20;
    const barX = (canvas.width - barWidth) / 2;
    const barY = canvas.height / 2;

    ctx.fillStyle = '#FFF';
    ctx.fillRect(barX, barY, barWidth, barHeight); // Полный размер

    // Заполняем прогресс-бар
    ctx.fillStyle = '#33FF33';
    ctx.fillRect(barX, barY, barWidth * 1, barHeight); // Можно убрать, если не нужно отображать заполнение
}

function updateProgressBar(percentage) {
    drawLoadingScreen(percentage);
}

// Определение устройства
const isMobile = /Mobi|Android/i.test(navigator.userAgent);

// Переход от главного меню к игре
document.getElementById('startButton').addEventListener('click', () => {
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('gameWrapper').style.display = 'flex';
    startGame(); // Запускаем игру
});



function activateBackground() {
    const gameWrapper = document.getElementById('gameWrapper');

    // Устанавливаем фон после загрузки игры
    gameWrapper.style.background = 'linear-gradient(135deg, #888888, #4A4A4A), url("assets/images/tabletexture.png")';
    gameWrapper.style.backgroundSize = 'cover';
    gameWrapper.style.backgroundBlendMode = 'multiply';
}

// Модифицированная функция для начала игры
function startGame() {
    drawLoadingScreen(0); // Отрисовываем начальный экран загрузки
    preloadImages().then(() => {
        // Включаем фон после загрузки картинок
        activateBackground();

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
        document.getElementById('loadingScreen').style.display = 'none'; // Скрываем экран загрузки
        document.getElementById('controls').style.display = 'flex'; // Показываем кнопки управления
    
        requestAnimationFrame(updateGame); // Запуск игрового цикла после полной загрузки изображений
    });
}

// Функция для рисования закругленного прямоугольника с обводкой, градиентной заливкой, внешней и внутренней тенью
function drawRoundedRectWithBorder(x, y, width, height, radius, borderWidth, gradient) {
    // Сохраняем текущее состояние контекста
    ctx.save();

    // Внешняя тень
    ctx.shadowOffsetX = -2;  // Смещение по оси X
    ctx.shadowOffsetY = 2;   // Смещение по оси Y
    ctx.shadowBlur = 2;      // Размытие
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';  // Цвет тени с прозрачностью 25%

    // Сначала рисуем обводку. Сжимаем область рисования на размер borderWidth, чтобы обводка рисовалась внутрь
    const innerX = x + borderWidth / 2;
    const innerY = y + borderWidth / 2;
    const innerWidth = width - borderWidth;
    const innerHeight = height - borderWidth;
    const innerRadius = radius - borderWidth / 2;

    // Создаем градиент для обводки
    const borderGradient = ctx.createLinearGradient(innerX, innerY + innerHeight, innerX + innerWidth, innerY);
    borderGradient.addColorStop(0, '#232323'); // Левый нижний угол
    borderGradient.addColorStop(1, '#404040'); // Правый верхний угол

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

    // Заливаем прозрачным цветом внутри
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fill();

    // Рисуем обводку
    ctx.stroke();

    // Восстанавливаем состояние контекста для дальнейших операций
    ctx.restore();

    // Внутренняя тень
    ctx.save();
    ctx.clip();  // Ограничиваем область рисования, чтобы тень была внутри формы

    // Внутренняя тень
    ctx.shadowOffsetX = -2;  // Смещение тени по X
    ctx.shadowOffsetY = 2;   // Смещение тени по Y
    ctx.shadowBlur = 2;      // Размытие
    ctx.shadowColor = 'rgba(27, 27, 27, 0.8)';  // Цвет тени

    // Рисуем прозрачный прямоугольник для создания внутренней тени
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(innerX, innerY, innerWidth, innerHeight);

    ctx.restore();  // Восстанавливаем контекст
}

// Загрузка изображения линий
const linesImage = new Image();
linesImage.src = '/assets/images/lines.png'; // Укажите правильный путь к изображению

// Функция для отрисовки иконки сожженных линий
function drawLinesIcon(x, y, width, height) {
    if (linesImage.complete) {
        ctx.drawImage(linesImage, x - width / 2, y - height / 2, width, height);
    } else {
        // Если изображение еще не загружено, рисуем резервный вариант (например, текст)
        ctx.fillStyle = '#FF007F';
        ctx.font = '44px Arial';
        ctx.fillText('≡', x, y);
    }
}

// Загрузка изображения значка доллара
const dollarIcon = new Image();
dollarIcon.src = 'assets/images/dollar_icon.png'; // Укажите путь к изображению

// Функция для отрисовки значка доллара
function drawScoreIcon(x, y, iconWidth, iconHeight) {
    // Проверяем, загрузилось ли изображение
    if (dollarIcon.complete) {
        ctx.drawImage(dollarIcon, x - iconWidth / 2, y - iconHeight / 2, iconWidth, iconHeight);
    } else {
        // Если изображение еще не загружено, подождем его загрузки и затем отрисуем
        dollarIcon.onload = function() {
            ctx.drawImage(dollarIcon, x - iconWidth / 2, y - iconHeight / 2, iconWidth, iconHeight);
        };
    }
}

// Загрузка изображения стрелки
const arrowUpImage = new Image();
arrowUpImage.src = '/assets/images/arrowup.png'; // Укажите правильный путь к изображению

// Функция для отрисовки стрелки уровня
function drawLevelIcon(x, y, width, height) {
    if (arrowUpImage.complete) {
        ctx.drawImage(arrowUpImage, x - width / 2, y - height / 2, width, height);
    } else {
        // Если изображение еще не загружено, рисуем резервный вариант (например, текст)
        ctx.fillStyle = '#33FF33';
        ctx.font = '44px Arial';
        ctx.fillText('↑', x, y);
    }
}

// Загрузка изображения стрелок для следующей карты
const nextCardArrowImage = new Image();
nextCardArrowImage.src = '/assets/images/arrows_nextcard.png'; // Укажите правильный путь к изображению

// Функция для отрисовки стрелки над следующей картой
function drawNextCardArrow(x, y, width, height) {
    if (nextCardArrowImage.complete) {
        ctx.drawImage(nextCardArrowImage, x - width / 2, y - height / 2, width, height);
    } else {
        // Если изображение еще не загружено, можно рисовать текст или placeholder
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('->', x, y); // Временный вариант
    }
}

// Функция для отрисовки текста с одинаковыми настройками
function drawTextWithNeonEffect(text, x, y, color) {
    // Задаем неоновое свечение
    ctx.shadowColor = color; // Цвет тени должен соответствовать цвету текста
    ctx.shadowBlur = 20; // Размытие тени
    ctx.shadowOffsetX = 0; // Смещение тени по X
    ctx.shadowOffsetY = 0; // Смещение тени по Y

    // Настройка цвета и шрифта
    ctx.fillStyle = color;
    ctx.font = '40px "Bebas Neue"';
    ctx.textAlign = 'center';  // Центрирование текста по горизонтали
    ctx.textBaseline = 'middle';  // Центрирование текста по вертикали

    // Отрисовка текста
    ctx.fillText(text, x, y);

    // Очищаем тень после отрисовки текста
    ctx.shadowBlur = 0;
}

// Функция для отрисовки прямоугольников информации с обводкой, тенью и текстом
function drawInfoRectangles() {
    const texts = ['Next card', `Level: ${currentLevel}`, `Score: ${playerScore}`, `Lines: ${linesRemoved}`];
    const valueColors = ['#33FF33', '#00FFFF', '#FF007F']; // Цвета для значений
    const borderRadius = 10; // Радиус закругления углов
    const borderWidth = 2; // Толщина обводки
    const iconSize = 70; // Задаем размер иконок

    for (let i = 0; i < rectCount; i++) {
        const rectX = infoX + 10; // Отступ слева и справа
        const rectY = infoY + rectMargin * (i + 1) + infoRectHeight * i; // Отступ сверху

        // Рисуем закругленный прямоугольник с обводкой и тенью
        drawRoundedRectWithBorder(rectX, rectY, rectWidth, infoRectHeight, borderRadius, borderWidth);

        // Если это первый прямоугольник для "Next card"
        if (i === 0) {
            const arrowX = rectX + rectWidth / 2; // Центрирование стрелки
            const arrowY = rectY + infoRectHeight / 4; // Отступ сверху
            drawNextCardArrow(arrowX, arrowY - 10, iconSize, iconSize); // Рисуем стрелку

            // Задаем параметры для смещений и размеров карты
            const cardX = rectX + rectWidth / 2; // Центрирование карты по ширине прямоугольника
            const cardY = rectY + infoRectHeight / 2 + 15; // Смещение вниз от центра прямоугольника
            const cardWidth = cellWidth; // Ширина карты
            const cardHeight = cellHeight; // Высота карты

            // Вызов функции для отрисовки следующей карты
            drawNextCard(cardX, cardY, cardWidth, cardHeight);
        }

        // Если это не первый прямоугольник (он зарезервирован под "Next card"), рисуем значение
        if (i > 0) {
            const textValue = texts[i].split(": ")[1];  // Значение для отображения
            const color = valueColors[i - 1];  // Соответствующий цвет
            const textX = rectX + rectWidth / 2; // Центрирование текста по ширине прямоугольника
            const textY = rectY + infoRectHeight / 2 + 25; // Смещение текста для центрирования

            // Отрисовка текста с одинаковыми параметрами
            drawTextWithNeonEffect(textValue, textX, textY, color);
        }

        // Рисуем соответствующие иконки для каждого блока (уровень, очки, линии)
        if (i === 1) {
            const iconX = rectX + rectWidth / 2; // Центрируем по ширине
            const iconY = rectY + infoRectHeight / 4; // Центрируем по высоте
            drawLevelIcon(iconX, iconY, iconSize, iconSize); // Рисуем стрелку
        }
        if (i === 2) {
            const iconX = rectX + rectWidth / 2; // Центрируем по ширине прямоугольника
            const iconY = rectY + infoRectHeight / 4; // Смещаем вверх от центра
            drawScoreIcon(iconX, iconY, iconSize, iconSize); // Вызываем функцию для отрисовки иконки
        }
        if (i === 3) {
            const iconX = rectX + rectWidth / 2; // Центрируем по ширине
            const iconY = rectY + infoRectHeight / 4; // Центрируем по высоте
            drawLinesIcon(iconX, iconY, iconSize, iconSize); // Рисуем иконку
        }
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


let texturePattern = null; // Переменная для хранения паттерна текстуры

// загрузка всех картинок
function preloadImages() {
    return new Promise((resolve) => {
        const imagesToLoad = [
            ...deck.map(card => getCardImagePath(card)), // Путь к картам
            'assets/images/BUTTONLEFT.png',
            'assets/images/BUTTONLEFTPRESSED.png',
            'assets/images/BUTTONRIGHT.png',
            'assets/images/BUTTONRIGHTPRESSED.png',
            'assets/images/BUTTONDOWN.png',
            'assets/images/BUTTONDOWNPRESSED.png',
            'assets/images/lines.png',
            'assets/images/dollar_icon.png',
            'assets/images/arrowup.png',
            'assets/images/arrows_nextcard.png',
            'assets/images/cell.png',
            'assets/images/tabletexture.png' // Добавляем текстуру фона
        ];

        let loadedImagesCount = 0;
        const totalImages = imagesToLoad.length;

        imagesToLoad.forEach(src => {
            const img = new Image();
            img.src = src;

            img.onload = () => {
                loadedImagesCount++;
                const percentage = Math.floor((loadedImagesCount / totalImages) * 100);
                updateProgressBar(percentage); // Обновляем прогресс загрузки

                // Если изображение это текстура, создаем паттерн
                if (src.includes('tabletexture')) {
                    texturePattern = ctx.createPattern(img, 'repeat');
                }

                if (loadedImagesCount === totalImages) {
                    resolve(); // Все изображения загружены
                }
            };

            // Сохраняем загруженные изображения в объект cardImages для карт
            if (src.includes('Card')) {
                const [value, suit] = src.match(/Card(\w+)(\w)\.png/).slice(1, 3);
                cardImages[`${value}${suit}`] = img;
            }
        });
    });
}

// Функция для получения изображения карты из загруженных
function getCardImage(card) {
    return cardImages[`${card.value}${card.suit.name[0]}`];
}

// Добавление обработчиков событий в зависимости от устройства
if (isMobile) {
    document.getElementById('leftButton').addEventListener('touchstart', (e) => {
        e.preventDefault();  // Предотвращаем стандартное поведение
        moveLeft();
        document.getElementById('leftButton').classList.add('pressed');
    });
    document.getElementById('leftButton').addEventListener('touchend', (e) => {
        e.preventDefault();  // Предотвращаем стандартное поведение
        document.getElementById('leftButton').classList.remove('pressed');
    });

    document.getElementById('rightButton').addEventListener('touchstart', (e) => {
        e.preventDefault();
        moveRight();
        document.getElementById('rightButton').classList.add('pressed');
    });
    document.getElementById('rightButton').addEventListener('touchend', (e) => {
        e.preventDefault();
        document.getElementById('rightButton').classList.remove('pressed');
    });

    document.getElementById('downButton').addEventListener('touchstart', (e) => {
        e.preventDefault();
        currentInterval = fastFallInterval;
        document.getElementById('downButton').classList.add('pressed');
    });
    document.getElementById('downButton').addEventListener('touchend', (e) => {
        e.preventDefault();
        currentInterval = fallInterval;
        document.getElementById('downButton').classList.remove('pressed');
    });
} else {
    document.getElementById('leftButton').addEventListener('mousedown', () => {
        moveLeft();
        document.getElementById('leftButton').classList.add('pressed');
    });
    document.getElementById('leftButton').addEventListener('mouseup', () => {
        document.getElementById('leftButton').classList.remove('pressed');
    });

    document.getElementById('rightButton').addEventListener('mousedown', () => {
        moveRight();
        document.getElementById('rightButton').classList.add('pressed');
    });
    document.getElementById('rightButton').addEventListener('mouseup', () => {
        document.getElementById('rightButton').classList.remove('pressed');
    });

    document.getElementById('downButton').addEventListener('mousedown', () => {
        currentInterval = fastFallInterval;
        document.getElementById('downButton').classList.add('pressed');
    });
    document.getElementById('downButton').addEventListener('mouseup', () => {
        currentInterval = fallInterval;
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
    // Параметры для прямоугольника
    const rectWidth = 200;
    const rectHeight = 250;
    const rectX = gridX + (gridWidth - rectWidth) / 2; // Центрируем по ширине
    const rectY = gridY + (gridHeight - rectHeight) / 2; // Центрируем по высоте
    const borderRadius = 10;
    const borderWidth = 4;
    const borderColor = '#4A4A4A';
    const backgroundColor = '#1C1C1C';
    
    // Внутренняя тень параметры
    const shadowBlur = 10;
    const shadowColor = 'rgba(255, 255, 255, 0.35)'; // Прозрачность 35%

    // Рисуем закругленный прямоугольник с заливкой и обводкой
    ctx.save(); // Сохраняем текущее состояние контекста

    // Обводка
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;

    // Заливка
    ctx.fillStyle = backgroundColor;

    // Рисуем прямоугольник
    ctx.beginPath();
    ctx.moveTo(rectX + borderRadius, rectY);
    ctx.lineTo(rectX + rectWidth - borderRadius, rectY);
    ctx.quadraticCurveTo(rectX + rectWidth, rectY, rectX + rectWidth, rectY + borderRadius);
    ctx.lineTo(rectX + rectWidth, rectY + rectHeight - borderRadius);
    ctx.quadraticCurveTo(rectX + rectWidth, rectY + rectHeight, rectX + rectWidth - borderRadius, rectY + rectHeight);
    ctx.lineTo(rectX + borderRadius, rectY + rectHeight);
    ctx.quadraticCurveTo(rectX, rectY + rectHeight, rectX, rectY + rectHeight - borderRadius);
    ctx.lineTo(rectX, rectY + borderRadius);
    ctx.quadraticCurveTo(rectX, rectY, rectX + borderRadius, rectY);
    ctx.closePath();

    // Внутренняя тень
    ctx.clip();  // Ограничиваем область рисования

    ctx.save();
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Рисуем полупрозрачный прямоугольник для создания внутренней тени
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(rectX, rectY, rectWidth, rectHeight);

    ctx.restore();  // Восстанавливаем контекст

    // Заливаем и обводим прямоугольник
    ctx.fill();
    ctx.stroke();

    // Рисуем текст "Game Over"
    ctx.fillStyle = '#77FF77';
    ctx.font = '40px "VT323"';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', rectX + rectWidth / 2, rectY + 40);

    // Рисуем текст с количеством очков
    ctx.font = '24px "VT323"';
    ctx.fillStyle = '#3BFFFF';
    ctx.fillText('Score', rectX + rectWidth / 2, rectY + 90);
    ctx.fillText(`${playerScore} points`, rectX + rectWidth / 2, rectY + 120);

    // Если удалось получить ранг, рисуем его
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
                ctx.font = '24px "VT323"';
                ctx.fillStyle = '#EFEFEF';
                ctx.fillText('Your rank:', rectX + rectWidth / 2, rectY + 160);
                ctx.fillText(`${resultRank} of ${totalResults}`, rectX + rectWidth / 2, rectY + 190);
            }
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
            ctx.fillStyle = 'red';
            ctx.fillText('Failed to get rank', rectX + rectWidth / 2, rectY + 160);
        }
    }

    ctx.restore(); // Восстанавливаем контекст
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
        // Устанавливаем шрифт VT323 и цвет D3D3D3
        ctx.font = '24px "VT323", monospace';
        ctx.fillStyle = '#D3D3D3'; // Устанавливаем цвет текста
        ctx.textAlign = 'center';

        // Отрисовываем текст с названием комбинации и набранными очками
        ctx.fillText(
            `${removedLineInfo.name} +${removedLineInfo.points} points`,
            gridX + gridWidth / 2,
            gridY + removedLineInfo.row * cellHeight + cellHeight / 3 + 10
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

// Функция для отрисовки следующей карты
function drawNextCard(cardX, cardY, cardWidth, cardHeight) {
    // Отрисовка следующей карты
    if (nextCard) {
        const nextCardImage = getCardImage(nextCard);
        if (nextCardImage && nextCardImage.complete) {
            ctx.drawImage(nextCardImage, cardX - cardWidth / 2, cardY - cardHeight / 2, cardWidth, cardHeight);
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