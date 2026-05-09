from PIL import Image, ImageDraw
import os

size = 512
img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

def rounded_rectangle(draw, xy, radius, fill):
    x1, y1, x2, y2 = xy
    draw.rectangle([x1+radius, y1, x2-radius, y2], fill=fill)
    draw.rectangle([x1, y1+radius, x2, y2-radius], fill=fill)
    draw.ellipse([x1, y1, x1+2*radius, y1+2*radius], fill=fill)
    draw.ellipse([x2-2*radius, y1, x2, y1+2*radius], fill=fill)
    draw.ellipse([x1, y2-2*radius, x1+2*radius, y2], fill=fill)
    draw.ellipse([x2-2*radius, y2-2*radius, x2, y2], fill=fill)

rounded_rectangle(draw, [0, 0, size-1, size-1], 80, '#0C447C')

# Lucide Activity icon — viewBox 0 0 24 24, scaled to fit in 512x512
# Path: M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0
#       L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2
scale = 512 * 0.68 / 24
ox = (512 - 24 * scale) / 2
oy = (512 - 24 * scale) / 2

def p(x, y):
    return (ox + x * scale, oy + y * scale)

points = [
    p(2,     12),
    p(4.49,  12),
    p(6.41,  10.54),
    p(8.76,  2.18),
    p(9.24,  2.18),
    p(14.76, 21.82),
    p(15.24, 21.82),
    p(19.52, 12),
    p(22,    12),
]

lw = round(scale * 2)  # stroke-width="2" from original SVG

# Draw line with round joints
for i in range(len(points) - 1):
    draw.line([points[i], points[i+1]], fill='white', width=lw)

# Round caps at each joint
r = lw // 2
for pt in points:
    x, y = pt
    draw.ellipse([x-r, y-r, x+r, y+r], fill='white')

os.makedirs('frontend/public', exist_ok=True)
img.save('frontend/public/favicon.png')
img.resize((64, 64), Image.LANCZOS).save('frontend/public/favicon-64.png')
img.resize((32, 32), Image.LANCZOS).save('frontend/public/favicon-32.png')
print('Favicon genere avec succes')
