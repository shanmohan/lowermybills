import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { analyzeBill, CATEGORIES, type Category } from "@/lib/anthropic";

export const runtime = "nodejs";
// 60s is the max on Vercel's Hobby (free) plan; raise on Pro if needed.
export const maxDuration = 60;

const ACCEPTED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "You must be signed in to analyse a bill." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
  }

  const rawCategory = form.get("category");
  const category: Category = CATEGORIES.includes(rawCategory as Category)
    ? (rawCategory as Category)
    : "electricity";

  if (!ACCEPTED.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload a PDF, PNG, JPG or WEBP of your bill." },
      { status: 415 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File is too large. Please keep it under 10 MB." },
      { status: 413 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await analyzeBill(
      {
        base64: buffer.toString("base64"),
        mediaType: file.type,
      },
      category,
    );
    return NextResponse.json({ result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Something went wrong analysing your bill.";
    // Surface a friendly message; log the detail server-side.
    console.error("[analyze] failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
