-- Tự động tạo các database cho các microservices nếu chưa tồn tại
SELECT 'CREATE DATABASE user_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'user_db')\gexec

SELECT 'CREATE DATABASE analytics_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'analytics_db')\gexec

SELECT 'CREATE DATABASE email_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'email_db')\gexec
