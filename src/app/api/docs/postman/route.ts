import { NextResponse } from "next/server";
import { generatePostmanCollection } from "@/lib/postman";

export async function GET() {
  const collection = generatePostmanCollection();
  return NextResponse.json(collection);
}
