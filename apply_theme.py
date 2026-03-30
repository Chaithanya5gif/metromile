import os
import re

# Mapping from current Sky Blue theme to the new Deep Plum/White theme
color_map = {
    # 1. Backgrounds & Cards
    r'#F8FAFC': '#FFFFFF',      # Light gray bg -> Pure White
    r'#E2E8F0': '#F3E8FF',      # Gray border/bg -> Very Light Purple (Purple-100)
    r'#CBD5E1': '#E9D5FF',      # Gray border -> Purple-200
    
    # 2. Primary Accents (The Blue -> Plum shift)
    r'#0EA5E9': '#581C87',      # Sky-500 -> Deep Purple (Purple-900ish)
    r'#0284C7': '#4C1D95',      # Sky-600 -> Darker Purple
    r'#38BDF8': '#A855F7',      # Sky-400 -> Medium Purple
    
    # 3. Hero / Earnings Elements (The Blue tints)
    r'#0369A1': '#2E1065',      # Sky-700 -> Very Dark Purple
    r'#E0F2FE': '#FAF5FF',      # Sky-100 -> Subtle Purple tint
    
    # 4. Text / Buttons 
    # (Assuming text is already dark charcoal, which is fine)
}

def replace_theme():
    target_dir = '/Users/apple/Desktop/metroiop/metromile/frontend/src'
    for root, _, files in os.walk(target_dir):
        if 'node_modules' in root or 'build' in root or 'ios' in root or 'android' in root:
            continue
            
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r') as f:
                        content = f.read()

                    new_content = content
                    for old_c, new_c in color_map.items():
                        new_content = re.sub(old_c, new_c, new_content, flags=re.IGNORECASE)

                    # Also update BorderRadius to be "Extra Rounded" as per screenshot (16 -> 24 typical)
                    # This is a bit risky but we can try to find standard radius patterns
                    # new_content = re.sub(r'borderRadius:\s*1[246]', 'borderRadius: 24', new_content)

                    if new_content != content:
                        with open(filepath, 'w') as f:
                            f.write(new_content)
                        print(f'Y -> Updated {file}')
                except Exception as e:
                    print(f'Error on {file}: {e}')

if __name__ == '__main__':
    replace_theme()
