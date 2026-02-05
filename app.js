import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  writeBatch,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const STORE_NAME = "لحوم الأستاذ";
const WHATSAPP_NUMBER = "201040123535"; // ضع رقم الواتساب بدون علامة + أو مسافات
const CURRENCY = "ج.م";
const MAX_IMAGE_SIZE = 900;
const IMAGE_QUALITY = 0.8;
const MAX_IMAGE_BYTES = 900 * 1024;
const DEFAULT_QTY_STEP = 0.5;
const PRODUCTS_COLLECTION = "products";
const ADMIN_EMAIL_DOMAIN = "mrbutcher.local";
const CATEGORY_PRODUCT = "product";
const CATEGORY_BOX = "box";

const firebaseConfig = {
  apiKey: "AIzaSyCRRl9ecLsqiZY2wM9uPnWbBtNmboxbqQo",
  authDomain: "mrbutcher-9e973.firebaseapp.com",
  projectId: "mrbutcher-9e973",
  storageBucket: "mrbutcher-9e973.firebasestorage.app",
  messagingSenderId: "307159067780",
  appId: "1:307159067780:web:cd2f533f1e360dbbc1e6d1",
  measurementId: "G-L57QRQ0CFJ",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const defaultProducts = [
  {
    id: "family-box",
    name: "بوكس العيله",
    price: 2050,
    category: CATEGORY_BOX,
    image: "assets/item7.png",
    alt: "بوكس العيله",
  },
  {
    id: "minced-meat",
    name: "لحم مفروم بلدي",
    price: 390,
    category: CATEGORY_PRODUCT,
    image: "assets/item1.png",
    alt: "لحم مفروم بلدي",
  },
  {
    id: "sausage",
    name: "سجق بلدي",
    price: 380,
    category: CATEGORY_PRODUCT,
    image: "assets/item2.png",
    alt: "سجق بلدي",
  },
  {
    id: "fillet",
    name: "عرق الفلتو",
    price: 530,
    category: CATEGORY_PRODUCT,
    image: "assets/item3.png",
    alt: "عرق الفلتو",
  },
  {
    id: "rosto",
    name: "عرق الرستو",
    price: 480,
    category: CATEGORY_PRODUCT,
    image: "assets/rosto.png",
    alt: "عرق الرستو",
  },
  {
    id: "tashkila",
    name: "تشكيلة الأستاذ",
    price: 980,
    category: CATEGORY_BOX,
    image: "assets/tashkila.png",
    alt: "تشكيلة الأستاذ",
  },
  {
    id: "cubes",
    name: "لحم مكعبات",
    price: 450,
    category: CATEGORY_PRODUCT,
    image: "assets/cubes.png",
    alt: "لحم مكعبات",
  },
  {
    id: "bone-in",
    name: "لحم بالعضم",
    price: 400,
    category: CATEGORY_PRODUCT,
    image: "assets/bone.png",
    alt: "لحم بالعضم",
  },
  {
    id: "kolata",
    name: "الكولاته",
    price: 0,
    category: CATEGORY_PRODUCT,
    image: "assets/item4.png",
    alt: "الكولاته",
  },
];

let products = [...defaultProducts];

const boxesGrid = document.getElementById("boxesGrid");
const productGrid = document.getElementById("productGrid");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const whatsappBtn = document.getElementById("whatsappBtn");
const orderModal = document.getElementById("orderModal");
const orderForm = document.getElementById("orderForm");
const closeModalButtons = document.querySelectorAll("[data-close-modal]");
const addProductForm = document.getElementById("addProductForm");
const adminList = document.getElementById("adminList");
const adminSection = document.getElementById("admin");
const adminTrigger = document.getElementById("adminTrigger");
const legacyAdminTrigger = document.querySelector(".powered-by-btn, .powered-by span, .powered-by");
const adminModal = document.getElementById("adminModal");
const adminForm = document.getElementById("adminForm");
const adminError = document.getElementById("adminError");
const closeAdminButtons = document.querySelectorAll("[data-close-admin]");
const adminLogout = document.getElementById("adminLogout");
const publishProductsBtn = document.getElementById("publishProducts");
const hero = document.querySelector(".hero");
const cartCount = document.getElementById("cartCount");

const cart = new Map();

function sanitizeProducts(list) {
  if (!Array.isArray(list) || list.length === 0) {
    return null;
  }

  const cleaned = list
    .filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        Number.isFinite(Number(item.price)) &&
        typeof item.image === "string"
    )
    .map((item) => ({
      ...item,
      price: Number(item.price),
      category: normalizeCategory(item.category),
      image: normalizeImageInput(item.image),
      alt: item.name,
      discountPrice:
        item.discountPrice === null || item.discountPrice === undefined
          ? null
          : Number(item.discountPrice),
      discountStart: item.discountStart || "",
      discountEnd: item.discountEnd || "",
    }));

  return cleaned.length ? cleaned : null;
}

function normalizeAdminEmail(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.includes("@")) {
    return trimmed;
  }
  return `${trimmed}@${ADMIN_EMAIL_DOMAIN}`;
}

function isAdminAuthenticated() {
  return Boolean(auth.currentUser);
}

async function saveProductToFirestore(id, data, isNew) {
  if (!isAdminAuthenticated()) {
    window.alert("من فضلك سجل الدخول كمسؤول أولاً.");
    return false;
  }
  try {
    const payload = {
      ...data,
      updatedAt: serverTimestamp(),
    };
    if (isNew) {
      payload.createdAt = serverTimestamp();
    }
    await setDoc(doc(db, PRODUCTS_COLLECTION, id), payload, { merge: true });
    return true;
  } catch (error) {
    window.alert("تعذر حفظ البيانات، حاول مرة أخرى.");
    return false;
  }
}

async function deleteProductFromFirestore(id) {
  if (!isAdminAuthenticated()) {
    window.alert("من فضلك سجل الدخول كمسؤول أولاً.");
    return false;
  }
  try {
    await deleteDoc(doc(db, PRODUCTS_COLLECTION, id));
    return true;
  } catch (error) {
    window.alert("تعذر حذف المنتج، حاول مرة أخرى.");
    return false;
  }
}

async function publishProductsToFirebase(list) {
  if (!isAdminAuthenticated()) {
    window.alert("من فضلك سجل الدخول كمسؤول أولاً.");
    return false;
  }
  try {
    const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => batch.delete(docSnap.ref));

    list.forEach((item, index) => {
      const id = item.id || `prod-${Date.now()}-${index}`;
      batch.set(doc(db, PRODUCTS_COLLECTION, id), {
        ...item,
        price: Number(item.price),
        category: normalizeCategory(item.category),
        image: normalizeImageInput(item.image),
        alt: item.name,
        discountPrice:
          item.discountPrice === null || item.discountPrice === undefined
            ? null
            : Number(item.discountPrice),
        discountStart: item.discountStart || "",
        discountEnd: item.discountEnd || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
    return true;
  } catch (error) {
    window.alert("تعذر نشر القائمة، حاول مرة أخرى.");
    return false;
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(1, MAX_IMAGE_SIZE / Math.max(img.width, img.height));
        const width = Math.round(img.width * ratio);
        const height = Math.round(img.height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
        const base64 = dataUrl.split(",")[1] || "";
        const bytes = Math.ceil((base64.length * 3) / 4);
        if (bytes > MAX_IMAGE_BYTES) {
          reject(new Error("Image too large"));
          return;
        }
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

function normalizeImageInput(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("data:") ||
    lower.startsWith("blob:") ||
    trimmed.startsWith("assets/") ||
    trimmed.startsWith("./") ||
    trimmed.startsWith("../") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }
  if (!trimmed.includes("/")) {
    return `assets/${trimmed}`;
  }
  return trimmed;
}

function normalizeCategory(value) {
  return value === CATEGORY_BOX ? CATEGORY_BOX : CATEGORY_PRODUCT;
}

function getUnitName(product) {
  return product.category === CATEGORY_BOX ? "بوكس" : "كجم";
}

function getPriceLabel(product) {
  return product.category === CATEGORY_BOX ? "سعر البوكس" : "سعر الكيلو";
}

function getQtyStep(product) {
  return product.category === CATEGORY_BOX ? 1 : DEFAULT_QTY_STEP;
}

function parseDateValue(value) {
  if (!value) {
    return null;
  }
  const parts = value.split("-");
  if (parts.length !== 3) {
    return null;
  }
  const [year, month, day] = parts.map(Number);
  if (!year || !month || !day) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateShort(value) {
  const date = parseDateValue(value);
  if (!date) {
    return "";
  }
  return date.toLocaleDateString("ar-EG", { day: "2-digit", month: "2-digit" });
}

function isDiscountActive(product) {
  const discountPrice = Number(product.discountPrice);
  if (!Number.isFinite(discountPrice) || discountPrice < 0) {
    return false;
  }
  if (!product.discountStart || !product.discountEnd) {
    return false;
  }
  if (discountPrice >= product.price) {
    return false;
  }
  const start = parseDateValue(product.discountStart);
  const end = parseDateValue(product.discountEnd);
  if (!start || !end) {
    return false;
  }
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  const now = new Date();
  return now >= start && now <= end;
}

function getEffectivePrice(product) {
  return isDiscountActive(product) ? Number(product.discountPrice) : product.price;
}

function getValidatedDiscount(basePrice, discountPriceValue, discountStart, discountEnd) {
  const hasAny = discountPriceValue || discountStart || discountEnd;
  if (!hasAny) {
    return { discountPrice: null, discountStart: "", discountEnd: "" };
  }
  const discountPrice = Number(discountPriceValue);
  if (!Number.isFinite(discountPrice) || discountPrice < 0) {
    return { error: "من فضلك أدخل سعر عرض صحيح." };
  }
  if (!discountStart || !discountEnd) {
    return { error: "حدد تاريخ بداية ونهاية العرض." };
  }
  const start = parseDateValue(discountStart);
  const end = parseDateValue(discountEnd);
  if (!start || !end || end < start) {
    return { error: "تاريخ العرض غير صحيح." };
  }
  if (discountPrice >= basePrice) {
    return { error: "سعر العرض يجب أن يكون أقل من السعر الأساسي." };
  }
  return { discountPrice, discountStart, discountEnd };
}

function showImageSizeWarning() {
  window.alert("حجم الصورة كبير. استخدم رابط صورة أو صورة أصغر.");
}

function showAdmin() {
  if (!adminSection) {
    return;
  }
  adminSection.classList.add("is-visible");
  adminSection.setAttribute("aria-hidden", "false");
}

function hideAdmin() {
  if (!adminSection) {
    return;
  }
  adminSection.classList.remove("is-visible");
  adminSection.setAttribute("aria-hidden", "true");
}

function openAdminModal() {
  if (!adminModal) {
    return;
  }
  adminModal.classList.add("is-open");
  adminModal.setAttribute("aria-hidden", "false");
  const input = adminForm?.querySelector("input");
  if (input) {
    input.focus();
  }
}

function closeAdminModal() {
  if (!adminModal) {
    return;
  }
  adminModal.classList.remove("is-open");
  adminModal.setAttribute("aria-hidden", "true");
  if (adminError) {
    adminError.textContent = "";
  }
  adminForm?.reset();
}

function formatPrice(value) {
  return `${value.toFixed(2)} ${CURRENCY}`;
}

function roundQty(value, step = DEFAULT_QTY_STEP) {
  return Math.round(value / step) * step;
}

function formatQty(value, step = DEFAULT_QTY_STEP) {
  const rounded = roundQty(value, step);
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
}

function renderGrid(list, grid, emptyMessage) {
  if (!grid) {
    return;
  }

  grid.innerHTML = "";

  if (list.length === 0) {
    const note = document.createElement("p");
    note.className = "note";
    note.textContent = emptyMessage;
    grid.appendChild(note);
    return;
  }

  list.forEach((product, index) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.style.animationDelay = `${index * 0.05}s`;

    const hasDiscount = isDiscountActive(product);
    const effectivePrice = getEffectivePrice(product);
    const periodText = hasDiscount
      ? `عرض من ${formatDateShort(product.discountStart)} إلى ${formatDateShort(
          product.discountEnd
        )}`
      : "";
    const priceLabel = getPriceLabel(product);

    const priceMarkup = hasDiscount
      ? `
      <div class="price-block">
        <span class="price-old">${formatPrice(product.price)}</span>
        <span class="price-new">${formatPrice(effectivePrice)}</span>
      </div>
      <div class="price-label">${priceLabel}</div>
      <div class="deal-period">${periodText}</div>
    `
      : `
      <div class="price">${formatPrice(product.price)}</div>
      <div class="price-label">${priceLabel}</div>
    `;

    card.innerHTML = `
      ${hasDiscount ? '<span class="deal-badge">عرض</span>' : ""}
      <div class="product-image">
        <img src="${product.image}" alt="${product.alt}" loading="lazy" />
      </div>
      <h3 class="product-name">${product.name}</h3>
      ${priceMarkup}
      <button class="add-btn">إضافة للسلة</button>
    `;

    const button = card.querySelector("button");

    button.addEventListener("click", () => {
      button.classList.remove("bump");
      void button.offsetWidth;
      button.classList.add("bump");

      const current = cart.get(product.id);
      const step = getQtyStep(product);
      const qty = current ? roundQty(current.qty + step, step) : 1;
      cart.set(product.id, {
        ...product,
        qty,
      });

      renderCart();
    });

    grid.appendChild(card);
  });
}

function renderCatalog() {
  const boxes = products.filter((product) => product.category === CATEGORY_BOX);
  const regular = products.filter((product) => product.category !== CATEGORY_BOX);

  renderGrid(boxes, boxesGrid, "قريباً بوكسات جديدة.");
  renderGrid(regular, productGrid, "لا توجد منتجات حالياً.");
}

function renderCart() {
  cartItems.innerHTML = "";

  if (cart.size === 0) {
    cartItems.innerHTML = "<p class=\"note\">سلتك فارغة. أضف منتجات للبدء.</p>";
    cartTotal.textContent = formatPrice(0);
    whatsappBtn.disabled = true;
    if (cartCount) {
      cartCount.textContent = "0";
      cartCount.classList.add("is-hidden");
    }
    return;
  }

  syncCartWithProducts();
  let total = 0;

  cart.forEach((item) => {
    const unitPrice = getEffectivePrice(item);
    const step = getQtyStep(item);
    const priceLabel = getPriceLabel(item);
    const subtotal = item.qty * unitPrice;
    total += subtotal;

    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <strong>${item.name}</strong>
      <div class="row">
        <div class="qty-controls" aria-label="تعديل الكمية">
          <button class="qty-btn" type="button" data-action="decrease">-</button>
          <span>${formatQty(item.qty, step)}</span>
          <button class="qty-btn" type="button" data-action="increase">+</button>
        </div>
        <span class="unit-price">${priceLabel}: ${formatPrice(unitPrice)}</span>
        <span>${formatPrice(subtotal)}</span>
      </div>
      <button class="remove-btn" type="button">إزالة</button>
    `;

    row.querySelector('[data-action="increase"]').addEventListener("click", () => {
      cart.set(item.id, { ...item, qty: roundQty(item.qty + step, step) });
      renderCart();
    });

    row.querySelector('[data-action="decrease"]').addEventListener("click", () => {
      const nextQty = roundQty(item.qty - step, step);
      if (nextQty <= 0) {
        cart.delete(item.id);
      } else {
        cart.set(item.id, { ...item, qty: nextQty });
      }
      renderCart();
    });

    row.querySelector(".remove-btn").addEventListener("click", () => {
      cart.delete(item.id);
      renderCart();
    });

    cartItems.appendChild(row);
  });

  cartTotal.textContent = formatPrice(total);
  whatsappBtn.disabled = false;

  if (cartCount) {
    const count = cart.size;
    cartCount.textContent = `${count}`;
    cartCount.classList.toggle("is-hidden", count === 0);
  }
}

function syncCartWithProducts() {
  const idsToDelete = [];

  cart.forEach((item, id) => {
    const updated = products.find((product) => product.id === id);
    if (!updated) {
      idsToDelete.push(id);
      return;
    }
    const step = getQtyStep(updated);
    const qty = roundQty(item.qty, step);
    if (qty <= 0) {
      idsToDelete.push(id);
      return;
    }
    cart.set(id, { ...updated, qty });
  });

  idsToDelete.forEach((id) => cart.delete(id));
}

function renderAdminList() {
  if (!adminList) {
    return;
  }

  adminList.innerHTML = "";

  products.forEach((product) => {
    const row = document.createElement("div");
    row.className = "admin-item";
    row.innerHTML = `
      <div class="admin-thumb">
        <img src="${product.image}" alt="${product.alt}" />
      </div>
      <div class="admin-fields">
        <label class="field">
          <span>نوع الصنف</span>
          <select name="category">
            <option value="product">منتج عادي</option>
            <option value="box">بوكس / تجميعة جاهزة</option>
          </select>
        </label>
        <label class="field">
          <span>الاسم</span>
          <input type="text" name="name" value="${product.name}" />
        </label>
        <label class="field">
          <span>السعر (ج.م)</span>
          <input type="number" name="price" min="0" step="1" value="${product.price}" />
        </label>
        <label class="field">
          <span>سعر العرض (اختياري)</span>
          <input
            type="number"
            name="discountPrice"
            min="0"
            step="1"
            value="${product.discountPrice ?? ""}"
          />
        </label>
        <label class="field">
          <span>بداية العرض</span>
          <input type="date" name="discountStart" value="${product.discountStart ?? ""}" />
        </label>
        <label class="field">
          <span>نهاية العرض</span>
          <input type="date" name="discountEnd" value="${product.discountEnd ?? ""}" />
        </label>
        <label class="field">
          <span>رابط الصورة (اختياري)</span>
          <input type="text" name="imageUrl" placeholder="assets/xxx.png أو https://..." value="${
            product.image.startsWith("data:") ? "" : product.image
          }" />
        </label>
        <label class="field">
          <span>استبدال الصورة</span>
          <input type="file" name="imageFile" accept="image/*" />
        </label>
      </div>
      <div class="admin-actions">
        <button class="save-btn" type="button">تحديث</button>
        <button class="delete-btn" type="button">حذف</button>
      </div>
    `;

    const previewImg = row.querySelector("img");
    const categorySelect = row.querySelector('select[name="category"]');
    const nameInput = row.querySelector('input[name="name"]');
    const priceInput = row.querySelector('input[name="price"]');
    const discountPriceInput = row.querySelector('input[name="discountPrice"]');
    const discountStartInput = row.querySelector('input[name="discountStart"]');
    const discountEndInput = row.querySelector('input[name="discountEnd"]');
    const urlInput = row.querySelector('input[name="imageUrl"]');
    const fileInput = row.querySelector('input[name="imageFile"]');
    const saveBtn = row.querySelector(".save-btn");
    const deleteBtn = row.querySelector(".delete-btn");

    if (categorySelect) {
      categorySelect.value = normalizeCategory(product.category);
    }

    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        previewImg.src = reader.result;
      };
      reader.readAsDataURL(file);
    });

    saveBtn.addEventListener("click", async () => {
      const updatedName = nameInput.value.trim();
      const updatedPrice = Number(priceInput.value);

      if (!updatedName || !Number.isFinite(updatedPrice) || updatedPrice < 0) {
        window.alert("من فضلك أدخل اسم وسعر صحيح.");
        return;
      }

      const discountResult = getValidatedDiscount(
        updatedPrice,
        discountPriceInput.value.trim(),
        discountStartInput.value,
        discountEndInput.value
      );

      if (discountResult.error) {
        window.alert(discountResult.error);
        return;
      }

      let updatedImage = normalizeImageInput(urlInput.value) || product.image;
      const updatedCategory = normalizeCategory(categorySelect?.value);
      if (fileInput.files[0]) {
        try {
          updatedImage = await fileToDataUrl(fileInput.files[0]);
        } catch (error) {
          if (error.message === "Image too large") {
            showImageSizeWarning();
          } else {
            window.alert("تعذر قراءة الصورة، حاول مرة أخرى.");
          }
          return;
        }
      }

      const updatedPayload = {
        name: updatedName,
        price: updatedPrice,
        category: updatedCategory,
        image: updatedImage,
        alt: updatedName,
        discountPrice: discountResult.discountPrice,
        discountStart: discountResult.discountStart,
        discountEnd: discountResult.discountEnd,
      };

      const saved = await saveProductToFirestore(product.id, updatedPayload, false);
      if (!saved) {
        return;
      }
    });

    deleteBtn.addEventListener("click", async () => {
      const confirmed = window.confirm("هل تريد حذف هذا المنتج؟");
      if (!confirmed) {
        return;
      }
      await deleteProductFromFirestore(product.id);
    });

    adminList.appendChild(row);
  });
}

function buildWhatsAppMessage() {
  const name = orderForm.elements.customerName.value.trim();
  const location = orderForm.elements.customerLocation.value.trim();
  const lines = [`طلب جديد من ${STORE_NAME}:`];

  lines.push(`الاسم: ${name}`);
  lines.push(`المكان: ${location}`);
  lines.push("الطلبات:");

  cart.forEach((item) => {
    const unitPrice = getEffectivePrice(item);
    const step = getQtyStep(item);
    const unitName = getUnitName(item);
    const subtotal = item.qty * unitPrice;
    lines.push(
      `- ${item.name}: ${formatQty(item.qty, step)} ${unitName} × ${unitPrice} = ${subtotal.toFixed(
        2
      )} ${CURRENCY}`
    );
  });

  lines.push(`الإجمالي: ${cartTotal.textContent}`);
  lines.push("شكراً لكم.");

  return lines.join("\n");
}

function openModal() {
  orderModal.classList.add("is-open");
  orderModal.setAttribute("aria-hidden", "false");
  const firstInput = orderForm.querySelector("input");
  if (firstInput) {
    firstInput.focus();
  }
}

function closeModal() {
  orderModal.classList.remove("is-open");
  orderModal.setAttribute("aria-hidden", "true");
}

whatsappBtn.addEventListener("click", () => {
  openModal();
});

closeModalButtons.forEach((button) => {
  button.addEventListener("click", closeModal);
});

orderForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!orderForm.reportValidity()) {
    return;
  }

  const message = buildWhatsAppMessage();
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
  orderForm.reset();
  closeModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && orderModal.classList.contains("is-open")) {
    closeModal();
  }
  if (event.key === "Escape" && adminModal?.classList.contains("is-open")) {
    closeAdminModal();
  }
});

if (addProductForm) {
  addProductForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = addProductForm.elements.name.value.trim();
    const price = Number(addProductForm.elements.price.value);
    const discountPriceValue = addProductForm.elements.discountPrice.value.trim();
    const discountStart = addProductForm.elements.discountStart.value;
    const discountEnd = addProductForm.elements.discountEnd.value;
    const imageUrl = addProductForm.elements.imageUrl.value.trim();
    const imageFile = addProductForm.elements.imageFile.files[0];
    const category = normalizeCategory(addProductForm.elements.category?.value);

    if (!name || !Number.isFinite(price) || price < 0) {
      window.alert("من فضلك أدخل اسم وسعر صحيح.");
      return;
    }

    const discountResult = getValidatedDiscount(
      price,
      discountPriceValue,
      discountStart,
      discountEnd
    );

    if (discountResult.error) {
      window.alert(discountResult.error);
      return;
    }

    let image = normalizeImageInput(imageUrl);
    if (imageFile) {
      try {
        image = await fileToDataUrl(imageFile);
      } catch (error) {
        if (error.message === "Image too large") {
          showImageSizeWarning();
        } else {
          window.alert("تعذر قراءة الصورة، حاول مرة أخرى.");
        }
        return;
      }
    }

    if (!image) {
      window.alert("من فضلك أضف رابط صورة أو ارفع صورة.");
      return;
    }

    const newProduct = {
      id: `prod-${Date.now()}`,
      name,
      price,
      category,
      image,
      alt: name,
      discountPrice: discountResult.discountPrice,
      discountStart: discountResult.discountStart,
      discountEnd: discountResult.discountEnd,
    };

    const saved = await saveProductToFirestore(newProduct.id, newProduct, true);
    if (!saved) {
      return;
    }
    addProductForm.reset();
  });
}

const adminTriggerElement = adminTrigger || legacyAdminTrigger;

if (adminTriggerElement) {
  adminTriggerElement.addEventListener("click", () => {
    if (isAdminAuthenticated()) {
      showAdmin();
      adminSection?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    openAdminModal();
  });
}

closeAdminButtons.forEach((button) => {
  button.addEventListener("click", closeAdminModal);
});

function getAuthErrorMessage(error) {
  if (!error?.code) {
    return "تعذر تسجيل الدخول.";
  }
  switch (error.code) {
    case "auth/invalid-email":
      return "البريد الإلكتروني غير صحيح.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "بيانات الدخول غير صحيحة.";
    case "auth/operation-not-allowed":
      return "فعّل تسجيل الدخول بالبريد وكلمة المرور في Firebase.";
    case "auth/network-request-failed":
      return "مشكلة اتصال بالإنترنت. حاول مرة أخرى.";
    case "auth/invalid-api-key":
      return "مفاتيح Firebase غير صحيحة.";
    case "auth/user-disabled":
      return "هذا الحساب موقوف.";
    case "auth/too-many-requests":
      return "محاولات كثيرة، حاول لاحقًا.";
    default:
      return `تعذر تسجيل الدخول (${error.code}).`;
  }
}

if (adminForm) {
  adminForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const usernameInput = adminForm.elements.username?.value || "";
    const password = adminForm.elements.password.value.trim();
    const email = normalizeAdminEmail(usernameInput);
    if (!email || !password) {
      if (adminError) {
        adminError.textContent = "أدخل البريد الإلكتروني وكلمة المرور.";
      }
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      closeAdminModal();
      adminSection?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      if (adminError) {
        adminError.textContent = getAuthErrorMessage(error);
      }
    }
  });
}

if (adminLogout) {
  adminLogout.addEventListener("click", async () => {
    await signOut(auth);
    hideAdmin();
  });
}

window.addEventListener("pagehide", () => {
  if (auth.currentUser) {
    signOut(auth);
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    showAdmin();
  } else {
    hideAdmin();
  }
});

function updateHeroState() {
  if (!hero) {
    return;
  }
  if (window.matchMedia("(max-width: 980px)").matches) {
    hero.classList.remove("is-collapsed");
    return;
  }
  hero.classList.toggle("is-collapsed", window.scrollY > 12);
}

window.addEventListener("scroll", updateHeroState, { passive: true });
window.addEventListener("load", updateHeroState);
window.addEventListener("resize", updateHeroState);

function startProductsListener() {
  const productsQuery = query(
    collection(db, PRODUCTS_COLLECTION),
    orderBy("createdAt", "desc")
  );

  onSnapshot(
    productsQuery,
    (snapshot) => {
      if (snapshot.empty) {
        products = [...defaultProducts];
      } else {
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        products = sanitizeProducts(list) || [];
      }
      renderCatalog();
      renderCart();
      renderAdminList();
    },
    () => {
      products = [...defaultProducts];
      renderCatalog();
      renderCart();
      renderAdminList();
    }
  );
}

if (publishProductsBtn) {
  publishProductsBtn.addEventListener("click", async () => {
    const confirmed = window.confirm(
      "سيتم استبدال كل المنتجات في Firebase بالقائمة الحالية. هل تريد المتابعة؟"
    );
    if (!confirmed) {
      return;
    }
    const cleaned = sanitizeProducts(products);
    if (!cleaned) {
      window.alert("لا توجد منتجات للنشر.");
      return;
    }
    const published = await publishProductsToFirebase(cleaned);
    if (published) {
      window.alert("تم نشر القائمة بنجاح.");
    }
  });
}

startProductsListener();
