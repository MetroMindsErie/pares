-- Clean up existing records with null property_data
DELETE FROM property_swipes WHERE property_data IS NULL;

-- Clean up existing records with oversized property_data (> 10KB)
DELETE FROM property_swipes WHERE length(property_data::text) > 10240;

-- Add a check constraint to prevent null property_data in future inserts (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_property_data_not_null' 
        AND conrelid = 'property_swipes'::regclass
    ) THEN
        ALTER TABLE property_swipes 
        ADD CONSTRAINT check_property_data_not_null 
        CHECK (property_data IS NOT NULL AND property_data != 'null'::jsonb);
    END IF;
END $$;

-- Create a function to validate property_data size
CREATE OR REPLACE FUNCTION validate_property_data_size()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if property_data JSON is too large (> 5KB to be safe)
    IF length(NEW.property_data::text) > 5120 THEN
        RAISE EXCEPTION 'property_data exceeds maximum size of 5KB';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate property_data size on insert/update
DROP TRIGGER IF EXISTS trigger_validate_property_data_size ON property_swipes;
CREATE TRIGGER trigger_validate_property_data_size
    BEFORE INSERT OR UPDATE ON property_swipes
    FOR EACH ROW
    EXECUTE FUNCTION validate_property_data_size();

-- Add index for better performance on non-null property_data queries
CREATE INDEX IF NOT EXISTS idx_property_swipes_property_data_not_null 
ON property_swipes(user_id, swipe_direction) 
WHERE property_data IS NOT NULL;

-- Add a partial index for oversized records to help identify them
CREATE INDEX IF NOT EXISTS idx_property_swipes_oversized 
ON property_swipes(user_id, created_at) 
WHERE length(property_data::text) > 5120;
