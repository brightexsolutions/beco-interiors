# Content Audit: what in the prototype is actually true

The approved prototype was built before Brightex had real information about Beco. Its design
was validated by the client, but **its content was largely invented to make the design
demonstrable.** That is normal for a pitch prototype and a problem if it ships.

This audit separates the two. **Nothing marked UNVERIFIED or FALSE goes live until confirmed.**

Audited 31 August 2026 against the Drive export and the April 2025 brand guideline.

---

## Why this matters more than it looks

Three of these claims are not merely cosmetic:

- **The showroom address** goes into `LocalBusiness` structured data and seeds the Google
  Business Profile. A wrong address there is published to Google, cited across the web, and
  awkward to correct once indexed
- **The 2 hour quote promise** is an operational commitment. The dashboard is being designed
  around it, with a stat card that turns red when the oldest unanswered quote breaches it
- **"10+ years"** is a trust claim on a public site, and it is contradicted by Beco's own brand
  guideline

---

## FALSE: contradicted by a primary source

| Claim | Where | Contradicted by |
|---|---|---|
| **"10+ Years in Nairobi"** | About page | Brand guideline, April 2025: "Beco Interiors is a **new entrant into the market newly launched** in the East African region" |
| **The entire product catalogue**, 20 items | `beco-shop.html` | **Not one matches the 24 real stones in Drive.** Calacatta White, Nero Marquina, Sahara Beige, Cemento Grey, Portoro Gold do not exist in Beco's range |
| **Slab sizes 1200x600 and 900x600** | Shop data | Sintered stone is large format. The real product is nearer 1600x3200 |
| **All prices**, KES 25,000, 22,000, 18,000 etc | Shop data | Invented. **No price data exists anywhere yet** |
| **"WPC Wall Panels"** | Everywhere | Drive has **SPC** Wall Panels. Wood Plastic Composite and Stone Plastic Composite are different materials |

## UNVERIFIED: plausible, invented, or unknown. Confirm before launch

| Claim | Where | Note |
|---|---|---|
| **"520+ products"** | Home, About, Products | Drive holds 24 products and 15 empty folders. The number appears fabricated |
| **Category counts:** Lighting 88, Sintered Stones 36, WPC 80, Accessories 320 | Nav, mega menu, Products | Sum to 524, hence "520+". Sintered Stones is 24 in reality, not 36. Precise looking numbers with no source |
| **"2 hour quote turnaround"** | Home, About, Contact | Appears 5 times. **The same prototype also says 24 hour once**, so it is not even internally consistent. Is this a real operational commitment Beco can keep? |
| **Showroom address:** Urban Square, Shop 8 & 9, Enterprise Road, Industrial Area, Nairobi | Footer, Contact, About | Consistent across the prototype, which means one person wrote it once, not that it is verified. **Highest risk item in this table** |
| **"Easy to find off Mombasa Road"**, "on-site parking available" | Contact | Unverified |
| **Phone +254 722 333 730** | Everywhere | Also the WhatsApp number in the plan. Confirm both are current |
| **info@beco.co.ke** | Everywhere | Confirm it is monitored, since quote notifications go here |
| **Mon to Sat, 8am to 6pm** | Footer, Contact | Confirm, and confirm holiday handling |
| **Mission and vision statements** | About | Do not match the guideline's mission text. The guideline's own wording should probably win |
| **Five core values** with emoji icons | About | Source unknown |
| **Testimonials** | Home | Are there real client testimonials, with permission to publish? |
| **"Kenya's most trusted interior materials supplier"** | About | A superlative claim from a company its own guideline calls a new entrant |

## TRUE: confirmed against a primary source

| Claim | Confirmed by |
|---|---|
| Four product families | Brand guideline strapline: Sintered Stone, Lighting, Panels, Accessories |
| Brand tone is "Elegance" | Guideline, page 1, in those words |
| Sells sintered stone, lighting, panels, accessories | Guideline strapline and mission |
| Nairobi and East Africa focus | Guideline mission |

---

## What replaces the invented content

**The catalogue replaces itself.** The import pipeline builds products from Drive, so the 24
real stones arrive with their real names automatically. The 20 invented products simply never
migrate. This was already the plan and needs no extra work.

**The numbers should be dropped rather than corrected.** "520+ products" and the per category
counts are stated as proof, and proof that is wrong is worse than no proof. Better options that
are true: the number of stone colours actually stocked, years since founding once known, or
nothing at all. A site does not need a statistic.

**The 2 hour promise needs a decision, not a guess.** Either Beco commits to it, in which case
the dashboard measures it and the site says it, or it comes off the site. It should not ship as
inherited copy nobody has agreed to.

**WPC becomes SPC**, or Beco confirms they stock both. This one is a factual product error, and
a materials supplier getting a material name wrong is costly to credibility.

**"10+ years" comes off.** New entrant is not a weakness worth hiding when the range is the
story, and an overstated claim is a real risk on a site aimed at architects and contractors who
check.

---

## The one thing to confirm first

**The showroom address.** Everything else can be fixed after launch with an edit. The address
propagates into structured data, the Google Business Profile and eventually third party
listings, and it is the one that is genuinely painful to unpick.

Confirm before the Business Profile is claimed, which per `docs/DEPLOYMENT.md` section 9 should
start in week one because postcard verification is slow.
