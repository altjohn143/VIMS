from PIL import Image
img = Image.open('web-app/src/assets/lotmap.png')
# candidate regions from top left cluster
regions = {
    'block2': (240, 140, 520, 340),
    'block6': (420, 110, 720, 340),
    'block11': (360, 520, 660, 780),
    'block16': (640, 490, 960, 760),
    'block21': (1080, 620, 1380, 820),
    'block9': (700, 110, 980, 380),
    'block24': (1140, 760, 1390, 960),
}
for name, box in regions.items():
    crop = img.crop(box)
    crop.save(f'web-app/src/assets/{name}_crop.png')
print('crops saved')
