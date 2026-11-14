
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

function getChatInfo() {
  const hash = window.location.hash;
  const params = new URLSearchParams(hash.replace(/^#/, ""));

  return {
    roomId: params.get("chat"),
    token: params.get("key"),
  };
}

function formatDate(date) {
  if (!date) return "";
  return new Date(date).toLocaleString("th-TH");
}

export default function ChatPage() {
  const [chatInfo] = useState(getChatInfo);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function loadMessages() {
    if (!chatInfo.roomId || !chatInfo.token) {
      setError("ไม่พบข้อมูลห้องแชต กรุณาเปิดจากลิงก์แชตที่ได้รับ");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc(
        "get_private_chat_messages",
        {
          p_room_id: chatInfo.roomId,
          p_contact_token: chatInfo.token,
        }
      );

      if (error) throw error;

      setMessages(data || []);

      const { error: readError } = await supabase.rpc(
        "mark_contact_chat_read",
        {
          p_room_id: chatInfo.roomId,
          p_contact_token: chatInfo.token,
        }
      );

      if (readError) throw readError;
      setError("");
    } catch (err) {
      setError("โหลดข้อความไม่สำเร็จ: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();

    if (!reply.trim() || sending) return;

    setSending(true);
    setError("");

    try {
      const { error } = await supabase.rpc(
        "send_private_chat_message_contact",
        {
          p_room_id: chatInfo.roomId,
          p_contact_token: chatInfo.token,
          p_message: reply.trim(),
        }
      );

      if (error) throw error;

      setReply("");
      await loadMessages();
    } catch (err) {
      setError("ส่งข้อความไม่สำเร็จ: " + err.message);
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    loadMessages();

    const interval = setInterval(() => {
      loadMessages();
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="app">
      <header className="site-header">
        <h1>แชตส่วนตัว</h1>
        <p>สนทนาระหว่างผู้ติดต่อกับเจ้าของประกาศ</p>
        <Link to="/messages">กลับกล่องข้อความ</Link>
      </header>

      <section className="manage-section">
        {!chatInfo.roomId || !chatInfo.token ? (
          <p>ไม่พบลิงก์ห้องแชตที่ถูกต้อง</p>
        ) : (
          <>
            <h2>บทสนทนา</h2>

            {loading ? (
              <p>กำลังโหลดข้อความ...</p>
            ) : (
              <div className="chat-messages">
                {messages.length === 0 ? (
                  <p>ยังไม่มีข้อความ เริ่มต้นสนทนาได้เลย</p>
                ) : (
                  messages.map((message) => (
                    <article className="message-card" key={message.id}>
                      <strong>
                        {message.sender_role === "contact"
                          ? "คุณ"
                          : "เจ้าของประกาศ"}
                      </strong>
                      <p>{message.message}</p>
                      <small>{formatDate(message.created_at)}</small>
                    </article>
                  ))
                )}
              </div>
            )}

            <form onSubmit={sendMessage}>
              <label>พิมพ์ข้อความ</label>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="พิมพ์ข้อความที่ต้องการส่ง..."
              />

              <button type="submit" disabled={sending || !reply.trim()}>
                {sending ? "กำลังส่ง..." : "ส่งข้อความ"}
              </button>
            </form>
          </>
        )}

        {error && <p role="alert">{error}</p>}
      </section>
    </main>
  );
}
