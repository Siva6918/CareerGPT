from PIL import Image
import os

artifact_dir = r"C:\Users\vasan\.gemini\antigravity-ide\brain\461710e0-e3e5-4149-a56d-f6cdf2ba8115\.user_uploaded"
images = [
    "media_1790785947353.png",
    "media_1790785975182.png",
    "media_1790785989082.png",
    "media_1790788389826.png",
    "media_1790789501865.jpg",
    "media_1790789532507.jpg",
    "media_1790790414622.jpg",
    "media_1790791819529.png",
    "media_1790793650725.jpg"
]

for img_name in images:
    path = os.path.join(artifact_dir, img_name)
    if os.path.exists(path):
        try:
            with Image.open(path) as img:
                print(f"{img_name}: {img.size}, mode {img.mode}, format {img.format}")
        except Exception as e:
            print(f"{img_name}: ERROR {e}")
