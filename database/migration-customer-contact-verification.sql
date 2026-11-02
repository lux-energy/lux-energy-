USE lux_energy_db;

ALTER TABLE users
    ADD COLUMN verification_status ENUM('pending', 'verified') NOT NULL DEFAULT 'pending',
    ADD COLUMN email_verified_at DATETIME NULL,
    ADD COLUMN phone_verified_at DATETIME NULL;

CREATE TABLE IF NOT EXISTS customer_verification_codes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    code_hash CHAR(64) NOT NULL,
    channel ENUM('email', 'sms') NOT NULL,
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_customer_verification_user_channel (user_id, channel, created_at),
    INDEX idx_customer_verification_expiry (expires_at),
    CONSTRAINT fk_customer_verification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
