-- Fluted Wall Panels arrived from the loose category import as its own
-- top level category, parent_id null, instead of nested under Wall Panels
-- the way its sibling Bamboo Veneer Wall Panels correctly is. Left it
-- invisible from the Wall Panels shop page's own sub range grid and
-- product listing, reachable only through a stray top level footer link.
-- Reported directly as missing from the site.
--
-- Corrects the nesting to match its sibling. A no-op wherever the
-- category does not exist yet or is already nested, which covers any
-- environment the loose category import has not reached.
update categories
set parent_id = (select id from categories where slug = 'wall-panels')
where slug = 'fluted-wall-panels' and parent_id is null;
