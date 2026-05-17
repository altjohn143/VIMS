from PIL import Image
from pathlib import Path
from collections import deque

img = Image.open(Path('web-app/src/assets/lotmap.png')).convert('RGB')
px = img.load()
w, h = img.size

visited = [[False] * w for _ in range(h)]

def is_green(p):
    return p[1] > 120 and p[1] > p[0] + 20 and p[1] > p[2] + 20 and p[0] < 220 and p[2] < 220 and (p[0] + p[2]) / 2 < 210

blocks = []
for y in range(h):
    for x in range(w):
        if visited[y][x] or not is_green(px[x, y]):
            continue
        q = deque([(x, y)])
        visited[y][x] = True
        minx = maxx = x
        miny = maxy = y
        count = 0
        while q:
            cx, cy = q.popleft()
            count += 1
            minx = min(minx, cx)
            maxx = max(maxx, cx)
            miny = min(miny, cy)
            maxy = max(maxy, cy)
            for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
                nx, ny = cx + dx, cy + dy
                if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx] and is_green(px[nx, ny]):
                    visited[ny][nx] = True
                    q.append((nx, ny))
        blocks.append((minx, miny, maxx, maxy, count))

large = [b for b in blocks if b[4] > 6000]
large.sort(key=lambda b: (b[1], b[0]))
for i, b in enumerate(large, 1):
    minx, miny, maxx, maxy, count = b
    print(i, minx, miny, maxx, maxy, count, f"{minx/w*100:.2f}% {miny/h*100:.2f}% {(maxx-minx)/w*100:.2f}% {(maxy-miny)/h*100:.2f}%")
print('total', len(large))
