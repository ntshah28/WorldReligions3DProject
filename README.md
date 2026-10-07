# Native American Religions: A Virtual Exhibition

A walk-through 3D exhibition built with [three.js](https://threejs.org/) for the Indigenous Religions Project. It has two galleries joined by a doorway. Five artworks hang in them, each with a wall label giving its title, artist, date, description and source, plus an intro panel and a closing panel. Glowing arrows and numbered markers on the floor show the route, and a guided tour steps through every stop.

## Running it

Serve the folder with any static web server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

It also works as-is on GitHub Pages. three.js is bundled in `vendor/`, so the gallery needs no internet connection; only the web fonts come from Google Fonts. If the fonts can't load, it uses system fonts. Artwork images only load when the site is served over HTTP. If you open `index.html` straight from disk, the artworks show placeholders.

## Controls

| Action | Desktop | Phone / tablet |
| --- | --- | --- |
| Look around | Click and drag | Drag |
| Walk | `W` `A` `S` `D` or arrow keys | On-screen ↑ / ↓ buttons |
| Guided tour | "Start guided tour", then ← / → | "Start guided tour", then the arrow buttons |
| View an artwork | Click it or its label | Tap it or its label |
| Leave the tour | `Esc` or × | × |

## Editing the exhibition

- Text and images for every stop are in `js/artworks.js`, listed in walking order.
- Where each stop hangs (which wall, how far along it) is set by `STOP_LAYOUT` in `js/main.js`.
- Artwork images are in `images/`.

## Files

- `index.html`: page markup, intro screen, tour bar and reader card
- `css/style.css`: UI styling
- `js/main.js`: the 3D scene (rooms, lighting, frames, wall labels, floor guide, controls, guided tour)
- `js/artworks.js`: exhibition text, artwork details and image paths
- `images/`: put your artwork images here
- `vendor/three.min.js`: three.js r159 (MIT licence in `vendor/three-LICENSE.txt`)
