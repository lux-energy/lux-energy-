USE lux_energy_db;

ALTER TABLE users
    ADD INDEX idx_users_phone (phone);

CREATE TABLE IF NOT EXISTS pending_customer_phone_verifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    challenge_id CHAR(36) NOT NULL UNIQUE,
    name VARCHAR(255) NULL,
    email VARCHAR(255) NULL,
    password_hash VARCHAR(255) NULL,
    phone VARCHAR(20) NOT NULL,
    can_register TINYINT(1) NOT NULL DEFAULT 0,
    code_hash CHAR(64) NOT NULL,
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    request_count TINYINT UNSIGNED NOT NULL DEFAULT 1,
    request_window_started_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pending_customer_phone_created (phone, created_at),
    INDEX idx_pending_customer_phone_expiry (expires_at)
);
