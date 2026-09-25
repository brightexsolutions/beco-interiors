# Photography and File Naming Guide

For the Beco Interiors team. This is what lets photographs flow onto the website automatically
instead of being placed by hand one at a time.

The website reads the Drive folder directly. If a folder and its files follow the pattern
below, the product appears on the site with its gallery in the right order, with no manual
step. If they do not, the system reports the problem and skips the file rather than guessing,
so nothing wrong is published.

---

## 1. Folder structure

```
BECO PRODUCTS/
  12MM SINTERED STONES/
      CALACATTA GOLD/          <- one folder per product
      JATOBA BROWN/
      STATUARIO/
  SPC FLOORING/
      OAK NATURAL/
  HANDLES/
      GOLD BAR HANDLE 128MM/
```

**Two rules:**

- **One folder per product, named exactly as the product should appear on the website.** The
  folder name becomes the product name and its web address, so `CALACATTA GOLD` becomes
  `beco.co.ke/product/calacatta-gold`
- **Never put a product folder inside another product folder.** This has already happened:
  `CYPRUS LIGHT GREY` and `GALAXY BIANCO` are currently sitting inside `AMBER JADE`. The system
  catches it and skips them, but it means those products do not appear until it is fixed
- **Never put several products' photographs loose in one folder.** A folder is ONE product. If
  the photographs inside it are named after different materials, the folder is really several
  products and needs splitting

**This one has already cost us, and it is worth reading twice.** `DELFONE 12MM` is a supplier
folder, not a stone. Inside it sat `BOSNIA GREY SLAB.jpg`, `BULGARIA BLACK SLAB.JPG`,
`CALACATTA MACCHIA SLAB 1.jpg`, `MARTHA BROWN SLAB.jpg`, `STATUARIO`, `TAJ MAHAL` and
`VERDE LEPANTO`, all loose.

The website has no way to know Delfone is a supplier, so it did what the rule says and made one
product called "Delfone 12mm" holding nineteen photographs of seven different stones: black,
white, green and brown in the same gallery, every one labelled with the wrong name. Six real
products never appeared on the site at all, and the missing photography for Statuario and Taj
Mahal, which we had been asking about, was in here the whole time.

The fix is a folder each:

```
12MM SINTERED STONES/
    BOSNIA GREY/
        SLAB.jpg
        APP 1.jpg
    BULGARIA BLACK/
        SLAB.jpg
        APP 1.jpg
    CALACATTA MACCHIA/
        SLAB 1.jpg
        SLAB 2.jpg
        APP 1.jpg
```

Put the supplier name in the product description if it matters commercially. It is not part of
the folder structure. The system now reports this on every import run and refuses to publish a
folder it has flagged, so nothing mislabelled can reach the site, but it cannot fix it for you:
splitting it automatically would mean guessing where one product's name ends and the shot
description begins, and a wrong guess puts a wrong specification in front of a specifier.

**Renaming a folder after it is live changes the product's web address and loses its Google
ranking.** If a name needs to change, tell us first and we will handle the redirect.

---

## 2. File names inside a product folder

Name the file after what the shot is. Case and spacing do not matter.

| Shot | Name the file | Notes |
|---|---|---|
| Flat slab | `SLAB` or `CALACATTA GOLD SLAB` | The main product image |
| On the stand | `SLAB ON STAND` | Word order does not matter, `STAND ON SLAB` also works |
| Bookmatch | `BOOK MATCH` or `BOOKMATCH` | Two slabs mirrored. See section 4, these matter more than they used to |
| In a room | `APP 1`, `APP 2`, `APP 3` | Numbered in the order they should appear |

**Anything else gets flagged, not guessed.** Files like `DSC02078.JPG` or a supplier's original
Chinese filename cannot be placed automatically, because the system has no way to know what
they show. They are reported and someone has to rename them.

Currently affected: **SANDSTONE BEIGE** has five files with Chinese names. We need someone to
tell us which one is the flat slab shot, or simply rename them in Drive.

---

## 3. What is missing right now

**On stand shots.** Checked against Drive on 31 August 2026. By file name, three folders have
no file named as an on stand shot:

- **Moire White**: APP 1, APP 2, APP 3, MOIRE WHITE SLAB
- **Pure White**: APP 1, APP 2, PURE WHITE SLAB
- **Sandstone Ivory**: APP 1, APP 2, APP 3, SANDSTONE IVORY SLAB

Limestone Creamy has a file named `DSC02078` which may well be the on stand shot, and Sandstone
Beige has five files with supplier names. Both just need renaming.

Irene notes that every stone does have an on stand photo. If these three exist under a
different name, renaming them to `SLAB ON STAND` is all that is needed. If they are genuinely
not there, they are quick to take. The other fifteen category folders are still
empty.

---

## 4. Bookmatch: a product fact, not a missing photo

**Corrected by Irene, 31 August 2026:** only the slabs marked BOOK MATCH are bookmatched. The
rest are **One Face**. That is a property of how the slab was manufactured, not something a
photographer can go and capture, so there is no shot list to fill here.

This matters beyond photography. **Book match versus one face is a specification buyers care
about**, so it belongs on the product page as a spec, and it goes in the product spreadsheet.

The website's main feature section uses a bookmatched slab, because the mirrored veining is
something only stone can do. It features the stones that genuinely are bookmatched, which is
correct rather than limiting.

If a new bookmatched slab arrives in stock, this is how to shoot it:

- Both slabs in frame, complete, nothing cropped off
- Straight on, camera square to the wall, not at an angle
- Even lighting across both slabs, no bright patch on one side
- The mirror seam running vertically down the centre of the frame
- As much of the frame filled by the stone as possible

---

## 4b. Room shots: what the brand guideline asks for

The Beco brand guideline is specific about photography, so these are the brand's own rules
rather than ours.

- **Hero the location.** The photograph is about the space, not a close crop of the product
- **The wider interior space is the focus**, always
- **People are welcome but never the focal point.** Show them working or moving, which also
  makes them less identifiable. Shallow depth of field or a little motion blur is the intended
  technique
- **Authentic people in authentic situations.** Real projects and real spaces, not staged

Wide room shots are more useful to us than tight product crops, and they suit the main homepage
feature better.

## 5. Shot pattern for every product

Aim for four to six images per product:

1. **Flat slab.** Straight on, whole surface, even light. This is the main image
2. **On the stand.** In the showroom, showing scale and edge thickness
3. **Bookmatch**, where the stone is bookmatched
4. **Two or three in a room.** Kitchen, bathroom, wall, floor, whatever is real

Products with fewer images still work. The website handles three images as well as six.

**Technical:** landscape orientation, largest size the camera produces, JPEG is fine. Do not
resize or compress before uploading, the website does that automatically and does it better
from the original.

---

## 6. Hardware, when those categories start

Handles, hinges, knobs, furniture legs, shelf brackets.

**Shoot these on a plain white or plain grey background, one item per photo, evenly lit, no
shadows on the background.** The website removes the background so the item can float on the
page, and that is quick and clean from a plain backdrop and slow and messy from a busy one.

Getting this right at the shoot saves reshooting later.

---

## 7. Site photos and videos

Both folders are empty and both are useful.

**Site photos.** Completed projects and installations. Wide shots showing the whole room, plus
a few close ups of the surface. These become the gallery, and they are some of the strongest
proof the website can show, because they are real Kenyan projects rather than supplier
catalogue images.

Please note which Beco products appear in each, so we can link the photo to the product.

**Site videos.** Short clips work well:

- Light moving across a polished surface
- A slow pan across a finished room
- A slab being handled, showing scale

**Technical:** landscape, 10 to 20 seconds, steady camera or a tripod, 1080p or better.
**Videos play silently on the website**, so no voiceover or music is needed.

---

## 8. Prices, specifications and descriptions

**None of this exists anywhere yet**, and it is the single most valuable thing the team can
supply.

Without it, every product launches showing a photograph and a name, with "Price on application"
and no detail. That works, and buyers can still request a quote, but it is a gallery rather
than a catalogue.

We will send a simple spreadsheet with one row per product. Fill in what is known, leave the
rest blank, and send it back whenever. Partial is genuinely fine, the website applies whatever
is filled in and leaves the rest as Price on application.

| Column | Example |
|---|---|
| Product | Calacatta Gold |
| Category | 12mm Sintered Stones |
| Code | SS-CAL-120 |
| Price | 25000, or leave blank for POA |
| Unit | per slab, per piece, per metre |
| Availability | In stock, Pre order, or POA |
| Size | 1600 x 3200mm |
| Thickness | 12mm |
| Finish | Polished, Matt |
| Description | Two or three sentences |

---

## 9. In short

- One folder per product, named as it should appear on the site
- Never nest a product folder inside another
- Name files `SLAB`, `SLAB ON STAND`, `BOOK MATCH`, `APP 1`, `APP 2`
- Upload originals, do not resize
- Hardware on a plain background
- Tell us before renaming anything that is already live

Anything that does not follow this is reported rather than guessed, so nothing incorrect
reaches the website. It just means someone has to go back and fix it.
