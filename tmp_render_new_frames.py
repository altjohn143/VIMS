from PIL import Image, ImageDraw
frames = {
    1: (7.36,4.15,26.93,7.77),
    2: (7.36,12.02,26.93,7.77),
    3: (8.28,19.90,26.01,7.77),
    4: (7.67,27.77,26.63,7.77),
    5: (7.61,35.65,26.69,7.77),
    6: (34.36,4.15,28.16,7.77),
    7: (34.36,12.02,28.16,7.77),
    8: (34.36,19.90,28.16,7.77),
    9: (34.36,27.77,28.16,7.77),
    10: (34.36,35.65,28.16,7.77),
    11: (7.36,43.52,26.93,8.19),
    12: (7.36,51.81,26.93,8.19),
    13: (7.36,60.10,26.93,8.19),
    14: (7.36,68.39,26.93,8.19),
    15: (7.36,76.68,26.93,8.19),
    16: (34.36,43.52,28.16,8.19),
    17: (34.36,51.81,28.16,8.19),
    18: (34.36,60.10,28.16,8.19),
    19: (34.36,68.39,28.16,8.19),
    20: (34.36,76.68,28.16,8.19),
    21: (62.58,43.52,36.75,8.19),
    22: (62.58,51.81,36.75,8.19),
    23: (62.58,60.10,36.75,8.19),
    24: (62.58,68.39,36.75,8.19),
    25: (62.58,76.68,36.75,8.19),
}
from PIL import Image, ImageDraw
img = Image.open('web-app/src/assets/lotmap.png').convert('RGB')
w,h = img.size
out = img.copy()
d = ImageDraw.Draw(out)
for block,(left,top,width,height) in frames.items():
    x0 = int(left/100*w)
    y0 = int(top/100*h)
    x1 = int((left+width)/100*w)
    y1 = int((top+height)/100*h)
    d.rectangle([x0,y0,x1,y1], outline='red', width=4)
    d.text((x0+3,y0+3), str(block), fill='yellow')
out.save('web-app/src/assets/lotmap_new_frames_debug.png')
print('saved new frames debug image')
