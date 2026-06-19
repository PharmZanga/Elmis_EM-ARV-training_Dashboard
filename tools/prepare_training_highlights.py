from pathlib import Path
import shutil

SOURCE_IMAGES = [
    (
        r"C:\Users\Zanga Musakuzi\OneDrive\Desktop\elmis\national elmis\elmis champions expert training\group photo\IMG-20250828-WA0053.jpg",
        "kafue-experts-group.jpg",
    ),
    (
        r"C:\Users\Zanga Musakuzi\OneDrive\Desktop\elmis\national elmis\elmis support training group 3\photos\IMG-20250908-WA0073.jpg",
        "support-training-panel.jpg",
    ),
    (
        r"C:\Users\Zanga Musakuzi\OneDrive\Desktop\elmis\national elmis\elmis support training group 3\photos\IMG-20250908-WA0029.jpg",
        "support-training-presentation.jpg",
    ),
    (
        r"C:\Users\Zanga Musakuzi\OneDrive\Desktop\elmis\national elmis\elmis support training\photos\field\WhatsApp Image 2025-09-05 at 13.46.19_f7cef034.jpg",
        "field-support-session.jpg",
    ),
    (
        r"C:\Users\Zanga Musakuzi\OneDrive\Desktop\elmis\national elmis\elmis support training\photos\field\IMG-20250905-WA0027.jpg",
        "facility-mentorship.jpg",
    ),
    (
        r"C:\Users\Zanga Musakuzi\OneDrive\Desktop\elmis\national elmis\elmis support training\photos\photos day 1\IMG-20250903-WA0123.jpg",
        "training-day-one-room.jpg",
    ),
    (
        r"C:\Users\Zanga Musakuzi\OneDrive\Desktop\elmis\national elmis\elmis champions expert training\last day photos\IMG-20250830-WA0039.jpg",
        "expert-classroom.jpg",
    ),
    (
        r"C:\Users\Zanga Musakuzi\OneDrive\Desktop\elmis\national elmis\elmis champions expert training\photos\day 2 photos\IMG-20250826-WA0031.jpg",
        "expert-room-wide.jpg",
    ),
    (
        r"C:\Users\Zanga Musakuzi\OneDrive\Desktop\elmis\national elmis\elmis champions expert training\photos\day 1\IMG-20250825-WA0111.jpg",
        "elmis-presentation.jpg",
    ),
    (
        r"C:\Users\Zanga Musakuzi\OneDrive\Desktop\elmis\national elmis\elmis champions expert training\photos\day 1\IMG-20250825-WA0042.jpg",
        "supply-chain-slide.jpg",
    ),
]


def main():
    out_dir = Path(__file__).resolve().parents[1] / "public" / "training-highlights"
    out_dir.mkdir(parents=True, exist_ok=True)

    try:
        from PIL import Image, ImageOps
    except ImportError:
        Image = None
        ImageOps = None

    for source, name in SOURCE_IMAGES:
        source_path = Path(source)
        target_path = out_dir / name
        if not source_path.exists():
            print(f"missing: {source_path}")
            continue

        if Image is None:
            shutil.copy2(source_path, target_path)
            print(f"copied: {target_path}")
            continue

        with Image.open(source_path) as image:
            image = ImageOps.exif_transpose(image).convert("RGB")
            image.thumbnail((1400, 950))
            image.save(target_path, "JPEG", quality=82, optimize=True)
            print(f"prepared: {target_path}")


if __name__ == "__main__":
    main()
