import { NextResponse } from "next/server";
import { handle } from "@/lib/http";
import { addSessionTree, clearPendingCreate, getPendingCreate } from "@/lib/session";
import { AppError, getInvoice, getTree, syncInvoice, treePhone } from "@/lib/trees";

// Төлбөр орсны дараа үүсгэгчийн хөтчийг шинэ мөнгөтэй гацуурт нэвтрүүлнэ (gc cookie-тэй хөтөч л).
export async function POST(req: Request) {
  return handle(req, async () => {
    const invId = await getPendingCreate();
    const inv = invId ? await getInvoice(invId) : null;
    if (!inv || inv.kind !== "create") throw new AppError(404, "Нэхэмжлэх олдсонгүй.");
    const synced = await syncInvoice(inv);
    if (synced.status !== "paid") throw new AppError(402, "Төлбөр хараахан орж ирээгүй байна.");
    if (!(await getTree(synced.treeId))) throw new AppError(409, "Гацуур үүсгэхэд алдаа гарлаа. Админтай холбогдоно уу.");
    await addSessionTree(synced.treeId, treePhone); // энгийн гацуураараа нэвтэрсэн байсан бол хоёулаа сешнд үлдэнэ
    await clearPendingCreate();
    return NextResponse.json({ id: synced.treeId });
  });
}
