
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import "./App.css";

function App() {
  const [type, setType] = useState("lost");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [images, setImages] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("โหลดข้อมูลไม่สำเร็จ: " + error.message);
      return;
    }

    setItems(data || []);
  }

  function handleImageChange(e) {
    const selected = Array.from(e.target.files || []);
    const remaining = 5 - images.length;
    const accepted = [];

    for (const file of selected) {
      if (accepted.length >= remaining) break;

      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        alert("รองรับเฉพาะ JPG, PNG และ WEBP");
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert("รูปแต่ละรูปต้องมีขนาดไม่เกิน 5 MB");
        continue;
      }

      accepted.push(file);
    }

    setImages((prev) => [...prev, ...accepted]);
    e.target.value = "";
  }

  function removeImage(index) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!title.trim()) {
      alert("กรุณากรอกชื่อสิ่งของ");
      return;
    }

    setLoading(true);
    const imageUrls = [];

    try {
      for (const file of images) {
        const extension = file.name.split(".").pop().toLowerCase();
        const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("lost-found")
          .upload(fileName, file, { contentType: file.type });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("lost-found")
          .getPublicUrl(fileName);

        imageUrls.push(data.publicUrl);
      }

      const { error } = await supabase.from("items").insert({
        type,
        title: title.trim(),
        description,
        location,
        image_urls: imageUrls,
      });

      if (error) throw error;

      alert("บันทึกข้อมูลเรียบร้อยแล้ว!");

      setTitle("");
      setDescription("");
      setLocation("");
      setImages([]);

      await fetchItems();
    } catch (error) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header>
        <h1>School Lost & Found</h1>
        <p>ระบบแจ้งของหายและประกาศของที่พบ</p>
      </header>

      <main className="container">
        <section className="form-section">
          <h2>แจ้งของหาย / แจ้งพบของ</h2>

          <form onSubmit={handleSubmit}>
            <label>ประเภท</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="lost">แจ้งของหาย</option>
              <option value="found">แจ้งพบของ</option>
            </select>

            <label>ชื่อสิ่งของ</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น กระเป๋าสีดำ"
              maxLength={100}
              required
            />

            <label>รายละเอียด</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="รายละเอียดของสิ่งของ"
            />

            <label>สถานที่</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="เช่น อาคารเรียน"
            />

            <label>รูปภาพ (สูงสุด 5 รูป)</label>
            <div className="upload-box">
              <input
                id="images"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleImageChange}
                disabled={images.length >= 5}
              />
              <label htmlFor="images" className="upload-button">
                เลือกรูปภาพ
              </label>
              <p>{images.length}/5 รูป</p>
              <small>JPG, PNG, WEBP ไม่เกิน 5 MB ต่อรูป</small>
            </div>

            <div className="preview-grid">
              {images.map((file, index) => (
                <div className="preview-item" key={`${file.name}-${index}`}>
                  <img src={URL.createObjectURL(file)} alt="ตัวอย่างรูป" />
                  <button
                    type="button"
                    className="remove-button"
                    onClick={() => removeImage(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button className="submit-button" disabled={loading}>
              {loading ? "กำลังบันทึก..." : "ส่งข้อมูล"}
            </button>
          </form>
        </section>

        <section className="latest">
          <h2>รายการล่าสุด</h2>

          <div className="item-grid">
            {items.map((item) => (
              <article className="item-card" key={item.id}>
                <span className={item.type === "lost" ? "lost-tag" : "found-tag"}>
                  {item.type === "lost" ? "ของหาย" : "พบของ"}
                </span>

                <h3>{item.title}</h3>

                <div className="item-images">
                  {(item.image_urls || []).map((url, index) => (
                    <img key={index} src={url} alt={item.title} />
                  ))}
                </div>

                <p>{item.description}</p>
                <p>สถานที่: {item.location || "-"}</p>
                <small>
                  {new Date(item.created_at).toLocaleString("th-TH")}
                </small>
              </article>
            ))}
          </div>

          {items.length === 0 && <p>ยังไม่มีรายการ</p>}
        </section>
      </main>
    </div>
  );
}

export default App;
