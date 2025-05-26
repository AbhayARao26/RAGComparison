# RAGComparison

This project compares different RAG (Retrieval-Augmented Generation) strategies and Large Language Models (LLMs).

### You can see the working in the video below:
https://github.com/user-attachments/assets/7697616b-f260-481b-b773-c82f94b3fe32


## Setup

1.  **Clone the repository:**

    ```bash
    git clone <repository_url>
    cd RAGComparison
    ```

2.  **Set up Qdrant (Vector Database):**

    ### macOS:
    ```bash
    # Create Qdrant directory and storage
    mkdir -p ~/qdrant/storage
    
    # Download Qdrant binary (for Apple Silicon/M1/M2 Macs)
    cd ~/qdrant
    curl -L https://github.com/qdrant/qdrant/releases/download/v1.14.1/qdrant-aarch64-apple-darwin.tar.gz -o qdrant.tar.gz
    tar -xzf qdrant.tar.gz
    chmod +x qdrant
    rm qdrant.tar.gz
    
    # Create config file
    mkdir -p config
    echo "storage:\n  storage_path: ~/qdrant/storage" > config/config.yaml
    
    # Start Qdrant
    ./qdrant --config-path config/config.yaml
    ```

    ### Windows:
    ```bash
    # Create Qdrant directory and storage
    mkdir %USERPROFILE%\qdrant\storage
    
    # Download Qdrant binary from:
    # https://github.com/qdrant/qdrant/releases/download/v1.14.1/qdrant-x86_64-pc-windows-msvc.zip
    
    # Extract the zip file and move qdrant.exe to %USERPROFILE%\qdrant
    
    # Create config file
    mkdir %USERPROFILE%\qdrant\config
    echo storage: > %USERPROFILE%\qdrant\config\config.yaml
    echo   storage_path: %USERPROFILE%\qdrant\storage >> %USERPROFILE%\qdrant\config\config.yaml
    
    # Start Qdrant
    cd %USERPROFILE%\qdrant
    qdrant.exe --config-path config\config.yaml
    ```

    ### Linux:
    ```bash
    # Create Qdrant directory and storage
    mkdir -p ~/qdrant/storage
    
    # Download Qdrant binary
    cd ~/qdrant
    curl -L https://github.com/qdrant/qdrant/releases/download/v1.14.1/qdrant-x86_64-unknown-linux-gnu.tar.gz -o qdrant.tar.gz
    tar -xzf qdrant.tar.gz
    chmod +x qdrant
    rm qdrant.tar.gz
    
    # Create config file
    mkdir -p config
    echo "storage:\n  storage_path: ~/qdrant/storage" > config/config.yaml
    
    # Start Qdrant
    ./qdrant --config-path config/config.yaml
    ```

3.  **Set up backend (FastAPI):**

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

4.  **Set up frontend (Next.js):**

    Navigate to the `frontend` directory and install dependencies:

    ```bash
    cd ../frontend
    npm install
    ```

    Create a `.env.local` file in the `frontend` directory with the following content:

    ```env
    NEXT_PUBLIC_API_URL=http://localhost:8000
    ```

    Run the frontend development server:

    ```bash
    npm run dev
    ```

5.  **Install System Dependencies:**

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

1. Make sure Qdrant is running (you should see "Qdrant HTTP listening on 6333" in the terminal)
2. Start the backend server (FastAPI)
3. Start the frontend server (Next.js)
4. Open your browser to `http://localhost:3000` to access the application

## Verifying the Setup

- Qdrant Web UI: http://localhost:6333/dashboard
- Backend API: http://localhost:8000
- Frontend: http://localhost:3000

## Troubleshooting

- If Qdrant fails to start, check if port 6333 is already in use:
  ```bash
  # macOS/Linux
  lsof -i :6333
  
  # Windows
  netstat -ano | findstr :6333
  ```
- If you need to stop Qdrant:
  ```bash
  # macOS/Linux
  kill $(lsof -t -i:6333)
  
  # Windows
  taskkill /PID <PID> /F
  ```
