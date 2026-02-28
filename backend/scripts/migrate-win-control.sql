-- Migration: 將輸贏控制從封頂模式改為機率控制模式
-- 執行前請先備份資料庫

-- 1. 修改 win_cap_controls 表
-- 刪除舊欄位，添加新欄位
ALTER TABLE win_cap_controls
  DROP COLUMN IF EXISTS daily_cap,
  DROP COLUMN IF EXISTS weekly_cap,
  DROP COLUMN IF EXISTS monthly_cap,
  DROP COLUMN IF EXISTS current_win;

-- 添加新欄位（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'win_cap_controls' AND column_name = 'control_direction') THEN
    ALTER TABLE win_cap_controls ADD COLUMN control_direction VARCHAR(10) DEFAULT 'win';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'win_cap_controls' AND column_name = 'control_percentage') THEN
    ALTER TABLE win_cap_controls ADD COLUMN control_percentage INTEGER DEFAULT 50;
  END IF;
END $$;

-- 2. 修改 agent_line_win_caps 表
ALTER TABLE agent_line_win_caps
  DROP COLUMN IF EXISTS daily_cap,
  DROP COLUMN IF EXISTS weekly_cap,
  DROP COLUMN IF EXISTS monthly_cap,
  DROP COLUMN IF EXISTS current_win;

-- 添加新欄位（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'agent_line_win_caps' AND column_name = 'control_direction') THEN
    ALTER TABLE agent_line_win_caps ADD COLUMN control_direction VARCHAR(10) DEFAULT 'win';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'agent_line_win_caps' AND column_name = 'control_percentage') THEN
    ALTER TABLE agent_line_win_caps ADD COLUMN control_percentage INTEGER DEFAULT 50;
  END IF;
END $$;

-- 完成
SELECT 'Migration completed successfully!' as status;
