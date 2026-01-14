-- RUN THIS IN SUPABASE SQL EDITOR

ALTER TABLE food_diary 
ADD COLUMN IF NOT EXISTS waist_user numeric; -- For storing body weight (e.g. 80.01)

COMMENT ON COLUMN food_diary.waist_user IS 'User body weight recorded for this date';
