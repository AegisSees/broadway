import json, os, sys
E = json.load(open('index.json'))
DIR = os.environ.get('DEADLOCK_CITADEL_DIR', 'citadel')
def get(path):
    arc, off, ln, pre, preoff = E[path]
    d = open(f'{DIR}/pak01_dir.vpk', 'rb').read()[preoff:preoff+pre] if pre else b''
    if ln:
        if arc == 0x7fff: raise Exception('in dir')
        with open(f'{DIR}/pak01_{arc:03d}.vpk', 'rb') as f: f.seek(off); d += f.read(ln)
    return d
if __name__ == '__main__':
    os.makedirs('raw', exist_ok=True)
    for p in sys.argv[1:]:
        b = get(p); open('raw/' + p.split('/')[-1], 'wb').write(b); print(p.split('/')[-1], len(b))
