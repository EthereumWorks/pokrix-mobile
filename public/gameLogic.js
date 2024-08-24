const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Получаем имя пользователя из URL-параметров
const urlParams = new URLSearchParams(window.location.search);
const playerName = urlParams.get('username') || 'Player';

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
    currentInterval = fallInterval;
    squares.push(createNewSquare());
    document.getElementById('playAgainButton').style.display = 'none';
    document.getElementById('controls').style.display = 'flex';
    requestAnimationFrame(updateGame);
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

// Функция для создания новой карты
function createNewSquare() {
    const card = nextCard;
    if (!card) {
        isGameOver = true;
        return null;
    }
    nextCard = getRandomCard();
    return {
        x: gridX + 2 * cellWidth,
        y: gridY,
        card
    };
}

// Добавление обработчиков событий в зависимости от устройства
if (isMobile) {
    document.getElementById('leftButton').addEventListener('touchstart', moveLeft);
    document.getElementById('rightButton').addEventListener('touchstart', moveRight);
    document.getElementById('downButton').addEventListener('touchstart', () => {
        currentInterval = fastFallInterval;
    });
    document.getElementById('downButton').addEventListener('touchend', () => {
        currentInterval = fallInterval;
    });
} else {
    document.getElementById('leftButton').addEventListener('click', moveLeft);
    document.getElementById('rightButton').addEventListener('click', moveRight);
    document.getElementById('downButton').addEventListener('mousedown', () => {
        currentInterval = fastFallInterval;
    });
    document.getElementById('downButton').addEventListener('mouseup', () => {
        currentInterval = fallInterval;
    });
}

// Обработка событий нажатия клавиш
document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'ArrowLeft':
            moveLeft();
            break;
        case 'ArrowRight':
            moveRight();
            break;
        case 'ArrowDown':
            currentInterval = fastFallInterval;
            break;
    }
});

document.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowDown') {
        currentInterval = fallInterval;
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
    const isStraight = numericValues.every((value, index) => index === 0 || value === numericValues[index - 1] + 1 || (numericValues.includes(2) && numericValues.includes(14)));

    const valueCounts = numericValues.reduce((acc, value) => {
        acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {});

    const counts = Object.values(valueCounts).sort((a, b) => b - a);

    if (isStraight && isFlush && numericValues[0] === 10) return { name: 'Royal Flush', points: 1000 };
    if (isStraight && isFlush) return { name: 'Straight Flush', points: 500 };
    if (counts[0] === 4) return { name: '4 of a Kind', points: 250 };
    if (counts[0] === 3 && counts[1] === 2) return { name: 'Full House', points: 150 };
    if (isFlush) return { name: 'Flush', points: 100 };
    if (isStraight) return { name: 'Straight', points: 80 };
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

            // Проверка на то, что после удаления линии нет никаких карт, упирающихся в верхнюю границу
            squares.forEach(square => {
                if (square.y === gridY) {
                    isGameOver = true;
                }
            });

            if (squares.length === 0) {
                squares.push(createNewSquare());
            }

            removedLineInfo = null;
            isPaused = false;

            if (!isGameOver) {
                requestAnimationFrame(updateGame);
            } else {
                drawGameOver();
            }
        }, 1000);
    }

    return lineRemoved;
}


// Функция для проверки условия окончания игры
function checkGameOver() {
    const currentSquare = squares[squares.length - 1];
    if (currentSquare.y === gridY && checkCollision(currentSquare)) {
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

function drawNextCard() {
    if (nextCard) {
        ctx.font = '22px "Arial Black", system-ui';
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.fillText('Next card:', infoX + infoWidth / 2, infoY + 30);

        const nextCardX = infoX + infoWidth / 2 - cellWidth / 2;
        const nextCardY = infoY + 70;

        ctx.fillStyle = nextCard.suit.color;
        ctx.fillRect(nextCardX, nextCardY, cellWidth, cellHeight);

        ctx.fillStyle = 'white';
        ctx.font = '20px Verdana';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(nextCard.value, nextCardX + cellWidth / 2, nextCardY + cellHeight / 2);

        ctx.font = '16px Verdana';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(getSuitSymbol(nextCard.suit.name), nextCardX + cellWidth - 4, nextCardY + 4);
    }
}

function drawScore() {
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';

    const offsetY = 140;

    ctx.font = '22px "Arial Black", system-ui';
    ctx.fillText('Level', infoX + infoWidth / 2, infoY + offsetY + 30);
    ctx.font = '36px "Arial Black", system-ui';
    ctx.fillText(`${currentLevel}`, infoX + infoWidth / 2, infoY + offsetY + 60);

    ctx.font = '22px "Arial Black", system-ui';
    ctx.fillText('Score', infoX + infoWidth / 2, infoY + offsetY + 130);
    ctx.font = '36px "Arial Black", system-ui';
    ctx.fillText(`${playerScore}`, infoX + infoWidth / 2, infoY + offsetY + 160);

    ctx.font = '22px "Arial Black", system-ui';
    ctx.fillText('Lines', infoX + infoWidth / 2, infoY + offsetY + 230);
    ctx.font = '36px "Arial Black", system-ui';
    ctx.fillText(`${linesRemoved}`, infoX + infoWidth / 2, infoY + offsetY + 260);
}

function drawRemovedLineInfo() {
    if (removedLineInfo) {
        ctx.font = '24px "Arial Black", system-ui';
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';

        ctx.fillText(
            `${removedLineInfo.name} +${removedLineInfo.points} points`,
            gridX + gridWidth / 2,
            gridY + removedLineInfo.row * cellHeight + cellHeight / 3
        );
    }
}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'lightgray';
    ctx.fillRect(gridX, gridY, gridWidth, gridHeight);

    ctx.strokeStyle = '#E6E6FA';
    ctx.lineWidth = 1;

    for (let i = 1; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(gridX + i * cellWidth, gridY);
        ctx.lineTo(gridX + i * cellWidth, gridY + gridHeight);
        ctx.stroke();
    }

    for (let i = 1; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(gridX, gridY + i * cellHeight);
        ctx.lineTo(gridX + gridWidth, gridY + i * cellHeight);
        ctx.stroke();
    }

    squares.forEach(square => {
        ctx.fillStyle = square.card.suit.color;
        ctx.fillRect(square.x, square.y, cellWidth, cellHeight);

        ctx.fillStyle = 'white';
        ctx.font = '20px Verdana';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(square.card.value, square.x + cellWidth / 2, square.y + cellHeight / 2);

        ctx.font = '16px Verdana';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(getSuitSymbol(square.card.suit.name), square.x + cellWidth - 4, square.y + 4);
    });

    drawNextCard();
    drawScore();
    drawRemovedLineInfo();

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

document.getElementById('playAgainButton').addEventListener('click', () => {
    startGame();
});
