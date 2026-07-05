import { NextResponse } from 'next/server';
import { createWalletClient, http, createPublicClient, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { Groq } from 'groq-sdk';

// Инициализация клиентов
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const CONTRACT_ADDRESS = '0xF4D17D4CC737a3B5E544bcFB7FF782946Affa8D2';
const ABI = parseAbi([
  'function recordReport(string _repoUrl, uint8 _score, string _verdict) public',
  'function hasReport(string _repoUrl) public view returns (bool)'
]);

export async function POST(req: Request) {
  try {
    const { repoUrl } = await req.json();
    
    // Проверки переменных окружения
    if (!process.env.PRIVATE_KEY) throw new Error("PRIVATE_KEY не задан в Vercel");
    if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY не задан в Vercel");

    const publicClient = createPublicClient({ chain: base, transport: http() });
    
    // Создаем аккаунт
    const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({ account, chain: base, transport: http() });

    // AI Анализ с обновленной моделью
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: `Analyze security of: ${repoUrl}. Give format exactly: "Score: [0-100], Verdict: [Short text]"` }],
      model: "llama-3.3-70b-versatile",
    });

    const aiText = chatCompletion.choices[0]?.message?.content || "";
    const score = parseInt(aiText.match(/Score: (\d+)/)?.[1] || "0");
    const verdict = aiText.match(/Verdict: (.+)/)?.[1] || "Unknown";

    // Запись в блокчейн
    const { request } = await publicClient.simulateContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'recordReport',
      args: [repoUrl, score, verdict]
    });

    const txHash = await walletClient.writeContract(request);

    return NextResponse.json({ score, verdict, txHash });

  } catch (error: any) {
    // Вывод ошибки в логи Vercel для диагностики
    console.log("=== ТУТ ОШИБКА ===");
    console.error(error); 
    
    return NextResponse.json({ 
      error: error.shortMessage || error.message || String(error) 
    }, { status: 500 });
  }
}
