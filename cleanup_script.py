import os
import shutil

def cleanup_downloads():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    downloads_path = os.path.join(base_dir, "public", "downloads")

    if not os.path.exists(downloads_path):
        return

    for item in os.listdir(downloads_path):
        item_path = os.path.join(downloads_path, item)
        try:
            if os.path.isdir(item_path):
                shutil.rmtree(item_path)
            elif os.path.isfile(item_path):
                os.remove(item_path)
        except Exception:
            pass

    print("Success")

if __name__ == "__main__":
    cleanup_downloads()