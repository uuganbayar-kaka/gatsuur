import Link from "next/link";
import MoneyCreateForm from "@/components/MoneyCreateForm";
import Papercut from "@/components/Papercut";
import Snow from "@/components/Snow";
import { MONEY_PAYOUT_DATE } from "@/lib/config";
import { getSessionTreeIds } from "@/lib/session";
import { getTree } from "@/lib/trees";

export const metadata = { title: "Мөнгөтэй гацуур · Шинэ жилийн гацуур" };

export const dynamic = "force-dynamic";

export default async function MoneyPage() {
  // Энгийн гацуураараа нэвтэрсэн бол утсыг нь бөглөнө; мөнгөтэй гацуур аль хэдийн байвал түүн рүү чиглүүлнэ
  const mine = (await Promise.all((await getSessionTreeIds()).map((id) => getTree(id)))).filter((t) => !!t);
  const moneyTree = mine.find((t) => t.kind === "money");
  const phone = mine[0]?.phone ?? "";
  return (
    <main className="page">
      <Papercut />
      <Snow />
      <div className="bar">
        <Link className="chip" href="/">← Буцах</Link>
      </div>
      <header className="head">
        <div className="title">Мөнгөтэй гацуур</div>
        <div className="sub">Найзууд чинь мөнгөн чимэглэл өлгөж, мөнгө нь {MONEY_PAYOUT_DATE}-нд таны данс руу орно.</div>
      </header>
      {moneyTree ? (
        <div className="actions">
          <p className="hint-pill">Танд мөнгөтэй гацуур аль хэдийн байна (1 утсанд 1 мөнгөтэй гацуур).</p>
          <Link className="btn money" href={`/t/${moneyTree.id}`}>💰 {moneyTree.name} руу орох</Link>
        </div>
      ) : (
        <MoneyCreateForm defaultPhone={phone} />
      )}
    </main>
  );
}
