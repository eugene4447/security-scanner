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

const rpcUrl = process.env.BASE_RPC_URL;
const publicClient = createPublicClient({ 
  chain: base, 
  transport: http(rpcUrl) 
});

export async function POST(req: Request) {
  try {
    const { repoUrl } = await req.json();

    const repoRegex = /^https:\/\/github\.com\/[^\/]+\/[^\/]+$/;
    if (!repoUrl || !repoRegex.test(repoUrl)) {
      return NextResponse.json(
        { error: "Invalid format. Use https://github.com/user/repo" }, 
        { status: 400 }
      );
    }

    const reportExists = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'hasReport',
      args: [repoUrl],
    });

    if (reportExists) {
      return NextResponse.json({ alreadyExists: true, message: "This repository has already been scanned." });
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ 
        role: "user", 
        content: `Analyze the security of the GitHub repository: ${repoUrl}. 
        Return ONLY in this format:
        Score: [0-100]
        Verdict: [Short summary]
        Rationale: [Detailed security analysis in under 800 characters]` 
      }],
      model: "llama-3.3-70b-versatile",
    });

    const aiText = chatCompletion.choices[0]?.message?.content || "";
    const scoreMatch = aiText.match(/Score: (\d+)/);
    const verdictMatch = aiText.match(/Verdict: (.+)/);
    const rationaleMatch = aiText.match(/Rationale: (.+)/);
    
    const score = parseInt(scoreMatch?.[1] || "0");
    const baseVerdict = (verdictMatch?.[1] || "Unknown").trim();
    const rationale = (rationaleMatch?.[1] || "No details provided").trim();
    
    // Формируем отчет с лимитом 1000 символов и умной обрезкой
    let fullVerdict = `${baseVerdict} | ${rationale}`;
    if (fullVerdict.length > 1000) {
      fullVerdict = fullVerdict.substring(0, 1000);
      fullVerdict = fullVerdict.substring(0, Math.min(fullVerdict.length, fullVerdict.lastIndexOf(" "))) + "...";
    }

    if (score === 0 && baseVerdict === "Unknown") {
      throw new Error("AI analysis failed.");
    }

    const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({ 
      account, 
      chain: base, 
      transport: http(rpcUrl) 
    });

    const { request } = await publicClient.simulateContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'recordReport',
      args: [repoUrl, score, fullVerdict] 
    });

    const txHash = await walletClient.writeContract(request);

    return NextResponse.json({ score, verdict: baseVerdict, rationale, txHash, alreadyExists: false });

  } catch (error: any) {
    console.error("DEBUG_ERROR:", error);
    const isRateLimit = error.details?.includes("rate limit") || error.message?.includes("rate limit");
    return NextResponse.json(
      { error: isRateLimit ? "RPC limit exceeded. Please try again in 5 seconds." : error.message }, 
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
