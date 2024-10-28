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
const rectCount = 5; // Количество прямоугольников
const rectMargin = 10; // Отступ между прямоугольниками
const infoRectHeight = (infoHeight - (rectMargin * (rectCount + 1))) / rectCount;
const rectWidth = infoWidth - 20; // Отступ по 10px с каждой стороны
const borderRadius = 15; // Радиус закругления углов

// Вычисляем размеры клеток для сетки
const cellWidth = gridWidth / 5;
const cellHeight = gridHeight / 8;

let isTutorialMode = false;  // Флаг для отслеживания, включен ли туториал
let tutorialStep = 0; // текущий шаг туториала

// Константное множество шагов, при которых карты не должны отрисовываться
const stepsWithoutFallingCards = new Set([0, 5, 7]);

let tutorialTaskCompleted = false; // Переменная для отслеживания выполнения задания на шаге туториала
let tutorialStepTimeout; // Переменная для хранения таймера шага
let isStep3TimeoutSet = false;  // Новый флаг для отслеживания установки таймера
let step4Initialized = false; // Флаг для отслеживания инициализации 4 шага
let step6Initialized = false; // Флаг для отслеживания инициализации 6 шага
let fallingCard = null;  // Карта, которая будет отслеживаться в падении в туториале
let wasAttemptFailed = false; // Флаг для отслеживания, была ли предыдущая попытка неудачной

let isHelpOpen = false; // Флаг для отслеживания состояния окна помощи

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

let hasHighlightedControls = false; // Флаг для проверки, выполнена ли подсветка
let isHighlightingFinished = false; // Флаг для проверки, завершена ли подсветка

let frameOpacity = 1; // Начальная непрозрачность рамки для выделения объекта в туториале
let frameDirection = -1; // Направление изменения прозрачности для выделения объекта в туториале
const blinkSpeed = 0.0165;  // Скорость мерцания, изменяйте для увеличения/уменьшения частоты

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

function activateBackground() {
    const gameWrapper = document.getElementById('gameWrapper');

    // Устанавливаем фон после загрузки игры
    gameWrapper.style.background = 'linear-gradient(135deg, #888888, #4A4A4A), url("assets/images/tabletexture.png")';
    gameWrapper.style.backgroundSize = 'cover';
    gameWrapper.style.backgroundBlendMode = 'multiply';
}
// отключение всех кнопок управления
function enableAllControlButtons() {
    document.getElementById('leftButton').disabled = false;
    document.getElementById('downButton').disabled = false;
    document.getElementById('rightButton').disabled = false;
}

// включение всех кнопок управления
function disableAllControlButtons() {
    document.getElementById('leftButton').disabled = true;
    document.getElementById('downButton').disabled = true;
    document.getElementById('rightButton').disabled = true;
}

function initializeGame(isTutorial = false) {
    usedCards = [];
    squares = [];
    playerScore = 0;
    isGameOver = false;
    currentLevel = 1;
    linesRemoved = 0;
    nextCard = getRandomCard();
    removedLineInfo = null;
    isPaused = false;  // В туториале карты не должны падать сразу
    fallInterval = 700;
    currentInterval =  fallInterval;  // В туториале скорость падения равна 0
    lastFallTime = 0;
    isTutorialMode = isTutorial;
    if (isTutorial) {
        tutorialStep = 0;
        document.getElementById('skipTutorialButton').style.display = 'block'; // Показываем кнопку Skip в туториале
    }
    squares.push(createNewSquare());
    document.getElementById('playAgainButton').style.display = 'none';
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('controls').style.display = 'flex'; // Показываем кнопки управления
}

function preloadFonts() {
    return document.fonts.ready;
}


// Функция для начала игры
function startGame() {

    drawLoadingScreen(0);
    Promise.all([preloadImages(), preloadFonts()]).then(() => {
        activateBackground();
        initializeGame(false);  // Инициализируем игру без туториала
        requestAnimationFrame(updateGame); // Запуск игрового цикла
    });
}

function startTutorial() {
    drawLoadingScreen(0);
    Promise.all([preloadImages(), preloadFonts()]).then(() => {
        activateBackground();
        initializeGame(true);  // Инициализируем игру без туториала
        requestAnimationFrame(updateTutorial); // Запуск игрового цикла
    });
}

// Функция для отрисовки окна помощи
function drawHelpWindow() {
    if (!isHelpOpen) return;

    const windowX = 3;
    const windowY = 5; // Отступ сверху 5px
    const windowWidth = canvas.width-10;
    const windowHeight = canvas.height - 7; // Корректируем высоту, чтобы не выходить за пределы
    const borderRadius = 10;

    ctx.save();
    ctx.globalAlpha = 0.95; // Прозрачность 95%
    
    // Градиентная заливка фона
    const gradient = ctx.createLinearGradient(windowX, windowY + windowHeight, windowX + windowWidth, windowY);
    gradient.addColorStop(0, '#1C1C1C');
    gradient.addColorStop(1, '#272727');
    ctx.fillStyle = gradient;

    ctx.strokeStyle = '#4A4A4A'; // Цвет обводки
    ctx.lineWidth = 4; // Толщина обводки

    // Рисуем закругленный прямоугольник
    ctx.beginPath();
    ctx.moveTo(windowX + borderRadius, windowY);
    ctx.lineTo(windowX + windowWidth - borderRadius, windowY);
    ctx.quadraticCurveTo(windowX + windowWidth, windowY, windowX + windowWidth, windowY + borderRadius);
    ctx.lineTo(windowX + windowWidth, windowY + windowHeight - borderRadius);
    ctx.quadraticCurveTo(windowX + windowWidth, windowY + windowHeight, windowX + windowWidth - borderRadius, windowY + windowHeight);
    ctx.lineTo(windowX + borderRadius, windowY + windowHeight);
    ctx.quadraticCurveTo(windowX, windowY + windowHeight, windowX, windowY + windowHeight - borderRadius);
    ctx.lineTo(windowX, windowY + borderRadius);
    ctx.quadraticCurveTo(windowX, windowY, windowX + borderRadius, windowY);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();

    // Заголовок окна помощи
    ctx.fillStyle = '#EFEFEF';
    ctx.font = '24px VT323';
    ctx.textAlign = 'center';
    ctx.fillText('Poker Combinations & Points', windowWidth / 2, windowY + 40);

    ctx.restore();
}

function toggleHelpWindow() {
    isHelpOpen = !isHelpOpen;
    isPaused = isHelpOpen;

    // Меняем видимость элементов управления
    const displayStyle = isHelpOpen ? 'hidden' : 'visible';
    const opacity = isHelpOpen ? '0' : '1';

    document.getElementById('leftButton').style.visibility = displayStyle;
    document.getElementById('downButton').style.visibility = displayStyle;
    document.getElementById('rightButton').style.visibility = displayStyle;
    document.getElementById('backToGameButton').style.display = isHelpOpen ? 'inline-block' : 'none';

    // Отключаем или включаем все кнопки управления
    if (isHelpOpen) {
        disableAllControlButtons();
    } else {
        enableAllControlButtons();
    }

    if (isHelpOpen) {
        drawHelpWindow();
    } else {
        requestAnimationFrame(updateGame);
    }
}

function addControlButtonListeners() {
    document.getElementById('leftButton').addEventListener('mousedown', moveLeft);
    document.getElementById('rightButton').addEventListener('mousedown', moveRight);
    document.getElementById('downButton').addEventListener('mousedown', () => currentInterval = fastFallInterval);
}

function removeControlButtonListeners() {
    document.getElementById('leftButton').removeEventListener('mousedown', moveLeft);
    document.getElementById('rightButton').removeEventListener('mousedown', moveRight);
    document.getElementById('downButton').removeEventListener('mousedown', () => currentInterval = fastFallInterval);
}

document.getElementById('backToGameButton').addEventListener('click', toggleHelpWindow);

canvas.addEventListener('click', (event) => {
    const rectX = infoX + 10;
    const rectY = infoY + rectMargin;
    const rectWidth = canvas.width / 3;
    const rectHeight = 60;
    const clickX = event.offsetX;
    const clickY = event.offsetY;

    // Проверка клика по области блока "Help"
    if (clickX >= rectX && clickX <= rectX + rectWidth && clickY >= rectY && clickY <= rectY + rectHeight) {
        toggleHelpWindow();  // Вызов функции toggleHelpWindow при клике на "Help"
    }
});

// Добавляем обработчик нажатия на кнопку "Skip Tutorial"
document.getElementById('skipTutorialButton').addEventListener('click', () => {
    document.getElementById('skipTutorialButton').style.display = 'none';  // Скрываем кнопку
    finishTutorial();  // Завершаем туториал и возвращаемся в главное меню
});

// Добавляем обработчик кликов и касаний на весь экран
canvas.addEventListener('click', handleScreenTap);
//canvas.addEventListener('touchstart', handleScreenTap);

// Функция для обработки нажатий на экран во время туториала
function handleScreenTap() {
  
    // На шаге 0 сразу переходим на следующий шаг
    if (isTutorialMode && (tutorialStep === 0 || tutorialStep === 5)) {
        tutorialStep++;
    }
    
    updateControlButtonsAccessibility();  // Обновляем кнопки после перехода на новый шаг
}

function clearButtonHighlights() {
    document.getElementById('leftButton').classList.remove('highlight');
    document.getElementById('rightButton').classList.remove('highlight');
    document.getElementById('downButton').classList.remove('highlight');
}

function checkTutorialStepCompletion() {
    if (tutorialTaskCompleted) {
        clearButtonHighlights(); // Сбрасываем подсветку кнопок перед переходом на следующий шаг
        tutorialStep++; // Переходим на следующий шаг
        updateControlButtonsAccessibility(); // открываем нужные кнопки
        tutorialTaskCompleted = false; // Сбрасываем флаг для следующего задания       
        hasHighlightedControls = false; // Сбрасываем флаг подсветки при переходе на новый шаг
    }
}

function drawCharacterImage(imgX, imgY, alpha = 1) {
    const characterImg = cardImages['Royle'];
    const imgWidth = 140;  // Ширина изображения
    const imgHeight = 140;  // Высота изображения

    ctx.save();  // Сохраняем текущее состояние контекста
    ctx.globalAlpha = alpha;  // Устанавливаем уровень прозрачности

    if (characterImg && characterImg.complete) {
        ctx.drawImage(characterImg, imgX, imgY, imgWidth, imgHeight);
    } else {
        console.error('Character image not loaded yet');
    }

    ctx.restore();  // Восстанавливаем контекст
}

function drawMessageBox(x, y, width, height, message, trianglePosition, alpha = 1) {
    ctx.save();  // Сохраняем текущее состояние контекста

    ctx.globalAlpha = alpha;  // Устанавливаем уровень прозрачности

    // Устанавливаем стиль для обводки и заливки
    ctx.fillStyle = '#E2DDD1'; // Цвет заливки
    ctx.strokeStyle = '#B7B7B7'; // Цвет обводки
    ctx.lineWidth = 4; // Толщина обводки

    // Рисуем прямоугольник с закругленными углами
    let R = 15;
    ctx.beginPath();
    ctx.moveTo(x + R, y);
    ctx.lineTo(x + width - R, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + R);
    ctx.lineTo(x + width, y + height - R);
    ctx.quadraticCurveTo(x + width, y + height, x + width - R, y + height);
    ctx.lineTo(x + R, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - R);
    ctx.lineTo(x, y + R);
    ctx.quadraticCurveTo(x, y, x + R, y);
    ctx.closePath();

    // Заливаем и рисуем обводку
    ctx.fill();
    ctx.stroke();

    // Логика для рисования треугольника в зависимости от позиции
    ctx.beginPath();
    switch (trianglePosition) {
        case 0:
            ctx.moveTo(x + 20, y + 5);  
            ctx.lineTo(x + 60, y - 30);  
            ctx.lineTo(x + 50, y + 5);  
            ctx.closePath();
            ctx.fill();
            break;
        case 1:
            ctx.moveTo(x + width - 60, y + 5);
            ctx.lineTo(x + width - 70, y - 30);
            ctx.lineTo(x + width - 30, y + 5);
            ctx.closePath();
            ctx.fill();
            break;
        default:
            break;
    }

    // Устанавливаем стиль для текста
    ctx.fillStyle = 'black';
    ctx.font = '20px "Playfair Display"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Функция для разделения текста на строки
    function wrapText(text, maxWidth) {
        const words = text.split(' ');
        let lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            let word = words[i];
            let width = ctx.measureText(currentLine + " " + word).width;
            if (width < maxWidth) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    }

    const lines = wrapText(message, width - 20);
    const lineHeight = 24;
    const textY = y + height / 2 - (lines.length * lineHeight) / 2 - 10;

    lines.forEach((line, index) => {
        ctx.fillText(line, x + width / 2, textY + (index + 1) * lineHeight);
    });

    ctx.restore();  // Восстанавливаем контекст
}

function showMessage(message, x, y, width, height, trianglePosition, alpha) {
    drawMessageBox(x, y, width, height, message, trianglePosition, alpha);
}

function showTutorialStep() {

    switch (tutorialStep) {
        case 0:
            drawCharacterImage(canvas.width / 2 - 140, 30, 0.9);  // Только картинка персонажа
            showMessage(
                "Howdy, partner! I'm Royle Branson, here to show you how to outplay 'em all.", 
                canvas.width / 2 - 160, // X координата
                210,                   // Y координата
                310,                   // Ширина
                120,                    // Высота
                0,                       // позиция хвостика облака
                0.9
            );
            drawStartButton("Next", canvas.width / 2 - 85, 420, 170, 50); // Рисуем кнопку "Start"
            step4Initialized = false;
            step6Initialized = false;
            break;
        
        case 1:
            drawCharacterImage(canvas.width/2 + 10 , 80, 0.9);  // Показ картинки с сообщением
            showMessage(
                "Let's move that card! Use the arrows to slide it left or right. Try it, partner!",
                canvas.width / 2 + 10, // X координата
                270,                   // Y координата
                140,                   // Ширина
                200,                    // Высота
                1,                       // Позиция хвостика облака
                0.9
            );
            
            // Вызываем подсветку кнопок только если она еще не была вызвана
            if (!hasHighlightedControls) {
                highlightLeftAndRightButtons(); // Подсветка кнопок влево и вправо
                hasHighlightedControls = true; // Устанавливаем флаг, чтобы подсветка выполнялась только один раз
            }
            break;

        case 2:
            drawCharacterImage(canvas.width/2 + 10 , 80, 0.9);  // Показ картинки с сообщением
            showMessage(
                "Lookin' good! Press down to drop the card faster. Try it!",
                canvas.width / 2 + 10, // X координата
                270,                   // Y координата
                140,                   // Ширина
                170,                    // Высота
                1,                       // Позиция хвостика облака
                0.9
            );   

            // Включаем подсветку кнопки вниз
            highlightDownButton();
            break;
        
        case 3:

            drawCharacterImage(canvas.width/2 + 10 , 80, 0.9);  // Показ картинки с сообщением
            showMessage(
                "Great job, partner! You nailed it!",
                canvas.width / 2 + 10, // X координата
                270,                   // Y координата
                140,                   // Ширина
                110,                    // Высота
                1,                       // Позиция хвостика облака
                0.9
            );


            break;

        case 4:

            // Проверяем, был ли уже инициализирован 4 шаг
            if (!step4Initialized) {
                // Удаляем все карты с поля перед размещением новых
                squares = [];
            
                // Размещаем 4 карты в нижнем ряду
                placeFourCardsAtBottom(["3c", "7d", "Ah", "Qs"]);
            
                // Устанавливаем туз крестей как следующую падающую карту
                fallingCard = {
                    x: gridX + 2 * cellWidth,  // Начальное положение (вторая колонка)
                    y: gridY,                  // Начальное положение сверху
                    card: {                    // Определяем масть и значение карты
                        suit: { name: 'clubs' }, // Масть крестей
                        value: 'A'               // Туз
                    },
                    image: getCardImage({ suit: { name: 'clubs' }, value: 'A' })  // Изображение карты Ac
                };
            
                // Добавляем карту Ac в массив падающих карт
                squares.push(fallingCard);
            
                // Отмечаем, что шаг 4 был инициализирован
                step4Initialized = true;
            }

            drawCharacterImage(canvas.width/2 + 10 , 80, 0.9);  // Показ картинки с сообщением
            // Изменяем сообщение в зависимости от того, была ли предыдущая попытка неудачной
            let message = wasAttemptFailed 
                ? "Missed it, partner! Try again and fill that bottom spot!"
                : "Time to shine! Fill that gap and make a full line.";

            showMessage(
                message,
                canvas.width / 2 + 10, // X координата
                270,                   // Y координата
                140,                   // Ширина
                160,                    // Высота
                1,                       // Позиция хвостика облака
                0.9
            );

            break;


        case 5:

            drawCharacterImage(canvas.width / 2 - 140, 30, 0.9); 
            showMessage(
                "Nice shootin'! You lined up 5 cards, hit a Pair, and cleared the row for 20 points. Keep ‘em combos comin', partner!", 
                canvas.width / 2 - 160, 210, 220, 180, 0, 0.9
            );

            // Координаты и размеры рамки для выделения сообщения о сожженной линии
            const frameX = gridX + gridWidth / 2 - 100;
            const frameY = gridY + removedLineInfo.row * cellHeight + cellHeight / 3 -10;
            const frameWidth = 200;
            const frameHeight = 40;

            // Вызов функции для рисования мигающей рамки
            drawFlashingFrame(frameX, frameY, frameWidth, frameHeight);

            // Координаты и размеры для информации о "Score" в информационном табло
            const scoreX = infoX + 10; // Используем те же значения, что и для информационного табло
            const scoreY = infoY + rectMargin * 3 + infoRectHeight * 2; // Положение блока "Score"
            const scoreWidth = rectWidth;
            const scoreHeight = infoRectHeight;

            // Вызов функции для рисования мигающей рамки вокруг информации о набранных очках
            drawFlashingFrame(scoreX, scoreY, scoreWidth, scoreHeight);

            // Отображаем кнопку "Continue" под сообщением персонажа
            drawStartButton("Next", canvas.width / 2 - 120, 410, 140, 50); // Рисуем кнопку "Start"

            break;

        case 6: 

            // Удаляем сообщение о сожженной линии перед началом нового задания
            removedLineInfo = null;
            // Проверяем, был ли уже инициализирован 4 шаг
            if (!step6Initialized) {
                // Удаляем все карты с поля перед размещением новых
                squares = [];
            
                // Размещаем 4 карты в нижнем ряду
                placeFourCardsAtBottom(["6h", "Ac", "Ah", "8s"]);
            
                // Устанавливаем туз крестей как следующую падающую карту
                fallingCard = {
                    x: gridX + 2 * cellWidth,  // Начальное положение (вторая колонка)
                    y: gridY,                  // Начальное положение сверху
                    card: {                    // Определяем масть и значение карты
                        suit: { name: 'clubs' }, // Масть крестей
                        value: '6'               // Туз
                    },
                    image: getCardImage({ suit: { name: 'clubs' }, value: '6' })  // Изображение карты Ac
                };
            
                // Добавляем карту 6c в массив падающих карт
                squares.push(fallingCard);
            
                // Отмечаем, что шаг 4 был инициализирован
                step6Initialized = true;
            }

            drawCharacterImage(canvas.width/2 + 10 , 80, 0.9);  // Показ картинки с сообщением
            // Изменяем сообщение в зависимости от того, была ли предыдущая попытка неудачной
            let messageForStep6 = wasAttemptFailed 
                ? "Missed it, partner! Try again and fill that bottom spot!"
                : "Place that card in the empty slot down there to hit Two Pair!";

            showMessage(
                messageForStep6,
                canvas.width / 2 + 10, // X координата
                270,                   // Y координата
                140,                   // Ширина
                160,                    // Высота
                1,                       // Позиция хвостика облака
                0.9
            );

            break;

        case 7:
            
        drawCharacterImage(canvas.width / 2 - 140, 30, 0.9); 
        showMessage(
            "Well done! That’s Two Pair! Higher combos bring higher points—tap that question mark top-right to check 'em out and move on!", 
            canvas.width / 2 - 160, 210, 220, 220, 0, 0.9
        );

        // Вызов функции для рисования мигающей рамки
        drawFlashingFrame(frameX, frameY, frameWidth, frameHeight);

        // Вызов функции для рисования мигающей рамки вокруг информации о набранных очках
        drawFlashingFrame(scoreX, scoreY, scoreWidth, scoreHeight);

        // Отображаем кнопку "Continue" под сообщением персонажа
        drawStartButton("Next", canvas.width / 2 - 120, 410, 140, 50); // Рисуем кнопку "Start"

        break;

        default:
            break;
    
            break;            
    }
}

// Функция для размещения 4 карт внизу экрана
function placeFourCardsAtBottom(cardStrings) {
    const suitMap = {
        'c': 'clubs',
        'd': 'diamonds',
        'h': 'hearts',
        's': 'spades'
    };

    cardStrings.forEach((cardString, index) => {
        // Разбираем строку: последняя буква — это масть, остальное — номинал карты
        const value = cardString.slice(0, -1);
        const suitChar = cardString.slice(-1);
        const suit = suitMap[suitChar];

        // Проверяем, существуют ли масть и номинал карты
        if (!suit || !value) {
            console.error(`Invalid card string: ${cardString}`);
            return;
        }

        const card = { suit: { name: suit }, value };
        const cardImage = getCardImage(card);

        if (!cardImage) {
            console.error(`Error: Image for card ${card.value}${card.suit.name[0]} not found.`);
            return;
        }

        // Добавляем карту в нижний ряд
        squares.push({
            x: gridX + (index + 1) * cellWidth, // Размещаем карты в ячейках 2, 3, 4 и 5 снизу
            y: gridY + 7 * cellHeight,          // Нижний ряд
            card,                               // Карта
            image: cardImage                    // Изображение карты
        });
    });
}

// Не забываем очищать таймер при завершении туториала или переходе на новый шаг
function clearTutorialStepTimeout() {
    if (tutorialStepTimeout) {
        clearTimeout(tutorialStepTimeout);
        tutorialStepTimeout = null;
    }
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
    const texts = ['Tips', 'Next card', `Level: ${currentLevel}`, `Score: ${playerScore}`, `Lines: ${linesRemoved}`];
    const valueColors = ['#33FF33', '#00FFFF', '#FF007F']; // Цвета для значений
    const borderRadius = 10; // Радиус закругления углов
    const borderWidth = 2; // Толщина обводки
    const iconSize = 70; // Размер иконок

    // Устанавливаем фиксированную высоту для каждого блока
    const topRectHeight = 60; // Высота блока Tips
    const nextCardRectHeight = infoRectHeight + 30; // Увеличенная высота блока Next card
    const lowerRectHeight = infoRectHeight; // Высота для нижних блоков

    // Фиксированный отступ между блоками
    const rectMargin = 10;

    // Начальная Y-позиция для первого блока
    let currentY = infoY + rectMargin;

    for (let i = 0; i < rectCount; i++) {
        const rectX = infoX + 10; // Отступ слева и справа
        const currentHeight = i === 0 ? topRectHeight : (i === 1 ? nextCardRectHeight : lowerRectHeight);

        // Рисуем закругленный прямоугольник с обводкой и тенью
        drawRoundedRectWithBorder(rectX, currentY, rectWidth, currentHeight, borderRadius, borderWidth);

        // Отрисовка содержимого блоков
        if (i === 0 && cardImages['HelpIcon']) { // Блок Tips
            const iconX = rectX + rectWidth / 2;
            const iconY = currentY + currentHeight / 2;
            ctx.drawImage(cardImages['HelpIcon'], iconX - 40, iconY - 40, 80, 80); // Увеличенная иконка
        }
        if (i === 1) { // Блок Next card
            const arrowX = rectX + rectWidth / 2;
            const arrowY = currentY + currentHeight / 4;
            drawNextCardArrow(arrowX, arrowY - 10, iconSize, iconSize);
            const cardX = rectX + rectWidth / 2;
            const cardY = currentY + currentHeight / 2 + 15;
            drawNextCard(cardX, cardY, cellWidth, cellHeight);
        }
        if (i > 1) { // Блоки уровня, очков и линий
            const textValue = texts[i].split(": ")[1];
            const color = valueColors[i - 2];
            const textX = rectX + rectWidth / 2;
            const textY = currentY + currentHeight / 2 + 25;
            drawTextWithNeonEffect(textValue, textX, textY, color);
        }

        // Отрисовка иконок для оставшихся блоков
        const iconX = rectX + rectWidth / 2;
        const iconY = currentY + currentHeight / 4;
        if (i === 2) drawLevelIcon(iconX, iconY, iconSize, iconSize);
        if (i === 3) drawScoreIcon(iconX, iconY, iconSize, iconSize);
        if (i === 4) drawLinesIcon(iconX, iconY, iconSize, iconSize);

        // Смещаем Y-позицию для следующего блока с учетом высоты текущего блока и фиксированного отступа
        currentY += currentHeight + rectMargin;
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
const helpIcon = new Image();
helpIcon.src = 'assets/images/HelpIcon.png'; // Укажите правильный путь к изображению

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
            'assets/images/tabletexture.png',
            'assets/images/cards/CardUu.png', // Карта единорога
            'assets/images/Royle.png',        // Изображение персонажа Royle
            'assets/images/HelpIcon.png',      // Новый значок справки
            'assets/images/ButtonBack.png'    // Кнопка "Back to Game"
        ];

        let loadedImagesCount = 0;
        const totalImages = imagesToLoad.length;

        imagesToLoad.forEach(src => {
            const img = new Image();
            img.src = src;

            img.onload = () => {
                loadedImagesCount++;
                const percentage = Math.floor((loadedImagesCount / totalImages) * 100);
                updateProgressBar(percentage);

                if (loadedImagesCount === totalImages) {
                    resolve(); // Все изображения и шрифт загружены
                }
            };

            img.onerror = () => {
                console.error(`Failed to load image: ${src}`);
            };

            if (src.includes('Royle.png')) {
                cardImages['Royle'] = img;
            }

            if (src.includes('HelpIcon.png')) {
                cardImages['HelpIcon'] = img; // Сохраняем изображение справки
            }

            if (src.includes('Card')) {
                const cardKey = src.match(/Card(\w+)\.png/)[1];
                cardImages[cardKey] = img;
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

        // Проверяем, находится ли игрок на шаге 2 туториала
        if (isTutorialMode && tutorialStep === 2) {
            tutorialTaskCompleted = true; // Отмечаем задание как выполненное
            checkTutorialStepCompletion(); // Проверяем выполнение задания и переходим на следующий шаг
        }

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

        // Проверяем, находится ли игрок на шаге 2 туториала
        if (isTutorialMode && tutorialStep === 2) {
            tutorialTaskCompleted = true; // Отмечаем задание как выполненное
            checkTutorialStepCompletion(); // Проверяем выполнение задания и переходим на следующий шаг
        }

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

            // Проверяем, находится ли игрок на шаге 2 туториала
            if (isTutorialMode && tutorialStep === 2) {
                tutorialTaskCompleted = true; // Отмечаем задание как выполненное
                checkTutorialStepCompletion(); // Проверяем выполнение задания и переходим на следующий шаг
            }

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
            document.getElementById('downButton').classList.add('pressed');
            currentInterval = fastFallInterval;

    }
});



// Функция для перемещения влево
function moveLeft() {
    const currentSquare = squares[squares.length - 1];
    if (!isGameOver && !isPaused && currentSquare.x > gridX && !checkCollisionSide(currentSquare, 'left')) {
        currentSquare.x -= cellWidth;
        if (isTutorialMode && tutorialStep === 1) {
            tutorialTaskCompleted = true; // Игрок выполнил задание по перемещению карты
            checkTutorialStepCompletion(); // Проверяем завершение шага
        }
    }
}

// Функция для перемещения вправо
function moveRight() {
    const currentSquare = squares[squares.length - 1];
    if (!isGameOver && !isPaused && currentSquare.x < gridX + 4 * cellWidth && !checkCollisionSide(currentSquare, 'right')) {
        currentSquare.x += cellWidth;
        if (isTutorialMode && tutorialStep === 1) {
            tutorialTaskCompleted = true; // Игрок выполнил задание по перемещению карты
            checkTutorialStepCompletion(); // Проверяем завершение шага
        }
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
        if (numericValues[0] === 10 && numericValues[4] === 14) {
            return { name: 'Royal Flush', points: 1000 };
        } else {
            return { name: 'Str. Flush', points: 500 };
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

                if (scoreInfo.name === 'Flush' || scoreInfo.name === 'Full House' || scoreInfo.name === '4 of a Kind' || scoreInfo.name === 'Str. Flush' || scoreInfo.name === 'Royal Flush') {
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


                // Добавляем проверку на шаг туториала
                if (!(isTutorialMode && tutorialStep === 5)) {
                    removedLineInfo = null; // Только если не на шаге 5
                }

                isPaused = false;
                if (isTutorialMode) requestAnimationFrame(updateTutorial); 
                else requestAnimationFrame(updateGame);
            }
        }, 1000);
    }

    return lineRemoved;
}

// Функция для проверки условия окончания игры
function checkGameOver() {

    if (isTutorialMode)
    { 
        isGameOver = false;
        return;
    }

    const middleColumnX = gridX + 2 * cellWidth;

    const isMiddleColumnFull = squares.some(square => 
        square.x === middleColumnX && 
        square.y === gridY &&
        checkCollision(square)
    );

    if (isMiddleColumnFull) {
        isGameOver = true;

        // Скрываем кнопки управления, но сохраняем высоту контейнера
        document.getElementById('leftButton').style.display = 'none';
        document.getElementById('downButton').style.display = 'none';
        document.getElementById('rightButton').style.display = 'none';
        
        // Показываем кнопку Play Again
        document.getElementById('playAgainButton').style.display = 'inline-block';

        saveGameResult(playerName, playerScore, currentLevel, linesRemoved);
    }
}

document.getElementById('playAgainButton').addEventListener('click', () => {
    // Скрываем кнопку Play Again и показываем кнопки управления при перезапуске
    document.getElementById('playAgainButton').style.display = 'none';
    document.getElementById('leftButton').style.display = 'flex';
    document.getElementById('downButton').style.display = 'flex';
    document.getElementById('rightButton').style.display = 'flex';
    startGame(); // Перезапуск игры
});

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
    ctx.fillText('Score:', rectX + rectWidth / 2, rectY + 90);
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
    
    const isUnicornCard = Math.random() < 1 / 1000000; 

    // Загружаем заранее предзагруженное изображение
    let cardImage;
    if (isUnicornCard) {
        cardImage = cardImages['Uu']; // Используем предзагруженную картинку единорога
    } else {
        cardImage = getCardImage(card); // Стандартная карта
    }

    return {
        x: gridX + 2 * cellWidth,
        y: gridY,
        card, // Сохраняем оригинальные данные карты
        image: cardImage  // Используем предзагруженное изображение карты
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

    // Проверка на туториал
    if (!(isTutorialMode && stepsWithoutFallingCards.has(tutorialStep))) {
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
    }

    // Отрисовка информации в прямоугольниках с закругленными углами
    drawInfoRectangles();

    drawRemovedLineInfo();

    if (isGameOver) {
        drawGameOver();
    }
}

// Функция для отрисовки следующей карты
function drawNextCard(cardX, cardY, cardWidth, cardHeight) {

    if (isTutorialMode && tutorialStep <= 5) {
        // Не отображаем следующую карту на первых шагах туториала
        return;
    }

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

function highlightButton(buttonId, duration, nextStep) {
    // Находим кнопку по ID
    const button = document.getElementById(buttonId);

    // Добавляем класс для подсветки кнопки
    button.classList.add('highlight');

    // Через заданное время убираем подсветку и запускаем следующий шаг
    setTimeout(() => {
        button.classList.remove('highlight');
        if (nextStep) {
            nextStep();  // Переходим к следующему шагу
        }
    }, duration);
}

// Подсветка кнопки вниз с циклом мигания
function highlightDownButton() {
    // Проверяем, выполнено ли задание для шага 2 или изменился ли шаг
    if (tutorialTaskCompleted || tutorialStep !== 2) {
        document.getElementById('downButton').classList.remove('highlight');
        return;
    }

    // Подсвечиваем кнопку и продолжаем подсветку с циклом
    highlightButton('downButton', 1000, () => {
        if (!tutorialTaskCompleted && tutorialStep === 2) {
            highlightDownButton(); // Продолжаем подсветку, пока задание не выполнено
        }
    });
}

function highlightLeftAndRightButtons() {
    if (tutorialTaskCompleted || tutorialStep !== 1) {
        // Если задание выполнено, убираем подсветку кнопок
        document.getElementById('leftButton').classList.remove('highlight');
        document.getElementById('rightButton').classList.remove('highlight');
        return;
    }

    // Включаем подсветку для кнопок влево и вправо
    document.getElementById('leftButton').classList.add('highlight');
    document.getElementById('rightButton').classList.add('highlight');
}

// Вызываем функцию отрисовки в игровом цикле
function updateGame(time) {

    if (isGameOver || isPaused) return;

    const currentSquare = squares[squares.length - 1];

    // Дополнительная проверка на случай залипания
    if (!document.getElementById('downButton').classList.contains('pressed')) {
        currentInterval = fallInterval;  // Если кнопка "вниз" не нажата, сбрасываем скорость
    }

    if (time - lastFallTime > currentInterval) {
        if (currentSquare.y + cellHeight < gridY + gridHeight && !checkCollision(currentSquare)) {
            currentSquare.y += cellHeight;
        } else {
            if (!checkAndRemoveFullLines()) {
                squares.push(createNewSquare());
            }

            checkGameOver();  // Проверка на Game Over только в обычном режиме игры
        }
        lastFallTime = time;
    }

    drawGame();
    if (!isPaused) {
        requestAnimationFrame(updateGame);
    }
}

function updateControlButtonsAccessibility() {
    if (tutorialStep === 0) {
        document.getElementById('leftButton').disabled = true;
        document.getElementById('downButton').disabled = true;
        document.getElementById('rightButton').disabled = true;
    } else if (tutorialStep === 1) {
        document.getElementById('leftButton').disabled = false;
        document.getElementById('rightButton').disabled = false;
        document.getElementById('downButton').disabled = true;
    } else if (tutorialStep === 2) {
        document.getElementById('leftButton').disabled = false;
        document.getElementById('rightButton').disabled = false;
        document.getElementById('downButton').disabled = false; // Делаем кнопку вниз доступной на шаге 2
    } else {
        document.getElementById('leftButton').disabled = false;
        document.getElementById('downButton').disabled = false;
        document.getElementById('rightButton').disabled = false;
    }
}

// Цикл обновления для туториала
function updateTutorial(time) {

    const currentSquare = squares[squares.length - 1];

    // Дополнительная проверка на случай залипания
    if (!document.getElementById('downButton').classList.contains('pressed')) {
        currentInterval = fallInterval;  // Если кнопка "вниз" не нажата, сбрасываем скорость
    }

    // В зависимости от шага туториала выполняем разные действия
    switch (tutorialStep) {
        case 0:
            // На первом шаге карта не должна падать, только отображаем персонажа и текст
            break;
        case 1:
            // На втором шаге карты пока не могут начинать падать
            break;
        case 2:
        case 3:
        case 4:
            if (time - lastFallTime > currentInterval) {
                if (currentSquare.y + cellHeight < gridY + gridHeight && !checkCollision(currentSquare)) {
                    currentSquare.y += cellHeight;
                } else {
                    // Проверяем, если карта достигла нижнего ряда на шаге 3
                    if (tutorialStep === 3) {
                        tutorialTaskCompleted = true; // Задание завершено
                        checkTutorialStepCompletion(); // Переходим на следующий шаг
                    }

                    // Проверяем, если карта достигла нижнего ряда на шаге 4 и шаг 4 инициализирован
                    if (tutorialStep === 4 && step4Initialized) {
         
                        const isInLeftCell = fallingCard.x === gridX;
                        if (isInLeftCell) {
                            // Если карта попала в крайнюю левую клетку и линия сожжена, переходим на следующий шаг
                            wasAttemptFailed = false;
                            tutorialTaskCompleted = true;
                            checkTutorialStepCompletion();
                        } else if (!isInLeftCell) {
                            // Если карта не попала в крайнюю левую клетку, перезапускаем шаг
                            step4Initialized = false;
                            tutorialTaskCompleted = false;
                            wasAttemptFailed = true; // Отмечаем, что попытка была неудачной
                        }
                    }

                    if (!checkAndRemoveFullLines()) {
                        squares.push(createNewSquare());
                    }
                }

                lastFallTime = time;
            }
            break;

        case 5:
            break;
        case 6:
            if (time - lastFallTime > currentInterval) {
                if (currentSquare.y + cellHeight < gridY + gridHeight && !checkCollision(currentSquare)) {
                    currentSquare.y += cellHeight;
                } else {

                    // Проверяем, если карта достигла нижнего ряда на шаге 4 и шаг 4 инициализирован
                    if (tutorialStep === 6 && step6Initialized) {
         
                        const isInLeftCell = fallingCard.x === gridX;
                        if (isInLeftCell) {
                            // Если карта попала в крайнюю левую клетку и линия сожжена, переходим на следующий шаг
                            wasAttemptFailed = false;
                            tutorialTaskCompleted = true;
                            checkTutorialStepCompletion();
                        } else if (!isInLeftCell) {
                            // Если карта не попала в крайнюю левую клетку, перезапускаем шаг
                            step6Initialized = false;
                            tutorialTaskCompleted = false;
                            wasAttemptFailed = true; // Отмечаем, что попытка была неудачной
                        }
                    }

                    if (!checkAndRemoveFullLines()) {
                        squares.push(createNewSquare());
                    }
                }

                lastFallTime = time;
            }

        default:
            // на этом шаге пока не падает карта
            break;
        // Добавьте дополнительные шаги туториала, если необходимо
    }

    drawGame();  // Отрисовка игрового состояния

    showTutorialStep();  // Отрисовка текущего шага туториала

    // Если туториал еще не завершён, продолжаем цикл
    if (!isPaused) {
        requestAnimationFrame(updateTutorial);
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
document.getElementById('startButton').addEventListener('click', () => {
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('gameWrapper').style.display = 'flex';
    enableAllControlButtons();  // Разблокируем все кнопки для обычной игры
    startGame(); // Запуск игры
});

document.getElementById('howToPlayButton').addEventListener('click', () => {
    document.getElementById('mainMenu').style.display = 'none';  // Скрываем главное меню
    document.getElementById('gameWrapper').style.display = 'flex';  // Показываем игровое поле
    disableAllControlButtons();  // Заблокируем все кнопки в начале туториала
    startTutorial();  // Запуск туториала
});

document.addEventListener('keydown', (event) => {
    if (isTutorialMode) {

        // Добавляйте условия для следующих шагов туториала
    } else {
        // Обычная логика игры
    }
});

// Функция для рисования кнопки "Start" под сообщением персонажа
function drawStartButton(buttonText = "Start", x = canvas.width / 2 - 100, y = 400, width = 170, height = 50) {
    const borderRadius = 15;

    ctx.save();
    ctx.globalAlpha = 0.9;

    // Устанавливаем цвет заливки и обводки
    ctx.fillStyle = '#E2DDD1';
    ctx.strokeStyle = '#B7B7B7';
    ctx.lineWidth = 4;

    // Рисуем прямоугольник с закругленными углами
    ctx.beginPath();
    ctx.moveTo(x + borderRadius, y);
    ctx.lineTo(x + width - borderRadius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + borderRadius);
    ctx.lineTo(x + width, y + height - borderRadius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - borderRadius, y + height);
    ctx.lineTo(x + borderRadius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - borderRadius);
    ctx.lineTo(x, y + borderRadius);
    ctx.quadraticCurveTo(x, y, x + borderRadius, y);
    ctx.closePath();

    // Заливаем и рисуем обводку
    ctx.fill();
    ctx.stroke();

    // Текст на кнопке
    ctx.fillStyle = 'black';
    ctx.font = '20px "Playfair Display"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(buttonText, x + width / 2, y + height / 2);

    // Подчеркивание текста
    ctx.beginPath();
    const textWidth = ctx.measureText(buttonText).width;
    ctx.moveTo(x + (width - textWidth) / 2, y + height / 2 + 10);
    ctx.lineTo(x + (width + textWidth) / 2, y + height / 2 + 10);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
}
function finishTutorial() {
    isTutorialMode = false;  // Отключаем режим туториала
    document.getElementById('gameWrapper').style.display = 'none';  // Скрываем игровое поле
    document.getElementById('mainMenu').style.display = 'block';  // Возвращаем главное меню
}

function drawFlashingFrame(x, y, width, height, borderRadius = 5) {
    // Настройка цвета и прозрачности рамки
    ctx.save();
    ctx.lineWidth = 4;
    ctx.strokeStyle = `rgba(0, 128, 0, ${frameOpacity})`;

    // Задаем пунктирный стиль: длина штриха и пробела
    ctx.setLineDash([6, 2]);

    // Рисуем прямоугольник с закругленными углами
    ctx.beginPath();
    ctx.moveTo(x + borderRadius, y);
    ctx.lineTo(x + width - borderRadius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + borderRadius);
    ctx.lineTo(x + width, y + height - borderRadius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - borderRadius, y + height);
    ctx.lineTo(x + borderRadius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - borderRadius);
    ctx.lineTo(x, y + borderRadius);
    ctx.quadraticCurveTo(x, y, x + borderRadius, y);
    ctx.closePath();

    // Отрисовываем рамку
    ctx.stroke();
    ctx.restore();

    // Обновление значения frameOpacity для анимации
    frameOpacity += frameDirection * blinkSpeed;  // Используем blinkSpeed для контроля частоты

    if (frameOpacity <= 0 || frameOpacity >= 1) {
        frameDirection *= -1; // Меняем направление при достижении крайних значений
    }
}