
import { useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import HomePage from "./pages/Home";
import ReportPage from "./pages/Report";
import ItemsPage from "./pages/Items";
import MessagesPage from "./pages/Messages";
import ChatPage from "./pages/Chat";
import { supabase } from "./lib/supabase";
import "./App.css";

function ManagePage() {
  const [manageId, setManageId] = useState("");
  const [manageToken, setManageToken] = useState("");
  const [item, setItem] = useState(null);
  const [manageStatus, setManageStatus] = useState("searching");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const statusLabels = {
    searching: "กำลังตามหา",
    found: "พบของแล้ว",
    returned: "ส่งคืนเจ้าของแล้ว",
  };

  async function loadAnnouncement(event) {
    event.preventDefault();
    setErrorMessage("");
    setItem(null);

    const id = Number(manageId);

    if (!Number.isInteger(id) || id <= 0 || !manageToken.trim()) {
      setErrorMessage("กรุณากรอกรหัสประกาศและรหัสจัดการให้ถูกต้อง");
      return;
    }

    setLoading(true);

    try {
      const { error: checkError } = await supabase.rpc(
        "get_contact_messages",
        {
          p_item_id: id,
          p_manage_token: manageToken.trim(),
        }
      );

      if (checkError) throw checkError;

      const { data, error } = await supabase
        .from("items")
        .select("id,type,title,description,location,status,image_urls")
        .eq("id", id)
        .single();

      if (error) throw error;

      setItem(data);
      setManageStatus(data.status || "searching");
    } catch (error) {
      setErrorMessage(
        "เปิดข้อมูลไม่สำเร็จ: " +
        (error.message || "กรุณาตรวจสอบรหัส")
      );
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(event) {
    event.preventDefault();
    if (!item) return;

    setSaving(true);
    setErrorMessage("");

    try {
      const { error } = await supabase.rpc("update_item_status", {
        p_item_id: Number(manageId),
        p_manage_token: manageToken.trim(),
        p_status: manageStatus,
      });

      if (error) throw error;

      setItem((previous) => ({
        ...previous,
        status: manageStatus,
      }));

      alert("เปลี่ยนสถานะเรียบร้อยแล้ว");
    } catch (error) {
      setErrorMessage(
        "เปลี่ยนสถานะไม่สำเร็จ: " +
        (error.message || "เกิดข้อผิดพลาด")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="app">
      <header className="site-header">
        <h1>จัดการประกาศ</h1>
        <p>ใช้รหัสที่ได้รับตอนลงประกาศ ไม่ต้องสมัครสมาชิก</p>
        <Link to="/">กลับหน้าหลัก</Link>
      </header>

      <section className="manage-section">
        <h2>เปิดข้อมูลประกาศของคุณ</h2>

        <form onSubmit={loadAnnouncement}>
          <label>รหัสประกาศ</label>
          <input
            value={manageId}
            onChange={(e) => setManageId(e.target.value)}
            placeholder="กรอกรหัสประกาศ"
            required
          />

          <label>รหัสจัดการ</label>
          <input
            value={manageToken}
            onChange={(e) => setManageToken(e.target.value)}
            placeholder="กรอกรหัสจัดการ"
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "กำลังตรวจสอบ..." : "เปิดข้อมูลประกาศ"}
          </button>
        </form>

        {errorMessage && <p role="alert">{errorMessage}</p>}

        {item && (
          <div className="manage-result">
            <h2>{item.title}</h2>
            <p>รหัสประกาศ: {item.id}</p>
            <p>รายละเอียด: {item.description || "ไม่มีรายละเอียด"}</p>
            <p>สถานที่: {item.location || "ไม่ระบุ"}</p>
            <p>สถานะ: {statusLabels[item.status] || item.status}</p>

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

            <form onSubmit={changeStatus}>
              <label>เปลี่ยนสถานะ</label>
              <select
                value={manageStatus}
                onChange={(e) => setManageStatus(e.target.value)}
              >
                <option value="searching">กำลังตามหา</option>
                <option value="found">พบของแล้ว</option>
                <option value="returned">ส่งคืนเจ้าของแล้ว</option>
              </select>

              <button type="submit" disabled={saving}>
                {saving ? "กำลังบันทึก..." : "บันทึกสถานะ"}
              </button>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}

function SimplePage({ title }) {
  return (
    <main className="app">
      <h1>{title}</h1>
      <p>หน้านี้กำลังอยู่ระหว่างพัฒนา</p>
      <Link to="/">กลับหน้าหลัก</Link>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/report" element={<ReportPage />} />
      <Route path="/items" element={<ItemsPage />} />
      <Route path="/manage" element={<ManagePage />} />
      <Route path="/messages" element={<MessagesPage />} />
      <Route path="/chat" element={<ChatPage />} />
    </Routes>
  );
}
