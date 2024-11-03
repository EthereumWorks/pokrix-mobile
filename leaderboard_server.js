const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const app = express();
const port = 3001;

const dbPath = 'database.sqlite';

app.use(cors({ origin: '*' })); // Разрешение для всех доменов

// Маршрут для получения данных лидерборда
app.get('/api/leaderboard', (req, res) => {
    console.log("Received request for leaderboard data");
    const db = new sqlite3.Database(dbPath);
    db.all('SELECT player_name, score, level, lines_removed FROM Scores ORDER BY score DESC LIMIT 10', (err, rows) => {
        if (err) {
            console.error('Database error:', err.message);
            res.status(500).json({ error: 'Server error' });
        } else {
            console.log("Sending JSON response:", JSON.stringify(rows));
            res.json(rows);
        }
        db.close();
    });
});

app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});
