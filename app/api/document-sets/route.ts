import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/credit";

const createSchema = z.object({
  tab: z.enum([
    "api",
    "process",
    "infrastructure",
    "schema",
    "requestTab",
    "other",
  ]),
  name: z.string().min(1),
});

export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await ensureUser(user.id, user.email ?? undefined);

  const { searchParams } = new URL(req.url);
  const tab = searchParams.get("tab");
  if (tab && !createSchema.shape.tab.options.includes(tab as any)) {
    return NextResponse.json({ error: "invalid tab" }, { status: 400 });
  }

  const sets = await prisma.documentSet.findMany({
    where: { userId: user.id, tab: tab ? (tab as any) : undefined },
    include: { documents: true },
  });

  return NextResponse.json({ documentSets: sets });
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

  const set = await prisma.documentSet.create({
    data: { userId: user.id, tab: parsed.data.tab, name: parsed.data.name },
  });

  return NextResponse.json({ documentSet: set });
}
