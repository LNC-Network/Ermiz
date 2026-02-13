import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureUser, requireCredits } from "@/lib/credit";

const tabEnum = z.enum([
  "api",
  "process",
  "infrastructure",
  "schema",
  "requestTab",
  "other",
]);

const createSchema = z.object({
  tab: tabEnum,
  title: z.string().min(1),
  content: z.unknown(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  documentSetId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await ensureUser(user.id, user.email ?? undefined);

  const { searchParams } = new URL(req.url);
  const tabParam = searchParams.get("tab");
  const parsedTab = tabParam ? tabEnum.safeParse(tabParam) : null;
  if (tabParam && !parsedTab?.success) {
    return NextResponse.json({ error: "invalid tab" }, { status: 400 });
  }

  const documents = await prisma.document.findMany({
    where: {
      userId: user.id,
      tab: parsedTab?.success ? parsedTab.data : undefined,
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ documents });
}

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await ensureUser(user.id, user.email ?? undefined);

  const json = await req.json();
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Consume 1 credit per document save (adjust as needed).
  try {
    await requireCredits(user.id, 1);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 402 });
  }

  const doc = await prisma.document.create({
    data: {
      userId: user.id,
      tab: parsed.data.tab,
      title: parsed.data.title,
      content: parsed.data.content,
      metadata: parsed.data.metadata,
      version: 1,
      documentSet: parsed.data.documentSetId
        ? { connect: { id: parsed.data.documentSetId } }
        : undefined,
    },
  });

  return NextResponse.json({ document: doc });
}
