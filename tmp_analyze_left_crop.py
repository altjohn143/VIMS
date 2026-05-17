from PIL import Image, ImageDraw
import numpy as np
from pathlib import Path
from collections import deque

img = Image.open(Path('web-app/src/assets/left_grid_crop.png')).convert('RGB')
a = np.array(img)
r,g,b = a[:,:,0], a[:,:,1], a[:,:,2]
mask = (g > 120) & (g > r+20) & (g > b+20) & (r < 220) & (b < 220) & ((r+b)/2 < 210)

# dilate mask by a few pixels to connect broken shapes
h,w = mask.shape
new = mask.copy()
for dy in range(-4,5):
    for dx in range(-4,5):
        shifted = np.zeros_like(mask)
        if dy < 0:
            ys, ys2 = slice(0,h+dy), slice(-dy,h)
        else:
            ys, ys2 = slice(dy,h), slice(0,h-dy)
        if dx < 0:
            xs, xs2 = slice(0,w+dx), slice(-dx,w)
        else:
            xs, xs2 = slice(dx,w), slice(0,w-dx)
        shifted[ys2, xs2] = mask[ys, xs]
        new |= shifted
mask = new

labels = np.zeros_like(mask, dtype=int)
label = 0
for y in range(h):
    for x in range(w):
        if not mask[y,x] or labels[y,x] != 0:
            continue
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
    if len(xs)==0: continue
    area = len(xs)
    if area < 1000: continue
    minx,maxx = xs.min(), xs.max()
    miny,maxy = ys.min(), ys.max()
    boxes.append((i,minx,miny,maxx,maxy,area))
boxes.sort(key=lambda b:(b[2], b[1]))
for i,minx,miny,maxx,maxy,area in boxes:
    print(i, minx,miny,maxx,maxy, area, f'{minx/w*100:.2f}% {miny/h*100:.2f}% {(maxx-minx)/w*100:.2f}% {(maxy-miny)/h*100:.2f}%')

out = img.convert('RGB')
d = ImageDraw.Draw(out)
for i,minx,miny,maxx,maxy,area in boxes:
    d.rectangle([minx,miny,maxx,maxy], outline='red', width=3)
    d.text((minx+5,miny+5), str(i), fill='yellow')
out.save('web-app/src/assets/left_grid_crop_debug.png')
print('saved debug image')
