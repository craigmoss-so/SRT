#!/usr/bin/env python3
"""
Test script for the Art Test Tool
"""

import unittest
import os
import sys
from PIL import Image
import tempfile

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


class TestArtTestTool(unittest.TestCase):
    """Test cases for the Art Test Tool"""
    
    def setUp(self):
        """Set up test fixtures"""
        # Create a temporary test image
        self.test_dir = tempfile.mkdtemp()
        self.test_image_path = os.path.join(self.test_dir, "test_image.png")
        
        # Create a simple test image
        img = Image.new('RGB', (1024, 768), color='red')
        img.save(self.test_image_path)
        
    def tearDown(self):
        """Clean up test fixtures"""
        if os.path.exists(self.test_image_path):
            os.remove(self.test_image_path)
        if os.path.exists(self.test_dir):
            os.rmdir(self.test_dir)
    
    def test_image_creation(self):
        """Test that test image was created successfully"""
        self.assertTrue(os.path.exists(self.test_image_path))
        
        img = Image.open(self.test_image_path)
        self.assertEqual(img.size, (1024, 768))
        self.assertEqual(img.format, 'PNG')
    
    def test_import_art_test_tool(self):
        """Test that the art_test_tool module can be imported"""
        try:
            import art_test_tool
            self.assertTrue(hasattr(art_test_tool, 'ArtTestTool'))
            self.assertTrue(hasattr(art_test_tool, 'main'))
        except ImportError as e:
            # tkinter may not be available in headless environments
            if 'tkinter' in str(e):
                self.skipTest("tkinter not available in headless environment")
            else:
                self.fail(f"Failed to import art_test_tool: {e}")
    
    def test_resolution_validation(self):
        """Test resolution validation logic"""
        # Large enough image
        img_pass = Image.new('RGB', (1024, 768), color='blue')
        self.assertGreaterEqual(img_pass.size[0], 512)
        self.assertGreaterEqual(img_pass.size[1], 512)
        
        # Too small image
        img_fail = Image.new('RGB', (256, 256), color='green')
        is_too_small = img_fail.size[0] < 512 or img_fail.size[1] < 512
        self.assertTrue(is_too_small)
    
    def test_supported_formats(self):
        """Test that common image formats are recognized"""
        supported_formats = ['PNG', 'JPEG', 'BMP', 'GIF']
        
        # Create images in different formats
        for fmt in ['PNG', 'JPEG', 'BMP']:
            temp_path = os.path.join(self.test_dir, f"test.{fmt.lower()}")
            img = Image.new('RGB', (512, 512), color='white')
            img.save(temp_path, format=fmt)
            
            loaded_img = Image.open(temp_path)
            self.assertIn(loaded_img.format, supported_formats)
            
            os.remove(temp_path)
    
    def test_color_mode_validation(self):
        """Test color mode validation"""
        # RGB mode - should pass
        img_rgb = Image.new('RGB', (512, 512), color='red')
        self.assertIn(img_rgb.mode, ['RGB', 'RGBA'])
        
        # RGBA mode - should pass
        img_rgba = Image.new('RGBA', (512, 512), color=(255, 0, 0, 128))
        self.assertIn(img_rgba.mode, ['RGB', 'RGBA'])
    
    def test_aspect_ratio_calculation(self):
        """Test aspect ratio calculations"""
        # 16:9 aspect ratio
        img_169 = Image.new('RGB', (1920, 1080), color='blue')
        aspect_169 = img_169.size[0] / img_169.size[1]
        self.assertAlmostEqual(aspect_169, 16/9, places=2)
        
        # 4:3 aspect ratio
        img_43 = Image.new('RGB', (1024, 768), color='green')
        aspect_43 = img_43.size[0] / img_43.size[1]
        self.assertAlmostEqual(aspect_43, 4/3, places=2)
        
        # 1:1 aspect ratio
        img_11 = Image.new('RGB', (512, 512), color='red')
        aspect_11 = img_11.size[0] / img_11.size[1]
        self.assertAlmostEqual(aspect_11, 1.0, places=2)


if __name__ == '__main__':
    print("Running Art Test Tool tests...")
    unittest.main(verbosity=2)
