import { createClient } from '@supabase/supabase-js';

// Using direct credentials to ensure connection works regardless of environment variables
const SUPABASE_URL = "https://gjzjrhredmheepmgpnjk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqempyaHJlZG1oZWVwbWdwbmprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1OTgzMjMsImV4cCI6MjA4MTE3NDMyM30.qJjjQA37dzsEYO_heqijSgZ7u313dhSKBCS0pToxa34";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);