
import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import "./App.css";

import {
  Search,
  PlusCircle,
  MessageCircle,
  MapPin,
  PackageCheck,
  UserRound,
  Home,
  Clock,
  CheckCircle,
  Smartphone,
  Wallet,
  KeyRound,
  BookOpen,
  Shirt,
  Headphones,
  Pencil,
  Package,
  Layers,
  MessageSquare,
  ArrowLeft,
} from "lucide-react";

const statusLabels = {
  searching: "กำลังตามหา",
  found: "พบของแล้ว",
  returned: "ส่งคืนเจ้าของแล้ว",
};

const categories = [
  { id: "all", name: "ทั้งหมด", icon: Layers },
  { id: "phone", name: "โทรศัพท์", icon: Smartphone },
  { id: "wallet", name: "กระเป๋าสตางค์", icon: Wallet },
  { id: "bag", name: "กระเป๋า", icon: Package },
  { id: "keys", name: "กุญแจ", icon: KeyRound },
  { id: "books", name: "หนังสือ", icon: BookOpen },
  { id: "clothing", name: "เสื้อผ้า", icon: Shirt },
  { id: "electronics", name: "อุปกรณ์ไอที", icon: Headphones },
  { id: "stationery", name: "เครื่องเขียน", icon: Pencil },
  { id: "other", name: "อื่น ๆ", icon: Package },
];

const iconStyle = {
  display: "inline-block",
  verticalAlign: "middle",
  marginRight: "7px",
};

const CONTACT_STORAGE = "school_lost_found_contact_chats";
const OWNER_STORAGE = "school_lost_found_owner_items";

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

function readStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    alert("บันทึกข้อมูลในเบราว์เซอร์ไม่สำเร็จ");
  }
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
  const [category, setCategory] = useState("other");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [createdSecret, setCreatedSecret] = useState(null);
  const [openContactId, setOpenContactId] = useState(null);
  const [contactName, setContactName] = useState("");
  const [contactMessage, setContactMessage] = useState("");

  const [manageId, setManageId] = useState("");
  const [manageToken, setManageToken] = useState("");
  const [manageStatus, setManageStatus] = useState("searching");
  const [messages, setMessages] = useState([]);
  const [manageLoaded, setManageLoaded] = useState(false);

  // แชตฝั่งผู้ติดต่อ
  const [contactRoomId, setContactRoomId] = useState("");
  const [contactToken, setContactToken] = useState("");
  const [contactChatMessages, setContactChatMessages] = useState([]);
  const [contactReply, setContactReply] = useState("");
  const [contactChatLoading, setContactChatLoading] = useState(false);
  const [createdChatLink, setCreatedChatLink] = useState("");

  // แชตฝั่งเจ้าของประกาศ
  const [ownerRooms, setOwnerRooms] = useState([]);
  const [selectedOwnerRoom, setSelectedOwnerRoom] = useState(null);
  const [ownerChatMessages, setOwnerChatMessages] = useState([]);
  const [ownerReply, setOwnerReply] = useState("");
  const [ownerChatLoading, setOwnerChatLoading] = useState(false);

  // รายการแชตที่บันทึกไว้ในเครื่อง
  const [savedContactChats, setSavedContactChats] = useState([]);
  const [savedOwnerItems, setSavedOwnerItems] = useState([]);
  const [chatView, setChatView] = useState(false);
  const [chatTab, setChatTab] = useState("contact");

  async function fetchItems() {
    setLoading(true);

    const { data, error } = await supabase
      .from("items")
      .select(
        "id,type,title,description,location,image_urls,status,category,created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      alert("โหลดประกาศไม่สำเร็จ: " + error.message);
    } else {
      setItems(data || []);
    }

    setLoading(false);
  }

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
      setContactRoomId(String(roomId));
      setContactToken(token);
    }

    setContactChatLoading(false);
  }

  useEffect(() => {
    fetchItems();

    setSavedContactChats(readStorage(CONTACT_STORAGE));
    setSavedOwnerItems(readStorage(OWNER_STORAGE));

    const params = new URLSearchParams(
      window.location.hash.slice(1)
    );

    const roomId = params.get("chat");
    const token = params.get("key");

    if (roomId && token) {
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

      const matchesCategory =
        categoryFilter === "all" ||
        (item.category || "other") === categoryFilter;

      return (
        matchesSearch &&
        matchesType &&
        matchesStatus &&
        matchesCategory
      );
    });
  }, [
    items,
    search,
    typeFilter,
    statusFilter,
    categoryFilter,
  ]);

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
    setImages((previous) =>
      previous.filter((_, i) => i !== index)
    );
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

        const path =
          `${Date.now()}-${crypto.randomUUID()}.${extension}`;

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
          p_category: category,
        }
      );

      if (error) throw error;

      setCreatedSecret({ id: newId, token });

      // บันทึกข้อมูลเจ้าของประกาศไว้ในเครื่องนี้
      const ownerEntry = {
        item_id: String(newId),
        token,
        title: title.trim(),
      };

      const updatedOwners = [
        ...readStorage(OWNER_STORAGE).filter(
          (entry) => String(entry.item_id) !== String(newId)
        ),
        ownerEntry,
      ];

      saveStorage(OWNER_STORAGE, updatedOwners);
      setSavedOwnerItems(updatedOwners);

      setTitle("");
      setDescription("");
      setLocation("");
      setImages([]);
      setType("lost");
      setCategory("other");

      await fetchItems();
    } catch (error) {
      alert("ลงประกาศไม่สำเร็จ: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  function rememberContactChat(roomId, token, itemId, itemTitle) {
    const link =
      `${window.location.origin}${window.location.pathname}` +
      `#chat=${encodeURIComponent(roomId)}` +
      `&key=${encodeURIComponent(token)}`;

    const entry = {
      room_id: String(roomId),
      token,
      item_id: String(itemId),
      item_title: itemTitle || "ประกาศ",
      link,
    };

    const updated = [
      ...readStorage(CONTACT_STORAGE).filter(
        (room) => String(room.room_id) !== String(roomId)
      ),
      entry,
    ];

    saveStorage(CONTACT_STORAGE, updated);
    setSavedContactChats(updated);

    return link;
  }

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
      const item = items.find(
        (entry) => String(entry.id) === String(itemId)
      );

      const link = rememberContactChat(
        roomId,
        token,
        itemId,
        item?.title
      );

      setCreatedChatLink(link);
      setContactMessage("");
      setContactName("");
      setOpenContactId(null);

      window.history.replaceState(null, "", link);

      await loadContactChat(roomId, token);

      alert("สร้างห้องแชตเรียบร้อยแล้ว กรุณาเก็บลิงก์ไว้");
    } catch (error) {
      alert("สร้างห้องแชตไม่สำเร็จ: " + error.message);
    } finally {
      setSaving(false);
    }
  }

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

  async function openSavedContactChat(room) {
    setChatView(false);
    setSelectedOwnerRoom(null);
    setContactReply("");

    const link =
      `${window.location.origin}${window.location.pathname}` +
      `#chat=${encodeURIComponent(room.room_id)}` +
      `&key=${encodeURIComponent(room.token)}`;

    window.history.replaceState(null, "", link);

    await loadContactChat(room.room_id, room.token);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function loadManageMessages(event) {
    if (event) event.preventDefault();

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

    const item = items.find(
      (entry) => String(entry.id) === String(itemId)
    );

    setManageStatus(item?.status || "searching");
    setMessages(oldMessages || []);
    setOwnerRooms(rooms || []);
    setSelectedOwnerRoom(null);
    setOwnerChatMessages([]);
    setManageLoaded(true);

    // บันทึกรหัสเจ้าของประกาศไว้ในเครื่อง
    const ownerEntry = {
      item_id: String(itemId),
      token: manageToken.trim(),
      title: item?.title || `ประกาศ #${itemId}`,
    };

    const updated = [
      ...readStorage(OWNER_STORAGE).filter(
        (entry) => String(entry.item_id) !== String(itemId)
      ),
      ownerEntry,
    ];

    saveStorage(OWNER_STORAGE, updated);
    setSavedOwnerItems(updated);
  }

  async function loadAllOwnerRooms() {
    const owners = readStorage(OWNER_STORAGE);
    const allRooms = [];

    for (const owner of owners) {
      const { data, error } = await supabase.rpc(
        "owner_list_private_chat_rooms",
        {
          p_item_id: Number(owner.item_id),
          p_manage_token: owner.token,
        }
      );

      if (error) {
        console.warn(
          "โหลดห้องแชตประกาศ #" + owner.item_id + " ไม่สำเร็จ",
          error.message
        );
        continue;
      }

      for (const room of data || []) {
        allRooms.push({
          ...room,
          item_id: owner.item_id,
          item_title: owner.title,
          owner_token: owner.token,
        });
      }
    }

    allRooms.sort(
      (a, b) =>
        new Date(b.last_message_at || 0) -
        new Date(a.last_message_at || 0)
    );

    setOwnerRooms(allRooms);
  }

  async function openOwnerRoom(room) {
    setSelectedOwnerRoom(room);
    setOwnerChatLoading(true);
    setOwnerReply("");

    const token = room.owner_token || manageToken.trim();

    const { data, error } = await supabase.rpc(
      "owner_get_private_chat_messages",
      {
        p_room_id: room.room_id,
        p_manage_token: token,
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

  async function sendOwnerReply(event) {
    event.preventDefault();

    if (!ownerReply.trim() || !selectedOwnerRoom) return;

    const token =
      selectedOwnerRoom.owner_token || manageToken.trim();

    const { error } = await supabase.rpc(
      "owner_send_private_chat_message",
      {
        p_room_id: selectedOwnerRoom.room_id,
        p_manage_token: token,
        p_message: ownerReply.trim(),
      }
    );

    if (error) {
      alert("ส่งข้อความไม่สำเร็จ: " + error.message);
      return;
    }

    setOwnerReply("");
    await openOwnerRoom(selectedOwnerRoom);
    await loadAllOwnerRooms();
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

  async function openChatDashboard() {
    setChatView(true);
    setContactRoomId("");
    setContactToken("");
    setSelectedOwnerRoom(null);
    setOwnerChatMessages([]);
    setContactChatMessages([]);

    await loadAllOwnerRooms();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeChatDashboard() {
    setChatView(false);
    setSelectedOwnerRoom(null);
    setOwnerChatMessages([]);
    setContactRoomId("");
    setContactToken("");
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search
    );
  }

  const visibleItems = filteredItems.filter(
    (item) => item.status !== "returned"
  );

  const currentCategoryName =
    categories.find((item) => item.id === categoryFilter)?.name ||
    "ทั้งหมด";

  return (
    <main className="app">
      <header className="site-header">
        <h1>
          <Home size={28} style={iconStyle} />
          School Lost &amp; Found
        </h1>
        <p>ระบบแจ้งของหายและของที่พบภายในโรงเรียน</p>

        <button
          type="button"
          className="primary-button"
          onClick={openChatDashboard}
        >
          <MessageCircle size={19} style={iconStyle} />
          กล่องข้อความของฉัน
          {savedContactChats.length + ownerRooms.length > 0 && (
            <span>
              {" "}({savedContactChats.length + ownerRooms.length})
            </span>
          )}
        </button>
      </header>

      {chatView && (
        <section className="manage-section">
          <button type="button" onClick={closeChatDashboard}>
            <ArrowLeft size={17} style={iconStyle} />
            กลับหน้าเว็บไซต์
          </button>

          <h2>
            <MessageSquare size={23} style={iconStyle} />
            กล่องข้อความของฉัน
          </h2>

          <div className="filters">
            <button
              type="button"
              className={chatTab === "contact" ? "primary-button" : ""}
              onClick={() => {
                setChatTab("contact");
                setSelectedOwnerRoom(null);
              }}
            >
              แชตที่ฉันเป็นผู้ติดต่อ ({savedContactChats.length})
            </button>

            <button
              type="button"
              className={chatTab === "owner" ? "primary-button" : ""}
              onClick={() => {
                setChatTab("owner");
                setSelectedOwnerRoom(null);
                loadAllOwnerRooms();
              }}
            >
              แชตในประกาศของฉัน ({ownerRooms.length})
            </button>
          </div>

          {chatTab === "contact" && (
            <>
              <h3>ห้องแชตที่ฉันเคยติดต่อ</h3>

              {savedContactChats.length === 0 ? (
                <p>ยังไม่มีห้องแชตที่บันทึกไว้ในเครื่องนี้</p>
              ) : (
                savedContactChats.map((room) => (
                  <article
                    className="message-card"
                    key={room.room_id}
                  >
                    <strong>
                      <MessageCircle size={16} style={iconStyle} />
                      {room.item_title || "ประกาศ"}
                    </strong>
                    <p>รหัสห้องแชต: {room.room_id}</p>
                    <button
                      type="button"
                      onClick={() => openSavedContactChat(room)}
                    >
                      เปิดบทสนทนา
                    </button>
                  </article>
                ))
              )}
            </>
          )}

          {chatTab === "owner" && (
            <>
              <h3>ห้องแชตในประกาศของฉัน</h3>

              {ownerRooms.length === 0 ? (
                <p>
                  ยังไม่พบห้องแชต หากมีประกาศเดิมที่ต้องการเพิ่ม
                  ให้กรอกรหัสประกาศและรหัสจัดการในส่วนจัดการประกาศก่อน
                </p>
              ) : (
                ownerRooms.map((room) => (
                  <article
                    className="message-card"
                    key={`${room.item_id}-${room.room_id}`}
                  >
                    <strong>
                      <UserRound size={16} style={iconStyle} />
                      {room.contact_name || "ผู้ติดต่อ"}
                    </strong>
                    <p>
                      ประกาศ: {room.item_title || `#${room.item_id}`}
                    </p>
                    <small>
                      <Clock size={13} style={iconStyle} />
                      {room.last_message_at
                        ? new Date(room.last_message_at).toLocaleString("th-TH")
                        : "ยังไม่มีเวลาอัปเดต"}
                    </small>
                    <button
                      type="button"
                      onClick={() => openOwnerRoom(room)}
                    >
                      เปิดบทสนทนา
                    </button>
                  </article>
                ))
              )}

              {selectedOwnerRoom && (
                <div className="owner-chat">
                  <h3>
                    แชตกับ {selectedOwnerRoom.contact_name}
                  </h3>

                  {ownerChatLoading ? (
                    <p>กำลังโหลดข้อความ...</p>
                  ) : (
                    <div className="chat-messages">
                      {ownerChatMessages.map((message) => (
                        <article
                          className="message-card"
                          key={message.id}
                        >
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
                      ))}
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
                    <button type="submit">
                      ส่งข้อความ
                    </button>
                  </form>
                </div>
              )}
            </>
          )}

          {contactRoomId && (
            <div className="owner-chat">
              <h3>แชตในฐานะผู้ติดต่อ</h3>

              {contactChatLoading ? (
                <p>กำลังโหลดข้อความ...</p>
              ) : (
                <div className="chat-messages">
                  {contactChatMessages.map((message) => (
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
                  ))}
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
              </form>
            </div>
          )}
        </section>
      )}

      {!chatView && (
        <>
          <section className="form-section">
            <h2>
              <PlusCircle size={22} style={iconStyle} />
              ลงประกาศใหม่
            </h2>

            <form onSubmit={handleSubmit}>
              <label>ประเภทประกาศ</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="lost">แจ้งของหาย</option>
                <option value="found">แจ้งพบของ</option>
              </select>

              <label>หมวดหมู่สิ่งของ</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories
                  .filter((item) => item.id !== "all")
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
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

              <label>
                <MapPin size={16} style={iconStyle} />
                สถานที่ที่หายหรือพบ
              </label>
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
                    <div
                      className="selected-file"
                      key={`${file.name}-${index}`}
                    >
                      <span>{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                      >
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
                <PlusCircle size={18} style={iconStyle} />
                {saving ? "กำลังลงประกาศ..." : "ลงประกาศ"}
              </button>
            </form>
          </section>

          {createdSecret && (
            <section className="secret-box">
              <h2>
                <CheckCircle size={22} style={iconStyle} />
                ประกาศสำเร็จ!
              </h2>
              <p>เก็บรหัสทั้งสองรายการนี้ไว้</p>
              <p>
                <strong>รหัสประกาศ:</strong> {createdSecret.id}
              </p>
              <p className="token-text">
                <strong>รหัสจัดการ:</strong> {createdSecret.token}
              </p>
              <button type="button" onClick={copyToken}>
                คัดลอกรหัสเก็บไว้
              </button>
              <button
                type="button"
                onClick={() => setCreatedSecret(null)}
              >
                ปิด
              </button>
            </section>
          )}

          {createdChatLink && (
            <section className="secret-box">
              <h2>
                <CheckCircle size={22} style={iconStyle} />
                สร้างห้องแชตสำเร็จ!
              </h2>
              <p>คัดลอกลิงก์นี้เก็บไว้ด้วย</p>
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

          {contactRoomId && (
            <section className="manage-section">
              <h2>
                <MessageCircle size={22} style={iconStyle} />
                แชตส่วนตัวของคุณ
              </h2>

              {contactChatLoading ? (
                <p>กำลังโหลดข้อความ...</p>
              ) : (
                <div className="chat-messages">
                  {contactChatMessages.map((message) => (
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
                  ))}
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
                  onClick={() =>
                    loadContactChat(contactRoomId, contactToken)
                  }
                >
                  โหลดข้อความใหม่
                </button>
              </form>
            </section>
          )}

          <section className="manage-section">
            <h2>
              <UserRound size={22} style={iconStyle} />
              จัดการประกาศและอ่านข้อความ
            </h2>
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

              <button type="submit">
                <CheckCircle size={17} style={iconStyle} />
                เปิดข้อมูลประกาศ
              </button>
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
                  <button type="submit">
                    <PackageCheck size={17} style={iconStyle} />
                    บันทึกสถานะ
                  </button>
                </form>

                <h3>
                  <MessageCircle size={19} style={iconStyle} />
                  ห้องแชตส่วนตัว ({ownerRooms.length})
                </h3>

                {ownerRooms.length === 0 ? (
                  <p>ยังไม่มีห้องแชต</p>
                ) : (
                  ownerRooms.map((room) => (
                    <article
                      className="message-card"
                      key={room.room_id}
                    >
                      <strong>
                        <UserRound size={16} style={iconStyle} />
                        {room.contact_name}
                      </strong>
                      <p>
                        อัปเดตล่าสุด:{" "}
                        {room.last_message_at
                          ? new Date(room.last_message_at).toLocaleString("th-TH")
                          : "-"}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          openOwnerRoom({
                            ...room,
                            owner_token: manageToken.trim(),
                            item_id: manageId,
                          })
                        }
                      >
                        เปิดห้องแชต
                      </button>
                    </article>
                  ))
                )}

                {selectedOwnerRoom && (
                  <div className="owner-chat">
                    <h3>
                      แชตกับ {selectedOwnerRoom.contact_name}
                    </h3>

                    {ownerChatLoading ? (
                      <p>กำลังโหลดข้อความ...</p>
                    ) : (
                      <div className="chat-messages">
                        {ownerChatMessages.map((message) => (
                          <article
                            className="message-card"
                            key={message.id}
                          >
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
                        ))}
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
                      <strong>
                        {message.sender_name || "ผู้ไม่ระบุชื่อ"}
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
          </section>

          <section className="items-section">
            <h2>
              <PackageCheck size={23} style={iconStyle} />
              รายการประกาศ
            </h2>

            <div style={{ position: "relative" }}>
              <Search
                size={19}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#777",
                }}
              />
              <input
                className="search-input"
                style={{ paddingLeft: "40px" }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อสิ่งของ รายละเอียด หรือสถานที่..."
              />
            </div>

            <h3>เลือกหมวดหมู่</h3>

            <div className="category-grid">
              {categories.map((item) => {
                const Icon = item.icon;
                const active = categoryFilter === item.id;

                return (
                  <button
                    type="button"
                    key={item.id}
                    className={
                      active
                        ? "category-button active"
                        : "category-button"
                    }
                    onClick={() => setCategoryFilter(item.id)}
                  >
                    <Icon size={25} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>

            <p>
              กำลังแสดงหมวดหมู่: <strong>{currentCategoryName}</strong>
            </p>

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
            ) : visibleItems.length === 0 ? (
              <p>ไม่พบประกาศในหมวดหมู่นี้</p>
            ) : (
              <div className="item-grid">
                {visibleItems.map((item) => {
                  const itemCategory = categories.find(
                    (entry) => entry.id === (item.category || "other")
                  );
                  const CategoryIcon = itemCategory?.icon || Package;

                  return (
                    <article className="item-card" key={item.id}>
                      <div className="item-tags">
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
                          {item.status === "found" ? (
                            <CheckCircle size={14} style={iconStyle} />
                          ) : (
                            <Clock size={14} style={iconStyle} />
                          )}
                          {statusLabels[item.status] || item.status}
                        </span>
                      </div>

                      <p>
                        <CategoryIcon size={16} style={iconStyle} />
                        {itemCategory?.name || "อื่น ๆ"}
                      </p>

                      <h3>{item.title}</h3>
                      <p>{item.description || "ไม่มีรายละเอียด"}</p>

                      <p>
                        <MapPin size={15} style={iconStyle} />
                        <strong>สถานที่:</strong>{" "}
                        {item.location || "ไม่ระบุ"}
                      </p>

                      <small>
                        <Clock size={13} style={iconStyle} />
                        วันที่ลงประกาศ:{" "}
                        {new Date(item.created_at).toLocaleString("th-TH")}
                      </small>

                      {item.image_urls?.length > 0 && (
                        <div className="item-images">
                          {item.image_urls.map((url, index) => (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              key={index}
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
                        onClick={() => {
                          setOpenContactId(
                            openContactId === item.id ? null : item.id
                          );
                          setContactName("");
                          setContactMessage("");
                        }}
                      >
                        <MessageCircle size={17} style={iconStyle} />
                        ติดต่อผ่านเว็บไซต์
                      </button>

                      {openContactId === item.id && (
                        <div className="contact-form">
                          <label>
                            <UserRound size={15} style={iconStyle} />
                            ชื่อผู้ติดต่อ (ไม่บังคับ)
                          </label>
                          <input
                            value={contactName}
                            onChange={(e) =>
                              setContactName(e.target.value)
                            }
                            placeholder="ระบุชื่อหรือเว้นว่างได้"
                            maxLength={80}
                          />

                          <label>ข้อความ</label>
                          <textarea
                            value={contactMessage}
                            onChange={(e) =>
                              setContactMessage(e.target.value)
                            }
                            placeholder="พิมพ์ข้อความถึงผู้แจ้งประกาศ"
                            rows={3}
                            maxLength={2000}
                          />

                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => createChatRoom(item.id)}
                          >
                            <MessageCircle size={17} style={iconStyle} />
                            {saving
                              ? "กำลังสร้างห้องแชต..."
                              : "เริ่มแชตส่วนตัว"}
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      <footer className="site-footer">
        <Home size={16} style={iconStyle} />
        School Lost &amp; Found
      </footer>
    </main>
  );
}
