import Link from "next/link";
import CreateForm from "@/components/CreateForm";
import Papercut from "@/components/Papercut";
import Snow from "@/components/Snow";
import { MONEY_PAYOUT_DATE } from "@/lib/config";
import { getSessionTreeId } from "@/lib/session";

export default async function Home() {
  const myId = await getSessionTreeId();
  return (
    <main className="page">
      <Papercut />
      <Snow />
      <div className="bar">
        <span className="chip">🎄 Гацуур</span>
        {myId ? (
          <Link className="chip" href={`/t/${myId}`}>Миний гацуур</Link>
        ) : (
          <Link className="chip" href="/login">Нэвтрэх</Link>
        )}
      </div>
      <header className="head">
        <div className="title">Шинэ жилийн гацуур</div>
        <div className="sub">Гацуураа үүсгээд линкээ хуваалц. Найзууд чинь бэлэг чимэглэл өлгөнө.</div>
      </header>
      {myId && (
        <div className="actions">
          <Link className="btn gold" href={`/t/${myId}`}>🎁 Миний гацуур руу орох</Link>
        </div>
      )}
      <CreateForm />
      <div className="actions">
        <Link className="btn money" href="/money">
          💰 Мөнгөтэй гацуур үүсгэх · 15,000₮
        </Link>
        <p className="hint-pill">Найзууд чинь мөнгөн чимэглэл өлгөж, мөнгө нь {MONEY_PAYOUT_DATE}-нд таны данс руу орно</p>
        <Link className="link" href="/login">Гацуур аль хэдийн байгаа юу? Нэвтрэх →</Link>
      </div>
      <footer className="footer">© {new Date().getFullYear()} KubConn</footer>
    </main>
  );
}
