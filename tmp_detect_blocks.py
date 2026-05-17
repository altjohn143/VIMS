from PIL import Image, ImageDraw
import numpy as np
from collections import deque

img = Image.open('web-app/src/assets/lotmap.png').convert('RGB')
a = np.array(img)
r,g,b = a[:,:,0], a[:,:,1], a[:,:,2]
mask = (g > 130) & (g > r + 25) & (g > b + 25)

# fill holes and connect shapes
h,w = mask.shape
for _ in range(2):
    new = mask.copy()
    for dy in (-1,0,1):
        for dx in (-1,0,1):
            if dy == 0 and dx == 0: continue
            shifted = np.zeros_like(mask)
            ys, ys2 = (slice(max(0,dy), h), slice(0, h-dy)) if dy > 0 else (slice(0, h+dy), slice(-dy, h))
            xs, xs2 = (slice(max(0,dx), w), slice(0, w-dx)) if dx > 0 else (slice(0, w+dx), slice(-dx, w))
            shifted[ys2, xs2] = mask[ys, xs]
            new |= shifted
    mask = new

labels = np.zeros_like(mask, dtype=int)
label = 0
for y in range(h):
    for x in range(w):
        if mask[y,x] and labels[y,x] == 0:
            label += 1
            q = deque([(x,y)])
            labels[y,x] = label
            while q:
                cx, cy = q.popleft()
                for dx, dy in [(-1,0),(1,0),(0,-1),(0,1)]:
                    nx, ny = cx+dx, cy+dy
                    if 0 <= nx < w and 0 <= ny < h and mask[ny,nx] and labels[ny,nx] == 0:
                        labels[ny,nx] = label
                        q.append((nx,ny))

clusters = []
for i in range(1, label+1):
    ys, xs = np.where(labels == i)
    if len(xs) == 0: continue
    minx, maxx = xs.min(), xs.max()
    miny, maxy = ys.min(), ys.max()
    area = len(xs)
    width = maxx - minx
    height = maxy - miny
    if area < 20000 or width < 60 or height < 40:
        continue
    clusters.append((i, minx, miny, maxx, maxy, area, width, height))

clusters.sort(key=lambda x: (-x[5], x[2], x[1]))
for i, minx, miny, maxx, maxy, area, width, height in clusters:
    print(i, minx, miny, maxx, maxy, area, width, height, f'{minx/w*100:.2f}% {miny/h*100:.2f}% {(maxx-minx)/w*100:.2f}% {(maxy-miny)/h*100:.2f}%')

# choose the 25 largest clusters and sort by y then x
clusters = sorted(clusters, key=lambda x: (x[2], x[1]))[:25]
clusters = sorted(clusters, key=lambda x: (round(x[2]/100), x[1]))
print('\nselected', len(clusters))
for idx,(i, minx, miny, maxx, maxy, area, width, height) in enumerate(clusters, start=1):
    print(idx, i, minx, miny, maxx, maxy, f'{minx/w*100:.2f} {miny/h*100:.2f} {((maxx-minx)/w)*100:.2f} {((maxy-miny)/h)*100:.2f}')

out = img.copy()
d = ImageDraw.Draw(out)
for idx,(i, minx, miny, maxx, maxy, area, width, height) in enumerate(clusters, start=1):
    d.rectangle([minx, miny, maxx, maxy], outline='red', width=4)
    d.text((minx+5, miny+5), str(idx), fill='yellow')
out.save('web-app/src/assets/lotmap_detected_blocks_debug.png')
print('saved debug image')
