-- Buying guidance on the categories that have products.
--
-- A grid does not rank and it does not sell. `categories.description` is the
-- field that makes a category page a head term asset rather than a wall of
-- thumbnails, and it is reused on every product page in that category, so one
-- piece of writing does two jobs.
--
-- Everything here describes the MATERIAL, which is verifiable, and nothing
-- describes a particular colour, which would need a specification sheet Beco
-- has not supplied. No dimensions, no hardness rating, no absorption figure:
-- those are exactly the numbers a specifier checks, and inventing one would
-- cost more credibility than leaving it out.
--
-- Beco edits this from the dashboard product editor at M5, so this is a
-- starting point rather than a fixed asset.

update categories set description =
'Sintered stone is made by compacting natural mineral particles under very high pressure and heat, without resins or binders. What comes out is a dense surface with no pores for liquid to enter, which is why it behaves differently from natural stone once it is installed.

In practice that means it does not need sealing, it does not stain from oil, wine or coffee the way a porous stone does, and it takes heat directly without the discolouration you get on a composite. It is a good answer for kitchen worktops and islands, for bathroom vanities and shower walls, and for feature walls where a large surface should read as one piece rather than as tiling.

It is supplied in large format slabs, so a run of worktop can often be cut from a single piece and the joins that break up a surface simply are not there. Where two slabs do meet, bookmatched pairs are cut in sequence and mirrored so the veining continues across the join.

Specification sheets for individual colours, including slab dimensions and finish options, are available from our team. Tell us what the project needs and we will send the sheets alongside a price.'
where source_path = '12MM SINTERED STONES';

update categories set description =
'Cabinet and door hardware is the part of a fitted interior that gets touched every day, so it is worth specifying deliberately rather than taking whatever comes with the carcass.

We stock handles, knobs and pulls in finishes chosen to sit with the surfaces we supply, so a brass pull can be matched against a worktop rather than guessed at from a screen. Bring the material, or a photograph of it, and we will show you what works next to it.

Finishes, centre to centre measurements and availability are confirmed per item. Ask us and we will send what you need to place an order.'
where source_path = 'HANDLES';
