# Pulling art from a local Deadlock install

Scripts used in Round 48 to read the game's own files (pak01_dir.vpk plus the numbered pak01_NNN.vpk chunks).
They need Python 3 and Pillow (zstandard only for reading .vdata_c).

1. `python3 vpkdir.py <citadel>/pak01_dir.vpk > index.json` lists every file with its chunk, offset and length.
2. Copy the chunks you need next to `pak01_dir.vpk` in `extract.DIR` (default `./citadel`, or set `DEADLOCK_CITADEL_DIR`).
3. `python3 lib.py` decodes every `panorama/images/**` texture (`.vtex_c`: BGRA/RGBA, PNG, JPEG, BC1/BC3/BC7) and
   vector (`.vsvg_c`) in the staged chunks to PNG/SVG under `OUT`, skipping what `done.json` already holds.

Hero codenames: violet=artist, deadman-danny=deadpack, solomon=chessmaster, nurse-harrow=nurse; the rest are in
the URLs in src/data/heroMoods.json. Ability icons map to abilities through `scripts/abilities.vdata_c`
(zstd-compressed KV3: each ability key is followed by its `file://{images}/hud/abilities/...` image).
