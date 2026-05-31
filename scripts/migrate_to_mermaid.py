import os
import yaml
import glob
import re

CATALOGS_DIR = 'src/configs/catalogs'

def get_mermaid_code(category, block_id):
    cat_lower = str(category).lower()
    
    if 'extract' in cat_lower or 'load' in cat_lower or 'read' in cat_lower:
        return '''
    graph LR
      Source[(Source)] -->|Load| Node([Extract Data])
      style Source fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
      style Node fill:#eff6ff,stroke:#3b82f6,stroke-width:2px
'''
    elif 'transform' in cat_lower or 'preprocess' in cat_lower:
        return '''
    graph LR
      In([Raw Data]) -->|Process| Out([Clean Data])
      style In fill:#eff6ff,stroke:#94a3b8,stroke-width:2px,stroke-dasharray: 5 5
      style Out fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff
'''
    elif 'model' in cat_lower or 'train' in cat_lower:
        return '''
    graph LR
      Data([Features]) --> Model((Machine Learning))
      Model --> Pred([Predictions])
      style Model fill:#8b5cf6,stroke:#7c3aed,stroke-width:2px,color:#fff
      style Data fill:#f8fafc,stroke:#94a3b8,stroke-width:1px
      style Pred fill:#f8fafc,stroke:#94a3b8,stroke-width:1px
'''
    elif 'eval' in cat_lower or 'metric' in cat_lower:
        return '''
    graph LR
      Pred([Predictions]) --> Metric{Evaluation}
      Actual([Ground Truth]) --> Metric
      style Metric fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff
'''
    elif 'deploy' in cat_lower or 'serve' in cat_lower:
        return '''
    graph LR
      Model((Model)) --> API{{API Endpoint}}
      API --> Client([Client App])
      style API fill:#ef4444,stroke:#dc2626,stroke-width:2px,color:#fff
      style Model fill:#8b5cf6,stroke:#7c3aed,stroke-width:2px,color:#fff
'''
    else:
        return '''
    graph LR
      A([Input]) --> B([Operation])
      B --> C([Output])
      style B fill:#64748b,stroke:#475569,stroke-width:2px,color:#fff
'''

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
        
        mermaid_code = get_mermaid_code(cat_str, block_id)
        
        # 1. Strip ALL old illustration_svg occurrences safely using regex
        # This handles single line and multiline cases without breaking other keys
        new_content = re.sub(r'illustration_svg:\s*(?:>-?\s*)?<svg.*?</svg>\s*\n', '', content, flags=re.DOTALL)
        
        # Also clean up any lingering 'illustration_svg: null' or single lines that failed to match
        new_content = re.sub(r'illustration_svg:.*?\n', '', new_content)
        
        # Also clean up any old 'illustration_plantuml' or 'illustration_mermaid' if they exist to avoid duplicates
        new_content = re.sub(r'illustration_mermaid:\s*\|.*?(?=\n\S|$)', '', new_content, flags=re.DOTALL)
        new_content = re.sub(r'illustration_plantuml:\s*\|.*?(?=\n\S|$)', '', new_content, flags=re.DOTALL)

        # 2. Inject illustration_mermaid before _metadata:
        if '_metadata:' in new_content:
            new_content = new_content.replace('_metadata:', f'illustration_mermaid: |{mermaid_code}\n_metadata:')
        else:
            new_content = new_content + f'\nillustration_mermaid: |{mermaid_code}\n'
            
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        count += 1
        
    print(f"Total YAMLs migrated to Mermaid: {count}")

if __name__ == "__main__":
    main()
