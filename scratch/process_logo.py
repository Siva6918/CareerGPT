import os
import glob
from PIL import Image

upload_dir = r"C:\Users\vasan\.gemini\antigravity-ide\brain\461710e0-e3e5-4149-a56d-f6cdf2ba8115\.user_uploaded"
files = glob.glob(os.path.join(upload_dir, "*.*"))
if not files:
    print("No files found.")
    exit(1)

# Get most recently created file
latest_file = max(files, key=os.path.getctime)
print(f"Processing: {latest_file}")

img = Image.open(latest_file)
width, height = img.size

# Crop a square from the center
size = min(width, height)
left = (width - size) / 2
top = (height - size) / 2
right = (width + size) / 2
bottom = (height + size) / 2

# Remove extra outer glow/parts by cropping an additional 5% from all sides
margin = int(size * 0.05)
img_cropped = img.crop((left + margin, top + margin, right - margin, bottom - margin))

# Convert to RGBA (for transparency support if needed, but it's jpeg/png)
img_cropped = img_cropped.convert("RGBA")

public_dir = r"frontend\public"
os.makedirs(public_dir, exist_ok=True)

img_192 = img_cropped.resize((192, 192), Image.Resampling.LANCZOS)
img_192.save(os.path.join(public_dir, "pwa-192x192.png"), format="PNG")

img_512 = img_cropped.resize((512, 512), Image.Resampling.LANCZOS)
img_512.save(os.path.join(public_dir, "pwa-512x512.png"), format="PNG")

img_512.save(os.path.join(public_dir, "apple-touch-icon.png"), format="PNG")

print("Images saved successfully to frontend/public/")
