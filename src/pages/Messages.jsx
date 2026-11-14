
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

const CONTACT_STORAGE = "school_lost_found_contact_chats";
const OWNER_STORAGE = "school_lost_found_owner_items";

function readStorage(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleString("th-TH");
}

export default function MessagesPage() {
  const [tab, setTab] = useState("contact");
  const [contacts] = useState(() => readStorage(CONTACT_STORAGE));
  const [owners] = useState(() => readStorage(OWNER_STORAGE));
  const [ownerRooms, setOwnerRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadOwnerRooms() {
    const results = await Promise.all(
      owners.map(async (owner) => {
        const { data, error } = await supabase.rpc(
          "owner_list_private_chat_rooms_with_unread",
          {
            p_item_id: Number(owner.item_id),
            p_manage_token: owner.token,
          }
        );

        if (error) {
          console.error(error.message);
          return [];
        }

        return (data || []).map((room) => ({
          ...room,
          item_id: owner.item_id,
          item_title: owner.title,
          owner_token: owner.token,
        }));
      })
    );

    setOwnerRooms(
      results
        .flat()
        .sort(
          (a, b) =>
            new Date(b.last_message_at || 0) -
            new Date(a.last_message_at || 0)
        )
    );
  }

  async function openOwnerChat(room) {
    setSelectedRoom(room);
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.rpc(
        "owner_get_private_chat_messages",
        {
          p_room_id: room.room_id,
          p_manage_token: room.owner_token,
        }
      );

      if (error) throw error;

      setMessages(data || []);

      const { error: readError } = await supabase.rpc(
        "mark_owner_chat_read",
        {
          p_room_id: room.room_id,
          p_manage_token: room.owner_token,
        }
      );

      if (readError) throw readError;

      await loadOwnerRooms();
    } catch (err) {
      setError("เปิดแชตไม่สำเร็จ: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function sendReply(event) {
    event.preventDefault();

    if (!reply.trim() || !selectedRoom) return;

    try {
      const { error } = await supabase.rpc(
        "owner_send_private_chat_message",
        {
          p_room_id: selectedRoom.room_id,
          p_manage_token: selectedRoom.owner_token,
          p_message: reply.trim(),
        }
      );

      if (error) throw error;

      setReply("");
      await openOwnerChat(selectedRoom);
    } catch (err) {
      setError("ส่งข้อความไม่สำเร็จ: " + err.message);
    }
  }

  useEffect(() => {
    loadOwnerRooms();
  }, []);

  return (
    <main className="app">
      <header className="site-header">
        <h1>กล่องข้อความของฉัน</h1>
        <p>พูดคุยกับผู้ติดต่อโดยไม่ต้องสมัครสมาชิก</p>
        <Link to="/">กลับหน้าหลัก</Link>
      </header>

      <section className="manage-section">
        <div className="filters">
          <button
            type="button"
            className={tab === "contact" ? "primary-button" : ""}
            onClick={() => {
              setTab("contact");
              setSelectedRoom(null);
              setMessages([]);
            }}
          >
            แชตที่ฉันเป็นผู้ติดต่อ ({contacts.length})
          </button>

          <button
            type="button"
            className={tab === "owner" ? "primary-button" : ""}
            onClick={() => {
              setTab("owner");
              setSelectedRoom(null);
              setMessages([]);
              loadOwnerRooms();
            }}
          >
            แชตในประกาศของฉัน ({ownerRooms.length})
          </button>
        </div>

        {tab === "contact" && (
          <>
            <h2>ห้องแชตที่ฉันเคยติดต่อ</h2>

            {contacts.length === 0 ? (
              <p>ยังไม่มีห้องแชตที่บันทึกไว้ในเบราว์เซอร์นี้</p>
            ) : (
              contacts.map((room) => (
                <article className="message-card" key={room.room_id}>
                  <h3>{room.item_title || "ประกาศ"}</h3>
                  <p>รหัสห้องแชต: {room.room_id}</p>
                  <Link
                    to={`/chat#chat=${encodeURIComponent(room.room_id)}&key=${encodeURIComponent(room.token)}`}
                  >
                    เปิดบทสนทนา
                  </Link>
                </article>
              ))
            )}
          </>
        )}

        {tab === "owner" && (
          <>
            <h2>ห้องแชตในประกาศของฉัน</h2>

            {ownerRooms.length === 0 ? (
              <p>ยังไม่มีห้องแชตในประกาศของคุณ</p>
            ) : (
              ownerRooms.map((room) => (
                <article
                  className="message-card"
                  key={`${room.item_id}-${room.room_id}`}
                >
                  <h3>{room.contact_name || "ผู้ติดต่อ"}</h3>
                  <p>ประกาศ: {room.item_title}</p>
                  <small>ข้อความล่าสุด: {formatDate(room.last_message_at)}</small>

                  {Number(room.unread_count) > 0 && (
                    <p>ข้อความที่ยังไม่อ่าน: {room.unread_count}</p>
                  )}

                  <button
                    type="button"
                    onClick={() => openOwnerChat(room)}
                  >
                    เปิดบทสนทนา
                  </button>
                </article>
              ))
            )}

            {selectedRoom && (
              <div className="owner-chat">
                <h3>แชตกับ {selectedRoom.contact_name || "ผู้ติดต่อ"}</h3>

                {loading ? (
                  <p>กำลังโหลดข้อความ...</p>
                ) : (
                  <div className="chat-messages">
                    {messages.map((message) => (
                      <article className="message-card" key={message.id}>
                        <strong>
                          {message.sender_role === "owner"
                            ? "คุณ"
                            : selectedRoom.contact_name || "ผู้ติดต่อ"}
                        </strong>
                        <p>{message.message}</p>
                        <small>{formatDate(message.created_at)}</small>
                      </article>
                    ))}
                  </div>
                )}

                <form onSubmit={sendReply}>
                  <label>พิมพ์ข้อความตอบกลับ</label>
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="พิมพ์ข้อความ..."
                  />
                  <button type="submit">ส่งข้อความ</button>
                </form>
              </div>
            )}
          </>
        )}

        {error && <p role="alert">{error}</p>}
      </section>
    </main>
  );
}
