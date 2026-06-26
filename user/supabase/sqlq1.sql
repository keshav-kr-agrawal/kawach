-- Create the citizen reports table
CREATE TABLE citizen_reports (
  id text PRIMARY KEY, -- Stores the client-generated video ID
  title text NOT NULL,
  description text,
  category text,
  uploader_uuid text,
  status text,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  video_url text,
  emergency_override boolean DEFAULT false,
  trim_start double precision DEFAULT 0,
  trim_end double precision DEFAULT 0,
  views integer DEFAULT 0,
  timestamp timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) or leave it disabled for development
-- For quick testing, you can disable RLS or add a policy to allow public read/write:
ALTER TABLE citizen_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" 
ON citizen_reports FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access" 
ON citizen_reports FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access" 
ON citizen_reports FOR UPDATE 
USING (true);
