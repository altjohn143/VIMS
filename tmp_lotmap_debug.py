from PIL import Image, ImageDraw
from pathlib import Path
img_path = Path('web-app/src/assets/lotmap.png')
img = Image.open(img_path).convert('RGB')
frames = {
  1: {'left': 15.5, 'top': 10.8, 'width': 11.8, 'height': 3.6},
  2: {'left': 15.2, 'top': 14.7, 'width': 12.2, 'height': 3.8},
  3: {'left': 15.0, 'top': 18.8, 'width': 12.3, 'height': 3.8},
  4: {'left': 15.0, 'top': 22.9, 'width': 12.3, 'height': 3.8},
  5: {'left': 15.0, 'top': 27.0, 'width': 12.3, 'height': 3.8},
  6: {'left': 43.0, 'top': 10.2, 'width': 12.5, 'height': 3.8},
  7: {'left': 43.0, 'top': 14.5, 'width': 12.5, 'height': 3.8},
  8: {'left': 43.0, 'top': 18.8, 'width': 12.5, 'height': 3.8},
  9: {'left': 43.0, 'top': 23.1, 'width': 12.5, 'height': 3.8},
  10: {'left': 43.0, 'top': 27.3, 'width': 12.5, 'height': 3.8},
  11: {'left': 16.2, 'top': 49.8, 'width': 12.0, 'height': 3.9},
  12: {'left': 16.2, 'top': 54.0, 'width': 12.0, 'height': 3.9},
  13: {'left': 16.2, 'top': 58.3, 'width': 12.0, 'height': 3.9},
  14: {'left': 16.2, 'top': 62.5, 'width': 12.0, 'height': 3.9},
  15: {'left': 16.2, 'top': 66.8, 'width': 12.0, 'height': 3.9},
  16: {'left': 39.5, 'top': 47.2, 'width': 12.7, 'height': 3.9},
  17: {'left': 39.5, 'top': 51.5, 'width': 12.7, 'height': 3.9},
  18: {'left': 39.5, 'top': 55.8, 'width': 12.7, 'height': 3.9},
  19: {'left': 39.5, 'top': 60.0, 'width': 12.7, 'height': 3.9},
  20: {'left': 39.5, 'top': 64.3, 'width': 12.7, 'height': 3.9},
  21: {'left': 67.0, 'top': 46.0, 'width': 12.5, 'height': 3.9},
  22: {'left': 67.0, 'top': 50.3, 'width': 12.5, 'height': 3.9},
  23: {'left': 67.0, 'top': 54.6, 'width': 12.5, 'height': 3.9},
  24: {'left': 67.0, 'top': 58.9, 'width': 12.5, 'height': 3.9},
  25: {'left': 67.0, 'top': 69.0, 'width': 12.5, 'height': 3.9},
}
draw = ImageDraw.Draw(img)
for b,f in frames.items():
    left = int(img.width * f['left'] / 100)
    top = int(img.height * f['top'] / 100)
    right = int(img.width * (f['left'] + f['width']) / 100)
    bottom = int(img.height * (f['top'] + f['height']) / 100)
    draw.rectangle([left, top, right, bottom], outline='red', width=3)
    draw.text((left+4, top+4), str(b), fill='yellow')
img.save('web-app/src/assets/lotmap_debug.png')
