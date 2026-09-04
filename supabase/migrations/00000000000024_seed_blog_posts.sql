-- Three launch blog articles, per D28: seeded through a migration rather
-- than waiting for Studio, each targeting a named search term and linking
-- into its category. Target terms and owning pages are the ones mapped in
-- files/BUILD-PLAN.md's SEO section.
--
-- Written directly rather than drafted through Studio's Gemini flow, since
-- D28 puts these ahead of Studio existing at all. Every factual claim
-- (slab size, price range, finishes, product counts) is checked against
-- the live catalogue, not recalled: 24 published 12mm sintered stones,
-- KES 60,000 to 95,000 a slab, 3200 x 1600 x 12mm, finishes Polished,
-- Silky, Matte, Soft Matte, Bush Hammered and Grip, 30 published products
-- across 15 ranges.
--
-- Cover images are real photography already in the catalogue, per the
-- blog-content skill's licensing rule: Beco's own, never hotlinked, and
-- already processed through the same Sharp pipeline as product images.
--
-- author is 'Beco Interiors' rather than a named individual: D40 requires
-- a person, never AI, and blog publishing is Brightex's own job per that
-- skill, not a claim attributed to any one Beco contact who has not
-- reviewed this copy. generated_by_model is set honestly regardless, so
-- the row is traceable to what actually produced the draft, the same
-- reason the column exists for the Studio flow.
--
-- reading_time is computed from the real word count at 200 words a
-- minute, rounded up, not guessed.

insert into blog_posts (
  title, slug, excerpt, body, cover_image, cover_image_alt, category, tags,
  meta_title, meta_description, target_term, reading_time, status,
  published_at, author, generated_by_model
)
values

(
  'Sintered Stone in Kenya: A Buying Guide',
  'sintered-stone-buying-guide',
  'Sintered stone is fused mineral powder, not a resin composite. What it actually is, what Beco stocks, and where it holds up best in Nairobi.',
  $md$## What sintered stone actually is

Sintered stone starts as natural mineral powders, mostly quartz, feldspar and clay, compressed under extreme heat and pressure until the particles fuse into one dense slab. Nothing binds it together, no resin, no adhesive layer, which is the real difference between this and an engineered quartz worktop. The result is harder, more heat resistant, and does not develop the faint yellow cast a resin bound surface can pick up after years in direct sun.

## Why it holds up in Nairobi

Nairobi kitchens sit close to the equator and get direct light for most of the day. A resin composite exposed to that for years can fade or yellow along the exposed edge. Sintered stone will not, and it takes a hot pan straight off the stove without marking, which a laminate or a softer natural stone cannot promise. It is also non porous, so it does not stain from turmeric, wine or oil the way an unsealed granite can.

## What Beco stocks

Every slab in stock is 3200 by 1600mm at 12mm thick, the size and thickness a worktop or a feature wall is actually specified against. Twenty four stones are priced from KES 60,000 to 95,000 a slab, and every one of them can be seen and handled at the Urban Square showroom before you commit to it, rather than specified from a catalogue photo that never quite shows the true colour.

## Finish is a spec, not a preference

Beco's range spans Polished, Silky, Matte, Soft Matte, Bush Hammered and Grip finishes. Polished and Silky read as premium and suit a feature wall or a reception desk under good light. Matte and Soft Matte hide fingerprints and water marks better, which matters on a kitchen island that gets touched all day. Bush Hammered and Grip add texture underfoot, worth specifying anywhere the surface might get wet, a bathroom floor or an outdoor step.

## Where it actually goes in a project

Kitchen worktops and islands are the obvious use, but the same slab does feature walls, vanity tops, reception counters and cladding over an existing wall without demolishing it first. Some stones in the range are cut book matched, meaning two slabs are paired so the veining mirrors across the seam, which is what a large feature wall or a wide island needs to read as one continuous pattern rather than two slabs stood side by side. Others are one face only, a single consistent pattern that suits a smaller worktop where there is no seam to hide.

## Cost against the alternative

Granite and quartz worktops in Nairobi are usually quoted per square metre, with a wide range depending on origin and finish, until a fabricator measures the actual kitchen. Sintered stone here is priced per slab regardless of the shape cut from it, KES 60,000 to 95,000 for the full 3200 by 1600mm sheet, which is easier to compare against upfront. Ordering by the half slab is also possible, so a single vanity top is not costed against a whole sheet it does not need.

## Looking after it

Sintered stone needs less maintenance than natural stone, not none. It does not need sealing the way granite does, but a hot pan left directly on the surface for a long period can still mark some finishes, and an abrasive scourer will dull a polished face over time. A damp cloth and a normal kitchen cleaner is enough day to day.

## Before you specify it

Confirm the finish against how the surface will actually be used, not just how it looks in the showroom. Ask whether the stone is book matched if you are covering a wide wall or island, since that changes how many slabs the job needs. Check thickness against the application: 12mm is standard for a worktop, and a fabricator will confirm if an edge detail needs it built up further.

## See it before you decide

A photograph never quite carries what a slab looks like leant against a wall in real daylight. The full range is in stock and priced: [shop the 12mm sintered stone range](/shop/12mm-sintered-stones), or see it in person at the Urban Square showroom.$md$,
  '{"path": "12mm-sintered-stones/sandstone-beige/slab-0", "width": 5156, "height": 10176}'::jsonb,
  'Close view of Sandstone Beige sintered stone, a warm cream surface with soft linear veining.',
  'Materials',
  '["sintered stone", "buying guide", "kitchen worktops", "12mm sintered stone"]'::jsonb,
  'Sintered Stone in Kenya: A Buying Guide',
  'What sintered stone is, why it suits Nairobi kitchens, and what Beco stocks from KES 60,000 a slab, finishes, sizes and where it works.',
  'sintered stone Kenya',
  4,
  'published'::post_status,
  now(),
  'Beco Interiors',
  'claude-sonnet-5'
),
(
  'Choosing an Interior Materials Supplier in Nairobi',
  'choosing-an-interior-materials-supplier',
  'Sourcing stone, panels, hardware and lighting from separate suppliers means separate quotes and separate delays. What to look for instead.',
  $md$## The real cost of sourcing separately

A single interior fit out in Nairobi can call for sintered stone worktops, wall panels, cabinet hardware and lighting, each commonly bought from a different supplier because no single showroom stocks all of it. That means separate quotes to chase, separate delivery dates to align, and a project that stalls if any one of them runs behind. It also means nobody along the chain has actually seen the whole room together, so a handle finish and a worktop finish can arrive looking wrong beside each other despite both being individually correct.

## What one supplier changes

Beco stocks sintered stone, wall panels, lighting and hardware together, roughly 30 products across 15 ranges at the Urban Square showroom, so a full material list for one room can be built, priced and quoted as a single request rather than several separate ones. The [quote builder](/quote) takes the whole list at once. There is no account to create and no minimum order, and everything on the list is priced together, which is the point: a contractor pricing a kitchen refit needs one number for the room, not several numbers from several suppliers that may or may not still be in stock by the time all of them are confirmed.

## Buying by the half slab, not just the whole sheet

Not every job needs a full 3200 by 1600mm slab. Sintered stone here can be ordered in half slab units, so a single vanity top or a small splashback is not priced against a whole sheet it does not need. That kind of flexibility is easy to promise and hard to actually hold to when a supplier does not stock the material itself, since a partial order from an importer is often not worth their while.

## What to check before committing to a supplier

Ask whether the stock is physically on the floor or only in a catalogue. A slab that has to be imported to order can add weeks to a project that a stocked range will not. Ask whether pricing already includes VAT, since a quote that adds it afterward at 16 percent can genuinely change a budget. And ask whether the supplier will quote a full material list together or only one line at a time, since pricing a worktop, its splashback panel and its handles separately from three different people rarely lands on a coherent room.

## What to bring to the showroom

A plan or even rough measurements of the room helps more than a mood board photo, since colour and veining read differently at scale than in a small sample. Bring the finishes you are already committed to, a cabinet colour or a floor tile, so a stone or a panel can actually be held against them rather than matched from memory afterward.

## What happens after a list is submitted

Beco does not check items out individually online: every request goes to the team, who price the full list and follow up on the number given, which suits a trade buyer pricing a job as much as someone furnishing one room, since neither is choosing a single item in isolation. WhatsApp is the fastest way to follow up on a reference once one has been issued.

## Where to start

[Browse the shop](/shop) to see what is in stock now, or read more about [how Beco works](/about). Everything on the floor can be added to one list and quoted together, and the showroom itself is worth the visit before anything is ordered: Urban Square, Shop 8 and 9, Enterprise Road, Industrial Area.$md$,
  '{"path": "12mm-sintered-stones/rome-phantom-ivory/application-3", "width": 2269, "height": 2284}'::jsonb,
  'A hotel bar counter faced in Rome Phantom Ivory sintered stone, with backlit shelving and a dark veined stone backsplash.',
  'Guides',
  '["interior materials", "supplier guide", "Nairobi", "quotes"]'::jsonb,
  'Choosing an Interior Materials Supplier in Nairobi',
  'Why sourcing stone, panels, hardware and lighting from one Nairobi supplier beats five separate quotes, and what to check before committing.',
  'interior materials Nairobi',
  4,
  'published'::post_status,
  now(),
  'Beco Interiors',
  'claude-sonnet-5'
),
(
  'Where Architectural Stone Works in a Nairobi Home',
  'architectural-stone-in-the-home',
  'Sintered stone is not only a worktop. Feature walls, fireplaces, reception desks and full height bathroom walls, and what changes when it goes architectural.',
  $md$## Beyond the kitchen worktop

Sintered stone is usually specified for a kitchen worktop first, but the same slab that survives a hot pan and direct sun also works as cladding, and a growing number of Nairobi projects are using it that way: a fireplace wall clad floor to ceiling, a reception desk faced in a single continuous slab, a bathroom wall taken full height rather than tiled in small sections that need regrouting every few years.

## Feature walls and fireplaces

A fireplace wall is one of the strongest uses of the material precisely because it is decorative rather than load bearing: the stone does not need to hold anything up, it only needs to read as one continuous surface. Book matched slabs, cut so the veining mirrors across the seam, are what makes a wide wall look like a single sheet of stone rather than two slabs stood side by side. [See real Nairobi installations in the gallery](/gallery) for what that actually looks like built, not rendered.

## Reception desks and counters

A reception desk faced in stone reads as considered in a way panelling rarely does, and because sintered stone does not need sealing or resurfacing the way natural stone does, a desk touched by every visitor keeps its finish for years rather than months. The same non porous surface that resists a coffee spill on a kitchen island resists one on a front desk too.

## Bathroom walls, floor to ceiling

Tiled bathroom walls accumulate grout lines that stain and eventually need regrouting. A single slab, or a small number of large format pieces, removes most of those lines entirely. It is heavier work to install than tile and needs a fabricator comfortable handling large format stone, but the result is a wall that reads as one surface rather than a grid.

## What changes when stone is architectural rather than functional

A worktop is chosen mostly for durability. A feature wall is chosen for how the veining reads at scale, which means seeing the actual slab, not a small sample, matters more here than anywhere else in a project. The same stone can look completely different across 1.6 metres of wall than it does in a 200mm square. That is the real reason to see it at the showroom before it goes across a whole wall.

## Working out how much you need

A feature wall or a fireplace surround rarely uses a whole slab efficiently, and a fabricator will usually need the actual dimensions before cutting starts. Bring measurements to the showroom rather than guessing from a floor plan: a book matched pair behaves differently once you know exactly where the seam falls on the real wall.

## Book matched or one face

Not every wall needs a book matched pair. A narrow feature strip or a single bathroom wall often reads well from one consistent slab, which is also the cheaper option since it uses one sheet rather than two cut to mirror each other. Book matching earns its cost on a wide wall or a large island, where the mirrored seam is the whole visual effect and a single slab would leave an obvious repeat or a visible join instead.

## Specify it properly

[Browse the 12mm sintered stone range](/shop/12mm-sintered-stones) to see what is in stock, or [see it built into real projects](/gallery) before deciding how it should read across a wall of your own.$md$,
  '{"path": "12mm-sintered-stones/taj-mahal/application-2", "width": 2976, "height": 3501}'::jsonb,
  'A minimalist living room with a fireplace wall clad in Taj Mahal sintered stone, lit warmly along its base.',
  'Applications',
  '["architectural stone", "feature walls", "interior design", "sintered stone"]'::jsonb,
  'Where Architectural Stone Works in a Nairobi Home',
  'Sintered stone beyond the worktop: fireplace walls, reception desks and bathroom cladding, and what changes when stone becomes architectural.',
  'architectural stone Nairobi',
  3,
  'published'::post_status,
  now(),
  'Beco Interiors',
  'claude-sonnet-5'
)
on conflict (slug) do nothing;
