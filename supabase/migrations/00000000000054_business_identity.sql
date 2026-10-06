-- The business identity a quote and a receipt print in their From block:
-- the registered name, the KRA PIN, a VAT number where it differs from the
-- PIN, the physical address and a contact email. Editable in Settings so
-- Beco changes them without a deploy.
--
-- Staff readable, admin writable, through the existing settings policies:
-- settings_read_staff and settings_write_admin already cover any key, and
-- none of these is added to settings_read_public, so anonymous cannot read
-- them. The PIN appears on documents a customer is handed; that is a
-- deliberate disclosure on paper, not a reason to serve it to any visitor.

insert into settings (key, value) values
  ('business_legal_name', '"Beco Interiors Limited"'::jsonb),
  ('kra_pin', '""'::jsonb),
  ('vat_number', '""'::jsonb),
  ('business_address', '"Urban Square, Shop 8 and 9, Enterprise Road, Industrial Area, Nairobi"'::jsonb),
  ('business_email', '"info@beco.co.ke"'::jsonb)
on conflict (key) do nothing;
