import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rawText } = await request.json();

    if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
      return NextResponse.json(
        { error: "Teks airdrop tidak boleh kosong." },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.SUMOPOD_AI_API_KEY || "sk-A8-Q1JtvoyQA9NeJAglU_g";
    const baseUrl =
      process.env.SUMOPOD_AI_BASE_URL || "https://ai.sumopod.com";

    const systemPrompt = `Anda adalah asisten cerdas ekstraktor informasi airdrop crypto untuk aplikasi Droppr.
Tugas Anda: mengekstrak informasi terstruktur dari pesan chat / postingan telegram / twitter tentang airdrop atau testnet crypto.

Harap kembalikan HANYA JSON murni tanpa markdown fence (jangan pakai \`\`\`json ... \`\`\`), dengan skema berikut:
{
  "name": string (Nama project, contoh: "Aura Network" atau "Testnet Aura"),
  "chain": string (Nama jaringan/chain blockchain, contoh: "Aura Testnet", "Ethereum", "Arbitrum", "Solana", atau ""),
  "status": "not_started" | "in_progress" | "waiting" | "ready_to_claim" | "completed",
  "social_links": {
    "website": string (URL web/launchpad resmi testnet jika ada),
    "twitter": string (URL atau handle X/Twitter jika ada),
    "telegram": string (URL atau handle Telegram jika ada),
    "discord": string (URL invite Discord jika ada)
  },
  "guide_content": string (Ringkasan panduan kerja atau catatan penting tentang biaya, modal, batas waktu, atau deskripsi),
  "tasks": [
    {
      "title": string (Deskripsi aksi task singkat dan padat, contoh: "Hubungkan wallet", "Mint faucet", "Lakukan staking di menu Stake & Yield"),
      "type": "one_time" | "daily" | "weekly" | "custom"
    }
  ],
  "accounts": [
    {
      "label": string (Nama sosmed yang diminta dihubungkan, misal "X/Twitter" atau "Discord"),
      "username_email": string (Placeholder atau username jika tertera, default "")
    }
  ]
}

Aturan penting:
1. Pisahkan setiap langkah (step-by-step / bullet point) di teks menjadi item dalam array "tasks". Jika itu instruksi faucet/check-in harian, buat type "daily", selain itu default "one_time".
2. Jangan pernah menyertakan private key atau seed phrase.
3. Selalu format URL dengan benar (misal https://...).
4. Jawab HANYA objek JSON yang valid.`;

    const aiResponse = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Berikut teks informasi airdrop yang perlu diekstrak:\n\n${rawText}` },
        ],
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("SumoPod AI API Error:", errText);
      return NextResponse.json(
        { error: "Gagal memproses dengan SumoPod AI: " + errText },
        { status: 500 }
      );
    }

    const aiData = await aiResponse.json();
    const messageContent = aiData.choices?.[0]?.message?.content?.trim() || "{}";

    // Clean any markdown formatting if present
    const cleanJson = messageContent
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsedResult = JSON.parse(cleanJson);

    return NextResponse.json({ success: true, data: parsedResult });
  } catch (error: any) {
    console.error("AI Parse route error:", error);
    return NextResponse.json(
      { error: error?.message || "Terjadi kesalahan saat mengekstrak pesan." },
      { status: 500 }
    );
  }
}
