ALTER TABLE public.registrations
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE public.registrations
DROP CONSTRAINT IF EXISTS registrations_status_check;

ALTER TABLE public.registrations
ADD CONSTRAINT registrations_status_check
CHECK (status IN ('pending', 'approved', 'rejected'));
