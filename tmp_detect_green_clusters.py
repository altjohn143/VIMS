from PIL import Image, ImageDraw
import numpy as np
from collections import deque

img = Image.open('web-app/src/assets/lotmap.png').convert('RGB')
a = np.array(img)
r,g,b = a[:,:,0], a[:,:,1], a[:,:,2]
mask = (g > 100) & (g > r + 20) & (g > b + 20) & (r < 180) & (b < 180)

# remove small specks
h,w = mask.shape
e = np.zeros_like(mask)
for y in range(h):
    for x in range(w):
        if not mask[y,x]: continue
        if np.sum(mask[max(0,y-1):min(h,y+2), max(0,x-1):min(w,x+2)]) >= 2:
            e[y,x] = True
mask = e

# optional dilation to connect shapes
for _ in range(3):
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

boxes=[]
for i in range(1,label+1):
    ys,xs = np.where(labels==i)
    if len(xs) == 0: continue
    area = len(xs)
    if area < 500: continue
    boxes.append((i, xs.min(), ys.min(), xs.max(), ys.max(), area))
boxes.sort(key=lambda b:(b[1], b[2]))
print('clusters:', len(boxes))
for i, minx,miny,maxx,maxy,area in boxes:
    print(i, minx, miny, maxx, maxy, area, f'{minx/w*100:.2f} {miny/h*100:.2f} {((maxx-minx)/w)*100:.2f} {((maxy-miny)/h)*100:.2f}')

out = img.convert('RGB')
D = ImageDraw.Draw(out)
for i, minx,miny,maxx,maxy,area in boxes:
    D.rectangle([minx,miny,maxx,maxy], outline='red', width=4)
    D.text((minx+3,miny+3), str(i), fill='white')
out.save('web-app/src/assets/lotmap_cluster_debug.png')
print('saved debug image')
