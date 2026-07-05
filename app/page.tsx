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
        setError(data.message || data.error || "Произошла ошибка");
      }
    } catch (err) {
      setError("Ошибка соединения с сервером");
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
        placeholder="Ссылка на GitHub репозиторий"
        style={{ padding: '10px', width: '300px' }}
      />
      <button onClick={handleCheck} disabled={loading} style={{ padding: '10px', marginLeft: '10px' }}>
        {loading ? "Анализ..." : "Проверить"}
      </button>

      {error && <p style={{ color: 'red', marginTop: '20px' }}>{error}</p>}

      {result && (
        <div style={{ marginTop: '20px' }}>
          {result.alreadyExists ? (
            <p>✅ {result.message}</p>
          ) : (
            <>
              <p><strong>Оценка:</strong> {result.score}</p>
              <p><strong>Вердикт:</strong> {result.verdict}</p>
              <a 
                href={`https://basescan.org/tx/${result.txHash}`} 
                target="_blank" 
                rel="noreferrer"
              >
                Посмотреть транзакцию в BaseScan
              </a>
            </>
          )}
        </div>
      )}
    </main>
  );
}
