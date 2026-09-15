-- The whole range, not just the part that has been photographed.
--
-- Only two categories existed, because a category was created by the import
-- pipeline the first time it found a product folder with images in it. So the
-- site presented Beco as a company that sells sintered stone and handles,
-- when the Drive taxonomy has fourteen product folders and the brand's own
-- strapline names four pillars.
--
-- Seeding them has three effects, all of which the build already handles:
--
--  1. The footer and the shop can show the real range.
--  2. Each gets a designed "coming soon" page instead of a 404.
--  3. Per D27 each stays noindex and out of the sitemap until it actually
--     holds published products, at which point it flips on its own. Nothing
--     thin is exposed to search, and nobody has to remember to come back.
--
-- source_path is the Drive folder VERBATIM, including its misspelling, because
-- that column is the identity the importer matches on. The display name is
-- spelled correctly: "Accoustic" should not ship on a public page.

insert into categories (name, slug, source_path, is_published, sort_order) values
  ('12mm Sintered Stones',        '12mm-sintered-stones',        '12MM SINTERED STONES',        true,  10),
  ('15mm Sintered Stones',        '15mm-sintered-stones',        '15MM SINTERED STONES',        true,  20),
  ('Lighting',                    'lighting',                    'LIGHTING',                    true,  30),
  ('Acoustic Wall Panels',        'acoustic-wall-panels',        'ACCOUSTIC WALL PANELS',       true,  40),
  ('Bamboo Veneer Wall Panels',   'bamboo-veneer-wall-panels',   'BAMBOO VENEER WALL PANELS',   true,  50),
  ('SPC Wall Panels',             'spc-wall-panels',             'SPC WALL PANELS',             true,  60),
  ('Wall Panel Accessories',      'wall-panel-accessories',      'WALL PANEL ACCESSORIES',      true,  70),
  ('SPC Flooring',                'spc-flooring',                'SPC FLOORING',                true,  80),
  ('Handles',                     'handles',                     'HANDLES',                     true,  90),
  ('Hinges',                      'hinges',                      'HINGES',                      true, 100),
  ('Door Locks',                  'door-locks',                  'DOOR LOCKS',                  true, 110),
  ('Furniture Legs',              'furniture-legs',              'FURNITURE LEGS',              true, 120),
  ('Floating Shelf Accessories',  'floating-shelf-accessories',  'FLOATING SHELF ACCESSORIES',  true, 130),
  ('Kitchen Accessories',         'kitchen-accessories',         'KITCHEN ACCESSORIES',         true, 140),
  ('Office Accessories',          'office-accessories',          'OFFICE ACCESSORIES',          true, 150)
on conflict (source_path) do update
  set name       = excluded.name,
      sort_order = excluded.sort_order;

-- LIGHTING has no Drive folder at all. It is named on every page of the brand
-- guideline, in the signage artwork, and in the mission text, so a site with
-- no lighting contradicts the client's own identity. Carrying it as an empty
-- category means the moment a LIGHTING folder appears in Drive the pipeline
-- fills this row rather than creating a second one. Recorded as D47.
