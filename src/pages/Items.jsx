
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  PackageCheck,
  MapPin,
  Clock,
  RefreshCw,
  MessageCircle,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import "../App.css";

const CONTACT_STORAGE = "school_lost_found_contact_chats";

const categories = [
  { id: "all", name: "ทุกหมวดหมู่" },
  { id: "phone", name: "โทรศัพท์" },
  { id: "wallet", name: "กระเป๋าสตางค์" },
  { id: "bag", name: "กระเป๋า" },
  { id: "keys", name: "กุญแจ" },
  { id: "books", name: "หนังสือ" },
  { id: "clothing", name: "เสื้อผ้า" },
  { id: "electronics", name: "อุปกรณ์ไอที" },
  { id: "stationery", name: "เครื่องเขียน" },
  { id: "other", name: "อื่น ๆ" },
];

const statusLabels = {
  searching: "กำลังตามหา",
  found: "พบของแล้ว",
  returned: "ส่งคืนเจ้าของแล้ว",
};

function readContactChats() {
  try {
    const data = JSON.parse(
      localStorage.getItem(CONTACT_STORAGE) || "[]"
    );
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default function ItemsPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [openContactId, setOpenContactId] = useState(null);
  const [contactName, setContactName] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [contactError, setContactError] = useState("");

  async function fetchItems() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase
        .from("items")
        .select(
          "id,type,title,description,location,image_urls,status,category,created_at"
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      setItems(data || []);
    } catch (error) {
      setErrorMessage(
        error.message || "ไม่สามารถโหลดประกาศได้"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const keyword = search.trim().toLowerCase();

      const matchesSearch =
        !keyword ||
        [item.title, item.description, item.location]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(keyword)
          );

      const matchesType =
        typeFilter === "all" || item.type === typeFilter;

      const matchesCategory =
        categoryFilter === "all" ||
        (item.category || "other") === categoryFilter;

      return (
        matchesSearch &&
        matchesType &&
        matchesCategory &&
        item.status !== "returned"
      );
    });
  }, [items, search, typeFilter, categoryFilter]);

  function openContactForm(itemId) {
    setOpenContactId(openContactId === itemId ? null : itemId);
    setContactName("");
    setContactMessage("");
    setContactError("");
  }

  async function createChatRoom(item) {
    if (!contactMessage.trim()) {
      setContactError("กรุณาพิมพ์ข้อความก่อนเริ่มแชต");
      return;
    }

    setSaving(true);
    setContactError("");

    try {
      const { data, error } = await supabase.rpc(
        "create_private_chat_room",
        {
          p_item_id: item.id,
          p_contact_name: contactName.trim() || "ผู้ติดต่อ",
          p_message: contactMessage.trim(),
        }
      );

      if (error) throw error;

      let result = Array.isArray(data) ? data[0] : data;

      if (typeof result === "string") {
        result = JSON.parse(result);
      }

      const roomId = result?.room_id;
      const token = result?.contact_token;

      if (!roomId || !token) {
        throw new Error("ไม่พบรหัสห้องแชตหรือรหัสเข้าถึง");
      }

      const chatLink =
        `/chat#chat=${encodeURIComponent(roomId)}` +
        `&key=${encodeURIComponent(token)}`;

      const savedChats = readContactChats();

      const newChat = {
        room_id: String(roomId),
        token,
        item_id: String(item.id),
        item_title: item.title || "ประกาศ",
        link: window.location.origin + chatLink,
      };

      const updatedChats = [
        newChat,
        ...savedChats.filter(
          (room) => String(room.room_id) !== String(roomId)
        ),
      ];

      localStorage.setItem(
        CONTACT_STORAGE,
        JSON.stringify(updatedChats)
      );

      setOpenContactId(null);
      navigate(chatLink);
    } catch (error) {
      setContactError(
        "สร้างห้องแชตไม่สำเร็จ: " +
        (error.message || "เกิดข้อผิดพลาด")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="app">
      <header className="site-header">
        <h1>
          <PackageCheck size={27} />
          ค้นหาสิ่งของ
        </h1>

        <p>รายการของหายและของที่พบภายในโรงเรียน</p>

        <Link to="/">กลับหน้าหลัก</Link>
        {" | "}
        <Link to="/messages">กล่องข้อความ</Link>
      </header>

      <section className="items-section">
        <h2>รายการประกาศทั้งหมด</h2>

        <input
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อสิ่งของ รายละเอียด หรือสถานที่..."
        />

        <h3>ประเภทประกาศ</h3>

        <div className="category-grid">
          <button
            type="button"
            className={
              typeFilter === "all"
                ? "category-button active"
                : "category-button"
            }
            onClick={() => setTypeFilter("all")}
          >
            ทั้งหมด
          </button>

          <button
            type="button"
            className={
              typeFilter === "lost"
                ? "category-button active"
                : "category-button"
            }
            onClick={() => setTypeFilter("lost")}
          >
            ของหาย
          </button>

          <button
            type="button"
            className={
              typeFilter === "found"
                ? "category-button active"
                : "category-button"
            }
            onClick={() => setTypeFilter("found")}
          >
            พบของ
          </button>
        </div>

        <h3>หมวดหมู่สิ่งของ</h3>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={fetchItems}
          disabled={loading}
        >
          <RefreshCw size={16} />
          โหลดประกาศใหม่
        </button>

        {loading ? (
          <p>กำลังโหลดประกาศ...</p>
        ) : errorMessage ? (
          <p role="alert">{errorMessage}</p>
        ) : filteredItems.length === 0 ? (
          <p>ไม่พบประกาศที่ค้นหา</p>
        ) : (
          <>
            <p>พบ {filteredItems.length} รายการ</p>

            <div className="item-list">
              {filteredItems.map((item) => (
                <article className="item-card" key={item.id}>
                  <div>
                    <span
                      className={
                        item.type === "lost"
                          ? "lost-tag"
                          : "found-tag"
                      }
                    >
                      {item.type === "lost" ? "ของหาย" : "พบของ"}
                    </span>

                    <span className="status-tag">
                      {statusLabels[item.status] || item.status}
                    </span>
                  </div>

                  <h3>{item.title}</h3>

                  <p>{item.description || "ไม่มีรายละเอียด"}</p>

                  <p>
                    <MapPin size={15} />
                    สถานที่: {item.location || "ไม่ระบุ"}
                  </p>

                  <p>
                    <Clock size={15} />
                    หมวดหมู่:{" "}
                    {categories.find(
                      (c) => c.id === (item.category || "other")
                    )?.name || "อื่น ๆ"}
                  </p>

                  {item.image_urls?.length > 0 && (
                    <div className="item-images">
                      {item.image_urls.map((url, index) => (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          key={`${item.id}-${index}`}
                        >
                          <img
                            src={url}
                            alt={`รูปประกาศ ${index + 1}`}
                          />
                        </a>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => openContactForm(item.id)}
                  >
                    <MessageCircle size={17} />
                    ติดต่อผ่านเว็บไซต์
                  </button>

                  {openContactId === item.id && (
                    <div className="contact-form">
                      <h3>เริ่มแชตส่วนตัว</h3>

                      <label>ชื่อผู้ติดต่อ (ไม่บังคับ)</label>

                      <input
                        value={contactName}
                        onChange={(e) =>
                          setContactName(e.target.value)
                        }
                        placeholder="ระบุชื่อหรือเว้นว่างได้"
                        maxLength={80}
                      />

                      <label>ข้อความเริ่มต้น</label>

                      <textarea
                        value={contactMessage}
                        onChange={(e) =>
                          setContactMessage(e.target.value)
                        }
                        placeholder="พิมพ์ข้อความถึงเจ้าของประกาศ..."
                        rows={3}
                        maxLength={2000}
                      />

                      {contactError && (
                        <p role="alert">{contactError}</p>
                      )}

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => createChatRoom(item)}
                      >
                        <MessageCircle size={17} />
                        {saving
                          ? "กำลังสร้างห้องแชต..."
                          : "เริ่มแชตส่วนตัว"}
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
