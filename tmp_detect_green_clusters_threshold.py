from PIL import Image, ImageDraw
import numpy as np
from collections import deque

img = Image.open('web-app/src/assets/lotmap.png').convert('RGB')
a = np.array(img)
r,g,b = a[:,:,0], a[:,:,1], a[:,:,2]
mask = (g > 120) & (g > r + 30) & (g > b + 30)

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

boxes=[]
for i in range(1,label+1):
    ys,xs = np.where(labels==i)
    if len(xs)==0: continue
    area = len(xs)
    minx,maxx = xs.min(), xs.max()
    miny,maxy = ys.min(), ys.max()
    if area < 8000: continue
    boxes.append((i,minx,miny,maxx,maxy,area))
boxes.sort(key=lambda b:(b[1], b[2]))
print('clusters', len(boxes))
for i, minx,miny,maxx,maxy,area in boxes:
    print(i, minx, miny, maxx, maxy, area, f'{minx/w*100:.2f}% {miny/h*100:.2f}% {(maxx-minx)/w*100:.2f}% {(maxy-miny)/h*100:.2f}%')

out = img.convert('RGB')
D = ImageDraw.Draw(out)
for _, minx,miny,maxx,maxy,_ in boxes:
    D.rectangle([minx,miny,maxx,maxy], outline='red', width=4)
out.save('web-app/src/assets/lotmap_cluster_threshold_debug.png')
print('saved debug image')
