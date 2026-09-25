-- Paybill and send-money sit next to bank and till so a quote can name
-- every channel Beco actually takes. Staff readable, not anon: the public
-- allowlist on settings_read_public is unchanged.

insert into settings (key, value) values
  ('paybill_number', '""'::jsonb),
  ('paybill_account', '""'::jsonb),
  ('send_money_number', '""'::jsonb)
on conflict (key) do nothing;
