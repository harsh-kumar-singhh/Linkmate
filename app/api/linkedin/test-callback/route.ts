import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const code = searchParams.get("code");
  const error = searchParams.get("error");

  console.log("=== LINKEDIN TEST CALLBACK ===");
  console.log("code:", code);
  console.log("error:", error);

  return NextResponse.json({
    success: !!code,
    code,
    error,
  });
}