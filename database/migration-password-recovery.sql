USE lux_energy_db;

CREATE TABLE IF NOT EXISTS password_reset_codes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    admin_id INT NULL,
    code_hash CHAR(64) NOT NULL,
    channel ENUM('email', 'sms') NOT NULL,
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_password_reset_user_created (user_id, created_at),
    INDEX idx_password_reset_admin_created (admin_id, created_at),
    INDEX idx_password_reset_expiry (expires_at),
    CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_password_reset_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);