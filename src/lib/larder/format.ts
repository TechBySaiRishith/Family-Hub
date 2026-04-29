import { LARDER_CATEGORY_LABELS, LARDER_CATEGORY_ORDER } from "./constants";

export interface LarderItemForFormatting {
  name: string;
  quantity: string | null;
  itemNotes: string | null;
  category: string;
}

// Twilio's WhatsApp body limit is 1600 chars per send; wa.me URLs survive
// further but the recipient still has to scroll. Cap the message body at a
// safe ceiling and append a "+ N more" footer if we had to truncate.
const MAX_BODY_CHARS = 1500;

/**
 * Render the unbought items as a WhatsApp-friendly plain-text message,
 * grouped by category. Built once on the server so the web-link and the
 * Twilio direct-send produce identical messages.
 */
export function formatLarderForWhatsApp(items: LarderItemForFormatting[]): string {
  if (items.length === 0) return "🛒 The Larder — nothing needed right now.";

  const grouped = new Map<string, LarderItemForFormatting[]>();
  for (const cat of LARDER_CATEGORY_ORDER) grouped.set(cat, []);
  for (const item of items) {
    if (!grouped.has(item.category)) grouped.set(item.category, []);
    grouped.get(item.category)!.push(item);
  }

  const header = `🛒 The Larder — ${items.length} ${items.length === 1 ? "thing" : "things"} needed`;
  const lines: string[] = [header, ""];
  let included = 0;
  let truncated = false;

  outer: for (const cat of LARDER_CATEGORY_ORDER) {
    const list = grouped.get(cat);
    if (!list || list.length === 0) continue;
    const headerLine = `*${LARDER_CATEGORY_LABELS[cat] ?? cat}*`;
    const draft = [...lines, headerLine];

    // If even the section header would push us over budget, stop.
    if (draft.join("\n").length > MAX_BODY_CHARS) {
      truncated = true;
      break;
    }
    lines.push(headerLine);

    for (const item of list) {
      let line = `• ${item.name}`;
      if (item.quantity) line += ` — ${item.quantity}`;
      if (item.itemNotes) line += ` _(${item.itemNotes})_`;

      // Reserve ~40 chars at the tail for the "+ N more" footer.
      if (lines.join("\n").length + line.length + 1 > MAX_BODY_CHARS - 40) {
        truncated = true;
        break outer;
      }
      lines.push(line);
      included++;
    }
    lines.push("");
  }

  while (lines[lines.length - 1] === "") lines.pop();

  if (truncated) {
    const remaining = items.length - included;
    if (remaining > 0) {
      lines.push("", `… and ${remaining} more in the hub.`);
    }
  }

  return lines.join("\n");
}
