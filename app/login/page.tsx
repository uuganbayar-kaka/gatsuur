import Link from "next/link";
import LoginForm from "@/components/LoginForm";
import Papercut from "@/components/Papercut";
import Snow from "@/components/Snow";

export const metadata = { title: "Нэвтрэх · Шинэ жилийн гацуур" };

export default function LoginPage() {
  return (
    <main className="page">
      <Papercut />
      <Snow />
      <div className="bar">
        <Link className="chip" href="/">← Буцах</Link>
      </div>
      <header className="head">
        <div className="title">Миний гацуур</div>
        <div className="sub">Утасны дугаар, нууц үгээрээ нэвтэрнэ үү.</div>
      </header>
      <LoginForm />
      <div className="actions">
        <Link className="link" href="/">Гацуургүй юу? Шинээр үүсгэх →</Link>
      </div>
    </main>
  );
}
