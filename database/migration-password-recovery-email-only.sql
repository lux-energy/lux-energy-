USE lux_energy_db;

UPDATE password_reset_codes
SET used_at = NOW()
WHERE channel = 'sms' AND used_at IS NULL;

ALTER TABLE password_reset_codes
    MODIFY COLUMN channel ENUM('email') NOT NULL DEFAULT 'email';
