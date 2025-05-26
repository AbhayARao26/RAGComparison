# RAGComparison

This project compares different RAG (Retrieval-Augmented Generation) strategies and Large Language Models (LLMs).

## Setup

1.  **Clone the repository:**

    ```bash
    git clone <repository_url>
    cd RAGComparison
    ```

2.  **Set up backend (FastAPI):**

    Navigate to the `backend` directory and install dependencies:

    ```bash
    cd backend
    pip install -r requirements.txt
    ```

    Create a `.env` file in the `backend` directory. This file is ignored by Git and should contain your API keys and other sensitive information. Example `.env` content:

    ```env
    GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
    GROQ_API_KEY="YOUR_GROQ_API_KEY"
    JINA_API_KEY="YOUR_JINA_API_KEY"
    # Add any other environment variables here
    ```

    Replace the placeholder values with your actual API keys.

    Run the backend server:

    ```bash
    uvicorn app.main:app --reload
    ```

3.  **Set up frontend (Next.js):**

    Navigate to the `frontend` directory and install dependencies:

    ```bash
    cd ../frontend
    npm install
    ```

    Run the frontend development server:

    ```bash
    npm run dev
    ```

4.  **Install System Dependencies:**

    You need **Poppler** and **Tesseract** installed on your system for PDF processing and OCR.

    -   **macOS (using Homebrew):**

        ```bash
        brew install poppler tesseract
        ```

    -   **Ubuntu/Debian:**

        ```bash
        sudo apt-get update
        sudo apt-get install poppler-utils tesseract-ocr
        ```

    -   **Windows:**

        Follow instructions to download and install from their respective websites and add them to your system PATH:

        -   Poppler: [http://blog.alivate.com.au/poppler-windows/](http://blog.alivate.com.au/poppler-windows/)
        -   Tesseract: [https://github.com/tesseract-ocr/tesseract](https://github.com/tesseract-ocr/tesseract)

## Usage

Once both the backend and frontend servers are running, open your browser to `http://localhost:3000` (or wherever your Next.js app is served) to access the application.