import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface TelegramInputMessage {
  id: string;
  date: string;
  postUrl: string;
  text: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectName, channelName, messages } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Daftar pesan Telegram tidak boleh kosong." },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.SUMOPOD_AI_API_KEY || "sk-A8-Q1JtvoyQA9NeJAglU_g";
    const baseUrl =
      process.env.SUMOPOD_AI_BASE_URL || "https://ai.sumopod.com";

    // Format raw messages for the prompt
    const formattedMessages = (messages as TelegramInputMessage[])
      .map((m, idx) => {
        return `[PESAN #${idx + 1}]
ID: ${m.id}
URL: ${m.postUrl}
TANGGAL: ${m.date}
TEKS:
${m.text}
----------------------------------------`;
      })
      .join("\n\n");

    const systemPrompt = `Anda adalah asisten cerdas penganalisis update airdrop crypto untuk aplikasi Droppr.
Tugas Anda:
1. Menganalisis rentetan pesan Telegram dari channel "${channelName || "Telegram Airdrop"}" khusus yang berkaitan dengan proyek "${projectName}".
2. Memisahkan dan merapikan setiap poin informasi ke dalam DUA kategori yang jelas:
   - "task": Langkah kerja / tindakan garapan yang harus dieksekusi pengguna (misal: "Swap token di portal baru", "Stake minimum $10 di pool", "Lakukan daily check-in / klaim faucet", "Isi formulir whitelist"). Tipe ini memiliki checkbox.
   - "news": Catatan berita, pengumuman jadwal snapshot, jadwal TGE, listing DEX/CEX, info vesting, atau kabar pemeliharaan/maintenance. Tipe ini HANYA informasi dan TIDAK ada checkbox.
3. Buat judul ("title") yang singkat, bersih, padat, dan jelas (jangan gunakan emoticon berlebihan atau teks promosi affiliate yang mengganggu).
4. Kaitkan setiap item dengan "source_url" dan "source_date" dari pesan Telegram asalnya.
5. Buat "content" opsional untuk penjelasan detail / petunjuk teknis singkat.

KEMBALIKAN HANYA JSON MURNI TANPA MARKDOWN FENCE:
{
  "items": [
    {
      "type": "task" | "news",
      "title": string,
      "content": string,
      "source_url": string,
      "source_date": string
    }
  ]
}`;

    const aiResponse = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini/gemini-3.1-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Berikut daftar postingan Telegram yang perlu dirapikan dan dipisahkan menjadi Task vs Berita untuk proyek ${projectName}:\n\n${formattedMessages}`,
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("SumoPod AI Parse Telegram Error:", errText);
      return NextResponse.json(
        { error: "Gagal memproses dengan SumoPod AI: " + errText },
        { status: 500 }
      );
    }

    const aiData = await aiResponse.json();
    const messageContent = aiData.choices?.[0]?.message?.content?.trim() || "{}";

    // Clean markdown fence
    const cleanJson = messageContent
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsedResult = JSON.parse(cleanJson);
    const items = Array.isArray(parsedResult.items) ? parsedResult.items : [];

    return NextResponse.json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error: any) {
    console.error("AI Parse Telegram route error:", error);
    return NextResponse.json(
      { error: error?.message || "Terjadi kesalahan saat memproses dengan AI." },
      { status: 500 }
    );
  }
}
