from PIL import Image
from pathlib import Path
from collections import deque

img = Image.open(Path('web-app/src/assets/lotmap.png')).convert('RGB')
px = img.load()
w,h = img.size
visited = [[False]*w for _ in range(h)]

def is_green(pixel):
    r,g,b = pixel
    return g > 120 and g > r+20 and g > b+20 and r < 220 and b < 220 and (r+b)/2 < 210

blocks=[]
for y in range(h):
    for x in range(w):
        if visited[y][x] or not is_green(px[x,y]):
            continue
        q=deque([(x,y)])
        visited[y][x]=True
        minx,maxx,miny,maxy=x,x,y,y
        count=0
        while q:
            cx,cy=q.popleft(); count += 1
            minx=min(minx,cx); maxx=max(maxx,cx); miny=min(miny,cy); maxy=max(maxy,cy)
            for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)]:
                nx,ny=cx+dx,cy+dy
                if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx] and is_green(px[nx,ny]):
                    visited[ny][nx]=True
                    q.append((nx,ny))
        if count > 2000:
            blocks.append((minx,miny,maxx,maxy,count))
blocks.sort(key=lambda b:(b[1],b[0]))
for i,b in enumerate(blocks,1):
    minx,miny,maxx,maxy,count = b
    print(i, minx, miny, maxx, maxy, count, f"{minx/w*100:.2f}% {miny/h*100:.2f}% { (maxx-minx)/w*100:.2f}% { (maxy-miny)/h*100:.2f}%")
print('total', len(blocks))
