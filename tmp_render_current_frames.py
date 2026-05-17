from PIL import Image, ImageDraw
img = Image.open('web-app/src/assets/lotmap.png').convert('RGB')
frames = {
    1: (15.5,10.8,11.8,3.6),
    2: (15.2,14.7,12.2,3.8),
    3: (15.0,18.8,12.3,3.8),
    4: (15.0,22.9,12.3,3.8),
    5: (15.0,27.0,12.3,3.8),
    6: (43.0,10.2,12.5,3.8),
    7: (43.0,14.5,12.5,3.8),
    8: (43.0,18.8,12.5,3.8),
    9: (43.0,23.1,12.5,3.8),
    10: (43.0,27.3,12.5,3.8),
    11: (16.2,49.8,12.0,3.9),
    12: (16.2,54.0,12.0,3.9),
    13: (16.2,58.3,12.0,3.9),
    14: (16.2,62.5,12.0,3.9),
    15: (16.2,66.8,12.0,3.9),
    16: (39.5,47.2,12.7,3.9),
    17: (39.5,51.5,12.7,3.9),
    18: (39.5,55.8,12.7,3.9),
    19: (39.5,60.0,12.7,3.9),
    20: (39.5,64.3,12.7,3.9),
    21: (67.0,46.0,12.5,3.9),
    22: (67.0,50.3,12.5,3.9),
    23: (67.0,54.6,12.5,3.9),
    24: (67.0,58.9,12.5,3.9),
    25: (67.0,69.0,12.5,3.9),
}
w,h = img.size
out = img.copy()
d = ImageDraw.Draw(out)
for block,(left,top,width,height) in frames.items():
    x0 = int(left/100*w)
    y0 = int(top/100*h)
    x1 = int((left+width)/100*w)
    y1 = int((top+height)/100*h)
    d.rectangle([x0,y0,x1,y1], outline='red', width=4)
    d.text((x0+5,y0+5), str(block), fill='yellow')
out.save('web-app/src/assets/lotmap_current_frames_debug.png')
print('saved current frames debug image')
