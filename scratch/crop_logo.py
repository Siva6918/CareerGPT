from PIL import Image, ImageChops, ImageOps
import os

def trim_and_resize(image_path, output_dir):
    try:
        img = Image.open(image_path).convert("RGBA")
        
        # Create a white background image same size as img
        bg = Image.new("RGBA", img.size, (255,255,255,255))
        # Composite img on white background to remove alpha if any
        img_no_alpha = Image.alpha_composite(bg, img)
        
        # Convert to grayscale and invert to find bounding box
        gray = img_no_alpha.convert("L")
        invert = ImageOps.invert(gray)
        # Any pixel not white (255 in original, 0 in inverted) will be > 0.
        # But maybe the background is not pure white. 
        # Let's get the color of top-left pixel.
        bg_color = img_no_alpha.getpixel((0,0))
        
        # Calculate difference from top-left pixel
        diff = ImageChops.difference(img_no_alpha, Image.new("RGBA", img.size, bg_color))
        diff = ImageChops.add(diff, diff, 2.0, -100)
        bbox = diff.getbbox()
        
        if bbox:
            img = img.crop(bbox)
        
        # Make it square
        w, h = img.size
        size = max(w, h)
        # Add 10% padding
        padded_size = int(size * 1.1)
        
        new_img = Image.new("RGBA", (padded_size, padded_size), (255, 255, 255, 0)) # transparent padding
        
        offset = ((padded_size - w) // 2, (padded_size - h) // 2)
        new_img.paste(img, offset)
        
        # Generate PWA icons
        os.makedirs(output_dir, exist_ok=True)
        
        # 512
        img_512 = new_img.resize((512, 512), Image.Resampling.LANCZOS)
        img_512.save(os.path.join(output_dir, "pwa-512x512.png"), format="PNG")
        
        # 192
        img_192 = new_img.resize((192, 192), Image.Resampling.LANCZOS)
        img_192.save(os.path.join(output_dir, "pwa-192x192.png"), format="PNG")
        
        # apple touch icon (180x180), usually wants solid background (white)
        apple_bg = Image.new("RGBA", (padded_size, padded_size), (255, 255, 255, 255))
        apple_bg.paste(img, offset, mask=img if img.mode == 'RGBA' else None)
        img_apple = apple_bg.resize((180, 180), Image.Resampling.LANCZOS)
        img_apple.convert("RGB").save(os.path.join(output_dir, "apple-touch-icon.png"), format="PNG")
        
        print("Icons successfully generated and saved!")
    except Exception as e:
        print(f"Failed to generate icons: {e}")

artifact_dir = r"C:\Users\vasan\.gemini\antigravity-ide\brain\461710e0-e3e5-4149-a56d-f6cdf2ba8115\.user_uploaded"
image_path = os.path.join(artifact_dir, "media_1790793650725.jpg")
output_dir = r"C:\Users\vasan\OneDrive\Desktop\Major Project\CareerGPT\frontend\public"

trim_and_resize(image_path, output_dir)
