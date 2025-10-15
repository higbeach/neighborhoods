import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nqwovjgoaofweadspwwt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd292amdvYW9md2VhZHNwd3d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NzA1NjYsImV4cCI6MjA3NTM0NjU2Nn0.7bkb6H-vvXfiZJsXhddO5TYK2oJcaKdVw_phKTCex-0'; // Use anon key for client-side

export const supabase = createClient(supabaseUrl, supabaseKey);