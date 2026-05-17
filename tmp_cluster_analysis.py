from PIL import Image
import numpy as np
from collections import deque

img = Image.open('web-app/src/assets/lotmap.png').convert('RGB')
a = np.array(img)
r,g,b = a[:,:,0], a[:,:,1], a[:,:,2]
mask = (g > 100) & (g > r + 20) & (g > b + 20) & (r < 180) & (b < 180)

# clean small noise
h,w = mask.shape
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

areas=[]
for i in range(1,label+1):
    ys,xs = np.where(labels==i)
    if len(xs)==0: continue
    area = len(xs)
    minx,maxx = xs.min(), xs.max()
    miny,maxy = ys.min(), ys.max()
    if area < 1000: continue
    areas.append((i,minx,miny,maxx,maxy,area))
areas.sort(key=lambda b:(b[1], b[2]))
print('count', len(areas))
for i,minx,miny,maxx,maxy,area in areas:
    print(i, minx, miny, maxx, maxy, area, f'{minx/w*100:.2f}% {miny/h*100:.2f}% {(maxx-minx)/w*100:.2f}% {(maxy-miny)/h*100:.2f}%')

cols = {}
for i,minx,miny,maxx,maxy,area in areas:
    col = round(minx/200)
    cols.setdefault(col, []).append((i,minx,miny,maxx,maxy,area))
print('\nby column:')
for col, items in sorted(cols.items()):
    print('col',col)
    for t in items:
        print(' ', t[0], t[1], t[2], t[5])
