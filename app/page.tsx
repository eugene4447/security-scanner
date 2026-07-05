'use client';
import { useState } from 'react';

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    // СТРОГАЯ КЛИЕНТСКАЯ ВАЛИДАЦИЯ
    // Разрешаем только формат github.com/user/repo
    const repoRegex = /^https:\/\/github\.com\/[^\/]+\/[^\/]+$/;
    
    if (!repoRegex.test(repoUrl)) {
      setError("Invalid format. Please use: https://github.com/user/repo (no commits or files)");
      return;
    }

    setError(null);
    setLoading(true);
    setResult(null); 

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      
      setResult(data);
    } catch (e: any) {
      setError(e.message);
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
          placeholder="https://github.com/user/repo"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
        />
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <button 
          onClick={handleCheck}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 p-4 rounded-xl font-bold transition disabled:opacity-50"
        >
          {loading ? "Scanning with AI..." : "Check Security"}
        </button>
      </div>

      {result && (
        <div className="mt-8 p-6 bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg animate-in fade-in duration-500">
          {result.alreadyExists ? (
            <div className="text-center">
              <p className="text-yellow-400 font-bold mb-4">Already scanned!</p>
              <a href={`https://basescan.org/address/0xF4D17D4CC737a3B5E544bcFB7FF782946Affa8D2`} target="_blank" className="text-blue-400 underline">
                View all reports on BaseScan
              </a>
            </div>
          ) : (
            <div>
              <p className="text-2xl font-bold text-white mb-2">Score: {result.score} / 100</p>
              
              <div className="mt-4 space-y-3">
                <p className="font-semibold text-blue-300">Summary: {result.verdict}</p>
                <div className="bg-slate-800 p-4 rounded-lg">
                  <p className="text-sm text-slate-400 font-bold mb-1">Why this score:</p>
                  <p className="text-sm text-slate-200">{result.rationale}</p>
                </div>
              </div>

              <div className="mt-6">
                <a href={`https://basescan.org/tx/${result.txHash}`} target="_blank" className="block text-blue-400 underline hover:text-blue-300 transition font-bold">
                  View Transaction on BaseScan
                </a>
                
                <div className="mt-4 p-4 bg-slate-800 rounded-lg border border-slate-700">
                  <p className="text-sm font-bold text-blue-400 mb-2">How to verify on-chain:</p>
                  <ol className="text-xs text-slate-400 list-decimal list-inside space-y-1">
                    <li>Click <a href={`https://basescan.org/tx/${result.txHash}`} target="_blank" className="underline text-blue-300">View Transaction</a>.</li>
                    <li>Scroll down to <span className="text-white font-medium">"Input Data"</span>.</li>
                    <li>Click the dropdown menu and select <span className="text-white font-medium">"UTF-8"</span>.</li>
                    <li>Scroll right to see the full audit report.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
