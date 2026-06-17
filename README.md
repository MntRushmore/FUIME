# Northern Light — single-album music site

A clean, white, modern microsite for one album with six playable tracks.
Pure HTML / CSS / JS. No backend, no build step.

## Run it

Open `index.html` directly, or serve the folder (recommended, so audio loads
correctly):

```bash
cd FUIME
python3 -m http.server 8000
# then open http://localhost:8000
```

## Add your own audio

1. Drop six audio files into an `audio/` folder.
2. The site looks for these paths by default:

   ```
   audio/01-first-snow.wav
   audio/02-cabin-north.wav
   audio/03-letters-home.wav
   audio/04-aurora.wav
   audio/05-the-long-way-back.wav
   audio/06-northern-light.wav
   ```

   Rename your files to match, **or** edit the `src` values in the `TRACKS`
   array at the top of [`script.js`](script.js). `.mp3`, `.wav`, `.m4a`,
   `.ogg` all work.

### Demo mode

If no audio files are found, the page automatically falls back to gentle
synthesized tones (one per track) via the Web Audio API — so every control
(play, pause, scrub, next/prev, volume) is fully functional out of the box.
Replace the files and the real audio takes over with no code changes.

## Customize

| What | Where |
|------|-------|
| Album title / artist / description / year | `index.html` hero section |
| Track titles & notes/lyrics | `TRACKS` array in `script.js` |
| Album cover | replace `assets/cover.svg` (or point to a `.jpg`/`.png` in `index.html`) |
| Colors, radius, shadows | CSS variables at the top of `styles.css` |

## Keyboard shortcuts

- **Space** — play / pause
- **← / →** (on page) — previous / next track
- Arrow keys on the progress / volume sliders — seek / adjust
