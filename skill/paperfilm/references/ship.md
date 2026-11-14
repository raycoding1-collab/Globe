# Shipping: phones, in-app browsers, publishing, sharing

## 1. Phones and in-app browsers (already built into the template; keep them)

People will open the link from an Instagram DM, which uses the app's own browser: Safari's
engine on iPhone, a Chrome WebView on Android, both with stricter rules than a normal browser.

- **Sound starts first, inside the tap on Begin**, before fullscreen or anything else. Android
  in-app browsers refuse sound if fullscreen used up the tap first. If sound is refused anyway,
  Begin comes back so the next tap starts it.
- **iPhone silent switch**: `navigator.audioSession.type = 'playback'` keeps the paper sounds and
  the soundtrack together.
- **Leaving pauses** (back to the chat, locked screen), and coming back shows the Play button.
- **Captions sit above the controls** even in the app's short window; titles stay on one line on
  narrow phones; the volume slider is hidden where phones ignore page volume (iPhones).
- **Seeking works on any host**: if a host cannot serve part of the audio file, the whole file is
  fetched once and played from memory.
- **Memory and start-up**: lazy sprite building and freeing scratch canvases (see `engine.md`).
- **Never lower quality** on slow devices (the user's rule).
- `viewport-fit=cover`, no text inflation on rotation, no double-tap zoom.

Run `node tools/inapp.mjs 8766` and `node tools/memory.mjs 8766` before every publish.

## 2. Publishing to GitHub Pages

- Work on the session's development branch. The public site is the `gh-pages` branch, written only
  by `tools/publish_pages.sh` (a worktree in `.cache/site`). Update the URL in the script's
  comment and the list of files it copies if the new film adds assets.
- GitHub usually turns Pages on by itself for a `gh-pages` branch; if it does not, the user
  turns it on in the repository's Settings, Pages.
- After publishing, confirm the "pages build and deployment" workflow run for the new commit
  finished with success, and that the published branch matches:
  `git fetch -q origin gh-pages && git diff --quiet HEAD origin/gh-pages -- index.html src && echo same`.

## 3. The link preview (how the link looks in a DM)

In `index.html`: `description`, `og:type`, `og:title`, `og:description`, `og:url`, `og:image`
(absolute URL), `og:image:width/height` (1200, 630), `og:image:alt`, `twitter:card`
(`summary_large_image`), and an icon (`assets/icon.png`, 180 px). Render the preview image from
the title screen, a little brighter than on screen so it reads small:

```js
// 1200x630, deviceScaleFactor 1; wait ~4.5 s for the living frame behind the title
await p.addStyleTag({ content: '#begin,.hint{visibility:hidden!important} .card{transform:translateY(2vh)!important} #veil{background:radial-gradient(ellipse at 50% 62%, rgba(6,4,5,.12), rgba(6,4,5,.62))!important}' });
await p.screenshot({ path: 'assets/share.jpg', type: 'jpeg', quality: 86 });
// icon: render ?t=<a beautiful moment> at 360x360 with the veil hidden, crop and scale to 180x180
```

## 4. A short link

GitHub Pages addresses are long. TinyURL makes a readable permanent redirect with no account:

```sh
curl -sG https://tinyurl.com/api-create.php --data-urlencode "url=https://<user>.github.io/<repo>/" --data-urlencode "alias=<film-name>"
curl -sI https://tinyurl.com/<film-name> | grep -i location   # check it points at the film
```

It answers `Error` when the alias is taken; try a hyphenated variant. The environment's network
rules must allow `tinyurl.com` (propose adding it if refused).

## 5. Finishing

Commit with a message that says what changed and why, push the development branch, publish,
confirm the deploy, and give the user the short link and a plain report.
