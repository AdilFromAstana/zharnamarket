import { NextRequest } from "next/server";
import { handleCategoryList, handleCategoryCreate } from "@/lib/admin-categories";

export async function GET(req: NextRequest) {
  return handleCategoryList(req, "adSubject");
}

export async function POST(req: NextRequest) {
  return handleCategoryCreate(req, "adSubject");
}
