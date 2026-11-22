# 3-Mile Coach — iPhone installation

This is a lightweight Progressive Web App (PWA) for the 12-week 3-mile plan. It is not an App Store app.

## What's included
- Full 12-week schedule with running, cross-training, rest and strength guidance
- Workout completion checkboxes
- Start-date-based training week and daily workout
- Weekly mileage, workout, calf-status and effort logs
- 1-mile / 3-mile benchmark fields
- 18:00 pace reference and pace calculator
- Local backup export/import
- Offline cache after the first successful visit

## Publish it free with GitHub Pages

You need a GitHub account and a computer for this one-time setup.

1. On your computer, open https://github.com and sign in (or create a free account).
2. Click **New repository**.
3. Name it `three-mile-coach` and set it to **Public**. You do not need to add a README, license or .gitignore.
4. Open the new empty repository.
5. Click **Add file** → **Upload files**.
6. Unzip `three-mile-coach.zip` on your computer. Open the resulting `three-mile-coach` folder.
7. Upload the *contents* of that folder (index.html, manifest.webmanifest, service-worker.js, icon-192.png, icon-512.png, README.md). Do not upload only the enclosing folder.
8. Click **Commit changes**.
9. In the repository, open **Settings** → **Pages**.
10. Under **Build and deployment**, set Source to **Deploy from a branch**.
11. Set Branch to **main** and folder to **/(root)**, then click **Save**.
12. Wait a minute or two. Refresh the Pages settings page. GitHub will show your site URL, usually:
    `https://YOUR-GITHUB-USERNAME.github.io/three-mile-coach/`
13. Open that URL on your computer first and make sure the app loads.

GitHub Pages setup guide: https://docs.github.com/en/pages/quickstart

## Add it to your iPhone Home Screen

1. On your iPhone, open **Safari** (not an in-app browser).
2. Enter your GitHub Pages URL, including the final `/three-mile-coach/`.
3. Wait for the app to load.
4. Tap Safari's **Share** button.
5. Scroll down and tap **Add to Home Screen**. If it is missing, scroll to the bottom of the actions, tap **Edit Actions**, and add it.
6. If shown, turn on **Open as Web App**.
7. Change the name to `3-Mile Coach` if desired, then tap **Add**.
8. Find the new icon on your Home Screen and open it.

Apple's instructions: https://support.apple.com/guide/iphone/turn-a-website-into-an-app-in-safari-iphEA86e5236/ios

## Important data note
Workout checkmarks and logs are stored locally in Safari/web-app storage on that iPhone. They are not linked to an account and do not automatically sync to your Mac or another phone. Use **Tools → Export backup** periodically and keep the JSON backup somewhere safe. Do not clear Safari website data unless you have exported a backup.

## Updating the app
If you later upload updated app files to the same GitHub repository, refresh the app while online. If an old version remains cached, close the web app, open the site in Safari, refresh, then reopen the Home Screen icon. The service worker cache version can be incremented in `service-worker.js` for future releases.
