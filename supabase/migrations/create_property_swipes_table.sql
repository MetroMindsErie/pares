CREATE TABLE IF NOT EXISTS property_swipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id TEXT NOT NULL,
  swipe_direction TEXT NOT NULL CHECK (swipe_direction IN ('left', 'right', 'up', 'down')),
  property_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_property_swipes_user_id ON property_swipes(user_id);
CREATE INDEX IF NOT EXISTS idx_property_swipes_property_id ON property_swipes(property_id);
CREATE INDEX IF NOT EXISTS idx_property_swipes_direction ON property_swipes(swipe_direction);
CREATE INDEX IF NOT EXISTS idx_property_swipes_created_at ON property_swipes(created_at);

-- Create unique constraint to prevent duplicate swipes
CREATE UNIQUE INDEX IF NOT EXISTS idx_property_swipes_unique 
ON property_swipes(user_id, property_id);

-- Enable Row Level Security
ALTER TABLE property_swipes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own swipes" ON property_swipes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own swipes" ON property_swipes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own swipes" ON property_swipes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own swipes" ON property_swipes
  FOR DELETE USING (auth.uid() = user_id);
