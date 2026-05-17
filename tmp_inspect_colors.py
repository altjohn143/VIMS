from PIL import Image
import numpy as np
img = Image.open('web-app/src/assets/lotmap.png').convert('RGB')
a = np.array(img)
print('size', img.size)
r,g,b = a[:,:,0], a[:,:,1], a[:,:,2]
print('g min/max', g.min(), g.max())
print('r min/max', r.min(), r.max())
print('b min/max', b.min(), b.max())
for y in [50,150,250,350,450,550,650,750,850]:
    row = []
    for x in [100,250,400,550,700,850,1000,1150,1300,1450]:
        row.append(f'({x},{y})={tuple(a[y,x])}')
    print(' | '.join(row))
