USE lux_energy_db;

ALTER TABLE users
    MODIFY COLUMN role ENUM('customer', 'agent') NOT NULL;