import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { desc } from "drizzle-orm";
import { locations } from "@/lib/db/schema";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "json";

  const allLocations = await db.query.locations.findMany({
    orderBy: [desc(locations.createdAt)],
  });

  const data = allLocations.map((loc) => ({
    ...loc,
    cuisine: JSON.parse(loc.cuisine || "[]"),
  }));

  if (format === "csv") {
    const headers = ["name", "address", "latitude", "longitude", "category", "cuisine", "priceRange", "visited", "sourceUrl"];
    const rows = data.map((loc) =>
      headers.map((h) => {
        const val = loc[h as keyof typeof loc];
        if (Array.isArray(val)) return `"${val.join(", ")}"`;
        if (typeof val === "string" && val.includes(",")) return `"${val}"`;
        return String(val ?? "");
      }).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    return new NextResponse(csv, {
      headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=locations.csv" },
    });
  }

  return NextResponse.json(data, {
    headers: { "Content-Disposition": "attachment; filename=locations.json" },
  });
}
