USE lux_energy_db;

ALTER TABLE pending_customer_phone_verifications
    ADD COLUMN delivery_channel ENUM('email', 'sms') NOT NULL DEFAULT 'sms' AFTER phone;
