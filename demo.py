#!/usr/bin/env python3
"""
Example script demonstrating the Art Test Tool functionality
This script creates sample images and shows how they would be tested
"""

from PIL import Image
import os
import tempfile


def create_sample_images():
    """Create sample test images"""
    temp_dir = tempfile.mkdtemp(prefix="srt_demo_")
    print(f"Creating sample images in: {temp_dir}\n")
    
    samples = []
    
    # Sample 1: Good quality image
    img1 = Image.new('RGB', (1920, 1080), color=(100, 150, 200))
    path1 = os.path.join(temp_dir, "sample_good_1920x1080.png")
    img1.save(path1)
    samples.append(("Good Quality Image", path1))
    print(f"✓ Created: sample_good_1920x1080.png (1920x1080)")
    
    # Sample 2: Small image (will fail resolution test)
    img2 = Image.new('RGB', (256, 256), color=(200, 100, 100))
    path2 = os.path.join(temp_dir, "sample_small_256x256.png")
    img2.save(path2)
    samples.append(("Small Image", path2))
    print(f"✓ Created: sample_small_256x256.png (256x256)")
    
    # Sample 3: RGBA image
    img3 = Image.new('RGBA', (1024, 768), color=(50, 200, 50, 200))
    path3 = os.path.join(temp_dir, "sample_rgba_1024x768.png")
    img3.save(path3)
    samples.append(("RGBA Image", path3))
    print(f"✓ Created: sample_rgba_1024x768.png (1024x768)")
    
    # Sample 4: Square image
    img4 = Image.new('RGB', (512, 512), color=(150, 150, 150))
    path4 = os.path.join(temp_dir, "sample_square_512x512.png")
    img4.save(path4)
    samples.append(("Square Image", path4))
    print(f"✓ Created: sample_square_512x512.png (512x512)")
    
    return temp_dir, samples


def analyze_image(name, path):
    """Analyze an image like the Art Test Tool would"""
    print(f"\n{'='*60}")
    print(f"Analyzing: {name}")
    print(f"{'='*60}")
    
    img = Image.open(path)
    
    # Image Info
    print(f"\nImage Information:")
    print(f"  File: {os.path.basename(path)}")
    print(f"  Format: {img.format}")
    print(f"  Mode: {img.mode}")
    print(f"  Size: {img.size[0]} x {img.size[1]}")
    
    file_size = os.path.getsize(path)
    if file_size < 1024:
        size_str = f"{file_size} bytes"
    elif file_size < 1024 * 1024:
        size_str = f"{file_size / 1024:.2f} KB"
    else:
        size_str = f"{file_size / (1024 * 1024):.2f} MB"
    print(f"  File Size: {size_str}")
    
    # Run Tests
    print(f"\nTest Results:")
    
    # Test 1: Resolution
    width, height = img.size
    if width >= 512 and height >= 512:
        print(f"  ✓ Resolution Test: PASS ({width}x{height})")
    else:
        print(f"  ✗ Resolution Test: FAIL ({width}x{height} - too small)")
    
    # Test 2: Format
    supported_formats = ['PNG', 'JPEG', 'BMP', 'GIF']
    if img.format in supported_formats:
        print(f"  ✓ Format Test: PASS ({img.format})")
    else:
        print(f"  ⚠ Format Test: WARNING ({img.format})")
    
    # Test 3: Color Mode
    if img.mode in ['RGB', 'RGBA']:
        print(f"  ✓ Color Mode Test: PASS ({img.mode})")
    else:
        print(f"  ⚠ Color Mode Test: WARNING ({img.mode})")
    
    # Test 4: File Size
    if file_size < 10 * 1024 * 1024:
        print(f"  ✓ File Size Test: PASS ({size_str})")
    else:
        print(f"  ⚠ File Size Test: WARNING ({size_str} - large file)")
    
    # Test 5: Aspect Ratio
    aspect_ratio = width / height
    print(f"  ℹ Aspect Ratio: {aspect_ratio:.2f}:1")
    
    img.close()


def main():
    """Main demo function"""
    print("=" * 60)
    print("SRT - Art Test Tool - Demo")
    print("=" * 60)
    print("\nThis demo creates sample images and analyzes them")
    print("to show how the Art Test Tool works.\n")
    
    # Create sample images
    temp_dir, samples = create_sample_images()
    
    # Analyze each sample
    for name, path in samples:
        analyze_image(name, path)
    
    print(f"\n{'='*60}")
    print("Demo Complete!")
    print(f"{'='*60}")
    print(f"\nSample images are saved in: {temp_dir}")
    print("You can load these images in the Art Test Tool GUI to test it.")
    print("\nTo run the GUI:")
    print("  python art_test_tool.py")
    print()


if __name__ == "__main__":
    main()
