import { NextRequest } from "next/server";
import { handleCategoryGetById, handleCategoryUpdate, handleCategoryDelete } from "@/lib/admin-categories";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleCategoryGetById(req, id, "adSubject");
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleCategoryUpdate(req, id, "adSubject");
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleCategoryDelete(req, id, "adSubject");
}
