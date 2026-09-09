import os
import base64

pub_dir = r'd:\Rakshith\Graphitex Digitals\client websites\kandy cabs new\kandy cabs website\public'

with open(os.path.join(pub_dir, 'images', 'logo-transparent.png'), 'rb') as f:
    light_b64 = base64.b64encode(f.read()).decode('utf-8')

with open(os.path.join(pub_dir, 'images', 'logo-dark-mode.png'), 'rb') as f:
    dark_b64 = base64.b64encode(f.read()).decode('utf-8')

svg_light = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 864 451" width="100%" height="100%">
  <image href="data:image/png;base64,{light_b64}" x="0" y="0" width="864" height="451"/>
</svg>'''

svg_dark = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 864 451" width="100%" height="100%">
  <image href="data:image/png;base64,{dark_b64}" x="0" y="0" width="864" height="451"/>
</svg>'''

with open(os.path.join(pub_dir, 'images', 'logo.svg'), 'w', encoding='utf-8') as f:
    f.write(svg_light)

with open(os.path.join(pub_dir, 'logo.svg'), 'w', encoding='utf-8') as f:
    f.write(svg_light)

with open(os.path.join(pub_dir, 'images', 'logo-dark.svg'), 'w', encoding='utf-8') as f:
    f.write(svg_dark)

with open(os.path.join(pub_dir, 'logo-dark.svg'), 'w', encoding='utf-8') as f:
    f.write(svg_dark)

print('All SVG logo files generated successfully!')
