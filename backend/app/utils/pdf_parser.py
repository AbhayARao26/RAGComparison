from PyPDF2 import PdfReader

def extract_text_from_pdf(pdf_path):
    reader = PdfReader(pdf_path)
    texts = []
    for i, page in enumerate(reader.pages):
        texts.append((i + 1, page.extract_text()))
    return texts  # [(page_num, text)]