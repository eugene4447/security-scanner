'use client';
import { useState } from 'react';

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleCheck = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ repoUrl }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      alert("Error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 flex flex-col items-center">
      <h1 className="text-4xl font-bold mb-8 text-blue-400">Security Scanner</h1>
      
      <div className="w-full max-w-lg bg-slate-900 p-6 rounded-2xl border border-slate-700 shadow-xl">
        <input 
          className="w-full bg-slate-800 p-4 rounded-xl mb-4 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="GitHub URL"
          onChange={(e) => setRepoUrl(e.target.value)}
        />
        <button 
          onClick={handleCheck}
          className="w-full bg-blue-600 hover:bg-blue-500 p-4 rounded-xl font-bold transition"
        >
          {loading ? "Scanning..." : "Check Security"}
        </button>
      </div>

      {result && (
        <div className="mt-8 p-6 bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg">
          {result.alreadyExists ? (
            <div className="text-center">
              <p className="text-yellow-400 font-bold mb-4">Already scanned!</p>
              <a 
                href={`https://basescan.org/address/0xF4D17D4CC737a3B5E544bcFB7FF782946Affa8D2`} 
                target="_blank"
                className="text-blue-400 underline"
              >
                View all reports on BaseScan
              </a>
            </div>
          ) : (
            <div>
              <p>Score: {result.score}</p>
              <p className="mt-2 text-sm text-slate-300">{result.verdict}</p>
              <a 
                href={`https://basescan.org/tx/${result.txHash}`} 
                target="_blank"
                className="mt-4 block text-blue-400 underline"
              >
                View Transaction
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
