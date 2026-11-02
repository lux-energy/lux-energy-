USE lux_energy_db;

ALTER TABLE password_reset_codes
    ADD COLUMN account_role ENUM('customer', 'agent', 'admin') NULL AFTER user_id;

UPDATE password_reset_codes AS reset_code
LEFT JOIN users AS account_user ON account_user.id = reset_code.user_id
SET reset_code.account_role = CASE
    WHEN reset_code.admin_id IS NOT NULL THEN 'admin'
    WHEN account_user.role IN ('customer', 'agent') THEN account_user.role
    ELSE 'customer'
END;

UPDATE password_reset_codes
SET used_at = NOW()
WHERE used_at IS NULL;

ALTER TABLE password_reset_codes
    MODIFY COLUMN account_role ENUM('customer', 'agent', 'admin') NOT NULL,
    DROP INDEX idx_password_reset_user_created,
    ADD INDEX idx_password_reset_user_role_created (user_id, account_role, created_at);
