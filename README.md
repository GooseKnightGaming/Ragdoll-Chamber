# Ragdoll Chamber

A slapstick 2.5D stress toy by GooseKnightGaming. Grab, flick, kick and drop things on a cartoon rag doll, and watch it flop, panic, pop its buttons and seams, then stitch itself back together.

Current version: **V0.1, physics prototype** (milestone 1 of the design doc). One buddy (Stitches, the rag doll), one room (the dungeon), six tools.

## Play locally
Open `index.html` in a browser. It needs an internet connection the first time, to load Three.js.

## Put it on GitHub Pages
1. Create a repository and upload `index.html`, `style.css`, `README.md` and the `js` folder (`physics.js`, `buddy.js`, `sound.js`, `render.js`, `game.js`).
2. In the repository, go to **Settings → Pages**, choose **Deploy from a branch**, pick `main` and `/ (root)`, then save.
3. The game appears at `https://<your-username>.github.io/<repository-name>/` after a minute or two.

## Controls
- **Tools:** Grab (drag and fling), Flick, Boot, Anvil, Cannon, Piano. Keys 1 to 6 pick them.
- **Camera:** drag empty space to turn it, scroll or pinch to zoom.
- **Repair** (or R) puts the buddy back together instantly. Leave it alone for a moment and it pulls itself together anyway.

## How it works
- `js/physics.js`: a small Verlet physics engine. The buddy is 16 points joined by sticks; heavy props are big balls.
- `js/buddy.js`: the rag doll: its seams, buttons, fluster, dizziness and wear, popping limbs off, mending and getting back up.
- `js/render.js`: the Three.js scene (r128, from cdnjs), toon shading, the face, props and effects.
- `js/sound.js`: every sound is generated in the browser.
- `js/game.js`: tools, input, camera, points and combos.

The best score saves in the browser.

## Changelog
**V0.1**
- Physics prototype: the rag doll, the dungeon, grab and fling, flick, boot, anvil, cannon and piano; squashing, stuffing puffs, buttons popping, limbs and the head coming off at the seams, mending and standing back up; faces, speech bubbles, generated sounds, points and combos.
