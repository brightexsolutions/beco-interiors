-- Staging and local seed. FICTIONAL customers only.
--
-- Staging is NEVER cloned from production. quotes and orders hold real
-- customer names, phone numbers and email addresses, and copying them into a
-- lower environment that more people can reach is a data protection problem
-- under Kenya's Data Protection Act 2019, and a needless one. See D44.
--
-- Real PRODUCTS are fine: they are not personal data, and the import pipeline
-- puts them here anyway. Seeding rather than cloning also makes staging
-- deterministic, so a failing test means a real regression rather than
-- someone having edited a row.

insert into settings (key, value) values
  ('brightex_allowed_emails', '["info.brightexsolutions@gmail.com"]'::jsonb),
  ('whatsapp_number', '"254722333730"'::jsonb),
  ('business_phone', '"+254722333730"'::jsonb)
on conflict (key) do update set value = excluded.value;

-- The real category, named from the Drive folder so the taxonomy stays
-- traceable to its source.
insert into categories (id, name, slug, description, is_published, source_path)
values (
  '00000000-0000-0000-0000-0000000000c1',
  -- Slug derived from the Drive folder, matching what the importer
  -- produces. A hand written slug here split this category in two.
  '12mm Sintered Stones', '12mm-sintered-stones',
  null,   -- real copy comes from Beco. A grid alone does not rank.
  true,
  '12MM SINTERED STONES'
) on conflict (source_path) do nothing;

-- The 24 real stones, with their real Drive folder names.
--
-- Everything launches POA, per A9: no price data exists anywhere yet, and
-- price_display_mode is separate from availability precisely so a card can
-- say this without ambiguity.
--
-- face_type is set from what Drive actually contains. Irene confirmed only
-- the slabs marked BOOK MATCH are bookmatched and the rest are One Face,
-- which is a manufacturing property rather than a missing photograph.
insert into products (name, slug, category_id, price_display_mode, availability,
                      face_type, unit, is_published, source_path)
select r.name, r.slug, '00000000-0000-0000-0000-0000000000c1',
       'poa', 'poa', r.face::face_type, 'per slab', true, r.source
from (values
  ('Amber Jade', 'amber-jade', 'one_face', '12MM SINTERED STONES/AMBER JADE'),
  ('Beverly Gold', 'beverly-gold', 'book_match', '12MM SINTERED STONES/BEVERLY GOLD'),
  ('Bianco Fendi', 'bianco-fendi', 'book_match', '12MM SINTERED STONES/BIANCO FENDI'),
  ('Bvlgari', 'bvlgari', 'one_face', '12MM SINTERED STONES/BVLGARI'),
  ('Calcatta Gold', 'calcatta-gold', 'book_match', '12MM SINTERED STONES/CALCATTA GOLD'),
  ('Calcatta Oro', 'calcatta-oro', 'book_match', '12MM SINTERED STONES/CALCATTA ORO'),
  ('Cyprus Light Grey', 'cyprus-light-grey', 'one_face', '12MM SINTERED STONES/CYPRUS LIGHT GREY'),
  ('Etereo', 'etereo', 'one_face', '12MM SINTERED STONES/ETEREO'),
  ('Galaxy Bianco', 'galaxy-bianco', 'one_face', '12MM SINTERED STONES/GALAXY BIANCO'),
  ('Jatoba Brown', 'jatoba-brown', 'one_face', '12MM SINTERED STONES/JATOBA BROWN'),
  ('Limestone Beige', 'limestone-beige', 'one_face', '12MM SINTERED STONES/LIMESTONE BEIGE'),
  ('Limestone Creamy', 'limestone-creamy', 'one_face', '12MM SINTERED STONES/LIMESTONE CREAMY'),
  ('Limestone Ivory', 'limestone-ivory', 'one_face', '12MM SINTERED STONES/LIMESTONE IVORY'),
  ('Moire White', 'moire-white', 'one_face', '12MM SINTERED STONES/MOIRE WHITE'),
  ('Precious Black', 'precious-black', 'one_face', '12MM SINTERED STONES/PRECIOUS BLACK'),
  ('Pure White', 'pure-white', 'one_face', '12MM SINTERED STONES/PURE WHITE'),
  ('Rome Phantom Ivory', 'rome-phantom-ivory', 'book_match', '12MM SINTERED STONES/ROME PHANTOM IVORY'),
  ('Sabnis', 'sabnis', 'one_face', '12MM SINTERED STONES/SABNIS'),
  ('Sandstone Beige', 'sandstone-beige', 'one_face', '12MM SINTERED STONES/SANDSTONE BEIGE'),
  ('Sandstone Ivory', 'sandstone-ivory', 'one_face', '12MM SINTERED STONES/SANDSTONE IVORY'),
  ('Statuario', 'statuario', 'book_match', '12MM SINTERED STONES/STATUARIO'),
  ('Statuario Gold', 'statuario-gold', 'book_match', '12MM SINTERED STONES/STATUARIO GOLD'),
  ('Taj Mahal', 'taj-mahal', 'one_face', '12MM SINTERED STONES/TAJ MAHAL'),
  ('Travertine Beige', 'travertine-beige', 'one_face', '12MM SINTERED STONES/TRAVERTINE BEIGE')
) as r(name, slug, face, source)
on conflict (slug) do nothing;
