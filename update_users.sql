-- Update roles for Mary's Supervisors
UPDATE auth.users
SET raw_user_meta_data = 
  COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "marys-supervisor"}'::jsonb
WHERE email ILIKE '%francisco.gamez%' OR email ILIKE '%roberto.lopez%';

-- Update roles for Agents (Restricted Access)
UPDATE auth.users
SET raw_user_meta_data = 
  COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "agent-marys"}'::jsonb
WHERE email ILIKE '%francisco.marmolejo%' 
   OR email ILIKE '%andres.belloso%'
   OR email ILIKE '%eduardo.garcia%';

-- Verify updates
SELECT email, raw_user_meta_data->>'role' as role FROM auth.users 
WHERE email ILIKE '%francisco.gamez%' 
   OR email ILIKE '%roberto.lopez%'
   OR email ILIKE '%francisco.marmolejo%' 
   OR email ILIKE '%andres.belloso%'
   OR email ILIKE '%eduardo.garcia%';
