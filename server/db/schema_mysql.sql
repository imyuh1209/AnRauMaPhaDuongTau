/* ==============================================================
   Rubber Tracker — SAFE SCHEMA (no drop, idempotent)
   - Không xoá DB/bảng
   - Tạo bảng nếu chưa có
   - Thêm cột/index/FK bằng lệnh động (kiểm tra trước)
   - Chạy nhiều lần không lỗi, giữ nguyên dữ liệu
   ============================================================= */

-- 0) DB
CREATE DATABASE IF NOT EXISTS rubber
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE rubber;
SET NAMES utf8mb4;

-- =============================================================
-- 1) farm
-- =============================================================
CREATE TABLE IF NOT EXISTS farm (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  area_ha DECIMAL(12,2) NOT NULL DEFAULT 0,
  province VARCHAR(120),
  district VARCHAR(120),
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
-- 2) plot
-- =============================================================
CREATE TABLE IF NOT EXISTS plot (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  farm_id INT UNSIGNED NOT NULL,
  code VARCHAR(60) NOT NULL,
  planting_year INT,
  area_ha DECIMAL(12,2) NOT NULL DEFAULT 0,
  clone VARCHAR(60),
  tapping_start_date DATE,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- uniq_plot (farm_id, code)
SET @exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name='plot' AND index_name='uniq_plot'
);
SET @sql := IF(@exists=0, 'CREATE UNIQUE INDEX uniq_plot ON plot (farm_id, code)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idx_plot_farm (farm_id)
SET @exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name='plot' AND index_name='idx_plot_farm'
);
SET @sql := IF(@exists=0, 'CREATE INDEX idx_plot_farm ON plot (farm_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- FK plot.farm_id (guarded)
SET @exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME='plot'
    AND CONSTRAINT_NAME='fk_plot_farm'
);
SET @sql := IF(@exists=0,
  'ALTER TABLE plot ADD CONSTRAINT fk_plot_farm FOREIGN KEY (farm_id) REFERENCES farm(id) ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =============================================================
-- 3) rubber_type
-- =============================================================
CREATE TABLE IF NOT EXISTS rubber_type (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(60) NOT NULL UNIQUE,   -- ví dụ: mu_nuoc, mu_tap
  description VARCHAR(255),
  unit VARCHAR(30) NOT NULL           -- ví dụ: kg, tấn
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
-- 4) conversion (hệ số quy khô)
-- =============================================================
CREATE TABLE IF NOT EXISTS conversion (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  farm_id INT UNSIGNED NULL,
  rubber_type_id INT UNSIGNED NOT NULL,
  effective_from DATE NOT NULL,
  factor_to_dry_ton DECIMAL(8,4) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- cột phát sinh: farm_id_norm (generated)
SET @exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'conversion'
    AND column_name = 'farm_id_norm'
);
SET @sql := IF(@exists=0,
  'ALTER TABLE conversion ADD COLUMN farm_id_norm INT UNSIGNED AS (IFNULL(farm_id,0)) STORED',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idx_conv_farm_id (farm_id)
SET @exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name='conversion' AND index_name='idx_conv_farm_id'
);
SET @sql := IF(@exists=0, 'CREATE INDEX idx_conv_farm_id ON conversion (farm_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idx_conv_rt (rubber_type_id)
SET @exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name='conversion' AND index_name='idx_conv_rt'
);
SET @sql := IF(@exists=0, 'CREATE INDEX idx_conv_rt ON conversion (rubber_type_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- uniq_conv (farm_id_norm, rubber_type_id, effective_from)
SET @exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name='conversion' AND index_name='uniq_conv'
);
SET @sql := IF(@exists=0,
  'CREATE UNIQUE INDEX uniq_conv ON conversion (farm_id_norm, rubber_type_id, effective_from)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- FK conversion.rubber_type_id (guarded)
SET @exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME='conversion'
    AND CONSTRAINT_NAME='fk_conv_rt'
);
SET @sql := IF(@exists=0,
  'ALTER TABLE conversion ADD CONSTRAINT fk_conv_rt FOREIGN KEY (rubber_type_id) REFERENCES rubber_type(id) ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- (tùy chọn) FK conversion.farm_id (chỉ thêm khi dữ liệu sạch)
-- SET @exists := (
--   SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
--   WHERE CONSTRAINT_SCHEMA = DATABASE()
--     AND TABLE_NAME='conversion'
--     AND CONSTRAINT_NAME='fk_conv_farm'
-- );
-- SET @sql := IF(@exists=0,
--   'ALTER TABLE conversion ADD CONSTRAINT fk_conv_farm FOREIGN KEY (farm_id) REFERENCES farm(id) ON DELETE SET NULL',
--   'SELECT 1'
-- );
-- PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =============================================================
-- 5) plan (kế hoạch)
-- =============================================================
CREATE TABLE IF NOT EXISTS plan (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  farm_id INT UNSIGNED NOT NULL,
  plot_id INT UNSIGNED NULL,
  rubber_type_id INT UNSIGNED NOT NULL,
  period_type ENUM('MONTH','QUARTER','YEAR') NOT NULL,
  period_key VARCHAR(20) NOT NULL,  -- 'YYYY-MM' | 'YYYY-Qn' | 'YYYY'
  version INT NOT NULL DEFAULT 1,
  planned_qty DECIMAL(14,3) NOT NULL DEFAULT 0,
  note VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- cột phát sinh: plot_id_norm
-- cột phát sinh: plot_id_norm (generated)
SET @exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'plan'
    AND column_name = 'plot_id_norm'
);
SET @sql := IF(@exists=0,
  'ALTER TABLE plan ADD COLUMN plot_id_norm INT UNSIGNED AS (IFNULL(plot_id,0)) STORED',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- idx_plan_farm
SET @exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name='plan' AND index_name='idx_plan_farm'
);
SET @sql := IF(@exists=0, 'CREATE INDEX idx_plan_farm ON plan (farm_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idx_plan_plot
SET @exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name='plan' AND index_name='idx_plan_plot'
);
SET @sql := IF(@exists=0, 'CREATE INDEX idx_plan_plot ON plan (plot_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idx_plan_rt
SET @exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name='plan' AND index_name='idx_plan_rt'
);
SET @sql := IF(@exists=0, 'CREATE INDEX idx_plan_rt ON plan (rubber_type_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idx_plan_lookup
SET @exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name='plan' AND index_name='idx_plan_lookup'
);
SET @sql := IF(@exists=0,
  'CREATE INDEX idx_plan_lookup ON plan (farm_id, rubber_type_id, period_type, period_key, version)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- uniq_plan
SET @exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name='plan' AND index_name='uniq_plan'
);
SET @sql := IF(@exists=0,
  'CREATE UNIQUE INDEX uniq_plan ON plan (farm_id, plot_id_norm, rubber_type_id, period_type, period_key, version)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- FK plan.farm_id (guarded)
SET @exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME='plan'
    AND CONSTRAINT_NAME='fk_plan_farm'
);
SET @sql := IF(@exists=0,
  'ALTER TABLE plan ADD CONSTRAINT fk_plan_farm FOREIGN KEY (farm_id) REFERENCES farm(id) ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- FK plan.rubber_type_id (guarded)
SET @exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME='plan'
    AND CONSTRAINT_NAME='fk_plan_rt'
);
SET @sql := IF(@exists=0,
  'ALTER TABLE plan ADD CONSTRAINT fk_plan_rt FOREIGN KEY (rubber_type_id) REFERENCES rubber_type(id) ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- (tùy chọn) FK plan.plot_id
-- SET @exists := (
--   SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
--   WHERE CONSTRAINT_SCHEMA = DATABASE()
--     AND TABLE_NAME='plan'
--     AND CONSTRAINT_NAME='fk_plan_plot'
-- );
-- SET @sql := IF(@exists=0,
--   'ALTER TABLE plan ADD CONSTRAINT fk_plan_plot FOREIGN KEY (plot_id) REFERENCES plot(id) ON DELETE SET NULL',
--   'SELECT 1'
-- );
-- PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =============================================================
-- 6) actual (thực tế)
-- =============================================================
CREATE TABLE IF NOT EXISTS actual (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  farm_id INT UNSIGNED NOT NULL,
  plot_id INT UNSIGNED NULL,
  rubber_type_id INT UNSIGNED NOT NULL,
  date DATE NOT NULL,
  qty DECIMAL(14,3) NOT NULL DEFAULT 0,
  source VARCHAR(60),
  note VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- cột phát sinh: plot_id_norm
-- cột phát sinh: plot_id_norm (generated)
SET @exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'actual'
    AND column_name = 'plot_id_norm'
);
SET @sql := IF(@exists=0,
  'ALTER TABLE actual ADD COLUMN plot_id_norm INT UNSIGNED AS (IFNULL(plot_id,0)) STORED',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- idx_actual_date
SET @exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name='actual' AND index_name='idx_actual_date'
);
SET @sql := IF(@exists=0, 'CREATE INDEX idx_actual_date ON actual (date)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idx_act_farm
SET @exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name='actual' AND index_name='idx_act_farm'
);
SET @sql := IF(@exists=0, 'CREATE INDEX idx_act_farm ON actual (farm_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idx_act_plot
SET @exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name='actual' AND index_name='idx_act_plot'
);
SET @sql := IF(@exists=0, 'CREATE INDEX idx_act_plot ON actual (plot_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idx_act_rt
SET @exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name='actual' AND index_name='idx_act_rt'
);
SET @sql := IF(@exists=0, 'CREATE INDEX idx_act_rt ON actual (rubber_type_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- uniq_actual
SET @exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name='actual' AND index_name='uniq_actual'
);
SET @sql := IF(@exists=0,
  'CREATE UNIQUE INDEX uniq_actual ON actual (farm_id, plot_id_norm, rubber_type_id, date)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- FK actual.farm_id (guarded)
SET @exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME='actual'
    AND CONSTRAINT_NAME='fk_act_farm'
);
SET @sql := IF(@exists=0,
  'ALTER TABLE actual ADD CONSTRAINT fk_act_farm FOREIGN KEY (farm_id) REFERENCES farm(id) ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- FK actual.rubber_type_id (guarded)
SET @exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME='actual'
    AND CONSTRAINT_NAME='fk_act_rt'
);
SET @sql := IF(@exists=0,
  'ALTER TABLE actual ADD CONSTRAINT fk_act_rt FOREIGN KEY (rubber_type_id) REFERENCES rubber_type(id) ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- (tùy chọn) FK actual.plot_id
-- SET @exists := (
--   SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
--   WHERE CONSTRAINT_SCHEMA = DATABASE()
--     AND TABLE_NAME='actual'
--     AND CONSTRAINT_NAME='fk_act_plot'
-- );
-- SET @sql := IF(@exists=0,
--   'ALTER TABLE actual ADD CONSTRAINT fk_act_plot FOREIGN KEY (plot_id) REFERENCES plot(id) ON DELETE SET NULL',
--   'SELECT 1'
-- );
-- PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =============================================================
-- 7) app_user & user_farm_scope
-- =============================================================
CREATE TABLE IF NOT EXISTS app_user (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(60) NOT NULL UNIQUE,
  hash_pw VARCHAR(255) NOT NULL,
  role ENUM('Admin','Planner','Reporter','Field') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_farm_scope (
  user_id INT UNSIGNED NOT NULL,
  farm_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id, farm_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- idx_ufs_user
SET @exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name='user_farm_scope' AND index_name='idx_ufs_user'
);
SET @sql := IF(@exists=0, 'CREATE INDEX idx_ufs_user ON user_farm_scope (user_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idx_ufs_farm
SET @exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name='user_farm_scope' AND index_name='idx_ufs_farm'
);
SET @sql := IF(@exists=0, 'CREATE INDEX idx_ufs_farm ON user_farm_scope (farm_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- FK user_farm_scope.user_id (guarded)
SET @exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME='user_farm_scope'
    AND CONSTRAINT_NAME='fk_ufs_user'
);
SET @sql := IF(@exists=0,
  'ALTER TABLE user_farm_scope ADD CONSTRAINT fk_ufs_user FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- FK user_farm_scope.farm_id (guarded)
SET @exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME='user_farm_scope'
    AND CONSTRAINT_NAME='fk_ufs_farm'
);
SET @sql := IF(@exists=0,
  'ALTER TABLE user_farm_scope ADD CONSTRAINT fk_ufs_farm FOREIGN KEY (farm_id) REFERENCES farm(id) ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =============================================================
-- 8) View tổng hợp (không ảnh hưởng dữ liệu)
-- =============================================================
CREATE OR REPLACE VIEW vw_monthly_summary AS
SELECT
  a.farm_id,
  a.plot_id,
  a.rubber_type_id,
  DATE_FORMAT(a.date, '%Y-%m') AS ym,
  SUM(a.qty) AS actual_qty
FROM actual a
GROUP BY a.farm_id, a.plot_id, a.rubber_type_id, DATE_FORMAT(a.date, '%Y-%m');
