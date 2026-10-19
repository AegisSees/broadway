"""Extract panorama UI art from whichever pak01 chunks are staged into the shared game-assets library."""
import sys, os, json, struct, io
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract import get, E, DIR
from PIL import Image
OUT = os.environ.get('GAME_ASSETS_OUT', 'game-assets')
HERE = os.path.dirname(os.path.abspath(__file__))
DONE = os.path.join(HERE, 'done.json'); FAIL = os.path.join(HERE, 'fail.json')
done = set(json.load(open(DONE))) if os.path.exists(DONE) else set()
fail = json.load(open(FAIL)) if os.path.exists(FAIL) else {}

def blocks(d):
    size, hv, ver, boff, bc = struct.unpack_from('<IHHII', d, 0); p = 8 + boff; b = {}
    for i in range(bc):
        t = d[p:p+4]; o, s = struct.unpack_from('<II', d, p + 4); b[t] = (p + 4 + o, s); p += 12
    return size, b

def tex(d):
    size, b = blocks(d); ds = b[b'DATA'][0]
    w, h, dep = struct.unpack_from('<HHH', d, ds + 20); fmt, mips = d[ds + 26], d[ds + 27]
    body = d[size:]
    if fmt in (16, 18):
        i = body.rfind(b'\x89PNG'); return Image.open(io.BytesIO(body[i:])).convert('RGBA')
    if fmt in (15, 17):
        i = body.rfind(b'\xff\xd8'); return Image.open(io.BytesIO(body[i:])).convert('RGBA')
    if fmt in (4, 28):
        n = w * h * 4
        assert len(body) >= n, 'short'
        return Image.frombytes('RGBA', (w, h), body[-n:] if len(body) == sum(max(1,w>>i)*max(1,h>>i)*4 for i in range(mips)) else body[-n:], 'raw', 'BGRA' if fmt == 28 else 'RGBA')
    bc = {1: (1, 8), 2: (3, 16), 20: (7, 16), 27: (4, 8), 21: (5, 16)}
    if fmt in bc:
        n, bs = bc[fmt]; sz = ((w + 3) // 4) * ((h + 3) // 4) * bs
        total = sum(((max(1,w>>i)+3)//4)*((max(1,h>>i)+3)//4)*bs for i in range(mips))
        assert len(body) == total, f'len {len(body)} != {total}'
        im = Image.frombytes('RGBA' if n not in (4, 5) else ('L' if n == 4 else 'RGB'), (w, h), body[-sz:], 'bcn', n)
        return im.convert('RGBA')
    raise Exception(f'fmt {fmt}')

def svg(d):
    size, b = blocks(d); ds, s = b[b'DATA']; t = d[ds:ds+s]
    i = t.find(b'<svg'); j = t.rfind(b'</svg>')
    return t[i:j+6]

def run():
    staged = {int(f[6:9]) for f in os.listdir(DIR) if f[6:9].isdigit()}
    ks = [k for k in E if k.startswith('panorama/images/') and (k.endswith('.vtex_c') or k.endswith('.vsvg_c'))
          and '/heroes/backgrounds/' not in k and k not in done and (E[k][0] in staged or E[k][0] == 0x7fff)]
    n = 0
    for k in ks:
        rel = k[len('panorama/images/'):]
        try:
            d = get(k)
            if k.endswith('.vsvg_c'):
                p = os.path.join(OUT, rel[:-len('.vsvg_c')] + '.svg'); os.makedirs(os.path.dirname(p), exist_ok=True)
                open(p, 'wb').write(svg(d))
            else:
                base = rel[:-len('.vtex_c')]
                for suf in ('_psd', '_png', '_tga', '_jpg'):
                    if base.endswith(suf): base = base[:-len(suf)]
                p = os.path.join(OUT, base + '.png'); os.makedirs(os.path.dirname(p), exist_ok=True)
                tex(d).save(p, optimize=False, compress_level=6)
            done.add(k); fail.pop(k, None); n += 1
        except Exception as e:
            fail[k] = str(e)[:120]
    json.dump(sorted(done), open(DONE, 'w')); json.dump(fail, open(FAIL, 'w'), indent=0)
    print('extracted', n, 'done', len(done), 'failed', len(fail))

if __name__ == '__main__':
    run()
