import Link from "next/link";
import Papercut from "@/components/Papercut";

export default function NotFound() {
  return (
    <main className="page">
      <Papercut />
      <header className="head" style={{ marginTop: "20vh" }}>
        <div className="title">Гацуур олдсонгүй</div>
        <div className="sub">Линк буруу эсвэл устгагдсан байна.</div>
      </header>
      <div className="actions">
        <Link className="btn primary" href="/">🎄 Өөрийн гацуураа үүсгэх</Link>
      </div>
    </main>
  );
}
