
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
  ArrowRight,
  Sparkles,
  BookOpen,
} from "lucide-react";

import { supabase } from "../lib/supabase";

// ภาพประกอบ SVG สำหรับหน้าแรก
function HeroIllustration() {
  return (
    <svg viewBox="0 0 520 330" width="100%" role="img"
      aria-label="ภาพประกอบกระเป๋านักเรียน หนังสือ และอุปกรณ์ค้นหาของ">
      <defs>
        <linearGradient id="bag" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id="book" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FBCFE8" />
          <stop offset="100%" stopColor="#C084FC" />
        </linearGradient>
      </defs>

      <ellipse cx="265" cy="285" rx="205" ry="24" fill="#DDD6FE" opacity=".7" />

      {/* ของตกแต่ง */}
      <circle cx="100" cy="80" r="32" fill="#E9D5FF" />
      <circle cx="410" cy="75" r="20" fill="#F5D0FE" />
      <path d="M70 170 l10 -20 10 20 20 10 -20 10 -10 20 -10 -20 -20 -10z"
        fill="#F9A8D4" />
      <path d="M410 175 l7 -14 7 14 14 7 -14 7 -7 14 -7 -14 -14 -7z"
        fill="#A78BFA" />

      {/* หนังสือ */}
      <g transform="translate(70 190) rotate(-9)">
        <rect x="0" y="0" width="115" height="65" rx="9" fill="#A78BFA" />
        <rect x="7" y="-8" width="105" height="65" rx="8" fill="url(#book)" />
        <path d="M58 -5 V52" stroke="#FFFFFF" strokeWidth="3" />
        <path d="M20 12 H45 M20 23 H45" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
      </g>

      {/* กระเป๋านักเรียน */}
      <g transform="translate(185 68)">
        <path d="M48 36 C48 -3 150 -3 150 36"
          fill="none" stroke="#6D28D9" strokeWidth="12" strokeLinecap="round" />
        <rect x="18" y="40" width="165" height="175" rx="42" fill="url(#bag)" />
        <rect x="42" y="111" width="117" height="83" rx="22" fill="#6D28D9" opacity=".65" />
        <rect x="52" y="120" width="97" height="65" rx="16" fill="#DDD6FE" />
        <rect x="82" y="139" width="38" height="25" rx="7" fill="#A78BFA" />
        <path d="M18 85 Q0 110 18 150" fill="none" stroke="#6D28D9" strokeWidth="9" />
        <path d="M183 85 Q201 110 183 150" fill="none" stroke="#6D28D9" strokeWidth="9" />
        <circle cx="100" cy="79" r="8" fill="#FDE68A" />
        <path d="M90 205 V215 M110 205 V215" stroke="#6D28D9" strokeWidth="7" strokeLinecap="round" />
      </g>

      {/* แว่นขยาย */}
      <g transform="translate(355 175) rotate(-18)">
        <circle cx="45" cy="45" r="38" fill="#FFFFFF" stroke="#8B5CF6" strokeWidth="12" />
        <circle cx="45" cy="45" r="24" fill="#DDD6FE" opacity=".8" />
        <path d="M72 73 L108 110" stroke="#7C3AED" strokeWidth="17" strokeLinecap="round" />
        <path d="M28 30 Q40 16 56 29" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
      </g>

      {/* ดาว */}
      <path d="M250 28 l7 15 16 7 -16 7 -7 16 -7 -16 -16 -7 16 -7z" fill="#FBBF24" />
      <circle cx="145" cy="120" r="6" fill="#F9A8D4" />
      <circle cx="450" cy="130" r="7" fill="#A78BFA" />
    </svg>
  );
}

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
        returned: items.filter((item) => item.status === "returned").length,
      });

      setLoading(false);
    }

    loadStats();
    window.addEventListener("focus", loadStats);

    return () => {
      mounted = false;
      window.removeEventListener("focus", loadStats);
    };
  }, []);

  const menus = [
    {
      title: "ลงประกาศ",
      description: "แจ้งสิ่งของที่หายหรือพบ",
      icon: PlusCircle,
      to: "/report",
      color: "#7C3AED",
      bg: "#EDE9FE",
    },
    {
      title: "ค้นหาสิ่งของ",
      description: "ค้นหาของที่มีคนแจ้งไว้",
      icon: Search,
      to: "/items",
      color: "#2563EB",
      bg: "#DBEAFE",
    },
    {
      title: "จัดการประกาศ",
      description: "ตรวจสอบและจัดการประกาศ",
      icon: UserRound,
      to: "/manage",
      color: "#059669",
      bg: "#D1FAE5",
    },
    {
      title: "กล่องข้อความ",
      description: "พูดคุยกับผู้ติดต่อส่วนตัว",
      icon: MessageCircle,
      to: "/messages",
      color: "#DB2777",
      bg: "#FCE7F3",
    },
  ];

  const statCards = [
    {
      title: "ของหาย",
      count: stats.lost,
      icon: Package,
      color: "#3B82F6",
      background: "#EFF6FF",
    },
    {
      title: "พบของ",
      count: stats.found,
      icon: SearchCheck,
      color: "#059669",
      background: "#ECFDF5",
    },
    {
      title: "คืนเจ้าของแล้ว",
      count: stats.returned,
      icon: CheckCircle,
      color: "#9333EA",
      background: "#F5F3FF",
    },
  ];

  return (
    <main
      className="app"
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "24px 18px",
      }}
    >
      {/* HEADER */}
      <header
        className="site-header"
        style={{
          borderRadius: "22px",
          padding: "22px",
          background: "linear-gradient(120deg, #7C3AED, #A78BFA)",
          color: "white",
          boxShadow: "0 8px 25px rgba(124,58,237,.18)",
        }}
      >
        <h1 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Home size={28} />
          School Lost &amp; Found
        </h1>
        <p style={{ color: "#F3E8FF", marginBottom: 0 }}>
          ระบบแจ้งของหายและของที่พบภายในโรงเรียน
        </p>
      </header>

      {/* HERO */}
      <section
        style={{
          marginTop: "25px",
          borderRadius: "26px",
          padding: "25px",
          background: "linear-gradient(135deg, #F5F3FF, #EDE9FE, #FAE8FF)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          alignItems: "center",
          gap: "15px",
          overflow: "hidden",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              background: "white",
              color: "#7C3AED",
              borderRadius: "30px",
              padding: "8px 14px",
              fontSize: "13px",
              fontWeight: "bold",
            }}
          >
            <Sparkles size={16} />
            SCHOOL COMMUNITY
          </div>

          <h2
            style={{
              fontSize: "clamp(27px, 4vw, 40px)",
              lineHeight: 1.3,
              color: "#4C1D95",
              margin: "18px 0 10px",
            }}
          >
            ของหายไม่ต้องกังวล
            <br />
            เราช่วยตามหาให้คุณ
          </h2>

          <p style={{ color: "#6B5B85", lineHeight: 1.8 }}>
            พื้นที่กลางสำหรับแจ้งของหาย ค้นหาสิ่งของ
            และส่งคืนเจ้าของภายในโรงเรียน
          </p>

          <Link
            to="/report"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "9px",
              background: "#7C3AED",
              color: "white",
              padding: "13px 21px",
              borderRadius: "14px",
              textDecoration: "none",
              fontWeight: "bold",
              marginTop: "8px",
              boxShadow: "0 5px 15px rgba(124,58,237,.25)",
            }}
          >
            เริ่มลงประกาศ <ArrowRight size={18} />
          </Link>
        </div>

        <div style={{ width: "100%", maxWidth: "480px", margin: "auto" }}>
          <HeroIllustration />
        </div>
      </section>

      {/* MENU */}
      <section style={{ marginTop: "35px" }}>
        <div style={{ marginBottom: "18px" }}>
          <h2 style={{ color: "#3B2463", marginBottom: "5px" }}>
            เมนูการใช้งาน
          </h2>
          <p style={{ color: "#777", margin: 0 }}>
            เลือกสิ่งที่คุณต้องการทำ
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
          }}
        >
          {menus.map((menu) => {
            const Icon = menu.icon;

            return (
              <Link
                key={menu.to}
                to={menu.to}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "15px",
                  padding: "20px",
                  background: "white",
                  border: "1px solid #EDE9FE",
                  borderRadius: "19px",
                  textDecoration: "none",
                  color: "#333",
                  boxShadow: "0 5px 18px rgba(76,29,149,.06)",
                  transition: "transform .2s, box-shadow .2s",
                }}
              >
                <div
                  style={{
                    width: "55px",
                    height: "55px",
                    flexShrink: 0,
                    borderRadius: "17px",
                    background: menu.bg,
                    color: menu.color,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Icon size={27} />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                    {menu.title}
                  </div>
                  <div style={{ color: "#888", fontSize: "12px", marginTop: "5px" }}>
                    {menu.description}
                  </div>
                </div>

                <ArrowRight size={19} color="#A78BFA" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* STATISTICS */}
      <section
        style={{
          marginTop: "35px",
          padding: "23px",
          borderRadius: "23px",
          background: "white",
          boxShadow: "0 6px 25px rgba(76,29,149,.07)",
          border: "1px solid #EDE9FE",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            flexWrap: "wrap",
            marginBottom: "22px",
          }}
        >
          <div>
            <h2 style={{ margin: 0, color: "#3B2463" }}>
              <BookOpen size={21} style={{ verticalAlign: "middle", marginRight: "8px" }} />
              สถิติสิ่งของ
            </h2>
            <p style={{ margin: "7px 0 0", color: "#888", fontSize: "13px" }}>
              สรุปข้อมูลประกาศภายในโรงเรียน
            </p>
          </div>

          <button
            onClick={() => window.location.reload()}
            title="รีเฟรชข้อมูล"
            style={{
              border: "none",
              background: "#F3E8FF",
              color: "#7C3AED",
              width: "42px",
              height: "42px",
              borderRadius: "13px",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={19} />
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
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
                  borderRadius: "18px",
                  padding: "22px 12px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: "53px",
                    height: "53px",
                    margin: "0 auto 12px",
                    borderRadius: "17px",
                    background: "white",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Icon size={28} color={stat.color} />
                </div>

                <div
                  style={{
                    fontSize: "34px",
                    fontWeight: "bold",
                    color: stat.color,
                  }}
                >
                  {loading ? "..." : stats[stat.title === "ของหาย" ? "lost" : stat.title === "พบของ" ? "found" : "returned"]}
                </div>

                <div style={{ fontSize: "14px", fontWeight: "600", color: "#444" }}>
                  {stat.title}
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <p style={{ color: "#DC2626", textAlign: "center", marginTop: "15px" }}>
            {error}
          </p>
        )}

        {!loading && !error && (
          <p style={{ textAlign: "center", color: "#999", fontSize: "12px", marginTop: "18px" }}>
            ข้อมูลจากฐานข้อมูล Supabase
          </p>
        )}
      </section>

      <footer
        className="site-footer"
        style={{ marginTop: "35px", textAlign: "center", color: "#888" }}
      >
        School Lost &amp; Found · Together we find what is lost
      </footer>
    </main>
  );
}
