# NEU Founders × ascend

A private, password-protected ledger of Northeastern founders (from the PitchBook People Screener and the
Northeastern Founders directory) matched against **ascend** constituent and household records.

- List view of every founder with match status, constituent and household ascend IDs, email, company and more
- Filters by match status, source and other fields, plus full-text search
- Right-hand detail panel with source data, the ascend match, the evidence behind it and links into ascend
- Excel / CSV export with a column picker
- Light and dark Northeastern themes

Built with React, TypeScript, Vite, Tailwind CSS and shadcn/ui.

## How the data is protected

The site is static. Founder data is published **only** as `public/data/vault.json`, which is gzip-compressed
and encrypted with AES-256-GCM using a key derived from the team password (PBKDF2-SHA256, 600,000 iterations).
The password is not stored anywhere in the code; the browser decrypts the file only when the right password is
entered. Readable data lives in `private/` and is git-ignored — never commit it.

## Updating the data

1. Produce the lookup files (people, PitchBook rows, website rows/drawers, final classification) in a folder.
2. Build the readable dataset:
   ```bash
   python3 scripts/prepare_data.py <lookup-data-dir>    # writes private/founders.json
   ```
3. Encrypt it (uses `private/PASSWORD.txt`, or set `VAULT_PASSWORD`):
   ```bash
   npm run encrypt                                      # writes public/data/vault.json
   ```
4. Commit and push `public/data/vault.json`. The site redeploys automatically.

To change the password, put the new one in `private/PASSWORD.txt` (or `VAULT_PASSWORD`) and run step 3 again.

## Local development

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build in dist/
```

## Deployment

`.github/workflows/deploy.yml` builds the site and publishes it to GitHub Pages on every push to `main`
(repository Settings → Pages → Source: **GitHub Actions**). The build does not need the password.
