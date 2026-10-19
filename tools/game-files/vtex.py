import struct
from PIL import Image
def decode(d):
    size, hv, ver, boff, bcount = struct.unpack_from('<IHHII', d, 0)
    p = 8 + boff; ds = None
    for i in range(bcount):
        t = d[p:p+4]; o, s = struct.unpack_from('<II', d, p + 4)
        if t == b'DATA': ds = p + 4 + o
        p += 12
    w, h, dep = struct.unpack_from('<HHH', d, ds + 20); fmt, mips = d[ds + 26], d[ds + 27]
    total = sum(max(1, w >> i) * max(1, h >> i) * 4 for i in range(mips))
    body = d[size:]
    assert fmt in (4, 28), f'format {fmt}'
    assert len(body) == total, (len(body), total, w, h, mips)
    px = body[-w * h * 4:]
    im = Image.frombytes('RGBA', (w, h), px, 'raw', 'BGRA' if fmt == 28 else 'RGBA')
    return im
