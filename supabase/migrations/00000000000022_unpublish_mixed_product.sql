-- Take "Delfone 12mm" off the site until its Drive folder is fixed.
--
-- Delfone is a SUPPLIER, not a stone. `12MM SINTERED STONES/DELFONE 12MM`
-- holds Bosnia Grey, Bulgaria Black, Calacatta Macchia, Martha Brown,
-- Statuario, Taj Mahal and Verde Lepanto as loose files named after the stone,
-- so the importer, which trusts the folder name to be the product name, made
-- one product out of seven.
--
-- What shipped was a product page called "Delfone 12mm" with nineteen
-- photographs of black, white, green and brown stone in one gallery, every one
-- captioned with the wrong material, no price, and the same wrong name on
-- every gallery card those photographs produced. That is a wrong
-- specification in front of the exact reader who checks, which is the same
-- class of error as the rail cards that called a brass handle sintered stone.
--
-- Unpublished rather than deleted: the row carries real provenance and real
-- photographs, and the fix is to reorganise the Drive folder, at which point
-- the import creates the seven products properly. Deleting would throw away
-- the record of what was imported and from where.
--
-- The importer only sets is_published on FIRST insert, per the fix that
-- stopped it rewriting commercial fields, so a nightly run cannot put this
-- back. The pipeline now also REPORTS the folder on every run, see
-- tools/drive-import/src/mixed.ts, so it cannot be silently forgotten.
--
-- Blocked on Beco. Tracked in docs/milestones/M4-TODO.md alongside the office
-- accessories folder, which is the same problem from the other direction.

update products
   set is_published = false
 where source_path = '12MM SINTERED STONES/DELFONE 12MM';
