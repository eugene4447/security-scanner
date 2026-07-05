import { NextResponse } from 'next/server';
import { createWalletClient, http, createPublicClient, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { Groq } from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const CONTRACT_ADDRESS = '0xF4D17D4CC737a3B5E544bcFB7FF782946Affa8D2';
const ABI = parseAbi([
  'function recordReport(string _repoUrl, uint8 _score, string _verdict) public',
  'function hasReport(string _repoUrl) public view returns (bool)'
]);

export async function POST(req: Request) {
  const { repoUrl } = await req.json();

  // 1. Инициализация клиента для чтения/записи
  const publicClient = createPublicClient({ chain: base, transport: http() });
  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
  const walletClient = createWalletClient({ account, chain: base, transport: http() });

  // 2. Проверка, есть ли уже отчет
  const exists = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi: ABI, functionName: 'hasReport', args: [repoUrl]
  });

  if (exists) return NextResponse.json({ error: "Already exists" }, { status: 400 });

  // 3. Запрос к AI (Groq)
  const chatCompletion = await groq.chat.completions.create({
    messages: [{ role: "user", content: `Analyze the security of this GitHub repo: ${repoUrl}. Give a score 0-100 and a short verdict in Russian. Format: "Score: 83, Verdict: ..." ` }],
    model: "llama3-70b-8192",
  });

  const aiText = chatCompletion.choices[0]?.message?.content || "";
  // Парсинг ответа (простой пример)
  const score = parseInt(aiText.match(/Score: (\d+)/)?.[1] || "0");
  const verdict = aiText.split("Verdict:")[1]?.trim() || "No verdict";

  // 4. Запись в блокчейн
  const { request } = await publicClient.simulateContract({
    address: CONTRACT_ADDRESS, abi: ABI, functionName: 'recordReport', args: [repoUrl, score as any, verdict]
  });
  
  const txHash = await walletClient.writeContract(request);

  return NextResponse.json({ score, verdict, txHash });
}
