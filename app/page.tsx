'use client';
import { useState } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const analyze = async () => {
    setLoading(true);
    const res = await fetch('/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ repoUrl: url }),
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  return (
    <main style={{ padding: '50px', fontFamily: 'sans-serif' }}>
      <h1>Security Scanner</h1>
      <input 
        value={url} 
        onChange={(e) => setUrl(e.target.value)} 
        placeholder="Ссылка на GitHub репозиторий"
        style={{ width: '300px', padding: '10px' }}
      />
      <button onClick={analyze} disabled={loading} style={{ padding: '10px' }}>
        {loading ? 'Анализ...' : 'Проверить'}
      </button>

      {result && (
        <div style={{ marginTop: '20px' }}>
          <p>Оценка: {result.score}</p>
          <p>Вердикт: {result.verdict}</p>
          {result.txHash && (
            <a href={`https://basescan.org/tx/${result.txHash}`} target="_blank">
              Посмотреть транзакцию в BaseScan
            </a>
          )}
        </div>
      )}
    </main>
  );
}
