
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  // ระบบค้นหาและกรอง
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const statusLabels = {
    searching: "กำลังตามหา",
    found: "พบของแล้ว",
    returned: "ส่งคืนเจ้าของแล้ว",
    active: "กำลังแสดง",
  };

  // โหลดประกาศ
  async function fetchItems() {
    setLoading(true);
    setError("");

    try {
      const { data, error: itemsError } = await supabase
        .from("items")
        .select(
          "id,type,title,description,location,status,created_at,image_urls"
        )
        .order("created_at", { ascending: false });

      if (itemsError) throw itemsError;

      setItems(data || []);
    } catch (err) {
      setError(err.message || "โหลดประกาศไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  // ตรวจสอบสิทธิ์แอดมิน
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
          .select(
            "id,type,title,description,location,status,created_at,image_urls"
          )
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

  // ออกจากระบบ
  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setError("ออกจากระบบไม่สำเร็จ: " + error.message);
      return;
    }

    navigate("/admin", { replace: true });
  }

  // ลบประกาศ
  async function handleDelete(item) {
    const confirmed = window.confirm(
      `คุณต้องการลบประกาศ "${item.title}" ใช่หรือไม่?\n\n` +
      "การลบนี้ไม่สามารถย้อนกลับได้"
    );

    if (!confirmed) return;

    setDeletingId(item.id);
    setError("");
    setNotice("");

    try {
      const { data, error: deleteError } = await supabase.rpc(
        "admin_delete_item",
        {
          p_item_id: item.id,
        }
      );

      if (deleteError) throw deleteError;

      if (!data?.deleted) {
        if (data?.reason === "not_found") {
          throw new Error("ไม่พบประกาศนี้ อาจถูกลบไปแล้ว");
        }

        throw new Error("ไม่สามารถลบประกาศได้");
      }

      // นำรายการที่ลบออกจากหน้าจอทันที
      setItems((currentItems) =>
        currentItems.filter(
          (currentItem) => currentItem.id !== item.id
        )
      );

      setNotice(`ลบประกาศ "${item.title}" เรียบร้อยแล้ว`);
    } catch (err) {
      setError(err.message || "ลบประกาศไม่สำเร็จ");
    } finally {
      setDeletingId(null);
    }
  }

  // สถิติประกาศ
  const statistics = useMemo(() => {
    return {
      total: items.length,
      lost: items.filter((item) => item.type === "lost").length,
      found: items.filter((item) => item.type === "found").length,
      returned: items.filter(
        (item) => item.status === "returned"
      ).length,
    };
  }, [items]);

  // ค้นหาและกรองประกาศ
  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !keyword ||
        [
          item.title,
          item.description,
          item.location,
          String(item.id),
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(keyword)
          );

      const matchesType =
        typeFilter === "all" || item.type === typeFilter;

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [items, search, typeFilter, statusFilter]);

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
        <h2>ภาพรวมระบบ</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <div className="manage-result">
            <p>ประกาศทั้งหมด</p>
            <h2>{statistics.total}</h2>
          </div>

          <div className="manage-result">
            <p>ของหาย</p>
            <h2>{statistics.lost}</h2>
          </div>

          <div className="manage-result">
            <p>พบของ</p>
            <h2>{statistics.found}</h2>
          </div>

          <div className="manage-result">
            <p>ส่งคืนแล้ว</p>
            <h2>{statistics.returned}</h2>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <h2>จัดการรายการประกาศ</h2>

          <button onClick={fetchItems} disabled={loading || deletingId !== null}>
            {loading ? "กำลังโหลด..." : "โหลดข้อมูลใหม่"}
          </button>
        </div>

        {/* ช่องค้นหา */}
        <div style={{ marginBottom: "16px" }}>
          <input
            type="text"
            placeholder="ค้นหาชื่อสิ่งของ รายละเอียด สถานที่ หรือรหัสประกาศ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box" }}
          />
        </div>

        {/* ตัวกรอง */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">ประเภททั้งหมด</option>
            <option value="lost">ของหาย</option>
            <option value="found">พบของ</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="active">กำลังแสดง</option>
            <option value="searching">กำลังตามหา</option>
            <option value="found">พบของแล้ว</option>
            <option value="returned">ส่งคืนเจ้าของแล้ว</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setTypeFilter("all");
              setStatusFilter("all");
            }}
          >
            ล้างตัวกรอง
          </button>
        </div>

        <p>
          กำลังแสดง {filteredItems.length} รายการ
          จากทั้งหมด {items.length} รายการ
        </p>

        {notice && (
          <p role="status" style={{ color: "green" }}>
            {notice}
          </p>
        )}

        {loading && <p>กำลังโหลดข้อมูล...</p>}

        {error && (
          <p role="alert" style={{ color: "red" }}>
            {error}
          </p>
        )}

        {!loading && !error && filteredItems.length === 0 && (
          <p>ไม่พบประกาศที่ตรงกับการค้นหา</p>
        )}

        {!loading && filteredItems.map((item) => (
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

            <button
              type="button"
              onClick={() => handleDelete(item)}
              disabled={deletingId !== null}
              style={{
                backgroundColor: "#dc2626",
                color: "white",
                marginTop: "12px",
                opacity: deletingId === item.id ? 0.7 : 1,
                cursor: deletingId !== null ? "not-allowed" : "pointer",
              }}
            >
              {deletingId === item.id ? "กำลังลบ..." : "ลบประกาศ"}
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}
