-- D163: a quote line remembers the price a sale cut, so the quote, its PDF
-- and the priced quote email can say "Was KES 10,000, 40% off".
--
-- A product on sale carries `compare_at_price` above `price`. A quote line
-- copies `price` into `list_price` when it is written, and nothing kept the
-- struck through figure, so a quote raised during the end year sale could
-- not show the customer what the sale saved them.
--
-- The figure is copied when the line is written, the same rule as the price
-- and the code (D124): an issued quote never changes because the sale ended
-- or the product was edited. One trigger fills it on every path that inserts
-- a line, so none of those functions is rewritten.
--
-- It is only ever the catalogue's own figure. On insert the trigger sets it
-- from the product, overwriting anything the caller sent, and only when the
-- line was written at the product's sale price: a line at a size's own price,
-- a free text line, or a product priced on application carries none. On
-- update it cannot change. A salesperson can still discount a line, which D86
-- already measures against `list_price`; what they cannot do is invent a
-- higher "was" price for the customer to see.
--
-- Quote lines only. Orders, receipts and lines written before this migration
-- carry none: backfilling would rewrite issued quotes.

alter table quote_items
  add column compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price > 0);

comment on column quote_items.compare_at_price is
  'The product''s struck through price when the line was written at its sale price. Set only by the quote_items_sale_price trigger, never by a caller. D163.';

create or replace function line_sale_price_from_product()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' then
    -- A snapshot: whatever an update sends, the line keeps what it was given.
    new.compare_at_price := old.compare_at_price;
    return new;
  end if;

  new.compare_at_price := null;
  if new.product_id is not null and new.list_price is not null then
    select p.compare_at_price into new.compare_at_price
      from products p
     where p.id = new.product_id
       and p.price_display_mode = 'fixed'
       and p.price is not null
       and p.compare_at_price > p.price
       and new.list_price = p.price;
  end if;
  return new;
end
$$;

create trigger quote_items_sale_price
  before insert or update of compare_at_price on quote_items
  for each row execute function line_sale_price_from_product();
