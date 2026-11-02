USE lux_energy_db;

ALTER TABLE users
    MODIFY COLUMN role ENUM('customer', 'agent', 'manager') NOT NULL;

CREATE TABLE IF NOT EXISTS daily_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_date DATE NOT NULL,
    shift_name VARCHAR(80) NOT NULL DEFAULT 'day',
    agent_id INT NOT NULL,
    station_id INT NOT NULL,
    status ENUM('draft', 'submitted', 'approved', 'returned') NOT NULL DEFAULT 'draft',
    report_data JSON NOT NULL,
    sales_total DECIMAL(14, 2) NOT NULL DEFAULT 0,
    cash_collected DECIMAL(14, 2) NOT NULL DEFAULT 0,
    transaction_count INT UNSIGNED NOT NULL DEFAULT 0,
    submitted_at DATETIME NULL,
    reviewed_at DATETIME NULL,
    reviewed_by_user_id INT NULL,
    reviewed_by_admin_id INT NULL,
    review_note TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_daily_report_agent_shift (agent_id, report_date, shift_name),
    INDEX idx_daily_reports_station_status_date (station_id, status, report_date),
    INDEX idx_daily_reports_date_status (report_date, status),
    CONSTRAINT fk_daily_reports_agent FOREIGN KEY (agent_id) REFERENCES users(id),
    CONSTRAINT fk_daily_reports_station FOREIGN KEY (station_id) REFERENCES stations(id),
    CONSTRAINT fk_daily_reports_reviewer_user FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_daily_reports_reviewer_admin FOREIGN KEY (reviewed_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS daily_report_audit (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    actor_user_id INT NULL,
    actor_admin_id INT NULL,
    actor_role VARCHAR(30) NOT NULL,
    action VARCHAR(40) NOT NULL,
    from_status VARCHAR(20) NULL,
    to_status VARCHAR(20) NULL,
    note TEXT NULL,
    changes JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_report_audit_report_date (report_id, created_at),
    CONSTRAINT fk_report_audit_report FOREIGN KEY (report_id) REFERENCES daily_reports(id) ON DELETE CASCADE,
    CONSTRAINT fk_report_audit_user FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_report_audit_admin FOREIGN KEY (actor_admin_id) REFERENCES admins(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS daily_report_attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    uploaded_by_user_id INT NOT NULL,
    storage_key VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_report_attachments_report (report_id),
    CONSTRAINT fk_report_attachments_report FOREIGN KEY (report_id) REFERENCES daily_reports(id) ON DELETE CASCADE,
    CONSTRAINT fk_report_attachments_user FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id)
);