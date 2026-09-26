-- Create the first platform owner.
--
-- Run this once, in the Supabase SQL editor, after every migration in
-- supabase/migrations has been applied in filename order.
--
-- There is deliberately no user interface for this. Staff authority must never
-- be grantable from a signed-in session, so the first owner is created with a
-- privileged database session and everyone after that goes through
-- public.promote_staff, which refuses self-changes and refuses to leave the
-- platform with zero active owners.
--
-- Replace the address below. The account must already exist in Supabase Auth
-- and must have confirmed its email: every staff surface calls
-- verifiedAccount(), which requires email_confirmed_at.

insert into public.platform_staff (user_id, role, active, note)
select id, 'owner', true, 'First platform owner'
from auth.users
where lower(email) = lower('REPLACE_WITH_YOUR_EMAIL')
  and email_confirmed_at is not null
on conflict (user_id) do update
  set role = 'owner', active = true, updated_at = now();

-- Confirm exactly one row came back. Zero means the address does not match an
-- account, or that account has not confirmed its email yet.
select u.email, s.role, s.active, s.created_at
from public.platform_staff s
join auth.users u on u.id = s.user_id
where s.role = 'owner';

-- Signing in at /staff-sign-in will then require enrolling an authenticator.
-- Multi-factor authentication is enforced in the database, not only the UI:
-- private.staff_access() requires the session to present aal2, so a staff row
-- alone grants nothing until TOTP is enrolled and verified.
