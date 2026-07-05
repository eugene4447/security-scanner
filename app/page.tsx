'use client';
import { useState } from 'react';

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleCheck = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ repoUrl }),
      });
      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.message || data.error || "An error occurred");
      }
    } catch (err) {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: '50px', fontFamily: 'sans-serif' }}>
      <h1>Security Scanner</h1>
      
      <input 
        value={repoUrl} 
        onChange={(e) => setRepoUrl(e.target.value)}
        placeholder="Enter GitHub repository URL"
        style={{ padding: '10px', width: '300px' }}
      />
      <button onClick={handleCheck} disabled={loading} style={{ padding: '10px', marginLeft: '10px' }}>
        {loading ? "Analyzing..." : "Check"}
      </button>

      {error && <p style={{ color: 'red', marginTop: '20px' }}>{error}</p>}

      {result && (
        <div style={{ marginTop: '20px' }}>
          {result.alreadyExists ? (
            <p>✅ This repository has already been scanned.</p>
          ) : (
            <>
              <p><strong>Score:</strong> {result.score}</p>
              <p><strong>Verdict:</strong> {result.verdict}</p>
              <a 
                href={`https://basescan.org/tx/${result.txHash}`} 
                target="_blank" 
                rel="noreferrer"
              >
                View transaction on BaseScan
              </a>
            </>
          )}
        </div>
      )}
    </main>
  );
}
