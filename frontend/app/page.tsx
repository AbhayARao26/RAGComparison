'use client';

import { useState, ChangeEvent, FormEvent } from 'react';

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [query, setQuery] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('groq'); // Default to groq for now, model selection is separate
  const [selectedRagType, setSelectedRagType] = useState<string>('basic'); // Add state for RAG type
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

  // Handler for RAG type selection
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

    setLoading(true);
    setResponse('');

    // Determine the backend endpoint based on selected RAG type
    let endpoint = 'http://localhost:8000/';
    switch (selectedRagType) {
      case 'basic':
        endpoint += 'query/'; // Maps to the Groq endpoint
        break;
      case 'self-query':
        endpoint += 'self-query/';
        break;
      case 'reranker':
        endpoint += 'reranker-query/';
        break;
      default:
        alert('Invalid RAG type selected.');
        setLoading(false);
        return;
    }

    // NOTE: The model selection dropdown is still visual only in this basic version.
    // The backend endpoints are currently tied to specific models/RAG types.
    // For full model control with the selected RAG type, the backend /chat endpoint
    // from the initial prompt would need to be implemented.

    const queryFormData = new FormData();
    queryFormData.append('question', query);
    // In a more advanced version with the /chat endpoint, you'd also send:
    // queryFormData.append('rag_type', selectedRagType);
    // queryFormData.append('model_id', selectedModel);


    try {
      const queryResponse = await fetch(endpoint, { // Use the determined endpoint
        method: 'POST',
        body: queryFormData,
      });

      if (queryResponse.ok) {
        const result = await queryResponse.json();
        // Display the relevant part of the response based on the endpoint
        // The exact response structure might vary slightly between endpoints
        if (result && result.answer) {
             setResponse(result.answer);
        } else {
            setResponse(JSON.stringify(result, null, 2)); // Display full result if structure unexpected
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
           {/* Dropdown for RAG Type */}
           <label htmlFor="rag-select" style={{ marginRight: '10px' }}>Choose RAG Type:</label>
           <select id="rag-select" value={selectedRagType} onChange={handleRagTypeChange} style={{ marginRight: '20px' }} disabled={loading}>
               <option value="basic">Basic RAG (Groq)</option> {/* Corresponds to /query/ */}
               <option value="self-query">Self-Query RAG (Gemini)</option> {/* Corresponds to /self-query/ */}
               <option value="reranker">Reranker RAG (Gemini + Jina)</option> {/* Corresponds to /reranker-query/ */}
           </select>

          {/* Dropdown for Model (Still placeholder functionality) */}
          <label htmlFor="model-select" style={{ marginRight: '10px' }}>Choose Model:</label>
          <select id="model-select" value={selectedModel} onChange={handleModelChange} disabled={loading}>
            {/* These options are visual placeholders or tied to specific RAG types */}
            <option value="gemini">Gemini (Placeholder)</option>
            <option value="groq">Groq (Used in Basic RAG)</option>
            <option value="jina">Jina (Used in Reranker, but needs Gemini for LLM)</option>
             {/* Add other models as needed */}
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

       {/* Placeholder for the Comparison Tab */}
       <div style={{ marginTop: '30px', border: '1px solid #ccc', padding: '15px', borderRadius: '8px', backgroundColor: '#f0f0f0' }}>
           <h2>Comparison Tab (Placeholder)</h2>
           <p>This area will display evaluation scores and compare results from different chat panels.</p>
           {/* Content for comparison table/cards goes here */}
       </div>

    </div>
  );
}