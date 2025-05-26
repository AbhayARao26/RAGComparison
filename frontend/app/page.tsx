'use client';

import { useState, ChangeEvent, FormEvent } from 'react';

// Define types for state and evaluation results
interface ChatPanelState {
  id: number;
  selectedRagType: string;
  selectedModel: string;
  response: string;
  loading: boolean;
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
  // Use an array to manage the state of multiple panels
  const [panels, setPanels] = useState<ChatPanelState[]>([
    { id: 1, selectedRagType: 'basic', selectedModel: 'groq', response: '', loading: false },
    { id: 2, selectedRagType: 'self-query', selectedModel: 'gemini', response: '', loading: false },
    // Remove the third panel to set default to 2
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
  const handlePanelChange = (id: number, field: keyof ChatPanelState, value: string | boolean) => {
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

    // Set loading for all panels during upload (optional, can be a global state)
    setOverallLoading(true);
     setPanels(prevPanels => prevPanels.map(panel => ({ ...panel, loading: true, response: ''})));
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
    // Set loading and clear response for all panels
    setPanels(prevPanels =>
      prevPanels.map(panel => ({ ...panel, loading: true, response: '' }))
    );
    setEvaluationResults(null); // Clear previous evaluation results


    console.log(`Submitting query: "${query}" to ${panels.length} panels concurrently.`);

    // Create an array of promises, one for each panel's API call
    // Modify the map to return the panel ID and the fetched response text
    const fetchPromises = panels.map(async (panel) => {
      const chatRequestData = {
        rag_type: panel.selectedRagType,
        model_id: panel.selectedModel,
        message: query,
      };

      let finalResponseText = ''; // Variable to hold the final response text (success or error)

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
           finalResponseText = result.answer || JSON.stringify(result, null, 2);
        } else {
           const error = await queryResponse.json();
           finalResponseText = `Error: ${error.detail || 'Unknown error'}`;
        }

         // Update the state for this specific panel with the received response text
         handlePanelChange(panel.id, 'response', finalResponseText);
         // Set loading to false for this specific panel when done
         handlePanelChange(panel.id, 'loading', false);

        // Return the panel ID and the final response text from the promise
        return { id: panel.id, response: finalResponseText };

      } catch (error: any) {
         finalResponseText = `Error: ${error.message}`;
         handlePanelChange(panel.id, 'response', finalResponseText);
         handlePanelChange(panel.id, 'loading', false);
         return { id: panel.id, response: finalResponseText }; // Return error text as response
      }
    });

    // Wait for all promises to settle and get their results
    const panelResults = await Promise.all(fetchPromises);

    console.log('All panel queries finished. Triggering evaluation...');
    console.log('Panel results collected for evaluation:', panelResults); // Log the collected results

    // --- Trigger Evaluation After All Panels Respond ---
    // Use the results directly from the promises, which now include the response text
    const panelOutputsForEvaluation = panelResults.map(result => ({
        id: result.id,
        response: result.response, // Use the response text from the promise result
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


  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: 'auto' }}>
      <h1>RAG Comparison Frontend</h1>

      <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
        <h2>Upload PDF</h2>
        <input type="file" accept=".pdf" onChange={handleFileChange} style={{ marginBottom: '10px' }} />
        <button onClick={handleUpload} disabled={!selectedFile || overallLoading}>
          {overallLoading ? 'Processing...' : 'Upload and Process PDF'}
        </button>
         {overallLoading && !panels.some(p => p.loading) && <p>Upload in progress...</p>}
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
            {overallLoading ? 'Generating & Evaluating...' : 'Generate Responses & Evaluate'}
          </button>
        </form>
      </div>

      {/* Add Panel Button */}
      <button onClick={handleAddPanel} disabled={overallLoading} style={{ marginBottom: '20px' }}>
        Add New Panel
      </button>

      {/* Container for Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        {panels.map(panel => {
            const panelEvaluation = getPanelEvaluation(panel.id);
            const isBestPanel = evaluationResults?.best_panel_id === panel.id;
             // Apply shadow based on evaluation result
            const panelStyle = {
                border: '1px solid #ccc',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: isBestPanel ? '0 0 10px 5px rgba(144, 238, 144, 0.6)' : 'none', // Light green shadow
                transition: 'box-shadow 0.3s ease-in-out', // Smooth transition
            };

            return (
                <div key={panel.id} style={panelStyle}>
                  {/* Panel Header with Delete Button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h3>Panel {panel.id}</h3>
                       {/* Show delete button only if more than 1 panel exists */}
                      {panels.length > 1 && (
                          <button
                              onClick={() => handleDeletePanel(panel.id)}
                              disabled={overallLoading}
                              style={{ background: 'red', color: 'white', border: 'none', borderRadius: '4px', padding: '5px 10px', cursor: overallLoading ? 'not-allowed' : 'pointer' }}
                          >
                              Delete
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

                  {/* Display Panel Specific Evaluation Scores */}
                  {panelEvaluation && (
                      <div style={{ marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                          <h4>Evaluation</h4>
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
      <div style={{ marginTop: '0px', border: '1px solid #ccc', padding: '15px', borderRadius: '8px', backgroundColor: '#f0f0f0' }}>
        <h2>Comparison & Benchmark</h2>
         {overallLoading && evaluationResults === null && <p>Waiting for responses to evaluate...</p>}
        {evaluationResults && (
            <div>
                <h4>Benchmark Answer (Generated by Gemini from PDF)</h4>
                <div style={{ whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto', border: '1px dashed #999', padding: '10px', marginBottom: '15px' }}>
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
        {!overallLoading && !evaluationResults && <p>Generate responses to see comparison results here.</p>}
      </div>

    </div>
  );
}