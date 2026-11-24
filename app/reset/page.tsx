import Link from "next/link";
import Papercut from "@/components/Papercut";
import ResetForm from "@/components/ResetForm";
import Snow from "@/components/Snow";

export const metadata = { title: "PIN сэргээх · Шинэ жилийн гацуур" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ phone?: string }> }) {
  const { phone = "" } = await searchParams;
  return (
    <main className="page">
      <Papercut />
      <Snow />
      <div className="bar">
        <Link className="chip" href="/login">← Буцах</Link>
      </div>
      <header className="head">
        <div className="title">PIN сэргээх</div>
        <div className="sub">Утсаараа SMS илгээж баталгаажуулаад шинэ PIN тохируулна.</div>
      </header>
      <ResetForm initialPhone={phone.replace(/\D/g, "").slice(0, 11)} />
    </main>
  );
}
