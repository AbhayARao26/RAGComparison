'use client';

import { useState, ChangeEvent, FormEvent } from 'react';

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [query, setQuery] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('groq');
  const [selectedRagType, setSelectedRagType] = useState<string>('basic');
  const [loading, setLoading] = useState<boolean>(false);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  const handleModelChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedModel(event.target.value);
  };

  const handleRagTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedRagType(event.target.value);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a PDF file to upload.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const uploadResponse = await fetch('http://localhost:8000/upload/', {
        method: 'POST',
        body: formData,
      });

      if (uploadResponse.ok) {
        alert('PDF uploaded and processed successfully!');
      } else {
        const error = await uploadResponse.json();
        alert(`Upload failed: ${error.detail || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleQuerySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim()) {
      alert('Please enter a query.');
      return;
    }

    console.log(`Using RAG Type: ${selectedRagType}, Model: ${selectedModel}`);

    setLoading(true);
    setResponse('');

    const chatRequestData = {
        rag_type: selectedRagType,
        model_id: selectedModel,
        message: query,
    };

    try {
      const queryResponse = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatRequestData),
      });

      if (queryResponse.ok) {
        const result = await queryResponse.json();
        if (result && result.answer) {
             setResponse(result.answer);
        } else {
            setResponse(JSON.stringify(result, null, 2));
        }

      } else {
         const error = await queryResponse.json();
        setResponse(`Error: ${error.detail || 'Unknown error'}`);
      }
    } catch (error: any) {
      setResponse(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
      <h1>RAG Comparison Frontend</h1>

      <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
        <h2>Upload PDF</h2>
        <input type="file" accept=".pdf" onChange={handleFileChange} style={{ marginBottom: '10px' }} />
        <button onClick={handleUpload} disabled={!selectedFile || loading}>
          {loading ? 'Uploading...' : 'Upload and Process PDF'}
        </button>
      </div>

      <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
        <h2>Query</h2>
        <div style={{ marginBottom: '10px' }}>
           <label htmlFor="rag-select" style={{ marginRight: '10px' }}>Choose RAG Type:</label>
           <select id="rag-select" value={selectedRagType} onChange={handleRagTypeChange} style={{ marginRight: '20px' }} disabled={loading}>
               <option value="basic">Basic RAG</option>
               <option value="self-query">Self-Query RAG</option>
               <option value="reranker">Reranker RAG</option>
           </select>

          <label htmlFor="model-select" style={{ marginRight: '10px' }}>Choose Model:</label>
          <select id="model-select" value={selectedModel} onChange={handleModelChange} disabled={loading}>
            <option value="gemini">Gemini</option>
            <option value="groq">Groq</option>
            <option value="jina">Jina (Note: Jina is a reranker, not an LLM itself)</option>
          </select>
        </div>
        <form onSubmit={handleQuerySubmit}>
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Enter your query here"
            style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
            disabled={loading}
          />
          <button type="submit" disabled={!query.trim() || loading}>
            {loading ? 'Generating...' : 'Generate Response'}
          </button>
        </form>
      </div>

      <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
        <h2>Response</h2>
        {loading && response === '' && <p>Loading response...</p>}
        {!loading && response === '' && <p>Submit a query to see the response.</p>}
        {!loading && response !== '' && <div style={{ whiteSpace: 'pre-wrap' }}>{response}</div>}
      </div>

       <div style={{ marginTop: '30px', border: '1px solid #ccc', padding: '15px', borderRadius: '8px', backgroundColor: '#f0f0f0' }}>
           <h2>Comparison Tab (Placeholder)</h2>
           <p>This area will display evaluation scores and compare results from different chat panels.</p>
       </div>

    </div>
  );
}