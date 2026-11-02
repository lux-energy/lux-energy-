-- Portal features: customer services, bills, tickets
-- Run after schema.sql (and migration-orders.sql if needed)

USE lux_energy_db;

CREATE TABLE IF NOT EXISTS customer_services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    service_id INT NOT NULL,
    station_id INT NULL,
    status ENUM('active', 'paused', 'cancelled') DEFAULT 'active',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_customer_service (customer_id, service_id),
    INDEX idx_cs_customer (customer_id),
    INDEX idx_cs_status (status),
    CONSTRAINT fk_cs_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_cs_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    CONSTRAINT fk_cs_station FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS bills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    order_id INT NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    due_date DATE,
    status ENUM('unpaid', 'paid', 'overdue', 'cancelled') DEFAULT 'unpaid',
    paid_at TIMESTAMP NULL,
    payment_method VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_bills_customer (customer_id),
    INDEX idx_bills_status (status),
    CONSTRAINT fk_bills_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_bills_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    category ENUM('technical', 'billing', 'delivery', 'account', 'other') DEFAULT 'technical',
    description TEXT NOT NULL,
    status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    admin_notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tickets_customer (customer_id),
    INDEX idx_tickets_status (status),
    CONSTRAINT fk_tickets_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Extra Eastern station for nationwide map coverage
INSERT INTO stations (name, province, district, sector, address, phone, opening_hours, latitude, longitude, services_available, status)
SELECT 'Lux Energy Rwamagana', 'Eastern', 'Rwamagana', 'Kigabiro', 'Rwamagana Town Center', '+250 788 678 901', '07:00 - 21:00', -1.9487, 30.4347, 'Petrol, Diesel, LPG', 'active'
WHERE NOT EXISTS (SELECT 1 FROM stations WHERE name = 'Lux Energy Rwamagana');
