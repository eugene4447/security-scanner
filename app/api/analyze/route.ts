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
  try {
    const { repoUrl } = await req.json();
    const publicClient = createPublicClient({ chain: base, transport: http() });

    // 1. ПРОВЕРКА: существует ли уже отчет?
    const reportExists = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'hasReport',
      args: [repoUrl],
    });

    if (reportExists) {
      return NextResponse.json({ 
        alreadyExists: true,
        message: "Этот репозиторий уже был проверен ранее."
      });
    }

    // 2. АНАЛИЗ (если отчета нет)
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: `Analyze security of: ${repoUrl}. Give format exactly: "Score: [0-100], Verdict: [Short text]"` }],
      model: "llama-3.3-70b-versatile",
    });

    const aiText = chatCompletion.choices[0]?.message?.content || "";
    const score = parseInt(aiText.match(/Score: (\d+)/)?.[1] || "0");
    const verdict = aiText.match(/Verdict: (.+)/)?.[1] || "Unknown";

    // 3. ЗАПИСЬ
    const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({ account, chain: base, transport: http() });

    const { request } = await publicClient.simulateContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'recordReport',
      args: [repoUrl, score, verdict]
    });

    const txHash = await walletClient.writeContract(request);

    return NextResponse.json({ score, verdict, txHash, alreadyExists: false });

  } catch (error: any) {
    console.error("DEBUG_ERROR:", error); 
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
