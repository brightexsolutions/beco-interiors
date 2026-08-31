-- Enums and shared helpers. Everything else depends on this.
-- See docs/SCHEMA.md.

create type user_role as enum
  ('beco_admin','beco_sales','beco_product_manager','beco_editor','brightex_admin');
create type price_display_mode as enum ('fixed','poa');
create type availability as enum ('in_stock','pre_order','poa');
-- Book match versus one face is a MANUFACTURING property, not a photography gap.
create type face_type as enum ('book_match','one_face');
create type product_badge as enum ('hot','new','sale','clearance');
create type quote_status as enum ('new','reviewing','quoted','won','lost');
-- whatsapp exists from day one though nothing writes it yet, leaving the seam open.
create type quote_source as enum ('web','walk_in','phone','whatsapp');
create type order_status as enum ('pending','confirmed','fulfilled','cancelled');
create type payment_status as enum ('unpaid','paid');
create type fulfilment as enum ('pickup','delivery');
create type document_type as enum ('quote','receipt');
create type audit_action as enum ('create','update','delete','login','send','export','assign');
create type image_role as enum ('slab','on_stand','bookmatch','application','unknown');
create type import_outcome as enum ('new','changed','moved','unchanged','missing');
create type announcement_type as enum ('sale','clearance','notice','event');
create type post_status as enum ('draft','published');

-- Reference numbers come from a sequence INSIDE the database, so two
-- salespeople saving in the same second cannot collide.
create sequence quote_reference_seq start 1;
create sequence order_reference_seq start 1;

create or replace function next_quote_reference() returns text
language sql volatile as $$
  select 'BEC-Q-' || lpad(nextval('quote_reference_seq')::text, 5, '0');
$$;

create or replace function next_order_reference() returns text
language sql volatile as $$
  select 'BEC-O-' || lpad(nextval('order_reference_seq')::text, 5, '0');
$$;

create or replace function current_user_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from users where id = auth.uid() and is_active;
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select current_user_role() in ('beco_admin','brightex_admin');
$$;
