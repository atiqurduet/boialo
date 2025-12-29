-- Create storage bucket for branding assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for branding bucket
CREATE POLICY "Admins can upload branding assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'branding' AND (SELECT is_admin(auth.uid())));

CREATE POLICY "Admins can update branding assets" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'branding' AND (SELECT is_admin(auth.uid())));

CREATE POLICY "Admins can delete branding assets" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'branding' AND (SELECT is_admin(auth.uid())));

CREATE POLICY "Anyone can view branding assets" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'branding');