ALTER TABLE public.registrations
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

ALTER TABLE public.registrations
ALTER COLUMN status SET DEFAULT 'pending';

UPDATE public.registrations
SET status = 'pending'
WHERE status IS NULL;

ALTER TABLE public.registrations
DROP CONSTRAINT IF EXISTS registrations_status_check;

ALTER TABLE public.registrations
ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.registrations
ADD CONSTRAINT registrations_status_check
CHECK (status IN ('pending', 'approved', 'rejected'));
