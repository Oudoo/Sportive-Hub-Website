# Sportive Hub website

The website for Sportive Hub, Movement Lab, a movement and recovery clinic in Sheikh Zayed. Live at https://sportive-hub.com, hosted on Hostinger.

Two separate things live in this repository:

- **`public_html/`**: the public website. Plain HTML, CSS and JavaScript: no framework, no build step, no npm. What is in it is exactly what is on the server. The rest of this file is about it.
- **`platform/`**: the patient portal, admin dashboard and API (Next.js, Prisma, MySQL). It is a separate app with its own README, dependencies and Hostinger website. See [`platform/README.md`](platform/README.md).

## Pages

| File | Live URL | What it is |
|---|---|---|
| `public_html/index.html` | https://sportive-hub.com/ | Main landing page, with scroll animations (GSAP and Lenis) |
| `public_html/where-it-hurts.html` | https://sportive-hub.com/where-it-hurts | Interactive 3D body map (three.js) with home exercises for each area |
| `public_html/links.html` | https://sportive-hub.com/links | Link-in-bio page for Instagram: booking, prices and locations in pop-up sheets |

## Folder layout

```
public_html/            everything in here goes live; nothing outside it does
  .htaccess             server config: HTTPS, short URLs, redirects from the .html names
  index.html
  links.html
  where-it-hurts.html
  favicon.ico           at the root because browsers ask for it there
  apple-touch-icon.png  at the root because iPhones ask for it there
  assets/               photos, logo, icons, link-preview image, exercises.js
platform/               the portal, dashboard and API: a Node.js app deployed separately (see its README)
README.md
```

## How the code is organised

- Each page is one self-contained HTML file. Its CSS is in a `<style>` block in the head and its JavaScript in a `<script>` at the end of the body.
- Brand colours and fonts are CSS variables at the top of each page's `<style>`: `--olive`, `--sand`, `--milk`, `--pastel` and `--charcoal`. Each page has its own copy, so a palette change means editing all three.
- The logo is `assets/logo.png`, used as a CSS mask so the one file can be shown in any brand colour (set `--logo-ink`).
- Links between pages use the `.html` names (for example `where-it-hurts.html#knee`), so they work when the files are opened locally. On the server, `.htaccess` redirects them to the short URLs.
- Booking happens on WhatsApp through `wa.me/201035555380` links, which appear on all three pages.
- Prices are in `links.html`, in the "Services & prices" sheet.
- The exercise animations on the body map are drawn by `assets/exercises.js`.
- Each page has link-preview (Open Graph) tags and a canonical URL on https://sportive-hub.com. The preview image is `assets/og-image.jpg` (1200×630).

## External libraries

Loaded from CDNs at pinned versions. Keep them pinned.

- GSAP 3.13.0 with ScrollTrigger and SplitText (cdnjs), on `index.html`
- Lenis 1.1.13 (jsDelivr), on `index.html`
- three.js r128 (cdnjs), on `where-it-hurts.html`
- Instrument Serif (Google Fonts), on every page

If a CDN fails to load, the pages still work: the home page skips its animations, and the body map shows the list of areas instead of the 3D body.

## Run locally

```bash
python3 -m http.server 8765 --directory public_html
```

Then open http://localhost:8765. Short URLs like `/links` only work on the server, so locally use `/links.html` and `/where-it-hurts.html`.

Check changes at phone width as well as desktop, and with "reduce motion" turned on in your system settings.

## Deploy

The site is the Hostinger website `sportive-hub.com`. Deploying replaces everything in the server's `public_html`.

1. Build the upload zip from the repository root:

   ```bash
   cd public_html && zip -r ../sportive-hub-site.zip . -x '*.DS_Store' && cd ..
   ```

2. Deploy it, either:
   - with the Hostinger API's static website deploy for `sportive-hub.com`, which uploads the zip and replaces `public_html` in one step; or
   - in hPanel, open File Manager for sportive-hub.com, empty `public_html`, upload the zip there, extract it, then delete the zip.

3. Clear the website cache in hPanel. The Hostinger CDN is on, so visitors can keep getting old files until it is cleared.

## Working on the site

- Work on a branch and open a pull request into `main`. Keep `main` matching the live site.
- Keep `public_html/` build-free: no npm packages or bundlers there. Anything that needs a build belongs in `platform/`.
- Keep file names lowercase. The server is case-sensitive.
- Put new images in `public_html/assets/` and compress them first. The current photos are about 25 to 250 KB at 720 to 1800 px wide.

## Contact details used on the site

- WhatsApp: +20 103 5555 380 (`wa.me/201035555380`)
- Instagram: @sportivehub_
- Email: info@sportive-hub.com
- Address: SODIC Medical District, Building 4, 2nd floor, Clinic 212, Sheikh Zayed, Giza

## History

The earlier React version of the site, and the old blue brand files, were removed when this site replaced it. They are still in the git history if ever needed.
