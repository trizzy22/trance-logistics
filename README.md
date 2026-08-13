# Trance Logistics — website

A static, multi-page freight-forwarding site with a browser-based admin panel
for editing content and publishing straight to GitHub. No build step, no
server — just HTML/CSS/JS and one `content.json` file that drives everything.

## Pages
- `index.html` — home, with the animated trade-route hero
- `about.html` — company story, values, offices
- `services.html` — full service list + process
- `track.html` — shipment tracking demo (sample data only — see comment in file)
- `contact.html` — quote request form (opens the visitor's email client; swap
  for a form backend like Formspree if you want submissions collected directly)
- `admin.html` — content editor, publishes directly to this repo via GitHub's API

## Publish it on GitHub Pages
1. Create a new **public** repo on GitHub (empty, no README).
2. Upload every file in this folder to it, keeping the folder structure
   (drag-and-drop on the repo's homepage works fine — no git required).
3. Go to **Settings → Pages**, set Source to your default branch, root folder.
4. Your site will be live at `https://<your-username>.github.io/<repo-name>/`
   within a minute or two.

## Using the admin panel
1. Open `https://<your-username>.github.io/<repo-name>/admin.html`.
2. Generate a GitHub **fine-grained personal access token**:
   github.com → Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token. Scope it to **this one repo
   only**, with **Contents: Read and write** permission, and a short
   expiry (30–90 days is plenty).
3. Paste your username, repo name, branch (`main`), and the token into the
   admin panel and click Connect.
4. Edit any tab, then click **Publish changes**. GitHub Pages rebuilds
   automatically, usually within a minute.

The token stays in your browser and talks directly to GitHub — it is never
seen by anyone else. Revoke it any time from the same GitHub settings page.
