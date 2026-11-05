# Sportive Hub site

Static site, no build step. Plain HTML, CSS and JS. Hosted on Hostinger at https://sportive-hub.com. The Vercel copy at https://sportive-hub-site.vercel.app is a preview and stays out of search.

## Pages

| File | URL | What it is |
|---|---|---|
| `index.html` | `/` | Main landing page (scroll animations with GSAP + Lenis) |
| `where-it-hurts.html` | `/where-it-hurts` | Interactive body map (three.js) with exercises per area |
| `links.html` | `/links` | Link-in-bio page for Instagram, one screen with pop-up sheets |
| `motion-test.html` | `/motion-test` | Motion test page, not linked from the site |

## Files

- `assets/` holds images, the logo and `exercises.js` (the exercise data that `where-it-hurts.html` uses), plus `icon-192.png` and `og-image.jpg` (the 1200×630 link-preview image)
- `favicon.ico` and `apple-touch-icon.png` sit at the root because browsers and iPhones request them there by default. The icon is the script "i" from the logo, milk on olive.
- Each page has link-preview (Open Graph) tags and a canonical address on https://sportive-hub.com
- `video/` holds the exercise clips (`bridge.mp4`, `birddog.mp4`)
- `.htaccess` is the Hostinger server config: forces HTTPS, serves `/links` and `/where-it-hurts` without `.html`, and redirects the `.html` addresses to them
- `vercel.json` is only for the Vercel preview: clean URLs plus a `noindex, nofollow` header, so the preview copy stays out of search. The pages themselves have no noindex tag.

## External libraries (loaded from CDNs)

- GSAP 3.13.0 with ScrollTrigger and SplitText (cdnjs)
- Lenis 1.1.13 (jsDelivr)
- three.js r128 (cdnjs)
- Instrument Serif from Google Fonts

## Run locally

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765. Clean URLs only work on the server (`.htaccess` on Hostinger, `vercel.json` on Vercel), so locally use `/links.html` and so on.

## Deploy to Hostinger

Only these go on the server: `.htaccess`, `index.html`, `links.html`, `where-it-hurts.html`, `favicon.ico`, `apple-touch-icon.png` and `assets/`. Leave out `motion-test.html` and `video/` (an unlinked test page and its clips), `README.md`, `vercel.json` and `.gitignore`.

Build the upload zip from this folder:

```bash
zip -r ../sportive-hub-hostinger.zip .htaccess index.html links.html where-it-hurts.html favicon.ico apple-touch-icon.png assets
```

Then either deploy it with the Hostinger API (static website deploy for `sportive-hub.com`), or in hPanel open File Manager for sportive-hub.com, upload the zip into `public_html` and extract it there. Deploying replaces what is in `public_html`, so take a backup first.

## Deploy the Vercel preview

```bash
vercel --prod
```

Link it to your own Vercel project the first time you run this.

## Contact details used on the site

- WhatsApp: +20 103 555 5380 (wa.me/201035555380)
- Instagram: @sportivehub_
- Address: SODIC Medical District, Building 4, Sheikh Zayed
