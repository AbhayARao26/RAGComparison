'use client';

import { useState, ChangeEvent, FormEvent } from 'react';

// Define a type for the state of a single chat panel
interface ChatPanelState {
  id: number;
  selectedRagType: string;
  selectedModel: string;
  response: string;
  loading: boolean;
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [query, setQuery] = useState<string>('');
  // Use an array to manage the state of multiple panels
  const [panels, setPanels] = useState<ChatPanelState[]>([
    { id: 1, selectedRagType: 'basic', selectedModel: 'groq', response: '', loading: false },
    { id: 2, selectedRagType: 'self-query', selectedModel: 'gemini', response: '', loading: false },
    // You could add more panels here or implement a button to add new ones
  ]);
  const [overallLoading, setOverallLoading] = useState<boolean>(false); // Loading state for the overall query

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  // Handler for changes within a specific panel
  const handlePanelChange = (id: number, field: keyof ChatPanelState, value: string | boolean) => {
    setPanels(prevPanels =>
      prevPanels.map(panel =>
        panel.id === id ? { ...panel, [field]: value } : panel
      )
    );
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a PDF file to upload.');
      return;
    }

    // Set loading for all panels during upload (optional, can be a global state)
    setOverallLoading(true);
     setPanels(prevPanels => prevPanels.map(panel => ({ ...panel, loading: true, response: ''})));


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
      setOverallLoading(false);
      setPanels(prevPanels => prevPanels.map(panel => ({ ...panel, loading: false })));
    }
  };

  const handleQuerySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim()) {
      alert('Please enter a query.');
      return;
    }

    setOverallLoading(true);
    // Set loading and clear response for all panels
    setPanels(prevPanels =>
      prevPanels.map(panel => ({ ...panel, loading: true, response: '' }))
    );

    console.log(`Submitting query: "${query}" to ${panels.length} panels concurrently.`);

    // Create an array of promises, one for each panel's API call
    const fetchPromises = panels.map(async (panel) => {
      const chatRequestData = {
        rag_type: panel.selectedRagType,
        model_id: panel.selectedModel,
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
          // Update the state for this specific panel
          handlePanelChange(panel.id, 'response', result.answer || JSON.stringify(result, null, 2));
        } else {
          const error = await queryResponse.json();
           handlePanelChange(panel.id, 'response', `Error: ${error.detail || 'Unknown error'}`);
        }
      } catch (error: any) {
         handlePanelChange(panel.id, 'response', `Error: ${error.message}`);
      } finally {
         // Set loading to false for this specific panel when done
         handlePanelChange(panel.id, 'loading', false);
      }
    });

    // Wait for all promises to settle (either resolve or reject)
    await Promise.all(fetchPromises);

    setOverallLoading(false);
    console.log('All panel queries finished.');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: 'auto' }}>
      <h1>RAG Comparison Frontend</h1>

      <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
        <h2>Upload PDF</h2>
        <input type="file" accept=".pdf" onChange={handleFileChange} style={{ marginBottom: '10px' }} />
        <button onClick={handleUpload} disabled={!selectedFile || overallLoading}>
          {overallLoading ? 'Processing...' : 'Upload and Process PDF'}
        </button>
         {overallLoading && !panels.some(p => p.loading) && <p>Upload in progress...</p>} {/* More specific loading */}
      </div>

      <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
        <h2>Query</h2>
        <form onSubmit={handleQuerySubmit}>
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Enter your query here (will be sent to all panels)"
            style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
            disabled={overallLoading}
          />
          <button type="submit" disabled={!query.trim() || overallLoading}>
            {overallLoading ? 'Generating...' : 'Generate Responses Concurrently'}
          </button>
        </form>
      </div>

      {/* Container for Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        {panels.map(panel => (
          <div key={panel.id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
            <h3>Panel {panel.id}</h3>
            <div style={{ marginBottom: '10px' }}>
              {/* Dropdown for RAG Type */}
              <label htmlFor={`rag-select-${panel.id}`} style={{ marginRight: '10px' }}>RAG Type:</label>
              <select
                id={`rag-select-${panel.id}`}
                value={panel.selectedRagType}
                onChange={(e) => handlePanelChange(panel.id, 'selectedRagType', e.target.value)}
                style={{ marginRight: '20px' }}
                disabled={overallLoading}
              >
                <option value="basic">Basic RAG</option>
                <option value="self-query">Self-Query RAG</option>
                <option value="reranker">Reranker RAG</option>
              </select>

              {/* Dropdown for Model */}
              <label htmlFor={`model-select-${panel.id}`} style={{ marginRight: '10px' }}>Model:</label>
              <select
                id={`model-select-${panel.id}`}
                value={panel.selectedModel}
                onChange={(e) => handlePanelChange(panel.id, 'selectedModel', e.target.value)}
                disabled={overallLoading}
              >
                 {/* Use backend expected model_id IDs as values */}
                <option value="gemini">Gemini</option>
                <option value="groq">Groq</option>
                <option value="jina">Jina (Reranker)</option>
                 {/* Add other models as needed */}
              </select>
            </div>

            <h4>Response (Panel {panel.id})</h4>
            {panel.loading && <p>Loading response...</p>}
            {!panel.loading && panel.response === '' && <p>Panel ready. Submit a query.</p>}
            {!panel.loading && panel.response !== '' && <div style={{ whiteSpace: 'pre-wrap', maxHeight: '300px', overflowY: 'auto' }}>{panel.response}</div>} {/* Add scroll */}
          </div>
        ))}
      </div>

      {/* Placeholder for the Comparison Tab */}
      <div style={{ marginTop: '0px', border: '1px solid #ccc', padding: '15px', borderRadius: '8px', backgroundColor: '#f0f0f0' }}>
        <h2>Comparison Tab (Placeholder)</h2>
        <p>This area will display evaluation scores and compare results from different chat panels.</p>
      </div>

    </div>
  );
}