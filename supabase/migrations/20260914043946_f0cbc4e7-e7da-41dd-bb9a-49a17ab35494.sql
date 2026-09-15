CREATE POLICY "Anyone can upload request attachments"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'request-attachments');