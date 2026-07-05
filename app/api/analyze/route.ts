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

    // 0. ВАЛИДАЦИЯ ССЫЛКИ
    const repoRegex = /^https:\/\/github\.com\/[^\/]+\/[^\/]+(\/.*)?$/;
    if (!repoUrl || !repoRegex.test(repoUrl)) {
      return NextResponse.json(
        { error: "Invalid GitHub URL. Use format: https://github.com/user/repo" }, 
        { status: 400 }
      );
    }

    const publicClient = createPublicClient({ chain: base, transport: http() });

    // 1. ПРОВЕРКА
    const reportExists = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'hasReport',
      args: [repoUrl],
    });

    if (reportExists) {
      return NextResponse.json({ alreadyExists: true, message: "This repository has already been scanned." });
    }

    // 2. АНАЛИЗ (Вариант Б: просим Verdict + Rationale)
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ 
        role: "user", 
        content: `Analyze security of: ${repoUrl}. 
        Return ONLY in this format:
        Score: [0-100]
        Verdict: [Short summary]
        Rationale: [Detailed reason for this score]` 
      }],
      model: "llama-3.3-70b-versatile",
    });

    const aiText = chatCompletion.choices[0]?.message?.content || "";
    
    // Парсинг
    const scoreMatch = aiText.match(/Score: (\d+)/);
    const verdictMatch = aiText.match(/Verdict: (.+)/);
    const rationaleMatch = aiText.match(/Rationale: (.+)/);
    
    const score = parseInt(scoreMatch?.[1] || "0");
    const baseVerdict = (verdictMatch?.[1] || "Unknown").trim();
    const rationale = (rationaleMatch?.[1] || "No details provided").trim();
    
    // Объединяем в одну строку для блокчейна
    const fullVerdict = `${baseVerdict} | ${rationale}`.substring(0, 150);

    if (score === 0 && baseVerdict === "Unknown") {
      throw new Error("AI analysis failed.");
    }

    // 3. ЗАПИСЬ
    const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({ account, chain: base, transport: http() });

    const { request } = await publicClient.simulateContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'recordReport',
      args: [repoUrl, score, fullVerdict] // fullVerdict содержит и summary, и rationale
    });

    const txHash = await walletClient.writeContract(request);

    // Возвращаем фронтенду раздельно для красивого вывода
    return NextResponse.json({ 
      score, 
      verdict: baseVerdict, 
      rationale: rationale, 
      txHash, 
      alreadyExists: false 
    });

  } catch (error: any) {
    console.error("DEBUG_ERROR:", error); 
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
