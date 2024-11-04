document.addEventListener('DOMContentLoaded', () => {
    const leaderboardContainer = document.getElementById('leaderboardContainer');
    const leaderboardCanvas = document.getElementById('leaderboardCanvas');
    const leaderboardCtx = leaderboardCanvas.getContext('2d');
    const backToMenuButton = document.getElementById('backToMenuButton');

    // Создаём элемент "Loading" и настраиваем его стиль
    const loadingText = document.createElement('div');
    loadingText.innerText = 'Loading...';
    loadingText.style.position = 'absolute';
    loadingText.style.top = '50%';
    loadingText.style.left = '50%';
    loadingText.style.transform = 'translate(-50%, -50%)';
    loadingText.style.fontSize = '24px';
    loadingText.style.color = '#FFFFFF';
    loadingText.style.fontFamily = "'VT323', monospace"; // Применяем шрифт VT323
    loadingText.style.display = 'none';
    document.body.appendChild(loadingText);

    if (!leaderboardContainer || !leaderboardCanvas || !backToMenuButton) {
        console.log("Error: Missing elements in the DOM.");
        return;
    }

    backToMenuButton.style.position = 'absolute';
    backToMenuButton.style.bottom = '30px';
    backToMenuButton.style.left = '50%';
    backToMenuButton.style.transform = 'translateX(-50%)';

    async function showLeaderboard() {
        document.getElementById('mainMenu').style.display = 'none';
        loadingText.style.display = 'block'; // Показываем "Loading" перед загрузкой
        try {
            await fetchLeaderboardData(); // Подгружаем данные
            loadingText.style.display = 'none'; // Скрываем "Loading" после загрузки
            leaderboardContainer.style.display = 'block';
            drawLeaderboardHeader();
            drawHorizontalLine();
        } catch (error) {
            console.error("Error fetching leaderboard data:", error);
            loadingText.innerText = 'Failed to load leaderboard. Please try again later.';
        }
    }

    function hideLeaderboard() {
        console.log("Hiding leaderboard, returning to main menu");
        leaderboardContainer.style.display = 'none';
        document.getElementById('mainMenu').style.display = 'flex';
    }

    const leaderboardButton = document.getElementById('lboardButton');
    if (leaderboardButton) {
        leaderboardButton.addEventListener('click', showLeaderboard);
        backToMenuButton.addEventListener('click', hideLeaderboard);
    } else {
        console.log("Leaderboard button not found.");
    }

    console.log("Event listeners added to buttons");

    async function fetchLeaderboardData() {
        try {
            console.log("Attempting to fetch leaderboard data...");
    
            // Попытка выполнить запрос на указанный URL с заголовком для пропуска предупреждения
            const response = await fetch('https://5f61-77-238-242-192.ngrok-free.app/api/leaderboard', {
                mode: 'cors',
                headers: {
                    'ngrok-skip-browser-warning': 'true' // добавляем заголовок для пропуска предупреждения
                }
            });
    
            // Проверка на успешный ответ от сервера
            if (!response.ok) {
                console.error(`Network response was not ok. Status: ${response.status}`);
                throw new Error('Network response was not ok');
            }
    
            // Получаем тело ответа как текст и выводим его в консоль
            const responseBody = await response.text();
            console.log("Response body:", responseBody); // Полный вывод содержимого ответа
    
            // Проверяем, является ли содержимое JSON
            try {
                const leaderboardData = JSON.parse(responseBody);
                console.log("Parsed leaderboard data:", leaderboardData);
                drawLeaderboardTable(leaderboardData);
            } catch (error) {
                console.error("Error parsing JSON:", error);
                console.log("Non-JSON response body:", responseBody); // Вывод тела ответа для анализа
                throw new Error("Received non-JSON response");
            }
    
        } catch (error) {
            console.error("Error fetching leaderboard data:", error);
        }
    }

    function drawLeaderboardHeader() {
        const gradient = leaderboardCtx.createLinearGradient(0, 85, leaderboardCanvas.width, 0);
        gradient.addColorStop(0, '#2A2A2A');
        gradient.addColorStop(1, '#333333');
        leaderboardCtx.fillStyle = gradient;
        leaderboardCtx.fillRect(0, 0, leaderboardCanvas.width, 85);

        leaderboardCtx.font = '30px "VT323", monospace';
        leaderboardCtx.fillStyle = '#EFEFEF';
        leaderboardCtx.shadowColor = 'rgba(26, 26, 26, 0.5)';
        leaderboardCtx.shadowOffsetX = -1;
        leaderboardCtx.shadowOffsetY = 1;
        leaderboardCtx.shadowBlur = 2;
        leaderboardCtx.textAlign = 'center';
        leaderboardCtx.fillText('Leaderboard', leaderboardCanvas.width / 2, 40);

        leaderboardCtx.lineWidth = 3;
        leaderboardCtx.strokeStyle = '#EFEFEF';

        leaderboardCtx.beginPath();
        leaderboardCtx.moveTo((leaderboardCanvas.width / 2) - 60, 70);
        leaderboardCtx.lineTo((leaderboardCanvas.width / 2) - 160, 70);
        leaderboardCtx.stroke();

        leaderboardCtx.beginPath();
        leaderboardCtx.moveTo((leaderboardCanvas.width / 2) + 60, 70);
        leaderboardCtx.lineTo((leaderboardCanvas.width / 2) + 160, 70);
        leaderboardCtx.stroke();

        leaderboardCtx.font = '20px "Noto Sans Symbols2"';
        leaderboardCtx.shadowBlur = 1;
        leaderboardCtx.fillText('♚ ♚ ♚', leaderboardCanvas.width / 2, 75);
    }

    function drawHorizontalLine() {
        leaderboardCtx.lineWidth = 2;
        leaderboardCtx.strokeStyle = '#555555';
        leaderboardCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        leaderboardCtx.shadowOffsetY = 2;
        leaderboardCtx.shadowBlur = 4;

        leaderboardCtx.beginPath();
        leaderboardCtx.moveTo(0, 85);
        leaderboardCtx.lineTo(leaderboardCanvas.width, 85);
        leaderboardCtx.stroke();

        leaderboardCtx.shadowColor = 'transparent';
        leaderboardCtx.shadowOffsetY = 0;
        leaderboardCtx.shadowBlur = 0;
    }

    function drawLeaderboardTable(leaderboardData) {
        const startY = 85;
        const headerHeight = 55;
        const rowHeight = 41;
        const numRows = leaderboardData.length;
    
        leaderboardCtx.fillStyle = '#242424';
        leaderboardCtx.fillRect(0, startY, leaderboardCanvas.width, headerHeight);
    
        leaderboardCtx.font = '20px "VT323", monospace';
        leaderboardCtx.fillStyle = '#F3FB85';
        leaderboardCtx.textAlign = 'center';
    
        const columnWidths = {
            number: 40,
            playerName: 150,
            points: 70,
            level: 40,
            lines: 50
        };
    
        const columnPositions = [
            columnWidths.number / 2,
            columnWidths.number + columnWidths.playerName / 2,
            leaderboardCanvas.width - columnWidths.points - columnWidths.level - columnWidths.lines + columnWidths.points / 2,
            leaderboardCanvas.width - columnWidths.level - columnWidths.lines + columnWidths.level / 2,
            leaderboardCanvas.width - columnWidths.lines / 2
        ];
    
        leaderboardCtx.fillText("№", columnPositions[0], startY + 35);
        leaderboardCtx.textAlign = 'left';
        leaderboardCtx.fillText("Top Players:", columnPositions[1] - columnWidths.playerName / 2 + 10, startY + 35);
        
        leaderboardCtx.textAlign = 'center';
    
        // Иконки в заголовке
        const icons = [
            { src: 'assets/images/dollar_icon.png', x: columnPositions[2] - 20, y: startY + 8 },
            { src: 'assets/images/arrowup.png', x: columnPositions[3] - 20, y: startY + 8 },
            { src: 'assets/images/lines.png', x: columnPositions[4] - 20, y: startY + 8 }
        ];
    
        icons.forEach(iconData => {
            const iconImage = new Image();
            iconImage.src = iconData.src;
            iconImage.onload = () => {
                leaderboardCtx.drawImage(iconImage, iconData.x, iconData.y, 40, 40);
            };
        });
    
        // Строки с данными игроков
        for (let i = 0; i < numRows; i++) {
            const y = startY + headerHeight + i * rowHeight;
            leaderboardCtx.fillStyle = i % 2 === 0 ? '#333333' : '#444444';
            leaderboardCtx.fillRect(0, y, leaderboardCanvas.width, rowHeight);
    
            leaderboardCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            leaderboardCtx.shadowOffsetX = -1;
            leaderboardCtx.shadowOffsetY = 1;
            leaderboardCtx.shadowBlur = 4;
    
            leaderboardCtx.fillStyle = '#F3FB85';
    
            // Рисуем медали и выравниваем их по центру
            const positionText = i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1;
            leaderboardCtx.fillText(positionText, columnPositions[0], y + rowHeight / 2 + 8);
    
            // Выровненные по левому краю имена игроков
            leaderboardCtx.textAlign = 'left';
            leaderboardCtx.fillText(leaderboardData[i].player_name, columnPositions[1] - columnWidths.playerName / 2 + 10, y + rowHeight / 2 + 8);
            
            leaderboardCtx.textAlign = 'center';
            leaderboardCtx.shadowColor = 'transparent';
            leaderboardCtx.fillStyle = '#00FFFF';
            leaderboardCtx.fillText(leaderboardData[i].score, columnPositions[2], y + rowHeight / 2 + 8);
            leaderboardCtx.fillStyle = '#33FF33';
            leaderboardCtx.fillText(leaderboardData[i].level, columnPositions[3], y + rowHeight / 2 + 8);
            leaderboardCtx.fillStyle = '#FF007F';
            leaderboardCtx.fillText(leaderboardData[i].lines_removed, columnPositions[4], y + rowHeight / 2 + 8);

        }

        
    }

});
