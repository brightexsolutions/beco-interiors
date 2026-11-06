-- A third pop up look, D162: `image`, a finished banner Beco has had designed,
-- uploaded once and shown whole. The end year sale banner is the first.
--
-- D159 said stones, not uploads, because the stone on offer should be the
-- stone in the catalogue. A designed banner is a different thing: the copy,
-- the dates and the photographs are already composed into one picture, and
-- redrawing it from catalogue photographs would throw that work away. So the
-- banner look carries its own image, and the other two looks are unchanged.
--
-- `image` holds the derivative stem in R2 and its size, the same shape as a
-- blog cover: { path, width, height, blur }. The title stays required and
-- becomes the banner's alt text, since the words in a picture are invisible
-- to a screen reader.
--
-- The new enum value is not referenced below. Postgres refuses a value added
-- in the same transaction it is used in, so the pairing of `image` with its
-- look is held by the form and by the storefront, which draws a banner pop up
-- without an image as nothing.

alter type popup_variant add value if not exists 'image';

alter table popups add column image jsonb;

alter table popups add constraint popups_image_shape check (
  image is null or (
    jsonb_typeof(image) = 'object'
    and jsonb_typeof(image->'path') = 'string'
    and (image->>'path') ~ '^popups/[0-9a-f-]{36}/[0-9a-f]{8}$'
    and jsonb_typeof(image->'width') = 'number'
    and jsonb_typeof(image->'height') = 'number'
    and (image->>'width')::numeric > 0
    and (image->>'height')::numeric > 0
  )
);

comment on column popups.image is
  'The banner look''s own picture, D162: { path, width, height, blur }. path is an R2 derivative stem under popups/.';
