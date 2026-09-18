-- Bamboo Veneer Wall Panels imported all 35 of its real photographs with
-- role unknown, since none of their camera filenames matched the category
-- name token set the import's own role resolver looks for. The catalogue
-- helpers pick a product's lead image by role order, slab, on_stand,
-- bookmatch, application, unknown, so with every photograph tied at
-- unknown the lead fell back to plain array order, and the very first
-- photograph in that order happened to be an extreme, blurry close up.
-- Reported directly as the image shown for this product on the home page.
--
-- These four are the clearest, most representative real photographs in
-- the set, hand reviewed: a bamboo herringbone panel, a brushed metal
-- panel, a honeycomb textured panel and a cream acoustic panel, retagged
-- so they lead instead of the close up. A no-op wherever this product
-- does not exist yet.
update products
set images = (
  select jsonb_agg(
    case
      when elem->>'path' = 'bamboo-veneer-wall-panels/bamboo-veneer-wall-panels/unknown-11'
        then jsonb_set(elem, '{role}', '"slab"')
      when elem->>'path' = 'bamboo-veneer-wall-panels/bamboo-veneer-wall-panels/unknown-19'
        then jsonb_set(elem, '{role}', '"on_stand"')
      when elem->>'path' = 'bamboo-veneer-wall-panels/bamboo-veneer-wall-panels/unknown-3'
        then jsonb_set(elem, '{role}', '"bookmatch"')
      when elem->>'path' = 'bamboo-veneer-wall-panels/bamboo-veneer-wall-panels/unknown-27'
        then jsonb_set(elem, '{role}', '"application"')
      else elem
    end
    order by (elem->>'sort')::int
  )
  from jsonb_array_elements(images) elem
)
where slug = 'bamboo-veneer-wall-panels';
