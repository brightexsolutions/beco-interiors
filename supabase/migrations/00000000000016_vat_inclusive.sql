-- Beco's prices INCLUDE VAT.
--
-- A3 assumed the opposite: that quotes would show VAT at 16% as a line added
-- to a net subtotal, which is the usual trade arrangement. It is not Beco's.
-- Recorded in settings rather than in code because the quote document, the
-- dashboard and the PDF all need the same answer, and because a rate change
-- must not be a deploy.
--
-- The consequence for M5 is that VAT is BACKED OUT of the line total rather
-- than added to it. On a 65,000 slab at 16% that is 8,965.52 of VAT inside the
-- price, not 10,400 on top. Adding it would overstate every quote by 16%.

insert into settings (key, value) values
  -- Kenya VAT, as a decimal, applied by backing it out of a tax inclusive
  -- price rather than adding it to a net one.
  ('vat_rate', '0.16'),
  -- Beco quotes tax inclusive. Quote and invoice totals must DERIVE VAT from
  -- the line total, never add it on top.
  ('prices_include_vat', 'true')
on conflict (key) do update set value = excluded.value;
