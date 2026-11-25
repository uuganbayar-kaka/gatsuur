import Link from "next/link";
import MoneyCreateForm from "@/components/MoneyCreateForm";
import Papercut from "@/components/Papercut";
import Snow from "@/components/Snow";

export const metadata = { title: "Мөнгөтэй гацуур · Шинэ жилийн гацуур" };

export default function MoneyPage() {
  return (
    <main className="page">
      <Papercut />
      <Snow />
      <div className="bar">
        <Link className="chip" href="/">← Буцах</Link>
      </div>
      <header className="head">
        <div className="title">Мөнгөтэй гацуур</div>
        <div className="sub">Найзууд чинь мөнгөн чимэглэл өлгөж, мөнгө нь таны данс руу орно.</div>
      </header>
      <MoneyCreateForm />
    </main>
  );
}
