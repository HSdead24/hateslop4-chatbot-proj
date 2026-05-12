import cloudinary
import cloudinary.uploader
from pathlib import Path
from dotenv import load_dotenv
import os

load_dotenv()

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

IMAGES_DIR = Path("llm/vector_store/data/images")

for char_dir in IMAGES_DIR.iterdir():
    if not char_dir.is_dir():
        continue
    for img in char_dir.iterdir():
        if img.suffix.lower() not in ['.png', '.jpg', '.jpeg']:
            continue
        public_id = f"chat/{char_dir.name}/{img.stem}"
        cloudinary.uploader.upload(
            str(img),
            public_id=public_id,
            overwrite=True,
            use_filename=False
        )
        print(f"업로드 완료: {public_id}")