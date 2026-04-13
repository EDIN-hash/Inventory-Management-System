-- Удаление пользователя
DELETE FROM users WHERE username = 'HILVAIT';

-- Создание таблицы users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'spectator',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
