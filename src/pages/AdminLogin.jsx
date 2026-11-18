
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) throw loginError;

      const { data: isAdmin, error: adminError } =
        await supabase.rpc("is_admin");

      if (adminError) throw adminError;

      if (!isAdmin) {
        await supabase.auth.signOut();
        throw new Error("บัญชีนี้ไม่มีสิทธิ์แอดมิน");
      }

      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app">
      <section className="manage-section">
        <h1>Admin Login</h1>
        <p>เข้าสู่ระบบสำหรับผู้ดูแลเว็บไซต์</p>

        <form onSubmit={handleLogin}>
          <label>อีเมล</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="กรอกอีเมลแอดมิน"
            required
          />

          <label>รหัสผ่าน</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="กรอกรหัสผ่าน"
            required
          />

          {error && <p role="alert">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      </section>
    </main>
  );
}
