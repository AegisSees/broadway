import struct, sys, json
def read_dir(path):
    d = open(path, 'rb').read()
    sig, ver, tree = struct.unpack_from('<III', d, 0)
    assert sig == 0x55aa1234, hex(sig)
    hdr = 28 if ver == 2 else 12
    p = hdr; end = hdr + tree
    def cstr():
        nonlocal p
        q = d.index(b'\0', p); s = d[p:q].decode('utf-8', 'replace'); p = q + 1; return s
    out = {}
    while p < end:
        ext = cstr()
        if not ext: break
        while True:
            path = cstr()
            if not path: break
            while True:
                name = cstr()
                if not name: break
                crc, pre, arc, off, ln, term = struct.unpack_from('<IHHIIH', d, p); p += 18
                preload = d[p:p+pre]; p += pre
                full = (('' if path == ' ' else path + '/') + name + ('' if ext == ' ' else '.' + ext))
                out[full] = (arc, off, ln, pre, p - pre)
    return out, hdr + tree
if __name__ == '__main__':
    entries, data_start = read_dir(sys.argv[1])
    print(len(entries), 'entries; dir data starts', data_start)
    json.dump({k: v for k, v in entries.items()}, open('index.json', 'w'))
