import pdfplumber
from pdf2image import convert_from_path
import pytesseract
import tempfile
import os

def extract_text_from_pdf(pdf_path):
    """
    Extracts all text from a PDF, including OCR on images/scanned pages.
    Returns a list of (page_num, text) tuples.
    """
    texts = []
    # 1. Extract text layer (if present)
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            page_text = page.extract_text() or ""
            texts.append((i + 1, page_text))
    # 2. OCR for images/scanned pages
    with tempfile.TemporaryDirectory() as path:
        images = convert_from_path(pdf_path, output_folder=path)
        for i, img in enumerate(images):
            ocr_text = pytesseract.image_to_string(img)
            if ocr_text.strip():
                # Append OCR text to the corresponding page
                if i < len(texts):
                    texts[i] = (texts[i][0], texts[i][1] + "\n" + ocr_text)
                else:
                    texts.append((i + 1, ocr_text))
    return texts  # [(page_num, text)]