# Ragdoll Chamber

A slapstick 2.5D stress toy by GooseKnightGaming. Grab, flick, kick and drop things on a cartoon rag doll, and watch it flop, panic, pop its buttons and seams, then stitch itself back together.

Current version: **V0.2, the look-and-feel pass**. One buddy (Stitches, the rag doll), one room (the dungeon), six tools.

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
**V0.2: the look-and-feel pass**
- The dungeon is lit like one: a lantern hanging over the middle throws a warm pool of light, two torches flicker on the back wall, cold moonlight comes through a barred window, and dust drifts in the air. Film-style tone mapping, a vignette.
- Real stonework: irregular blocks with mortar, mottling and damp streaks; wet flagstones with cracks and puddles that catch the light; a timbered ceiling; corner pillars; a studded door; chains and shackles; straw, a barrel and a bucket. The room carries on towards the camera, so there is no black void at the sides; a stone sill marks the edge of the play area.
- Stitches is a proper stuffed toy: chunkier, felt-textured, with an ink outline, a stitched seam down the front and round the waist, thread rings where the arms and legs are sewn on, sewn-on button eyes with a shine, yarn hair, stitched patches and four-hole buttons. A soft shadow keeps it grounded.
- Hits land: the camera shakes, big hits pause the world for a beat, the doll flashes white, dust kicks up where things meet the floor, bigger stuffing puffs.
- The anvil and piano show a flashing target on the floor before they land, and land with a clang, dust and a shake.
- The cannon actually appears: it pokes out of the wall, fires with a flash of light and smoke, and kicks back.
- The boot swings in from behind and above, toe first, and follows through.
- Sound: everything echoes off the stone (a generated reverb), and there is a soft cloth slap on each hit.

**V0.1**
- Physics prototype: the rag doll, the dungeon, grab and fling, flick, boot, anvil, cannon and piano; squashing, stuffing puffs, buttons popping, limbs and the head coming off at the seams, mending and standing back up; faces, speech bubbles, generated sounds, points and combos.
