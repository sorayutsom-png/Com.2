
import { Link } from "react-router-dom";
import {
  Home,
  PlusCircle,
  Search,
  UserRound,
  MessageCircle,
} from "lucide-react";

export default function HomePage() {
  return (
    <main className="app">
      <header className="site-header">
        <h1>
          <Home size={28} /> School Lost &amp; Found
        </h1>

        <p>ระบบแจ้งของหายและของที่พบภายในโรงเรียน</p>
      </header>

      <section className="items-section">
        <h2>ยินดีต้อนรับ</h2>
        <p>เลือกเมนูที่ต้องการใช้งาน</p>

        <div className="category-grid">
          <Link to="/report" className="category-button">
            <PlusCircle size={25} />
            <span>ลงประกาศ</span>
          </Link>

          <Link to="/items" className="category-button">
            <Search size={25} />
            <span>ค้นหาสิ่งของ</span>
          </Link>

          <Link to="/manage" className="category-button">
            <UserRound size={25} />
            <span>จัดการประกาศ</span>
          </Link>

          <Link to="/messages" className="category-button">
            <MessageCircle size={25} />
            <span>กล่องข้อความ</span>
          </Link>
        </div>
      </section>

      <footer className="site-footer">
        School Lost &amp; Found
      </footer>
    </main>
  );
}
