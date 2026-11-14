
import { useState } from "react";
import { Link } from "react-router-dom";
import { PlusCircle, MapPin, CheckCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import "../App.css";

const OWNER_STORAGE = "school_lost_found_owner_items";

const categories = [
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

function saveOwnerItem(entry) {
  try {
    const oldData = JSON.parse(
      localStorage.getItem(OWNER_STORAGE) || "[]"
    );

    const owners = Array.isArray(oldData) ? oldData : [];

    const updated = [
      ...owners.filter(
        (item) => String(item.item_id) !== String(entry.item_id)
      ),
      entry,
    ];

    localStorage.setItem(OWNER_STORAGE, JSON.stringify(updated));
  } catch {
    alert("บันทึกรหัสจัดการในเครื่องไม่สำเร็จ กรุณาจดรหัสไว้");
  }
}

export default function ReportPage() {
  const [type, setType] = useState("lost");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [images, setImages] = useState([]);
  const [category, setCategory] = useState("other");
  const [saving, setSaving] = useState(false);
  const [createdSecret, setCreatedSecret] = useState(null);

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

      saveOwnerItem({
        item_id: String(newId),
        token,
        title: title.trim(),
      });

      setTitle("");
      setDescription("");
      setLocation("");
      setImages([]);
      setType("lost");
      setCategory("other");

      alert("ลงประกาศเรียบร้อยแล้ว");
    } catch (error) {
      alert(
        "ลงประกาศไม่สำเร็จ: " +
        (error?.message || "เกิดข้อผิดพลาด")
      );
    } finally {
      setSaving(false);
    }
  }

  async function copyToken() {
    if (!createdSecret) return;

    const text =
      `รหัสประกาศ: ${createdSecret.id}\n` +
      `รหัสจัดการ: ${createdSecret.token}`;

    try {
      await navigator.clipboard.writeText(text);
      alert("คัดลอกรหัสแล้ว กรุณาเก็บไว้ให้ดี");
    } catch {
      alert("คัดลอกไม่ได้ กรุณาจดรหัสเก็บไว้");
    }
  }

  return (
    <main className="app">
      <header className="site-header">
        <h1>ลงประกาศใหม่</h1>
        <p>ระบบแจ้งของหายและของที่พบภายในโรงเรียน</p>
        <Link to="/">กลับหน้าหลัก</Link>
      </header>

      <section className="form-section">
        <h2>
          <PlusCircle size={22} />
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
            {categories.map((item) => (
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
            <MapPin size={16} />
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
            <PlusCircle size={18} />
            {saving ? "กำลังลงประกาศ..." : "ลงประกาศ"}
          </button>
        </form>
      </section>

      {createdSecret && (
        <section className="secret-box">
          <h2>
            <CheckCircle size={22} />
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
    </main>
  );
}
