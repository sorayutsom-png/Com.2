
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function checkAdmin() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session) {
          navigate("/admin", { replace: true });
          return;
        }

        const { data: isAdmin, error: adminError } =
          await supabase.rpc("is_admin");

        if (adminError) throw adminError;

        if (!isAdmin) {
          await supabase.auth.signOut();
          navigate("/admin", { replace: true });
          return;
        }

        const { data, error: itemsError } = await supabase
          .from("items")
          .select("id,type,title,description,location,status,created_at,image_urls")
          .order("created_at", { ascending: false });

        if (itemsError) throw itemsError;

        if (active) {
          setItems(data || []);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "เกิดข้อผิดพลาด");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    checkAdmin();

    return () => {
      active = false;
    };
  }, [navigate]);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setError("ออกจากระบบไม่สำเร็จ: " + error.message);
      return;
    }

    navigate("/admin", { replace: true });
  }

  const statusLabels = {
    searching: "กำลังตามหา",
    found: "พบของแล้ว",
    returned: "ส่งคืนเจ้าของแล้ว",
    active: "กำลังแสดง",
  };

  return (
    <main className="app">
      <header className="site-header">
        <h1>Admin Dashboard</h1>
        <p>ระบบจัดการประกาศ School Lost & Found</p>

        <button onClick={handleLogout}>
          ออกจากระบบ
        </button>
      </header>

      <section className="manage-section">
        <h2>รายการประกาศทั้งหมด ({items.length})</h2>

        {loading && <p>กำลังโหลดข้อมูล...</p>}

        {error && <p role="alert">{error}</p>}

        {!loading && !error && items.length === 0 && (
          <p>ยังไม่มีประกาศ</p>
        )}

        {!loading && items.map((item) => (
          <article
            key={item.id}
            className="manage-result"
          >
            <h3>{item.title}</h3>

            <p>รหัสประกาศ: {item.id}</p>
            <p>
              ประเภท: {item.type === "lost" ? "ของหาย" : "พบของ"}
            </p>
            <p>
              รายละเอียด: {item.description || "ไม่มีรายละเอียด"}
            </p>
            <p>สถานที่: {item.location || "ไม่ระบุ"}</p>
            <p>
              สถานะ: {statusLabels[item.status] || item.status}
            </p>
            <p>
              วันที่สร้าง:{" "}
              {item.created_at
                ? new Date(item.created_at).toLocaleString("th-TH")
                : "ไม่ระบุ"}
            </p>

            {item.image_urls?.length > 0 && (
              <div className="item-images">
                {item.image_urls.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`รูปประกาศ ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
