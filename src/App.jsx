
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

// ------------------------------
// ค่าพื้นฐานของเว็บไซต์
// ------------------------------

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

// ------------------------------
// ฟังก์ชันช่วยเหลือ
// ------------------------------

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
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    alert("บันทึกข้อมูลในเบราว์เซอร์ไม่สำเร็จ");
    return false;
  }
}

function getErrorMessage(error) {
  return error?.message || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
}

function formatDate(date) {
  if (!date) return "-";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleString("th-TH");
}

function getRpcObject(data) {
  if (Array.isArray(data)) return data[0] || {};
  return data || {};
}

// ------------------------------
// App
// ------------------------------

export default function App() {
  // รายการประกาศ
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // แบบฟอร์มประกาศ
  const [type, setType] = useState("lost");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [images, setImages] = useState([]);
  const [category, setCategory] = useState("other");

  // ตัวกรอง
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // ข้อมูลหลังลงประกาศ
  const [createdSecret, setCreatedSecret] = useState(null);

  // แบบฟอร์มติดต่อ
  const [openContactId, setOpenContactId] = useState(null);
  const [contactName, setContactName] = useState("");
  const [contactMessage, setContactMessage] = useState("");

  // จัดการประกาศ
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

  // ข้อมูลที่บันทึกในเครื่อง
  const [savedContactChats, setSavedContactChats] = useState([]);
  const [savedOwnerItems, setSavedOwnerItems] = useState([]);

  // จำนวนข้อความที่ยังไม่อ่านของผู้ติดต่อ
  const [contactUnreadCounts, setContactUnreadCounts] = useState({});

  // หน้ากล่องข้อความ
  const [chatView, setChatView] = useState(false);
  const [chatTab, setChatTab] = useState("contact");

  // ------------------------------
  // โหลดประกาศ
  // ------------------------------

  async function fetchItems() {
    setLoading(true);

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
      alert("โหลดประกาศไม่สำเร็จ: " + getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------
  // โหลดแชตผู้ติดต่อ
  // ------------------------------

  async function loadContactChat(roomId, token, options = {}) {
    if (!roomId || !token) return;

    const silent = options.silent === true;

    if (!silent) {
      setContactChatLoading(true);
    }

    try {
      const { data, error } = await supabase.rpc(
        "get_private_chat_messages",
        {
          p_room_id: roomId,
          p_contact_token: token,
        }
      );

      if (error) throw error;

      setContactRoomId(String(roomId));
      setContactToken(token);
      setContactChatMessages(data || []);

      const { error: readError } = await supabase.rpc(
        "mark_contact_chat_read",
        {
          p_room_id: roomId,
          p_contact_token: token,
        }
      );

      if (readError) throw readError;
    } catch (error) {
      if (!silent) {
        alert("เปิดห้องแชตไม่สำเร็จ: " + getErrorMessage(error));
      }

      console.error("โหลดแชตผู้ติดต่อไม่สำเร็จ:", error);
    } finally {
      if (!silent) {
        setContactChatLoading(false);
      }
    }
  }

  // ------------------------------
  // ตรวจสอบข้อความที่ยังไม่อ่านของผู้ติดต่อ
  // ------------------------------

  async function refreshContactUnreadCounts() {
    const chats = readStorage(CONTACT_STORAGE);
    const counts = {};

    await Promise.all(
      chats.map(async (room) => {
        try {
          const { data, error } = await supabase.rpc(
            "get_private_chat_messages_with_unread",
            {
              p_room_id: room.room_id,
              p_contact_token: room.token,
            }
          );

          if (error) throw error;

          counts[room.room_id] =
            Number(data?.[0]?.unread_count || 0);
        } catch (error) {
          console.warn(
            "ตรวจสอบข้อความใหม่ไม่สำเร็จ:",
            error.message
          );
        }
      })
    );

    setContactUnreadCounts({ ...counts });
  }

  // ------------------------------
  // เริ่มต้นเว็บไซต์
  // ------------------------------

  useEffect(() => {
    fetchItems();

    const contacts = readStorage(CONTACT_STORAGE);
    const owners = readStorage(OWNER_STORAGE);

    setSavedContactChats(contacts);
    setSavedOwnerItems(owners);

    const params = new URLSearchParams(
      window.location.hash.slice(1)
    );

    const roomId = params.get("chat");
    const token = params.get("key");

    if (roomId && token) {
      loadContactChat(roomId, token);
    }
  }, []);

  // ------------------------------
  // ค้นหาและกรองประกาศ
  // ------------------------------

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

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      const matchesCategory =
        categoryFilter === "all" ||
        (item.category || "other") === categoryFilter;

      const notReturned = item.status !== "returned";

      return (
        matchesSearch &&
        matchesType &&
        matchesStatus &&
        matchesCategory &&
        notReturned
      );
    });
  }, [
    items,
    search,
    typeFilter,
    statusFilter,
    categoryFilter,
  ]);

  // ------------------------------
  // สถิติประกาศ
  // ------------------------------

  const statistics = useMemo(() => {
    return {
      lost: items.filter((item) => item.type === "lost").length,
      found: items.filter((item) => item.type === "found").length,
      returned: items.filter((item) => item.status === "returned").length,
      total: items.length,
    };
  }, [items]);

  // ------------------------------
  // จัดการรูปภาพ
  // ------------------------------

  function handleImageChange(event) {
    const selected = Array.from(event.target.files || []);

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

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

  // ------------------------------
  // ลงประกาศ
  // ------------------------------

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

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

      const { data, error } = await supabase.rpc(
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

      const newId = Array.isArray(data) ? data[0] : data;

      if (newId === null || newId === undefined) {
        throw new Error("ไม่พบรหัสประกาศที่สร้างขึ้น");
      }

      setCreatedSecret({
        id: newId,
        token,
      });

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
      alert("ลงประกาศไม่สำเร็จ: " + getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  // ------------------------------
  // บันทึกห้องแชตผู้ติดต่อ
  // ------------------------------

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

  // ------------------------------
  // สร้างห้องแชต
  // ------------------------------

  async function createChatRoom(itemId) {
    if (saving) return;

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

      const result = getRpcObject(data);
      const roomId = result.room_id;
      const token = result.contact_token;

      if (!roomId || !token) {
        throw new Error("ไม่ได้รับข้อมูลห้องแชตจากระบบ");
      }

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

      window.scrollTo({ top: 0, behavior: "smooth" });

      alert("สร้างห้องแชตเรียบร้อยแล้ว กรุณาเก็บลิงก์ไว้");
    } catch (error) {
      alert("สร้างห้องแชตไม่สำเร็จ: " + getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  // ------------------------------
  // ส่งข้อความผู้ติดต่อ
  // ------------------------------

  async function sendContactReply(event) {
    event.preventDefault();

    if (!contactReply.trim() || !contactRoomId || !contactToken) {
      return;
    }

    try {
      const { error } = await supabase.rpc(
        "send_private_chat_message_contact",
        {
          p_room_id: contactRoomId,
          p_contact_token: contactToken,
          p_message: contactReply.trim(),
        }
      );

      if (error) throw error;

      setContactReply("");
      await loadContactChat(contactRoomId, contactToken);
    } catch (error) {
      alert("ส่งข้อความไม่สำเร็จ: " + getErrorMessage(error));
    }
  }

  // ------------------------------
  // เปิดแชตที่เคยบันทึกไว้
  // ------------------------------

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

  // ------------------------------
  // โหลดข้อมูลเจ้าของประกาศ
  // ------------------------------

  async function loadManageMessages(event) {
    if (event) event.preventDefault();

    if (!manageId.trim() || !manageToken.trim()) {
      alert("กรุณากรอกรหัสประกาศและรหัสจัดการ");
      return;
    }

    const itemId = Number(manageId);

    if (!Number.isInteger(itemId) || itemId <= 0) {
      alert("รหัสประกาศไม่ถูกต้อง");
      return;
    }

    try {
      const { data: oldMessages, error: oldError } =
        await supabase.rpc("get_contact_messages", {
          p_item_id: itemId,
          p_manage_token: manageToken.trim(),
        });

      if (oldError) throw oldError;

      const { data: rooms, error: roomsError } =
        await supabase.rpc("owner_list_private_chat_rooms_with_unread", {
          p_item_id: itemId,
          p_manage_token: manageToken.trim(),
        });

      if (roomsError) throw roomsError;

      const item = items.find(
        (entry) => String(entry.id) === String(itemId)
      );

      setManageStatus(item?.status || "searching");
      setMessages(oldMessages || []);
      setOwnerRooms(rooms || []);
      setSelectedOwnerRoom(null);
      setOwnerChatMessages([]);
      setManageLoaded(true);

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
    } catch (error) {
      alert("เปิดข้อมูลไม่สำเร็จ: " + getErrorMessage(error));
      setManageLoaded(false);
    }
  }

  // ------------------------------
  // โหลดห้องแชตทั้งหมดของเจ้าของ
  // ------------------------------

  async function loadAllOwnerRooms() {
    const owners = readStorage(OWNER_STORAGE);
    const allRooms = [];

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
          console.warn(
            "โหลดห้องแชตไม่สำเร็จ:",
            error.message
          );
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

    for (const rooms of results) {
      allRooms.push(...rooms);
    }

    allRooms.sort(
      (a, b) =>
        new Date(b.last_message_at || 0) -
        new Date(a.last_message_at || 0)
    );

    setOwnerRooms(allRooms);
  }

  // ------------------------------
  // เปิดแชตเจ้าของประกาศ
  // ------------------------------

  async function openOwnerRoom(room, options = {}) {
    const silent = options.silent === true;

    setSelectedOwnerRoom(room);

    if (!silent) {
      setOwnerChatLoading(true);
      setOwnerReply("");
    }

    const token = room.owner_token || manageToken.trim();

    try {
      const { data, error } = await supabase.rpc(
        "owner_get_private_chat_messages",
        {
          p_room_id: room.room_id,
          p_manage_token: token,
        }
      );

      if (error) throw error;

      setOwnerChatMessages(data || []);

      const { error: readError } = await supabase.rpc(
        "mark_owner_chat_read",
        {
          p_room_id: room.room_id,
          p_manage_token: token,
        }
      );

      if (readError) throw readError;

      await loadAllOwnerRooms();
    } catch (error) {
      if (!silent) {
        alert("เปิดห้องแชตไม่สำเร็จ: " + getErrorMessage(error));
      }

      console.error("โหลดแชตเจ้าของไม่สำเร็จ:", error);
    } finally {
      if (!silent) {
        setOwnerChatLoading(false);
      }
    }
  }

  // ------------------------------
  // ส่งข้อความเจ้าของประกาศ
  // ------------------------------

  async function sendOwnerReply(event) {
    event.preventDefault();

    if (!ownerReply.trim() || !selectedOwnerRoom) return;

    const room = selectedOwnerRoom;
    const token = room.owner_token || manageToken.trim();

    try {
      const { error } = await supabase.rpc(
        "owner_send_private_chat_message",
        {
          p_room_id: room.room_id,
          p_manage_token: token,
          p_message: ownerReply.trim(),
        }
      );

      if (error) throw error;

      setOwnerReply("");

      await openOwnerRoom(room);
      await loadAllOwnerRooms();
    } catch (error) {
      alert("ส่งข้อความไม่สำเร็จ: " + getErrorMessage(error));
    }
  }

  // ------------------------------
  // เปลี่ยนสถานะประกาศ
  // ------------------------------

  async function changeStatus(event) {
    event.preventDefault();

    if (!manageId.trim() || !manageToken.trim()) return;

    try {
      const { error } = await supabase.rpc("update_item_status", {
        p_item_id: Number(manageId),
        p_manage_token: manageToken.trim(),
        p_status: manageStatus,
      });

      if (error) throw error;

      alert("เปลี่ยนสถานะเรียบร้อยแล้ว");

      await fetchItems();
    } catch (error) {
      alert("เปลี่ยนสถานะไม่สำเร็จ: " + getErrorMessage(error));
    }
  }

  // ------------------------------
  // โหลดข้อความและแจ้งเตือนอัตโนมัติ
  // ------------------------------

  useEffect(() => {
    if (!contactRoomId && !selectedOwnerRoom) return;

    let running = false;

    const timer = setInterval(async () => {
      if (running) return;

      running = true;

      try {
        if (contactRoomId && contactToken) {
          await loadContactChat(contactRoomId, contactToken, {
            silent: true,
          });
        }

        if (selectedOwnerRoom) {
          await openOwnerRoom(selectedOwnerRoom, {
            silent: true,
          });
        }
      } finally {
        running = false;
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [
    contactRoomId,
    contactToken,
    selectedOwnerRoom?.room_id,
    selectedOwnerRoom?.owner_token,
    manageToken,
  ]);

  // ------------------------------
  // โหลดจำนวนข้อความที่ยังไม่อ่านอัตโนมัติ
  // ------------------------------

  useEffect(() => {
    if (!chatView) return;

    let running = false;

    const refresh = async () => {
      if (running) return;

      running = true;

      try {
        await Promise.all([
          refreshContactUnreadCounts(),
          loadAllOwnerRooms(),
        ]);
      } finally {
        running = false;
      }
    };

    refresh();

    const timer = setInterval(refresh, 5000);

    return () => clearInterval(timer);
  }, [chatView]);

  // ------------------------------
  // คัดลอกรหัสและลิงก์
  // ------------------------------

  async function copyToken() {
    if (!createdSecret) return;

    const text =
      `รหัสประกาศ: ${createdSecret.id}\n` +
      `รหัสจัดการ: ${createdSecret.token}`;

    try {
      await navigator.clipboard.writeText(text);
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

  // ------------------------------
  // เปิดและปิดกล่องข้อความ
  // ------------------------------

  async function openChatDashboard() {
    setChatView(true);
    setContactRoomId("");
    setContactToken("");
    setContactChatMessages([]);
    setSelectedOwnerRoom(null);
    setOwnerChatMessages([]);

    await Promise.all([
      loadAllOwnerRooms(),
      refreshContactUnreadCounts(),
    ]);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeChatDashboard() {
    setChatView(false);
    setSelectedOwnerRoom(null);
    setOwnerChatMessages([]);
    setContactRoomId("");
    setContactToken("");
    setContactChatMessages([]);

    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search
    );
  }

  const currentCategoryName =
    categories.find((item) => item.id === categoryFilter)?.name ||
    "ทั้งหมด";

  // ------------------------------
  // หน้าตาเว็บไซต์
  // ------------------------------

  return (
    <main className="app">

      {/* ส่วนหัวเว็บไซต์ */}

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
          {savedContactChats.length + savedOwnerItems.length > 0 && (
            <span>
              {" "}({savedContactChats.length + savedOwnerItems.length})
            </span>
          )}
        </button>
      </header>

      {/* แดชบอร์ดสถิติ */}

      {!chatView && (
        <section
          style={{
            margin: "24px 0",
            padding: "22px",
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "16px",
          }}
        >
          <h2 style={{ color: "#142b4a", marginTop: 0 }}>
            <PackageCheck size={22} style={iconStyle} />
            สถิติการแจ้งของหายและพบของ
          </h2>

          <p style={{ color: "#64748b", marginTop: "-5px" }}>
            สรุปข้อมูลประกาศทั้งหมดในระบบ
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "14px",
            }}
          >
            <div
              style={{
                padding: "18px",
                borderRadius: "12px",
                background: "#eff6ff",
                border: "1px solid #dbeafe",
              }}
            >
              <div style={{ color: "#1d4ed8", fontSize: "14px" }}>
                แจ้งของหาย
              </div>
              <strong
                style={{
                  display: "block",
                  fontSize: "34px",
                  color: "#1d4ed8",
                  marginTop: "6px",
                }}
              >
                {loading ? "..." : statistics.lost}
              </strong>
              <small>รายการ</small>
            </div>

            <div
              style={{
                padding: "18px",
                borderRadius: "12px",
                background: "#f0fdf4",
                border: "1px solid #dcfce7",
              }}
            >
              <div style={{ color: "#15803d", fontSize: "14px" }}>
                แจ้งพบของ
              </div>
              <strong
                style={{
                  display: "block",
                  fontSize: "34px",
                  color: "#15803d",
                  marginTop: "6px",
                }}
              >
                {loading ? "..." : statistics.found}
              </strong>
              <small>รายการ</small>
            </div>

            <div
              style={{
                padding: "18px",
                borderRadius: "12px",
                background: "#faf5ff",
                border: "1px solid #f3e8ff",
              }}
            >
              <div style={{ color: "#7e22ce", fontSize: "14px" }}>
                ส่งคืนเจ้าของแล้ว
              </div>
              <strong
                style={{
                  display: "block",
                  fontSize: "34px",
                  color: "#7e22ce",
                  marginTop: "6px",
                }}
              >
                {loading ? "..." : statistics.returned}
              </strong>
              <small>รายการ</small>
            </div>

            <div
              style={{
                padding: "18px",
                borderRadius: "12px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ color: "#334155", fontSize: "14px" }}>
                ประกาศทั้งหมด
              </div>
              <strong
                style={{
                  display: "block",
                  fontSize: "34px",
                  color: "#142b4a",
                  marginTop: "6px",
                }}
              >
                {loading ? "..." : statistics.total}
              </strong>
              <small>รายการ</small>
            </div>
          </div>

          <p style={{ fontSize: "12px", color: "#64748b", marginBottom: 0 }}>
            * จำนวนประกาศทั้งหมดรวมรายการที่ส่งคืนเจ้าของแล้ว
          </p>
        </section>
      )}

      {/* กล่องข้อความ */}

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

          {/* แชตผู้ติดต่อ */}

          {chatTab === "contact" && (
            <>
              <h3>ห้องแชตที่ฉันเคยติดต่อ</h3>

              {savedContactChats.length === 0 ? (
                <p>ยังไม่มีห้องแชตที่บันทึกไว้ในเครื่องนี้</p>
              ) : (
                savedContactChats.map((room) => (
                  <article className="message-card" key={room.room_id}>
                    <strong>
                      <MessageCircle size={16} style={iconStyle} />
                      {room.item_title || "ประกาศ"}
                    </strong>

                    <p>รหัสห้องแชต: {room.room_id}</p>

                    {Number(contactUnreadCounts[room.room_id]) > 0 && (
                      <span
                        style={{
                          display: "inline-block",
                          background: "#dc2626",
                          color: "#fff",
                          padding: "4px 10px",
                          borderRadius: "20px",
                          fontSize: "13px",
                          marginBottom: "8px",
                        }}
                      >
                        ยังไม่อ่าน {contactUnreadCounts[room.room_id]} ข้อความ
                      </span>
                    )}

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

          {/* แชตเจ้าของประกาศ */}

          {chatTab === "owner" && (
            <>
              <h3>ห้องแชตในประกาศของฉัน</h3>

              {ownerRooms.length === 0 ? (
                <p>
                  ยังไม่พบห้องแชต
                  กรุณาเปิดข้อมูลประกาศในส่วนจัดการประกาศก่อน
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
                      {formatDate(room.last_message_at)}
                    </small>

                    {Number(room.unread_count) > 0 && (
                      <span
                        style={{
                          display: "inline-block",
                          background: "#dc2626",
                          color: "#fff",
                          padding: "4px 10px",
                          borderRadius: "20px",
                          fontSize: "13px",
                          margin: "8px 0",
                        }}
                      >
                        ยังไม่อ่าน {room.unread_count} ข้อความ
                      </span>
                    )}

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
                    แชตกับ {selectedOwnerRoom.contact_name || "ผู้ติดต่อ"}
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
                          <small>{formatDate(message.created_at)}</small>
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
                  </form>
                </div>
              )}
            </>
          )}

          {/* แชตผู้ติดต่อที่เปิดจากลิงก์ */}

          {contactRoomId && (
            <div className="owner-chat">
              <h3>แชตในฐานะผู้ติดต่อ</h3>

              {contactChatLoading ? (
                <p>กำลังโหลดข้อความ...</p>
              ) : (
                <div className="chat-messages">
                  {contactChatMessages.map((message) => (
                    <article
                      className="message-card"
                      key={message.id}
                    >
                      <strong>
                        {message.sender_role === "owner"
                          ? "เจ้าของประกาศ"
                          : "คุณ"}
                      </strong>

                      <p>{message.message}</p>
                      <small>{formatDate(message.created_at)}</small>
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

          {/* แบบฟอร์มลงประกาศ */}

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

              <button
                className="primary-button"
                type="submit"
                disabled={saving}
              >
                <PlusCircle size={18} style={iconStyle} />
                {saving ? "กำลังลงประกาศ..." : "ลงประกาศ"}
              </button>
            </form>
          </section>

          {/* รหัสประกาศ */}

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

          {/* ลิงก์แชต */}

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

          {/* แชตส่วนตัว */}

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
                    <article
                      className="message-card"
                      key={message.id}
                    >
                      <strong>
                        {message.sender_role === "owner"
                          ? "เจ้าของประกาศ"
                          : "คุณ"}
                      </strong>

                      <p>{message.message}</p>
                      <small>{formatDate(message.created_at)}</small>
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

          {/* จัดการประกาศ */}

          <section className="manage-section">
            <h2>
              <UserRound size={22} style={iconStyle} />
              จัดการประกาศและอ่านข้อความ
            </h2>

            <p>
              กรอกรหัสประกาศและรหัสจัดการที่ได้รับตอนลงประกาศ
            </p>

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
                        {room.contact_name || "ผู้ติดต่อ"}
                      </strong>

                      <p>
                        อัปเดตล่าสุด: {formatDate(room.last_message_at)}
                      </p>

                      {Number(room.unread_count) > 0 && (
                        <span
                          style={{
                            display: "inline-block",
                            background: "#dc2626",
                            color: "#fff",
                            padding: "4px 10px",
                            borderRadius: "20px",
                            fontSize: "13px",
                            marginBottom: "8px",
                          }}
                        >
                          ยังไม่อ่าน {room.unread_count} ข้อความ
                        </span>
                      )}

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
                      แชตกับ {selectedOwnerRoom.contact_name || "ผู้ติดต่อ"}
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
                            <small>{formatDate(message.created_at)}</small>
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
                      <small>{formatDate(message.created_at)}</small>
                    </article>
                  ))
                )}
              </div>
            )}
          </section>

          {/* รายการประกาศ */}

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
              กำลังแสดงหมวดหมู่:{" "}
              <strong>{currentCategoryName}</strong>
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
              </select>
            </div>

            {loading ? (
              <p>กำลังโหลดประกาศ...</p>
            ) : filteredItems.length === 0 ? (
              <p>ไม่พบประกาศในหมวดหมู่นี้</p>
            ) : (
              <div className="item-grid">
                {filteredItems.map((item) => {
                  const itemCategory = categories.find(
                    (entry) =>
                      entry.id === (item.category || "other")
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
                        วันที่ลงประกาศ: {formatDate(item.created_at)}
                      </small>

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

      {/* ท้ายเว็บไซต์ */}

      <footer className="site-footer">
        <Home size={16} style={iconStyle} />
        School Lost &amp; Found
      </footer>

    </main>
  );
}
