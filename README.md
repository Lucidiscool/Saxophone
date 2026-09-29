# Saxophone — Find your voice

A responsive, playable saxophone collection, with a clean product-gallery interface inspired by Apple.

**Live site:** https://Lucidiscool.github.io/Saxophone/

## Play

- Choose soprano, alto, tenor, or baritone. The **More** menu opens five rare family members.
- Hold the on-screen keys, or use **A W S E D F T G Y H U J K** to play a chromatic octave.
- Change the written octave between 4 and 5, adjust volume, or play a short demonstration.
- Press Escape to stop. Notes also stop when the window loses focus.

The keyboard shows written pitch; the readout shows concert pitch and frequency. The quartet uses FluidR3 GM saxophone samples. Rare instruments use pitch-shifted soprano/baritone samples, explicitly labeled as register demonstrations. Recordings have a finite length.

## Development and deployment

This is a dependency-free static site: HTML, CSS, JavaScript, and local media. Serve the repository with any static HTTP server; opening the HTML directly from disk will prevent sample fetching in many browsers.

GitHub Pages publishes the root of `main`. Push a commit to update the live site. No build step or API keys are needed. Google Fonts is optional; the interface falls back to system fonts.

## Credits

See [Sources & credits](credits.html) for photography, sound samples, licensing, and references. Code is MIT licensed. Third-party images and audio retain their stated licenses.
