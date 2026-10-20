# Source

Front/back body silhouette outlines, used as the clickable base layer for
the skin-lesion body map (see `components/patient/skin-lesions-panel.tsx`).

- **Files:** `perpara.svg` (front), `pas.svg` (back)
- **Origin:** original artwork made for this project — a symmetric body
  outline built as a single closed cubic-bezier path, generated
  programmatically (see `generate.py` in this folder for the exact path
  data and how it was built) and hand-tuned, not traced or downloaded from
  a third party.
- **License:** none needed — this is original work created for Hypocrates,
  free to keep, replace, or restyle.

**Correction (2026-08-28):** this file previously attributed these SVGs to
Sebastian Wallroth / Wikimedia Commons (a real CC0 human-silhouette file at
`commons.wikimedia.org/wiki/File:Human_silhouette_gender_neutral_front.svg`).
That attribution was false — fetching the actual Wikimedia file for
comparison shows a completely different viewBox and path structure than
what's shipped here. The shipped shape matches `generate.py` byte-for-byte
instead. No license problem results (original work needs no license), but
the earlier documentation incorrectly credited a real person and a real
file that this artwork has nothing to do with. Corrected here, and in the
`apps/physiotherapy` copy that reused this asset.