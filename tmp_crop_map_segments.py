from PIL import Image
img = Image.open('web-app/src/assets/lotmap.png').convert('RGB')
regions = {
    'top_left': (120, 40, 560, 420),
    'top_center': (560, 40, 1020, 420),
    'top_right': (1020, 40, 1620, 420),
    'bottom_left': (120, 420, 560, 820),
    'bottom_center': (560, 420, 1020, 820),
    'bottom_right': (1020, 420, 1620, 820),
}
for name, box in regions.items():
    crop = img.crop(box)
    crop.save(f'web-app/src/assets/{name}_crop.png')
print('saved crops')
