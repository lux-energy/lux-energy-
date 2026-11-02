USE lux_energy_db;

ALTER TABLE password_reset_codes
    MODIFY COLUMN channel ENUM('email', 'sms') NOT NULL DEFAULT 'email';
