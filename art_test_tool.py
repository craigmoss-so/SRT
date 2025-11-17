#!/usr/bin/env python3
"""
SRT - Art Test Tool
A graphical tool for testing and validating art assets
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from PIL import Image, ImageTk
import os


class ArtTestTool:
    """Main application class for the Art Test Tool"""
    
    def __init__(self, root):
        self.root = root
        self.root.title("SRT - Art Test Tool")
        self.root.geometry("1000x700")
        
        self.current_image = None
        self.image_path = None
        
        self._setup_ui()
        
    def _setup_ui(self):
        """Set up the user interface"""
        # Main container
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configure grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        main_frame.rowconfigure(1, weight=1)
        
        # Title
        title_label = ttk.Label(main_frame, text="Art Test Tool", 
                               font=('Helvetica', 16, 'bold'))
        title_label.grid(row=0, column=0, columnspan=2, pady=10)
        
        # Control Panel (Left Side)
        control_frame = ttk.LabelFrame(main_frame, text="Controls", padding="10")
        control_frame.grid(row=1, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), padx=(0, 10))
        
        # Load Image Button
        load_btn = ttk.Button(control_frame, text="Load Image", 
                             command=self.load_image)
        load_btn.grid(row=0, column=0, sticky=(tk.W, tk.E), pady=5)
        
        # Image Info Section
        info_frame = ttk.LabelFrame(control_frame, text="Image Information", padding="10")
        info_frame.grid(row=1, column=0, sticky=(tk.W, tk.E), pady=10)
        
        self.info_text = tk.Text(info_frame, height=10, width=30, wrap=tk.WORD)
        self.info_text.grid(row=0, column=0, sticky=(tk.W, tk.E))
        
        # Test Results Section
        results_frame = ttk.LabelFrame(control_frame, text="Test Results", padding="10")
        results_frame.grid(row=2, column=0, sticky=(tk.W, tk.E), pady=10)
        
        self.results_text = tk.Text(results_frame, height=10, width=30, wrap=tk.WORD)
        self.results_text.grid(row=0, column=0, sticky=(tk.W, tk.E))
        
        # Run Tests Button
        test_btn = ttk.Button(control_frame, text="Run Tests", 
                             command=self.run_tests)
        test_btn.grid(row=3, column=0, sticky=(tk.W, tk.E), pady=5)
        
        # Image Display Area (Right Side)
        display_frame = ttk.LabelFrame(main_frame, text="Image Preview", padding="10")
        display_frame.grid(row=1, column=1, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Canvas for image display
        self.canvas = tk.Canvas(display_frame, bg='gray')
        self.canvas.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        display_frame.columnconfigure(0, weight=1)
        display_frame.rowconfigure(0, weight=1)
        
    def load_image(self):
        """Load an image file"""
        file_path = filedialog.askopenfilename(
            title="Select an image",
            filetypes=[
                ("Image files", "*.png *.jpg *.jpeg *.gif *.bmp *.tiff"),
                ("All files", "*.*")
            ]
        )
        
        if not file_path:
            return
            
        try:
            self.image_path = file_path
            self.current_image = Image.open(file_path)
            self._display_image()
            self._show_image_info()
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load image: {str(e)}")
            
    def _display_image(self):
        """Display the loaded image on canvas"""
        if not self.current_image:
            return
            
        # Get canvas size
        canvas_width = self.canvas.winfo_width()
        canvas_height = self.canvas.winfo_height()
        
        # Use default size if canvas not yet rendered
        if canvas_width <= 1:
            canvas_width = 600
        if canvas_height <= 1:
            canvas_height = 500
            
        # Calculate scaling to fit image in canvas
        img_width, img_height = self.current_image.size
        scale = min(canvas_width / img_width, canvas_height / img_height)
        
        # Don't scale up, only down
        if scale > 1:
            scale = 1
            
        new_width = int(img_width * scale)
        new_height = int(img_height * scale)
        
        # Resize image
        resized_image = self.current_image.resize((new_width, new_height), 
                                                  Image.Resampling.LANCZOS)
        
        # Convert to PhotoImage
        self.photo = ImageTk.PhotoImage(resized_image)
        
        # Clear canvas and display image
        self.canvas.delete("all")
        self.canvas.create_image(canvas_width // 2, canvas_height // 2, 
                                image=self.photo, anchor=tk.CENTER)
        
    def _show_image_info(self):
        """Display information about the loaded image"""
        if not self.current_image:
            return
            
        self.info_text.delete(1.0, tk.END)
        
        info = []
        info.append(f"File: {os.path.basename(self.image_path)}\n")
        info.append(f"Path: {self.image_path}\n\n")
        info.append(f"Format: {self.current_image.format}\n")
        info.append(f"Mode: {self.current_image.mode}\n")
        info.append(f"Size: {self.current_image.size[0]} x {self.current_image.size[1]}\n")
        
        # File size
        file_size = os.path.getsize(self.image_path)
        if file_size < 1024:
            size_str = f"{file_size} bytes"
        elif file_size < 1024 * 1024:
            size_str = f"{file_size / 1024:.2f} KB"
        else:
            size_str = f"{file_size / (1024 * 1024):.2f} MB"
        info.append(f"File Size: {size_str}\n")
        
        self.info_text.insert(1.0, ''.join(info))
        
    def run_tests(self):
        """Run various tests on the loaded image"""
        if not self.current_image:
            messagebox.showwarning("Warning", "Please load an image first!")
            return
            
        self.results_text.delete(1.0, tk.END)
        
        results = []
        results.append("=== Test Results ===\n\n")
        
        # Test 1: Resolution Check
        width, height = self.current_image.size
        results.append("1. Resolution Test:\n")
        if width >= 512 and height >= 512:
            results.append("   ✓ PASS - Resolution is adequate\n")
        else:
            results.append("   ✗ FAIL - Resolution is too low (< 512x512)\n")
        results.append(f"   Actual: {width}x{height}\n\n")
        
        # Test 2: Format Check
        results.append("2. Format Test:\n")
        supported_formats = ['PNG', 'JPEG', 'BMP', 'GIF']
        if self.current_image.format in supported_formats:
            results.append(f"   ✓ PASS - Format {self.current_image.format} is supported\n\n")
        else:
            results.append(f"   ⚠ WARNING - Format {self.current_image.format} may not be optimal\n\n")
        
        # Test 3: Color Mode Check
        results.append("3. Color Mode Test:\n")
        if self.current_image.mode in ['RGB', 'RGBA']:
            results.append(f"   ✓ PASS - Color mode {self.current_image.mode} is suitable\n\n")
        else:
            results.append(f"   ⚠ WARNING - Color mode {self.current_image.mode} may need conversion\n\n")
        
        # Test 4: File Size Check
        file_size = os.path.getsize(self.image_path)
        results.append("4. File Size Test:\n")
        if file_size < 10 * 1024 * 1024:  # 10 MB
            results.append("   ✓ PASS - File size is reasonable\n")
        else:
            results.append("   ⚠ WARNING - File size is large (> 10 MB)\n")
        results.append(f"   Actual: {file_size / (1024 * 1024):.2f} MB\n\n")
        
        # Test 5: Aspect Ratio Check
        aspect_ratio = width / height
        results.append("5. Aspect Ratio Test:\n")
        results.append(f"   Ratio: {aspect_ratio:.2f}:1\n")
        common_ratios = [16/9, 4/3, 1/1, 21/9, 16/10]
        is_common = any(abs(aspect_ratio - ratio) < 0.1 for ratio in common_ratios)
        if is_common:
            results.append("   ✓ PASS - Aspect ratio matches common standard\n\n")
        else:
            results.append("   ⚠ INFO - Custom aspect ratio detected\n\n")
        
        results.append("=== Tests Complete ===\n")
        
        self.results_text.insert(1.0, ''.join(results))


def main():
    """Main entry point for the application"""
    root = tk.Tk()
    app = ArtTestTool(root)
    root.mainloop()


if __name__ == "__main__":
    main()
