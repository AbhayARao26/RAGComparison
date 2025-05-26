'use client';

import { useState, ChangeEvent, FormEvent } from 'react';

// Define types for state and evaluation results
interface ChatPanelState {
  id: number;
  selectedRagType: string;
  selectedModel: string;
  response: string;
  loading: boolean;
  // Add fields for response time and context
  responseTime: number | null;
  context: string | object | null; // Context could be a string or structured object (e.g., list of sources)
}

interface PanelEvaluation {
    id: number;
    similarity_score: number;
    correctness_score: number;
    total_score: number;
}

interface EvaluationResults {
    scores: PanelEvaluation[];
    best_panel_id: number | null;
    benchmark_answer: string;
}


export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [query, setQuery] = useState<string>('');
  // Initialize panels with new fields
  const [panels, setPanels] = useState<ChatPanelState[]>([
    { id: 1, selectedRagType: 'basic', selectedModel: 'groq', response: '', loading: false, responseTime: null, context: null },
    { id: 2, selectedRagType: 'self-query', selectedModel: 'gemini', response: '', loading: false, responseTime: null, context: null },
  ]);
  const [overallLoading, setOverallLoading] = useState<boolean>(false); // Loading state for the overall query
  const [evaluationResults, setEvaluationResults] = useState<EvaluationResults | null>(null); // State for evaluation results


  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  // Handler for changes within a specific panel
  const handlePanelChange = (id: number, field: keyof ChatPanelState, value: any) => { // Use 'any' for value to accommodate string, boolean, number, object
    setPanels(prevPanels =>
      prevPanels.map(panel =>
        panel.id === id ? { ...panel, [field]: value } : panel
      )
    );
  };

   // Function to handle adding a new panel
  const handleAddPanel = () => {
    setPanels(prevPanels => [
      ...prevPanels,
      {
        id: prevPanels.length + 1, // Simple way to generate a unique ID
        selectedRagType: 'basic', // Default RAG type for new panels
        selectedModel: 'groq',    // Default model for new panels
        response: '',
        loading: false,
        responseTime: null, // Initialize new fields
        context: null,      // Initialize new fields
      },
    ]);
    setEvaluationResults(null); // Clear evaluation results when panels change
  };

  // Function to handle deleting a panel
  const handleDeletePanel = (idToDelete: number) => {
    if (panels.length <= 1) {
      alert('You must have at least one panel.');
      return;
    }
    setPanels(prevPanels => {
      const filteredPanels = prevPanels.filter(panel => panel.id !== idToDelete);
      const renumberedPanels = filteredPanels.map((panel, index) => ({
        ...panel,
        id: index + 1,
      }));
      return renumberedPanels;
    });
     setEvaluationResults(null); // Clear evaluation results when panels change
  };


  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a PDF file to upload.');
      return;
    }

    setOverallLoading(true);
     // Clear response, loading, time, and context on new upload
     setPanels(prevPanels => prevPanels.map(panel => ({ ...panel, loading: true, response: '', responseTime: null, context: null })));
     setEvaluationResults(null); // Clear results on new upload


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
    // Set loading and clear response, time, and context for all panels
    setPanels(prevPanels =>
      prevPanels.map(panel => ({ ...panel, loading: true, response: '', responseTime: null, context: null }))
    );
    setEvaluationResults(null); // Clear previous evaluation results


    console.log(`Submitting query: "${query}" to ${panels.length} panels concurrently.`);

    // Create an array of promises, one for each panel's API call
    // Modify the map to return the panel ID and the fetched response data
    const fetchPromises = panels.map(async (panel) => {
      const chatRequestData = {
        rag_type: panel.selectedRagType,
        model_id: panel.selectedModel,
        message: query,
      };

      let panelResponseData = null; // Variable to hold the full response data (including time and context)
      let finalResponseText = ''; // Variable to hold just the answer text for display/evaluation

      try {
        const queryResponse = await fetch('http://localhost:8000/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chatRequestData),
        });

        if (queryResponse.ok) {
          panelResponseData = await queryResponse.json();
           finalResponseText = panelResponseData.answer || JSON.stringify(panelResponseData, null, 2);
           // Update state with response, time, and context
           handlePanelChange(panel.id, 'response', finalResponseText);
           handlePanelChange(panel.id, 'responseTime', panelResponseData.response_time || null);
           handlePanelChange(panel.id, 'context', panelResponseData.context || null);

        } else {
           const error = await queryResponse.json();
           finalResponseText = `Error: ${error.detail || 'Unknown error'}`;
           // Update state with error response
           handlePanelChange(panel.id, 'response', finalResponseText);
           handlePanelChange(panel.id, 'responseTime', null); // No time on error
           handlePanelChange(panel.id, 'context', null); // No context on error
        }

         // Set loading to false for this specific panel when done
         handlePanelChange(panel.id, 'loading', false);

        // Return the panel ID and the collected response data for evaluation
        return {
            id: panel.id,
            response: finalResponseText, // Send answer text for evaluation
            context: panelResponseData?.context || null, // Include context if available
            response_time: panelResponseData?.response_time || null, // Include response time
        };

      } catch (error: any) {
         finalResponseText = `Error: ${error.message}`;
         // Update state with error response
         handlePanelChange(panel.id, 'response', finalResponseText);
         handlePanelChange(panel.id, 'responseTime', null);
         handlePanelChange(panel.id, 'context', null);
         handlePanelChange(panel.id, 'loading', false);
         // Return error info for evaluation (response text will be the error message)
         return {
             id: panel.id,
             response: finalResponseText,
             context: null,
             response_time: null,
         };
      }
    });

    // Wait for all promises to settle and get their results
    const panelResults = await Promise.all(fetchPromises);

    console.log('All panel queries finished. Triggering evaluation...');
    console.log('Panel results collected for evaluation:', panelResults); // Log the collected results

    // --- Trigger Evaluation After All Panels Respond ---
    // Use the results collected directly from the promises
    const panelOutputsForEvaluation = panelResults.map(result => ({
        id: result.id,
        response: result.response, // Send the answer text for evaluation
        // Include context and response_time in the evaluation request if backend needs them
        context: result.context,
        response_time: result.response_time,
    }));

    try {
        const evaluationResponse = await fetch('http://localhost:8000/evaluate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ panel_outputs: panelOutputsForEvaluation }),
        });

        if (evaluationResponse.ok) {
            const evaluationResult = await evaluationResponse.json();
            setEvaluationResults(evaluationResult); // Store evaluation results
            console.log('Evaluation results:', evaluationResult);
        } else {
            const error = await evaluationResponse.json();
            console.error('Evaluation failed:', error);
             alert(`Evaluation failed: ${error.detail || 'Unknown error'}`);
        }
    } catch (error: any) {
        console.error('Evaluation failed due to exception:', error);
        alert(`Evaluation failed: ${error.message}`);
    } finally {
        setOverallLoading(false); // Overall loading finishes after evaluation
        console.log('Evaluation process finished.');
    }
    // --- End Trigger Evaluation ---
  };

    // Function to get evaluation score for a specific panel ID
    const getPanelEvaluation = (panelId: number | undefined) => {
        if (!evaluationResults || panelId === undefined) return null;
        return evaluationResults.scores.find(score => score.id === panelId);
    };

    // Helper to render context - can be a string or object
    const renderContext = (context: string | object | null) => {
        if (!context) return <p>No context available.</p>;
        if (typeof context === 'string') {
            return <div style={{ whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto', fontSize: '0.8em', color: '#bbb' }}>{context}</div>; // Darker theme text color
        }
        // If context is an object (e.g., list of sources), stringify it
        return <div style={{ whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto', fontSize: '0.8em', color: '#bbb' }}>{JSON.stringify(context, null, 2)}</div>; // Darker theme text color
    };


  return (
    <div style={{ 
      padding: '0px', 
      width: '100%', 
      margin: '0', 
      backgroundColor: '#1a1a2e', 
      color: '#ffffff', 
      minHeight: '100vh' 
    }}>

      {/* Header Section */}
      <header style={{ 
        backgroundColor: '#1a1a2e', 
        padding: '20px', 
        borderRadius: '0px 0px 8px 8px',
        width: '100%'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ margin: '0', fontSize: '2em' }}>RAG Model Comparison Platform</h1> {/* Larger title */}
            <p style={{ margin: '5px 0 0 0', color: '#bbb' }}>Compare different RAG pipelines and language models side by side</p> {/* Subtitle */}
          </div>
          {/* Add Panel and Theme Toggle */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* Add Panel Button */}
            <button onClick={handleAddPanel} disabled={overallLoading} style={{ marginRight: '10px', padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: overallLoading ? 'not-allowed' : 'pointer' }}>
              + Add Panel
            </button>
          </div>
        </div>

        {/* Upload and Query Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' , flexGrow: 1, padding: '8px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#2a2a4a', marginBottom: '10px', color: '#ffffff'}}>
          {/* Upload Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ color: '#bbb' }}>Upload PDF Document:</label>
            <div style={{ position: 'relative', flexGrow: 1 }}>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer'
                }}
              />
              <button
                type="button"
                style={{
                  width: '100%',
                  padding: '8px 15px',
                  backgroundColor: '#2a2a4a',
                  color: '#ffffff',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                {selectedFile ? selectedFile.name : 'Choose PDF file'}
              </button>
            </div>
            <button onClick={handleUpload} disabled={!selectedFile || overallLoading} style={{ padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: overallLoading ? 'not-allowed' : 'pointer' }}>
              {overallLoading && !panels.some(p => p.loading) ? 'Processing...' : 'Create Embeddings'}
            </button>
          </div>
        </div>
        <div>  
          {/* Query Section */}
          <form onSubmit={handleQuerySubmit} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="text"
              value={query}
              onChange={handleQueryChange}
              placeholder="Enter your question about the document"
              style={{ 
                flexGrow: 1, 
                padding: '8px', 
                borderRadius: '4px', 
                border: '1px solid #555', 
                backgroundColor: '#2a2a4a', 
                color: '#ffffff' 
              }}
              disabled={overallLoading}
            />
            <button 
              type="submit" 
              disabled={!query.trim() || overallLoading} 
              style={{ 
                padding: '8px 15px', 
                backgroundColor: '#007bff', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: overallLoading ? 'not-allowed' : 'pointer' 
              }}
            >
              {overallLoading ? 'Generating...' : 'Generate'} {/* Change button text */}
            </button>
          </form>
        </div>
      </header>

      {/* Container for Panels */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '20px', 
        padding: '0 20px', 
        marginBottom: '20px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {panels.map(panel => {
            const panelEvaluation = getPanelEvaluation(panel.id);
            const isBestPanel = evaluationResults?.best_panel_id === panel.id;
             // Apply shadow based on evaluation result
            const panelStyle = {
                border: '1px solid #555', // Darker border
                padding: '15px',
                borderRadius: '8px',
                backgroundColor: '#2a2a4a', // Darker panel background
                boxShadow: isBestPanel ? '0 0 10px 5px rgba(144, 238, 144, 0.6)' : 'none', // Light green shadow
                transition: 'box-shadow 0.3s ease-in-out', // Smooth transition
                color: '#ffffff', // White text for panels
            };

            return (
                <div key={panel.id} style={panelStyle}>
                  {/* Panel Header with Delete Button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h3 style={{ margin: '0' }}>Panel {panel.id}</h3> {/* Remove default margin */}
                       {/* Show delete button only if more than 1 panel exists */}
                      {panels.length > 1 && (
                          <button
                              onClick={() => handleDeletePanel(panel.id)}
                              disabled={overallLoading}
                              style={{ background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', padding: '5px 10px', cursor: overallLoading ? 'not-allowed' : 'pointer' }}
                          >
                              X {/* Use X for delete button */}
                          </button>
                      )}
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    {/* Dropdown for RAG Type */}
                    <label htmlFor={`rag-select-${panel.id}`} style={{ marginRight: '10px' }}>RAG Type:</label>
                    <select
                      id={`rag-select-${panel.id}`}
                      value={panel.selectedRagType}
                      onChange={(e) => handlePanelChange(panel.id, 'selectedRagType', e.target.value)}
                      style={{ 
                        marginRight: '20px', 
                        padding: '5px', 
                        borderRadius: '4px', 
                        border: '1px solid #555', 
                        backgroundColor: '#2a2a4a', 
                        color: '#ffffff' 
                      }}
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
                      style={{ 
                        padding: '5px', 
                        borderRadius: '4px', 
                        border: '1px solid #555', 
                        backgroundColor: '#2a2a4a', 
                        color: '#ffffff' 
                      }}
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
                  {panel.loading && <p style={{ color: '#bbb' }}>Loading response...</p>} {/* Darker loading text */}
                  {!panel.loading && panel.response === '' && <p style={{ color: '#bbb' }}>Panel ready. Submit a query.</p>} {/* Darker placeholder text */}
                  {!panel.loading && panel.response !== '' && <div style={{ whiteSpace: 'pre-wrap', maxHeight: '300px', overflowY: 'auto' }}>{panel.response}</div>} {/* Add scroll */}

                  {/* Display Response Time */}
                   {panel.responseTime !== null && (
                       <div style={{ marginTop: '10px', borderTop: '1px solid #555', paddingTop: '10px', color: '#bbb' }}> {/* Darker border and text */}
                           <p>Response Time: {panel.responseTime.toFixed(2)} s</p> {/* Format to 2 decimal places */}
                       </div>
                   )}

                  {/* Display Context */}
                   {panel.context !== null && (
                       <div style={{ marginTop: '10px', borderTop: '1px solid #555', paddingTop: '10px', color: '#bbb' }}> {/* Darker border and text */}
                           <h4>Context Used</h4>
                           {renderContext(panel.context)} {/* Use helper function */}
                       </div>
                   )}

                  {/* Display Panel Specific Evaluation Scores */}
                  {panelEvaluation && (
                      <div style={{ marginTop: '10px', borderTop: '1px solid #555', paddingTop: '10px', color: '#bbb' }}> {/* Darker border and text */}
                          <h4>Evaluation Scores</h4>
                          <p>Similarity Score: {panelEvaluation.similarity_score}</p>
                          <p>Correctness Score: {panelEvaluation.correctness_score}</p>
                          <p>Total Score: {panelEvaluation.total_score}</p>
                      </div>
                  )}
                </div>
            );
        })}
      </div>

      {/* Comparison Tab Displaying Benchmark Answer and Overall Best */}
      <div style={{ 
        marginTop: '0px',
        marginLeft: '20px',
        marginRight: '20px', 
        border: '1px solid #555', 
        padding: '15px 15px', 
        borderRadius: '8px', 
        backgroundColor: '#2a2a4a', 
        color: '#ffffff',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <h2>Comparison & Benchmark</h2>
         {overallLoading && evaluationResults === null && <p style={{ color: '#bbb' }}>Waiting for responses to evaluate...</p>} {/* Darker loading text */}
        {evaluationResults && (
            <div>
                <h4>Benchmark Answer (Generated by Gemini from PDF)</h4>
                <div style={{ whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto', border: '1px dashed #777', padding: '10px', marginBottom: '15px', backgroundColor: '#2a2a4a', color: '#ffffff' }}> {/* Darker border and background */}
                    {evaluationResults.benchmark_answer}
                </div>

                <h4>Overall Results</h4>
                {evaluationResults.best_panel_id !== null ? (
                    <p>Panel with Highest Accuracy: <strong>Panel {evaluationResults.best_panel_id}</strong></p>
                ) : (
                     <p>Evaluation complete. No best panel identified (or only one panel).</p>
                )}

                {/* Optional: Could list all panel scores here again in a table */}
                {/* <h4>All Scores</h4>
                <ul>
                    {evaluationResults.scores.map(score => (
                        <li key={score.id}>
                            Panel {score.id}: Total Score {score.total_score}
                        </li>
                    ))}
                </ul> */}
            </div>
        )}
        {!overallLoading && !evaluationResults && <p style={{ color: '#bbb' }}>Generate responses to see comparison results here.</p>} {/* Darker placeholder text */}
      </div>

    </div>
  );
}