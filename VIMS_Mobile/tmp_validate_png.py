from pathlib import Path
p = Path('assets/dashboard_bg_placeholder.png')
print('exists', p.exists())
print('size', p.stat().st_size if p.exists() else 'na')
if p.exists():
    b = p.read_bytes()[:16]
    print('header', b[:8])
    print('pngsig', b[:8] == b'\x89PNG\r\n\x1a\n')
    try:
        from PIL import Image
        img = Image.open(p)
        print('format', img.format, 'mode', img.mode, 'size', img.size)
        img.verify()
        print('verified ok')
    except Exception as e:
        print('PIL error', repr(e))
