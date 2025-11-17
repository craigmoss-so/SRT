# SRT - Art Test Tool

A graphical and easy-to-use tool for testing and validating art assets.

## Overview

SRT (Simple, Reliable Testing) is a desktop application that helps artists, game developers, and digital content creators test and validate their art assets. The tool provides a user-friendly graphical interface to quickly check image properties, run automated tests, and ensure assets meet quality standards.

## Features

- **Graphical User Interface**: Easy-to-use GUI built with Python tkinter
- **Image Loading**: Support for common image formats (PNG, JPEG, BMP, GIF, TIFF)
- **Image Preview**: Visual preview of loaded art assets with auto-scaling
- **Image Information**: Display detailed metadata including format, resolution, file size, and color mode
- **Automated Tests**: Run comprehensive tests on your art assets:
  - Resolution validation
  - Format compatibility check
  - Color mode verification
  - File size optimization check
  - Aspect ratio analysis
- **Test Results**: Clear pass/fail/warning indicators for each test

## Installation

### Prerequisites

- Python 3.6 or higher
- pip (Python package manager)

### Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/craigmoss-so/SRT.git
   cd SRT
   ```

2. Install required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

Run the Art Test Tool with:

```bash
python art_test_tool.py
```

### How to Use

1. **Load an Image**: Click the "Load Image" button and select an art asset from your file system
2. **View Information**: The image information panel displays metadata about your asset
3. **Preview**: The image preview area shows your asset scaled to fit the window
4. **Run Tests**: Click "Run Tests" to execute automated quality checks
5. **Review Results**: Check the test results panel for detailed feedback on your asset

### Test Criteria

The tool runs the following tests:

- **Resolution Test**: Ensures the image is at least 512x512 pixels
- **Format Test**: Checks if the format is commonly supported (PNG, JPEG, BMP, GIF)
- **Color Mode Test**: Validates RGB/RGBA color modes for optimal compatibility
- **File Size Test**: Warns if file size exceeds 10 MB
- **Aspect Ratio Test**: Identifies common aspect ratios (16:9, 4:3, 1:1, etc.)

## Requirements

See `requirements.txt` for Python package dependencies:
- Pillow (PIL) for image processing

## License

This project is open source and available for use.

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.
