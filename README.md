# 3D Art Gallery

A walk-through 3D art gallery built with [three.js](https://threejs.org/). The room has six framed artworks, each lit by its own spotlight and labelled with a wall placard.

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
| View an artwork | Click it | Tap it |
| Next / previous artwork | Panel buttons or ← / → while viewing | Panel buttons |
| Close the info panel | `Esc` or × | × |

## Adding your artwork

1. Put your images in `images/`, named `artwork-1.jpg` through `artwork-6.jpg`. To use other names or formats such as `.png`, change the `image` paths in `js/artworks.js`.
2. Edit the `title`, `artist`, `year` and `description` for each piece in `js/artworks.js`.

An artwork without an image file shows a numbered placeholder. When you add the image, the frame resizes to match its aspect ratio.

## Files

- `index.html`: page markup, overlays and the info panel
- `css/style.css`: UI styling
- `js/main.js`: the 3D scene (room, lighting, frames, controls, camera tour)
- `js/artworks.js`: artwork titles, descriptions and image paths
- `images/`: put your artwork images here
- `vendor/three.min.js`: three.js r159 (MIT licence in `vendor/three-LICENSE.txt`)
