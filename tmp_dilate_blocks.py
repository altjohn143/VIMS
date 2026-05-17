from PIL import Image
from pathlib import Path
import numpy as np
from collections import deque

img = Image.open(Path('web-app/src/assets/lotmap.png')).convert('RGB')
a = np.array(img)
r,g,b = a[:,:,0], a[:,:,1], a[:,:,2]
mask = (g > 120) & (g > r+20) & (g > b+20) & (r < 220) & (b < 220) & ((r+b)/2 < 210)

h,w = mask.shape
new = mask.copy()
for dy in range(-8, 9):
    for dx in range(-8, 9):
        shifted = np.zeros_like(mask)
        if dy < 0:
            ys = slice(0, h+dy)
            ys2 = slice(-dy, h)
        else:
            ys = slice(dy, h)
            ys2 = slice(0, h-dy)
        if dx < 0:
            xs = slice(0, w+dx)
            xs2 = slice(-dx, w)
        else:
            xs = slice(dx, w)
            xs2 = slice(0, w-dx)
        shifted[ys2, xs2] = mask[ys, xs]
        new |= shifted
mask = new

labels = np.zeros_like(mask, dtype=int)
label = 0
for y in range(h):
    for x in range(w):
        if not mask[y, x] or labels[y, x] != 0:
            continue
        label += 1
        q = deque([(x, y)])
        labels[y, x] = label
        while q:
            cx, cy = q.popleft()
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nx, ny = cx + dx, cy + dy
                if 0 <= nx < w and 0 <= ny < h and mask[ny, nx] and labels[ny, nx] == 0:
                    labels[ny, nx] = label
                    q.append((nx, ny))

boxes = []
for i in range(1, label + 1):
    ys, xs = np.where(labels == i)
    if len(xs) == 0:
        continue
    minx, maxx = xs.min(), xs.max()
    miny, maxy = ys.min(), ys.max()
    area = len(xs)
    boxes.append((minx, miny, maxx, maxy, area))

boxes = [b for b in boxes if b[4] > 10000]
boxes.sort(key=lambda b: (b[1], b[0]))
for i, (minx, miny, maxx, maxy, area) in enumerate(boxes, 1):
    print(i, minx, miny, maxx, maxy, area, f"{minx/w*100:.2f}% {miny/h*100:.2f}% {(maxx-minx)/w*100:.2f}% {(maxy-miny)/h*100:.2f}%")
print('total', len(boxes))
