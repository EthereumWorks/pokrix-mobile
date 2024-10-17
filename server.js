const express = require('express');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();

// Указываем статическую папку
app.use(express.static(path.join(__dirname, 'public')));

// Парсинг JSON для работы с API
app.use(express.json());

// Подключение к базе данных SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'), // Указываем путь к файлу базы данных
});

// Определение модели для хранения результатов
const Score = sequelize.define('Score', {
  player_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  level: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  lines_removed: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW,
  },
}, {
  timestamps: false,
});

// Синхронизация модели с базой данных
sequelize.sync();

// Обслуживание главной страницы игры
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API для сохранения результатов игры
app.post('/api/scores', async (req, res) => {
  try {
    const { player_name, score, level, lines_removed } = req.body;
    const newScore = await Score.create({ player_name, score, level, lines_removed });
    res.status(201).json(newScore);
  } catch (error) {
    console.error('Failed to save score:', error);
    res.status(500).json({ error: 'Failed to save score' });
  }
});

// API для получения топ-игроков
app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboard = await Score.findAll({
      order: [['score', 'DESC']],
      limit: 10, // Возвращаем топ-10
    });
    res.status(200).json(leaderboard);
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// API для получения топ-1000 игроков
app.get('/api/top1000', async (req, res) => {
    try {
        const leaderboard = await Score.findAll({
            order: [['score', 'DESC']],
            limit: 1000, // Возвращаем топ-1000
        });
        res.status(200).json(leaderboard);
    } catch (error) {
        console.error('Failed to fetch top 1000 leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch top 1000 leaderboard' });
    }
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://77.238.245.5:${PORT}`));
