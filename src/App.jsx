
import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import "./App.css";

const statusLabels = {
  searching: "กำลังตามหา",
  found: "พบของแล้ว",
  returned: "ส่งคืนเจ้าของแล้ว",
};

function makeToken() {
  const characters =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);

  return Array.from(
    bytes,
    (byte) => characters[byte % characters.length]
  ).join("");
}

export default function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState("lost");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [images, setImages] = useState([]);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [createdSecret, setCreatedSecret] = useState(null);
  const [openContactId, setOpenContactId] = useState(null);
  const [contactName, setContactName] = useState("");
  const [contactMessage, setContactMessage] = useState("");

  const [manageId, setManageId] = useState("");
  const [manageToken, setManageToken] = useState("");
  const [manageStatus, setManageStatus] = useState("searching");
  const [messages, setMessages] = useState([]);
  const [manageLoaded, setManageLoaded] = useState(false);

  // ระบบแชตของผู้ติดต่อ
  const [contactRoomId, setContactRoomId] = useState("");
  const [contactToken, setContactToken] = useState("");
  const [contactChatMessages, setContactChatMessages] = useState([]);
  const [contactReply, setContactReply] = useState("");
  const [contactChatLoading, setContactChatLoading] = useState(false);
  const [createdChatLink, setCreatedChatLink] = useState("");

  // ระบบแชตของเจ้าของประกาศ
  const [ownerRooms, setOwnerRooms] = useState([]);
  const [selectedOwnerRoom, setSelectedOwnerRoom] = useState(null);
  const [ownerChatMessages, setOwnerChatMessages] = useState([]);
  const [ownerReply, setOwnerReply] = useState("");
  const [ownerChatLoading, setOwnerChatLoading] = useState(false);

  async function fetchItems() {
    setLoading(true);

    const { data, error } = await supabase
      .from("items")
      .select("id,type,title,description,location,image_urls,status,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      alert("โหลดประกาศไม่สำเร็จ: " + error.message);
    } else {
      setItems(data || []);
    }

    setLoading(false);
  }

  // โหลดแชตของผู้ติดต่อจากลิงก์ส่วนตัว
  async function loadContactChat(roomId, token) {
    setContactChatLoading(true);

    const { data, error } = await supabase.rpc(
      "get_private_chat_messages",
      {
        p_room_id: roomId,
        p_contact_token: token,
      }
    );

    if (error) {
      alert("เปิดห้องแชตไม่สำเร็จ ลิงก์อาจไม่ถูกต้อง");
      setContactChatMessages([]);
    } else {
      setContactChatMessages(data || []);
    }

    setContactChatLoading(false);
  }

  useEffect(() => {
    fetchItems();

    // ตรวจสอบว่ามีลิงก์แชตส่วนตัวหรือไม่
    const params = new URLSearchParams(
      window.location.hash.slice(1)
    );

    const roomId = params.get("chat");
    const token = params.get("key");

    if (roomId && token) {
      setContactRoomId(roomId);
      setContactToken(token);
      loadContactChat(roomId, token);
    }
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const keyword = search.trim().toLowerCase();

      const matchesSearch =
        !keyword ||
        [item.title, item.description, item.location]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(keyword));

      const matchesType =
        typeFilter === "all" || item.type === typeFilter;

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [items, search, typeFilter, statusFilter]);

  function handleImageChange(event) {
    const selected = Array.from(event.target.files || []);
    const allowed = ["image/jpeg", "image/png", "image/webp"];

    if (images.length + selected.length > 5) {
      alert("แนบรูปภาพได้สูงสุด 5 รูป");
      event.target.value = "";
      return;
    }

    for (const file of selected) {
      if (!allowed.includes(file.type)) {
        alert("รองรับเฉพาะ JPG, PNG และ WEBP");
        event.target.value = "";
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert("รูปภาพแต่ละไฟล์ต้องมีขนาดไม่เกิน 5 MB");
        event.target.value = "";
        return;
      }
    }

    setImages((previous) => [...previous, ...selected]);
    event.target.value = "";
  }

  function removeImage(index) {
    setImages((previous) => previous.filter((_, i) => i !== index));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!title.trim()) {
      alert("กรุณากรอกชื่อสิ่งของ");
      return;
    }

    setSaving(true);

    try {
      const imageUrls = [];

      for (const file of images) {
        const extension =
          file.name.split(".").pop()?.toLowerCase() || "jpg";

        const path = `${Date.now()}-${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("lost-found")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("lost-found")
          .getPublicUrl(path);

        imageUrls.push(data.publicUrl);
      }

      const token = makeToken();

      const { data: newId, error } = await supabase.rpc(
        "create_public_item",
        {
          p_type: type,
          p_title: title.trim(),
          p_description: description.trim(),
          p_location: location.trim(),
          p_image_urls: imageUrls,
          p_manage_token: token,
        }
      );

      if (error) throw error;

      setCreatedSecret({ id: newId, token });
      setTitle("");
      setDescription("");
      setLocation("");
      setImages([]);
      setType("lost");

      await fetchItems();
    } catch (error) {
      alert("ลงประกาศไม่สำเร็จ: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  // สร้างห้องแชตใหม่
  async function createChatRoom(itemId) {
    if (!contactMessage.trim()) {
      alert("กรุณาพิมพ์ข้อความ");
      return;
    }

    setSaving(true);

    try {
      const { data, error } = await supabase.rpc(
        "create_private_chat_room",
        {
          p_item_id: itemId,
          p_contact_name: contactName.trim() || "ผู้ติดต่อ",
          p_message: contactMessage.trim(),
        }
      );

      if (error) throw error;

      const roomId = data.room_id;
      const token = data.contact_token;

      const link =
        `${window.location.origin}${window.location.pathname}` +
        `#chat=${encodeURIComponent(roomId)}` +
        `&key=${encodeURIComponent(token)}`;

      setCreatedChatLink(link);
      setContactRoomId(roomId);
      setContactToken(token);
      setContactMessage("");
      setContactName("");
      setOpenContactId(null);

      window.history.replaceState(null, "", link);

      await loadContactChat(roomId, token);

      alert("สร้างห้องแชตเรียบร้อยแล้ว กรุณาคัดลอกลิงก์เก็บไว้");
    } catch (error) {
      alert("สร้างห้องแชตไม่สำเร็จ: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  // ผู้ติดต่อส่งข้อความ
  async function sendContactReply(event) {
    event.preventDefault();

    if (!contactReply.trim()) return;

    const { error } = await supabase.rpc(
      "send_private_chat_message_contact",
      {
        p_room_id: contactRoomId,
        p_contact_token: contactToken,
        p_message: contactReply.trim(),
      }
    );

    if (error) {
      alert("ส่งข้อความไม่สำเร็จ: " + error.message);
      return;
    }

    setContactReply("");
    await loadContactChat(contactRoomId, contactToken);
  }

  // เจ้าของเปิดข้อมูลประกาศและรายการห้องแชต
  async function loadManageMessages(event) {
    event.preventDefault();

    if (!manageId.trim() || !manageToken.trim()) {
      alert("กรุณากรอกรหัสประกาศและรหัสจัดการ");
      return;
    }

    const itemId = Number(manageId);

    const { data: oldMessages, error: oldError } =
      await supabase.rpc("get_contact_messages", {
        p_item_id: itemId,
        p_manage_token: manageToken.trim(),
      });

    if (oldError) {
      alert("เปิดข้อมูลไม่สำเร็จ ตรวจสอบรหัสอีกครั้ง");
      setManageLoaded(false);
      return;
    }

    const { data: rooms, error: roomsError } =
      await supabase.rpc("owner_list_private_chat_rooms", {
        p_item_id: itemId,
        p_manage_token: manageToken.trim(),
      });

    if (roomsError) {
      alert("โหลดห้องแชตไม่สำเร็จ: " + roomsError.message);
      setManageLoaded(false);
      return;
    }

    const item = items.find((entry) => entry.id === itemId);

    setManageStatus(item?.status || "searching");
    setMessages(oldMessages || []);
    setOwnerRooms(rooms || []);
    setSelectedOwnerRoom(null);
    setOwnerChatMessages([]);
    setManageLoaded(true);
  }

  // เจ้าของเปิดห้องแชตของผู้ติดต่อ
  async function openOwnerRoom(room) {
    setSelectedOwnerRoom(room);
    setOwnerChatLoading(true);

    const { data, error } = await supabase.rpc(
      "owner_get_private_chat_messages",
      {
        p_room_id: room.room_id,
        p_manage_token: manageToken.trim(),
      }
    );

    if (error) {
      alert("เปิดห้องแชตไม่สำเร็จ: " + error.message);
      setOwnerChatMessages([]);
    } else {
      setOwnerChatMessages(data || []);
    }

    setOwnerChatLoading(false);
  }

  // เจ้าของตอบข้อความ
  async function sendOwnerReply(event) {
    event.preventDefault();

    if (!ownerReply.trim() || !selectedOwnerRoom) return;

    const { error } = await supabase.rpc(
      "owner_send_private_chat_message",
      {
        p_room_id: selectedOwnerRoom.room_id,
        p_manage_token: manageToken.trim(),
        p_message: ownerReply.trim(),
      }
    );

    if (error) {
      alert("ส่งข้อความไม่สำเร็จ: " + error.message);
      return;
    }

    setOwnerReply("");
    await openOwnerRoom(selectedOwnerRoom);
  }

  async function changeStatus(event) {
    event.preventDefault();

    const { error } = await supabase.rpc("update_item_status", {
      p_item_id: Number(manageId),
      p_manage_token: manageToken.trim(),
      p_status: manageStatus,
    });

    if (error) {
      alert("เปลี่ยนสถานะไม่สำเร็จ: " + error.message);
      return;
    }

    alert("เปลี่ยนสถานะเรียบร้อยแล้ว");
    await fetchItems();
  }

  async function copyToken() {
    if (!createdSecret) return;

    try {
      await navigator.clipboard.writeText(
        `รหัสประกาศ: ${createdSecret.id}\nรหัสจัดการ: ${createdSecret.token}`
      );
      alert("คัดลอกรหัสแล้ว กรุณาเก็บไว้ให้ดี");
    } catch {
      alert("ไม่สามารถคัดลอกได้ กรุณาจดรหัสเก็บไว้");
    }
  }

  async function copyChatLink() {
    if (!createdChatLink) return;

    try {
      await navigator.clipboard.writeText(createdChatLink);
      alert("คัดลอกลิงก์แชตแล้ว กรุณาเก็บไว้");
    } catch {
      alert("คัดลอกไม่ได้ กรุณาคัดลอกลิงก์ด้วยตนเอง");
    }
  }

  return (
    <main className="app">
      <header className="site-header">
        <h1>School Lost &amp; Found</h1>
        <p>ระบบแจ้งของหายและของที่พบภายในโรงเรียน</p>
      </header>

      <section className="form-section">
        <h2>ลงประกาศใหม่</h2>

        <form onSubmit={handleSubmit}>
          <label>ประเภทประกาศ</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="lost">แจ้งของหาย</option>
            <option value="found">แจ้งพบของ</option>
          </select>

          <label>ชื่อสิ่งของ</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="เช่น กระเป๋าสตางค์ กล่องดินสอ"
            maxLength={100}
            required
          />

          <label>รายละเอียด</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="รายละเอียดหรือลักษณะของสิ่งของ"
            rows={3}
          />

          <label>สถานที่ที่หายหรือพบ</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="เช่น อาคาร 2 ห้องสมุด"
          />

          <label>รูปภาพ (สูงสุด 5 รูป)</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleImageChange}
          />

          {images.length > 0 && (
            <div className="selected-files">
              {images.map((file, index) => (
                <div className="selected-file" key={`${file.name}-${index}`}>
                  <span>{file.name}</span>
                  <button type="button" onClick={() => removeImage(index)}>
                    ลบ
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="hint">
            ห้ามใส่ข้อมูลส่วนตัวหรือภาพบัตรนักเรียนในประกาศ
          </p>

          <button className="primary-button" disabled={saving}>
            {saving ? "กำลังลงประกาศ..." : "ลงประกาศ"}
          </button>
        </form>
      </section>

      {createdSecret && (
        <section className="secret-box">
          <h2>ประกาศสำเร็จ!</h2>
          <p>เก็บรหัสทั้งสองรายการนี้ไว้ เพื่อจัดการประกาศในภายหลัง</p>
          <p><strong>รหัสประกาศ:</strong> {createdSecret.id}</p>
          <p className="token-text">
            <strong>รหัสจัดการ:</strong> {createdSecret.token}
          </p>
          <button type="button" onClick={copyToken}>
            คัดลอกรหัสเก็บไว้
          </button>
          <button type="button" onClick={() => setCreatedSecret(null)}>
            ปิด
          </button>
        </section>
      )}

      {createdChatLink && (
        <section className="secret-box">
          <h2>สร้างห้องแชตสำเร็จ!</h2>
          <p>คัดลอกลิงก์นี้เก็บไว้ เพื่อกลับมาอ่านข้อความและตอบกลับภายหลัง</p>
          <input
            value={createdChatLink}
            readOnly
            onFocus={(e) => e.target.select()}
          />
          <button type="button" onClick={copyChatLink}>
            คัดลอกลิงก์แชต
          </button>
          <button
            type="button"
            onClick={() => setCreatedChatLink("")}
          >
            ปิด
          </button>
        </section>
      )}

      {/* หน้าห้องแชตของผู้ติดต่อ */}
      {contactRoomId && (
        <section className="manage-section">
          <h2>แชตส่วนตัวของคุณ</h2>
          <p>ห้องสนทนานี้เป็นส่วนตัว กรุณาเก็บลิงก์ไว้</p>

          {contactChatLoading ? (
            <p>กำลังโหลดข้อความ...</p>
          ) : (
            <div className="chat-messages">
              {contactChatMessages.length === 0 ? (
                <p>ยังไม่มีข้อความ</p>
              ) : (
                contactChatMessages.map((message) => (
                  <article className="message-card" key={message.id}>
                    <strong>
                      {message.sender_role === "owner"
                        ? "เจ้าของประกาศ"
                        : "คุณ"}
                    </strong>
                    <p>{message.message}</p>
                    <small>
                      {new Date(message.created_at).toLocaleString("th-TH")}
                    </small>
                  </article>
                ))
              )}
            </div>
          )}

          <form onSubmit={sendContactReply}>
            <label>พิมพ์ข้อความตอบกลับ</label>
            <textarea
              value={contactReply}
              onChange={(e) => setContactReply(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="พิมพ์ข้อความ..."
            />
            <button type="submit">ส่งข้อความ</button>
            <button
              type="button"
              onClick={() => loadContactChat(contactRoomId, contactToken)}
            >
              โหลดข้อความใหม่
            </button>
          </form>
        </section>
      )}

      <section className="manage-section">
        <h2>จัดการประกาศและอ่านข้อความ</h2>
        <p>กรอกรหัสประกาศและรหัสจัดการที่ได้รับตอนลงประกาศ</p>

        <form onSubmit={loadManageMessages}>
          <label>รหัสประกาศ</label>
          <input
            value={manageId}
            onChange={(e) => setManageId(e.target.value)}
            placeholder="เช่น 12"
          />

          <label>รหัสจัดการ</label>
          <input
            value={manageToken}
            onChange={(e) => setManageToken(e.target.value)}
            placeholder="วางรหัสจัดการของคุณ"
          />

          <button type="submit">เปิดข้อมูลประกาศ</button>
        </form>

        {manageLoaded && (
          <div className="manage-result">
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
              <button type="submit">บันทึกสถานะ</button>
            </form>

            <h3>ห้องแชตส่วนตัว ({ownerRooms.length})</h3>

            {ownerRooms.length === 0 ? (
              <p>ยังไม่มีห้องแชต</p>
            ) : (
              ownerRooms.map((room) => (
                <article className="message-card" key={room.room_id}>
                  <strong>{room.contact_name}</strong>
                  <p>
                    อัปเดตล่าสุด:{" "}
                    {new Date(room.last_message_at).toLocaleString("th-TH")}
                  </p>
                  <button
                    type="button"
                    onClick={() => openOwnerRoom(room)}
                  >
                    เปิดห้องแชต
                  </button>
                </article>
              ))
            )}

            {selectedOwnerRoom && (
              <div className="owner-chat">
                <h3>แชตกับ {selectedOwnerRoom.contact_name}</h3>

                {ownerChatLoading ? (
                  <p>กำลังโหลดข้อความ...</p>
                ) : (
                  <div className="chat-messages">
                    {ownerChatMessages.length === 0 ? (
                      <p>ยังไม่มีข้อความ</p>
                    ) : (
                      ownerChatMessages.map((message) => (
                        <article className="message-card" key={message.id}>
                          <strong>
                            {message.sender_role === "owner"
                              ? "คุณ (เจ้าของประกาศ)"
                              : selectedOwnerRoom.contact_name}
                          </strong>
                          <p>{message.message}</p>
                          <small>
                            {new Date(message.created_at).toLocaleString("th-TH")}
                          </small>
                        </article>
                      ))
                    )}
                  </div>
                )}

                <form onSubmit={sendOwnerReply}>
                  <label>ตอบกลับผู้ติดต่อ</label>
                  <textarea
                    value={ownerReply}
                    onChange={(e) => setOwnerReply(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="พิมพ์ข้อความ..."
                  />
                  <button type="submit">ส่งข้อความ</button>
                  <button
                    type="button"
                    onClick={() => openOwnerRoom(selectedOwnerRoom)}
                  >
                    โหลดข้อความใหม่
                  </button>
                </form>
              </div>
            )}

            <h3>ข้อความจากระบบเดิม</h3>
            {messages.length === 0 ? (
              <p>ยังไม่มีข้อความเดิม</p>
            ) : (
              messages.map((message) => (
                <article className="message-card" key={message.id}>
                  <strong>{message.sender_name || "ผู้ไม่ระบุชื่อ"}</strong>
                  <p>{message.message}</p>
                  <small>
                    {new Date(message.created_at).toLocaleString("th-TH")}
                  </small>
                </article>
              ))
            )}
          </div>
        )}
      </section>

      <section className="items-section">
        <h2>รายการประกาศ</h2>

        <input
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อสิ่งของ รายละเอียด หรือสถานที่..."
        />

        <div className="filters">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">ประกาศทุกประเภท</option>
            <option value="lost">ของหาย</option>
            <option value="found">พบของ</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">ทุกสถานะ</option>
            <option value="searching">กำลังตามหา</option>
            <option value="found">พบของแล้ว</option>
            <option value="returned">ส่งคืนเจ้าของแล้ว</option>
          </select>
        </div>

        {loading ? (
          <p>กำลังโหลดประกาศ...</p>
        ) : filteredItems.filter((item) => item.status !== "returned").length === 0 ? (
          <p>ไม่พบประกาศที่ค้นหา</p>
        ) : (
          <div className="item-grid">
            {filteredItems
              .filter((item) => item.status !== "returned")
              .map((item) => (
                <article className="item-card" key={item.id}>
                  <div className="item-tags">
                    <span className={item.type === "lost" ? "lost-tag" : "found-tag"}>
                      {item.type === "lost" ? "ของหาย" : "พบของ"}
                    </span>
                    <span className="status-tag">
                      {statusLabels[item.status] || item.status}
                    </span>
                  </div>

                  <h3>{item.title}</h3>
                  <p>{item.description || "ไม่มีรายละเอียด"}</p>
                  <p>
                    <strong>สถานที่:</strong> {item.location || "ไม่ระบุ"}
                  </p>
                  <small>
                    วันที่ลงประกาศ:{" "}
                    {new Date(item.created_at).toLocaleString("th-TH")}
                  </small>

                  {item.image_urls?.length > 0 && (
                    <div className="item-images">
                      {item.image_urls.map((url, index) => (
                        <a href={url} target="_blank" rel="noreferrer" key={index}>
                          <img src={url} alt={`รูปประกาศ ${index + 1}`} />
                        </a>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setOpenContactId(openContactId === item.id ? null : item.id);
                      setContactName("");
                      setContactMessage("");
                    }}
                  >
                    ติดต่อผ่านเว็บไซต์
                  </button>

                  {openContactId === item.id && (
                    <div className="contact-form">
                      <label>ชื่อผู้ติดต่อ (ไม่บังคับ)</label>
                      <input
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="ระบุชื่อหรือเว้นว่างได้"
                        maxLength={80}
                      />

                      <label>ข้อความ</label>
                      <textarea
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        placeholder="พิมพ์ข้อความถึงผู้แจ้งประกาศ"
                        rows={3}
                        maxLength={2000}
                      />

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => createChatRoom(item.id)}
                      >
                        {saving ? "กำลังสร้างห้องแชต..." : "เริ่มแชตส่วนตัว"}
                      </button>
                    </div>
                  )}
                </article>
              ))}
          </div>
        )}
      </section>

      <footer className="site-footer">
        School Lost &amp; Found
      </footer>
    </main>
  );
}
