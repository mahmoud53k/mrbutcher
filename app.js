const STORE_NAME = "لحوم الأستاذ";
const WHATSAPP_NUMBER = "201040123535"; // ضع رقم الواتساب بدون علامة + أو مسافات
const CURRENCY = "ج.م";
const STORAGE_KEY = "lahm-products-v1";
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "1122026";
const ADMIN_KEY = "lahm-admin-unlocked";
const MAX_IMAGE_SIZE = 900;
const IMAGE_QUALITY = 0.8;
const QTY_STEP = 0.5;
const PRODUCTS_URL = "products.json";
const EXPORT_FILENAME = "products.json";

const defaultProducts = [
  {
    id: "minced-meat",
    name: "لحم مفروم بلدي",
    price: 390,
    image: "assets/item1.png",
    alt: "لحم مفروم بلدي",
  },
  {
    id: "sausage",
    name: "سجق بلدي",
    price: 380,
    image: "assets/item2.png",
    alt: "سجق بلدي",
  },
  {
    id: "fillet",
    name: "عرق الفلتو",
    price: 530,
    image: "assets/item3.png",
    alt: "عرق الفلتو",
  },
  {
    id: "rosto",
    name: "عرق الرستو",
    price: 480,
    image: "assets/rosto.png",
    alt: "عرق الرستو",
  },
  {
    id: "tashkila",
    name: "تشكيلة الأستاذ",
    price: 980,
    image: "assets/tashkila.png",
    alt: "تشكيلة الأستاذ",
  },
  {
    id: "cubes",
    name: "لحم مكعبات",
    price: 450,
    image: "assets/cubes.png",
    alt: "لحم مكعبات",
  },
  {
    id: "bone-in",
    name: "لحم بالعضم",
    price: 400,
    image: "assets/bone.png",
    alt: "لحم بالعضم",
  },
  {
    id: "kolata",
    name: "الكولاته",
    price: 0,
    image: "assets/item4.png",
    alt: "الكولاته",
  },
];

let products = [...defaultProducts];

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
const adminModal = document.getElementById("adminModal");
const adminForm = document.getElementById("adminForm");
const adminError = document.getElementById("adminError");
const closeAdminButtons = document.querySelectorAll("[data-close-admin]");
const adminLogout = document.getElementById("adminLogout");
const exportProductsBtn = document.getElementById("exportProducts");
const reloadProductsBtn = document.getElementById("reloadProducts");

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

function loadLocalProducts() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return null;
  }
  try {
    const parsed = JSON.parse(stored);
    return sanitizeProducts(parsed);
  } catch (error) {
    return null;
  }
}

async function loadRemoteProducts() {
  try {
    const response = await fetch(`${PRODUCTS_URL}?v=${Date.now()}`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return sanitizeProducts(data);
  } catch (error) {
    return null;
  }
}

function saveProducts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    return true;
  } catch (error) {
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

function showStorageWarning() {
  window.alert(
    "التعديل ظهر لكن لم يُحفظ على الجهاز. قلّل حجم الصورة أو استخدم رابط صورة بدلاً من ملف كبير."
  );
}

function showExportWarning() {
  window.alert(
    "ملحوظة: هناك صور مرفوعة من جهازك ومخزنة داخل الملف. الأفضل استخدام مسار assets/ أو رابط مباشر قبل التصدير."
  );
}

function isAdminUnlocked() {
  return localStorage.getItem(ADMIN_KEY) === "1";
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

function roundQty(value) {
  return Math.round(value / QTY_STEP) * QTY_STEP;
}

function formatQty(value) {
  const rounded = roundQty(value);
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
}

function renderProducts() {
  productGrid.innerHTML = "";

  products.forEach((product, index) => {
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

    const priceMarkup = hasDiscount
      ? `
      <div class="price-block">
        <span class="price-old">${formatPrice(product.price)}</span>
        <span class="price-new">${formatPrice(effectivePrice)}</span>
      </div>
      <div class="price-label">سعر الكيلو</div>
      <div class="deal-period">${periodText}</div>
    `
      : `
      <div class="price">${formatPrice(product.price)}</div>
      <div class="price-label">سعر الكيلو</div>
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
      const qty = current ? roundQty(current.qty + QTY_STEP) : 1;
      cart.set(product.id, {
        ...product,
        qty,
      });

      renderCart();
    });

    productGrid.appendChild(card);
  });
}

function renderCart() {
  cartItems.innerHTML = "";

  if (cart.size === 0) {
    cartItems.innerHTML = "<p class=\"note\">سلتك فارغة. أضف منتجات للبدء.</p>";
    cartTotal.textContent = formatPrice(0);
    whatsappBtn.disabled = true;
    return;
  }

  syncCartWithProducts();
  let total = 0;

  cart.forEach((item) => {
    const unitPrice = getEffectivePrice(item);
    const subtotal = item.qty * unitPrice;
    total += subtotal;

    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <strong>${item.name}</strong>
      <div class="row">
        <div class="qty-controls" aria-label="تعديل الكمية">
          <button class="qty-btn" type="button" data-action="decrease">-</button>
          <span>${formatQty(item.qty)}</span>
          <button class="qty-btn" type="button" data-action="increase">+</button>
        </div>
        <span class="unit-price">سعر الكيلو: ${formatPrice(unitPrice)}</span>
        <span>${formatPrice(subtotal)}</span>
      </div>
      <button class="remove-btn" type="button">إزالة</button>
    `;

    row.querySelector('[data-action="increase"]').addEventListener("click", () => {
      cart.set(item.id, { ...item, qty: roundQty(item.qty + QTY_STEP) });
      renderCart();
    });

    row.querySelector('[data-action="decrease"]').addEventListener("click", () => {
      const nextQty = roundQty(item.qty - QTY_STEP);
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
}

function syncCartWithProducts() {
  const idsToDelete = [];

  cart.forEach((item, id) => {
    const updated = products.find((product) => product.id === id);
    if (!updated) {
      idsToDelete.push(id);
      return;
    }
    cart.set(id, { ...updated, qty: item.qty });
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
    const nameInput = row.querySelector('input[name="name"]');
    const priceInput = row.querySelector('input[name="price"]');
    const discountPriceInput = row.querySelector('input[name="discountPrice"]');
    const discountStartInput = row.querySelector('input[name="discountStart"]');
    const discountEndInput = row.querySelector('input[name="discountEnd"]');
    const urlInput = row.querySelector('input[name="imageUrl"]');
    const fileInput = row.querySelector('input[name="imageFile"]');
    const saveBtn = row.querySelector(".save-btn");
    const deleteBtn = row.querySelector(".delete-btn");

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
      if (fileInput.files[0]) {
        try {
          updatedImage = await fileToDataUrl(fileInput.files[0]);
        } catch (error) {
          window.alert("تعذر قراءة الصورة، حاول مرة أخرى.");
          return;
        }
      }

      products = products.map((item) =>
        item.id === product.id
          ? {
              ...item,
              name: updatedName,
              price: updatedPrice,
              image: updatedImage,
              alt: updatedName,
              discountPrice: discountResult.discountPrice,
              discountStart: discountResult.discountStart,
              discountEnd: discountResult.discountEnd,
            }
          : item
      );

      const saved = saveProducts();
      renderProducts();
      renderAdminList();
      renderCart();
      if (!saved) {
        showStorageWarning();
      }
    });

    deleteBtn.addEventListener("click", () => {
      const confirmed = window.confirm("هل تريد حذف هذا المنتج؟");
      if (!confirmed) {
        return;
      }
      products = products.filter((item) => item.id !== product.id);
      const saved = saveProducts();
      renderProducts();
      renderAdminList();
      renderCart();
      if (!saved) {
        showStorageWarning();
      }
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
    const subtotal = item.qty * unitPrice;
    lines.push(
      `- ${item.name}: ${formatQty(item.qty)} كجم × ${unitPrice} = ${subtotal.toFixed(
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
        window.alert("تعذر قراءة الصورة، حاول مرة أخرى.");
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
      image,
      alt: name,
      discountPrice: discountResult.discountPrice,
      discountStart: discountResult.discountStart,
      discountEnd: discountResult.discountEnd,
    };

    products = [newProduct, ...products];
    const saved = saveProducts();
    renderProducts();
    renderAdminList();
    renderCart();
    addProductForm.reset();
    if (!saved) {
      showStorageWarning();
    }
  });
}

if (adminTrigger) {
  adminTrigger.addEventListener("click", () => {
    if (isAdminUnlocked()) {
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

