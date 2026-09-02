-- Three things a Beco quote has to capture that the form did not ask for.
--
-- DELIVERY is chargeable. The form offered pickup or delivery and said nothing
-- about cost, so a customer choosing delivery could reasonably read the slab
-- price as the delivered price. On a 65,000 slab that is not a small surprise.
--
-- INSTALLATION is a service Beco provides and charges for. It is one of the
-- reasons a specifier chooses a supplier who can do the whole job, so not
-- asking loses the upsell and loses the detail the salesperson needs to quote.
--
-- SAMPLES are how developers and interior designers actually buy. They want a
-- physical piece in the room before committing to a slab, and a quote request
-- that cannot say so becomes a phone call instead.
--
-- All three are captured as intent, not as priced lines: the salesperson
-- prices them, exactly as they price the materials.

alter table quotes
  add column if not exists wants_installation boolean not null default false,
  add column if not exists wants_samples      boolean not null default false;

comment on column quotes.wants_installation is
  'Customer asked about installation. Chargeable, priced by the salesperson.';
comment on column quotes.wants_samples is
  'Customer wants samples before committing. Common for developers and designers.';
