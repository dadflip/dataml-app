import os
import yaml
import glob
import re

CATALOGS_DIR = 'src/configs/catalogs'

def get_modern_svg(category, block_id):
    cat_lower = str(category).lower()
    
    # Theme mapping
    if 'extract' in cat_lower or 'load' in cat_lower or 'read' in cat_lower:
        color = '#3b82f6' # Blue
        accent = '#60a5fa'
        icon_path = 'M10 30 L50 70 L90 30'
    elif 'transform' in cat_lower or 'preprocess' in cat_lower:
        color = '#10b981' # Green
        accent = '#34d399'
        icon_path = 'M20 50 Q50 20 80 50 T140 50'
    elif 'model' in cat_lower or 'train' in cat_lower:
        color = '#8b5cf6' # Purple
        accent = '#a78bfa'
        icon_path = 'M20 70 L40 30 L60 70 M30 50 L50 50 M80 30 v40 M100 30 v40'
    elif 'eval' in cat_lower or 'metric' in cat_lower:
        color = '#f59e0b' # Amber
        accent = '#fbbf24'
        icon_path = 'M20 70 L50 30 L80 60 L120 20'
    elif 'deploy' in cat_lower or 'serve' in cat_lower:
        color = '#ef4444' # Red
        accent = '#f87171'
        icon_path = 'M50 20 L80 80 L20 80 Z'
    else:
        color = '#64748b' # Slate
        accent = '#94a3b8'
        icon_path = 'M20 50 L100 50 M60 20 L60 80'

    # Generate a sleek, modern 600x100 SVG banner
    svg = f'''<svg viewBox="0 0 600 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad_{block_id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" stop-opacity="1" />
      <stop offset="100%" stop-color="#1e293b" stop-opacity="1" />
    </linearGradient>
    <filter id="glow_{block_id}" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect width="600" height="100" rx="12" fill="url(#grad_{block_id})" stroke="{color}" stroke-width="2" stroke-opacity="0.3"/>
  <circle cx="50" cy="50" r="30" fill="{color}" opacity="0.15" filter="url(#glow_{block_id})"/>
  <g transform="translate(10, 15) scale(0.7)" fill="none" stroke="{accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <path d="{icon_path}" />
  </g>
  <path d="M 120 50 L 550 50" stroke="{color}" stroke-width="1" stroke-dasharray="4 8" opacity="0.5"/>
  <circle cx="200" cy="50" r="4" fill="{color}"/>
  <circle cx="350" cy="50" r="4" fill="{color}"/>
  <circle cx="500" cy="50" r="4" fill="{color}"/>
</svg>'''
    
    return svg.replace('\n', '')

def main():
    yaml_files = glob.glob(f"{CATALOGS_DIR}/**/*.yaml", recursive=True)
    count = 0
    for file_path in yaml_files:
        if file_path.endswith('_contract.yaml'):
            continue
            
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        try:
            data = yaml.safe_load(content)
        except:
            continue
            
        if not data or not isinstance(data, dict):
            continue
            
        block_id = data.get('id', 'unknown')
        category = data.get('category', '')
        tags = data.get('tags', [])
        cat_str = category + " " + " ".join(tags)
        
        modern_svg = get_modern_svg(cat_str, block_id)
        
        # Replace illustration_svg using regex to ensure we don't break metadata
        if 'illustration_svg:' in content:
            new_content = re.sub(r'illustration_svg:.*?\n', f'illustration_svg: {modern_svg}\n', content)
        else:
            # Inject before _metadata if present
            if '_metadata:' in content:
                new_content = content.replace('_metadata:', f'illustration_svg: {modern_svg}\n_metadata:')
            else:
                new_content = content + f'\nillustration_svg: {modern_svg}\n'
                
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        count += 1
        print(f"Updated {file_path}")

    print(f"Total updated: {count}")

if __name__ == "__main__":
    main()
