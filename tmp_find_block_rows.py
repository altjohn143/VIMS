from PIL import Image, ImageDraw
import numpy as np
from itertools import groupby

img = Image.open('web-app/src/assets/lotmap.png').convert('RGB')
a = np.array(img)
r,g,b = a[:,:,0], a[:,:,1], a[:,:,2]
mask = (g > 130) & (g > r + 30) & (g > b + 30)

# block groups approx boxes
groups = [
    ('phase1', 120, 40, 560, 420, list(range(1,6))),
    ('phase2', 560, 40, 1020, 420, list(range(6,11))),
    ('phase3', 120, 420, 560, 820, list(range(11,16))),
    ('phase4', 560, 420, 1020, 820, list(range(16,21))),
    ('phase5', 1020, 420, 1620, 820, list(range(21,26))),
]
results = []
for name, x0,y0,x1,y1, blocks in groups:
    sub = mask[y0:y1, x0:x1]
    h, w = sub.shape
    # compute horizontal row segments by vertical projection
    colsum = sub.any(axis=1)
    # expand into ranges of true segments
    rows=[]
    in_row=False
    for i, v in enumerate(colsum):
        if v and not in_row:
            start=i; in_row=True
        elif not v and in_row:
            end=i; in_row=False; rows.append((start, end))
    if in_row:
        rows.append((start, h))
    print(name, 'rows', rows)
    for i,(rs,re) in enumerate(rows):
        rowmask = sub[rs:re]
        # columns with any true
        rowsum = rowmask.any(axis=0)
        if not rowsum.any():
            continue
        cs=[]
        in_col=False
        for j,v in enumerate(rowsum):
            if v and not in_col:
                cs0=j; in_col=True
            elif not v and in_col:
                cs1=j; in_col=False; cs.append((cs0, cs1))
        if in_col:
            cs.append((cs0,w))
        print('  block row', i, 'col segments', cs)
    # get 5 block row bounding boxes using row split by row lines
    # assume 5 blocks stacked top to bottom
    # assign row boxes by vertical ranges evenly spaced or by row masks
    row_bounds = rows[:5] if len(rows)>=5 else rows
    # if fewer than 5, split evenly
    if len(row_bounds) < 5:
        step = h/5
        row_bounds = [(int(i*step), int((i+1)*step)) for i in range(5)]
    for block, (rs,re) in zip(blocks, row_bounds):
        submask = mask[y0+rs:y0+re, x0:x0+w]
        ys,xs = np.where(submask)
        if len(xs)==0:
            results.append((block, x0, y0+rs, x1, y0+re))
            continue
        minx,maxx = xs.min(), xs.max()
        miny,maxy = ys.min(), ys.max()
        results.append((block, x0+minx, y0+rs+miny, x0+maxx, y0+rs+maxy))

for r in sorted(results, key=lambda x: x[0]):
    block,x0,y0,x1,y1 = r
    print(block, x0,y0,x1,y1, f'{x0/1630*100:.2f}% {y0/965*100:.2f}% {((x1-x0)/1630)*100:.2f}% {((y1-y0)/965)*100:.2f}%')

# render debug
dbg = img.copy()
d = ImageDraw.Draw(dbg)
for block,x0,y0,x1,y1 in results:
    d.rectangle([x0,y0,x1,y1], outline='red', width=4)
    d.text((x0+3,y0+3), str(block), fill='yellow')
dbg.save('web-app/src/assets/lotmap_group_rows_debug.png')
print('saved group row debug')
