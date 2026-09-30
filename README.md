# Saxophone — The alto studio

**Live site:** https://lucidiscool.github.io/Saxophone/

A dark, minimal interactive studio focused on the alto saxophone. The home page uses the Smithsonian scan of Charlie Parker’s King Super 20, with all nine saxophone family members preserved on the separate family page.

## Controls

- Drag to orbit; scroll or pinch to zoom; use the top reset icon to restore the view.
- Click the actual key surfaces to play notes. Eight diatonic key targets are aligned with the scanned model.
- **Notes** reveals optional note labels. **Listen** plays a short original phrase. **Rotate** slowly turns the model.
- Open the top-right piano icon for the chromatic keyboard, octave and volume. Hold its keys or use A W S E D F T G Y H U J K while the piano is open.
- Escape stops playback and rotation and closes the piano. Window blur also stops audio.
- Focus the viewer and use arrows to orbit, + / - to zoom, Home to reset. The piano and note labels provide keyboard-accessible alternatives to clicking 3D surfaces.

Keys use a simplified one-note mapping, not authentic fingerings. The scan is not rigged: playable touches highlight instead of deforming the historical object. Audio uses FluidR3 GM alto samples, not recordings of Parker or his saxophone. Samples have finite length.

## Development and publishing

Static HTML, CSS and JavaScript ES modules. Serve the repository with any static HTTP server. There is no build step or API key. Three.js 0.186.1 and Draco are vendored locally. Desktop uses the 4K scan derivative; mobile / lower-memory devices use 2K. The piano remains available if WebGL fails.

GitHub Pages publishes the root of main. Push a commit to update the site.

## Credits

See [Sources & credits](credits.html) and [model provenance](assets/models/README.md). Source code is MIT licensed; third-party assets retain their documented licenses. The Smithsonian scan is public domain. Three.js is MIT; Draco is Apache 2.0.

test
