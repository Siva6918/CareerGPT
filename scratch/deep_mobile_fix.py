import os
import re

def fix_all(directory):
    for root, _, files in os.walk(directory):
        for file in files:
            if not file.endswith('.jsx'): continue
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()

            orig = content
            # Fix large fixed paddings 
            content = re.sub(r"padding:\s*'(36px 36px|36px|24px 36px|20px 36px)'", "padding: 'clamp(16px, 4vw, 36px)'", content)
            content = re.sub(r"padding:\s*'32px 36px'", "padding: 'clamp(16px, 4vw, 32px) clamp(16px, 4vw, 36px)'", content)
            content = re.sub(r"padding:\s*'24px 28px'", "padding: 'clamp(12px, 3vw, 24px) clamp(12px, 3vw, 28px)'", content)
            content = re.sub(r"padding:\s*'20px 24px'", "padding: 'clamp(12px, 3vw, 20px) clamp(12px, 3vw, 24px)'", content)
            content = re.sub(r"padding:\s*'16px 20px'", "padding: 'clamp(10px, 2.5vw, 16px) clamp(10px, 2.5vw, 20px)'", content)
            
            # Widths inside modal containers
            content = re.sub(r"width:\s*400\b", "width: 'min(400px, 100%)'", content)
            content = re.sub(r"maxWidth:\s*460\b", "maxWidth: 'min(460px, 100vw)'", content)
            content = re.sub(r"maxWidth:\s*400\b", "maxWidth: 'min(400px, 100vw)'", content)
            content = re.sub(r"maxWidth:\s*860\b", "maxWidth: 'min(860px, 100vw)'", content)
            content = re.sub(r"maxWidth:\s*840\b", "maxWidth: 'min(840px, 100vw)'", content)
            content = re.sub(r"width:\s*'100vw'\s*,?\s*maxWidth:\s*'400px'", "width: '100%', maxWidth: 400", content)
            
            # Min widths causing scroll
            content = re.sub(r"minWidth:\s*260\b", "minWidth: 'min(260px, 100vw)'", content)
            content = re.sub(r"minWidth:\s*200\b", "minWidth: 'min(200px, 100vw)'", content)
            content = re.sub(r"minWidth:\s*300\b", "minWidth: 'min(300px, 100vw)'", content)
            
            if content != orig:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Deep fixed: {file}")

fix_all("frontend/src")
print("Deep sweep complete.")
