-- Add days_of_week column to account_schedules table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'account_schedules'
        AND column_name = 'days_of_week'
    ) THEN
        ALTER TABLE account_schedules
        ADD COLUMN days_of_week integer[] DEFAULT '{0,1,2,3,4,5,6}';

        UPDATE account_schedules
        SET days_of_week = '{0,1,2,3,4,5,6}'
        WHERE days_of_week IS NULL;

        RAISE NOTICE 'Added days_of_week column to account_schedules table.';
    ELSE
        RAISE NOTICE 'Column days_of_week already exists.';
    END IF;
END $$;