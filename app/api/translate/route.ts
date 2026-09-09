import { NextResponse } from "next/server";

/**
 * Translate single segment using MyMemory API
 */
async function translateSegment(
  text: string,
  targetLang: string = "id",
  sourceLang?: string
): Promise<string> {
  if (!text.trim()) return text;

  try {
    const pair = sourceLang ? `${sourceLang}|${targetLang}` : `autodetect|${targetLang}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      text
    )}&langpair=${pair}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      return text;
    }

    const data = await res.json();
    if (data?.responseData?.translatedText) {
      return data.responseData.translatedText;
    }
    return text;
  } catch (err) {
    console.error("Segment translate error:", err);
    return text;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = body?.text?.trim();
    const targetLang = body?.targetLang || "id";
    const sourceLang = body?.sourceLang;

    if (!text) {
      return NextResponse.json(
        { error: "Teks untuk diterjemahkan tidak boleh kosong." },
        { status: 400 }
      );
    }

    // Split text by lines so formatting and line breaks are preserved exactly
    const lines = text.split("\n");
    const translatedLines: string[] = [];

    // Translate in parallel batches of 5 lines to be fast and respectful of rate limits
    const batchSize = 5;
    for (let i = 0; i < lines.length; i += batchSize) {
      const batch = lines.slice(i, i + batchSize);
      const translatedBatch = await Promise.all(
        batch.map(async (line: string) => {
          // Keep blank lines or pure URLs without translation
          if (!line.trim() || /^https?:\/\/[^\s]+$/.test(line.trim())) {
            return line;
          }
          return await translateSegment(line, targetLang, sourceLang);
        })
      );
      translatedLines.push(...translatedBatch);
    }

    const fullTranslatedText = translatedLines.join("\n");

    return NextResponse.json({
      success: true,
      data: {
        translatedText: fullTranslatedText,
      },
    });
  } catch (error: any) {
    console.error("Translate error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal menerjemahkan teks." },
      { status: 500 }
    );
  }
}
