-- Beco's first anniversary, October 2026, and the site launch timed to land
-- in the same month. Two small pieces of public state: when the countdown
-- is aiming for, and whether an admin has actually thrown the switch. See D80.
--
-- Kept in settings rather than a new table: this is exactly the shape that
-- table already exists for, and it inherits the existing policies instead
-- of opening a new surface. `site_launch_at` starts null because the exact
-- day is not yet confirmed, and the storefront's own countdown treats null
-- as "nothing to show yet" rather than guessing a date.
insert into settings (key, value) values
  ('site_launch_at', 'null'::jsonb),
  ('site_launch_live', 'false'::jsonb);

-- Both need to be anon readable: the countdown and the reveal render server
-- side from this table like everything else on the storefront, not from an
-- admin only fetch shimmed into a public page.
drop policy settings_read_public on settings;
create policy settings_read_public on settings for select
  using (key in (
    'vat_rate', 'quote_validity_days', 'whatsapp_number', 'business_phone',
    'site_launch_at', 'site_launch_live'
  ));

-- Writing them is already covered by settings_write_admin (is_admin()), the
-- same beco_admin or brightex_admin gate as every other setting.
