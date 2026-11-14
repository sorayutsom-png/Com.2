
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Home,
  PlusCircle,
  Search,
  UserRound,
  MessageCircle,
  Package,
  SearchCheck,
  CheckCircle,
  RefreshCw,
} from "lucide-react";

import { supabase } from "../lib/supabase";

export default function HomePage() {
  const [stats, setStats] = useState({
    lost: 0,
    found: 0,
    returned: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadStats() {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("items")
        .select("id, type, status");

      if (!mounted) return;

      if (error) {
        console.error("โหลดสถิติไม่สำเร็จ:", error);
        setError("ไม่สามารถโหลดสถิติได้");
        setLoading(false);
        return;
      }

      const items = data || [];

      setStats({
        lost: items.filter((item) => item.type === "lost").length,
        found: items.filter((item) => item.type === "found").length,
        returned: items.filter(
          (item) => item.status === "returned"
        ).length,
      });

      setLoading(false);
    }

    loadStats();

    // โหลดสถิติใหม่เมื่อกลับมาเปิดหน้าเว็บไซต์
    window.addEventListener("focus", loadStats);

    return () => {
      mounted = false;
      window.removeEventListener("focus", loadStats);
    };
  }, []);

  const statCards = [
    {
      title: "ของหาย",
      count: stats.lost,
      icon: Package,
      color: "#3B82F6",
      background: "#DBEAFE",
    },
    {
      title: "พบของ",
      count: stats.found,
      icon: SearchCheck,
      color: "#059669",
      background: "#D1FAE5",
    },
    {
      title: "คืนเจ้าของแล้ว",
      count: stats.returned,
      icon: CheckCircle,
      color: "#9333EA",
      background: "#F3E8FF",
    },
  ];

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

      <section
        style={{
          marginTop: "35px",
          padding: "20px",
          borderRadius: "18px",
          background: "rgba(255,255,255,0.85)",
          boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>สถิติสิ่งของ</h2>
            <p style={{ margin: "5px 0 0", color: "#666" }}>
              สรุปข้อมูลประกาศภายในโรงเรียน
            </p>
          </div>

          <RefreshCw
            size={20}
            color="#7C3AED"
            onClick={() => window.location.reload()}
            style={{ cursor: "pointer" }}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "15px",
          }}
        >
          {statCards.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.title}
                style={{
                  background: stat.background,
                  borderRadius: "15px",
                  padding: "20px 12px",
                  textAlign: "center",
                }}
              >
                <Icon
                  size={32}
                  color={stat.color}
                  style={{ marginBottom: "8px" }}
                />

                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: "bold",
                    color: stat.color,
                  }}
                >
                  {loading ? "..." : stat.count}
                </div>

                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: "600",
                    color: "#333",
                  }}
                >
                  {stat.title}
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <p style={{ color: "#DC2626", textAlign: "center" }}>
            {error}
          </p>
        )}

        {!loading && !error && (
          <p
            style={{
              textAlign: "center",
              color: "#777",
              fontSize: "12px",
              marginTop: "15px",
            }}
          >
            ข้อมูลจากฐานข้อมูล Supabase
          </p>
        )}
      </section>

      <footer className="site-footer">
        School Lost &amp; Found
      </footer>
    </main>
  );
}
