import glob
import re

CATALOGS_DIR = 'src/configs/catalogs'

def main():
    yaml_files = glob.glob(f"{CATALOGS_DIR}/**/*.yaml", recursive=True)
    count = 0
    for file_path in yaml_files:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Target 1: The illustration_svg: key and its contents (if they are on one line)
        content = re.sub(r'^illustration_svg:.*?\n', '', content, flags=re.MULTILINE)
        
        # Target 2: Any dangling multiline SVG strings (anything between "\n and illustration_mermaid:)
        # Looking for things like `  width="400" ... </svg>`
        # We will match `"\n` followed by any number of lines that do NOT start with a valid YAML key (no colon)
        # up until `illustration_mermaid:` or `_metadata:`
        
        # We find the `code_template` end and the next valid key.
        # Valid next key is `illustration_mermaid:` or `_metadata:`
        
        # Regex explanation:
        # Match `"\n` or `'\n` or `|\n`
        # Match lines that don't have top level keys (e.g. `  width="...`)
        # until `illustration_mermaid:` or `_metadata:`
        
        new_content = re.sub(
            r'("\n|\'\n)(?:(?![a-zA-Z_]+:).*\n)+?(illustration_mermaid:|_metadata:)', 
            r'\1\2', 
            content
        )
        
        # Additionally, if there are any lingering lines containing </svg>, just remove them entirely
        # (This is safe because no valid python code or metadata should contain </svg>)
        lines = new_content.split('\n')
        cleaned_lines = []
        skip_mode = False
        for line in lines:
            if 'illustration_svg:' in line or '<svg' in line:
                skip_mode = True
            
            if not skip_mode:
                cleaned_lines.append(line)
                
            if '</svg>' in line:
                skip_mode = False
                
        # Handle case where </svg> was alone on a line or something
        final_lines = []
        for line in cleaned_lines:
            if '</svg>' in line or '<svg' in line or 'illustration_svg:' in line:
                continue
            # Also remove those weird orphaned SVG attribute lines
            if re.match(r'^\s*(width=|height=|fill=|stroke=|style=|cx=|cy=|r=|x1=|y1=|x2=|y2=|d=|points=|rx=|ry=|font-|transform=|opacity=|marker-).*/>\'?$', line):
                continue
            if re.match(r'^\s*width=.*</svg>\'?$', line):
                continue
            final_lines.append(line)

        final_content = '\n'.join(final_lines)
        
        # Another pass to make sure we don't have multiple illustration_mermaid
        # or empty lines before _metadata
        final_content = re.sub(r'\n{3,}', '\n\n', final_content)

        if final_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(final_content)
            count += 1
            print(f"Cleaned leftover SVGs in {file_path}")

    print(f"Total files cleaned: {count}")

if __name__ == "__main__":
    main()
