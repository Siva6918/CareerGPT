import os
import re

def fix_ui_flaws(directory):
    for root, _, files in os.walk(directory):
        for file in files:
            if not file.endswith('.jsx'):
                continue
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            original_content = content

            # Fix hardcoded paddings (e.g., padding: '40px', padding: '24px 32px')
            # Let's target specific large paddings that hurt mobile
            content = re.sub(r"padding:\s*'28px'", "padding: 'clamp(16px, 4vw, 28px)'", content)
            content = re.sub(r"padding:\s*'40px'", "padding: 'clamp(20px, 5vw, 40px)'", content)
            content = re.sub(r"padding:\s*24", "padding: 'clamp(12px, 3vw, 24px)'", content)
            
            # Specifically fix AppLayout.main content padding
            if "app-main-content" in content:
                content = re.sub(
                    r"padding:\s*'28px'",
                    "padding: 'clamp(12px, 3vw, 28px)'",
                    content
                )

            # Fix gaps (e.g., gap: 24, gap: '24px')
            content = re.sub(r"gap:\s*24\b", "gap: 'clamp(12px, 3vw, 24px)'", content)
            content = re.sub(r"gap:\s*32\b", "gap: 'clamp(16px, 4vw, 32px)'", content)
            content = re.sub(r"gap:\s*48\b", "gap: 'clamp(20px, 5vw, 48px)'", content)
            content = re.sub(r"gap:\s*40\b", "gap: 'clamp(16px, 4vw, 40px)'", content)
            content = re.sub(r"gap:\s*20\b", "gap: 'clamp(10px, 2.5vw, 20px)'", content)

            # Fix large font sizes (e.g., fontSize: '2.5rem', fontSize: '2.2rem', fontSize: '3rem')
            content = re.sub(r"fontSize:\s*'2\.5rem'", "fontSize: 'clamp(1.75rem, 5vw, 2.5rem)'", content)
            content = re.sub(r"fontSize:\s*'2\.2rem'", "fontSize: 'clamp(1.5rem, 4vw, 2.2rem)'", content)
            content = re.sub(r"fontSize:\s*'3rem'", "fontSize: 'clamp(2rem, 6vw, 3rem)'", content)
            content = re.sub(r"fontSize:\s*'1\.75rem'", "fontSize: 'clamp(1.25rem, 4vw, 1.75rem)'", content)
            content = re.sub(r"fontSize:\s*'1\.5rem'", "fontSize: 'clamp(1.15rem, 3.5vw, 1.5rem)'", content)
            content = re.sub(r"fontSize:\s*'2rem'", "fontSize: 'clamp(1.4rem, 4.5vw, 2rem)'", content)
            content = re.sub(r"fontSize:\s*'3\.5rem'", "fontSize: 'clamp(2.2rem, 7vw, 3.5rem)'", content)

            if content != original_content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Fixed {file}")

fix_ui_flaws(r"C:\Users\vasan\OneDrive\Desktop\Major Project\CareerGPT\frontend\src\pages")
fix_ui_flaws(r"C:\Users\vasan\OneDrive\Desktop\Major Project\CareerGPT\frontend\src\layouts")
fix_ui_flaws(r"C:\Users\vasan\OneDrive\Desktop\Major Project\CareerGPT\frontend\src\components")
