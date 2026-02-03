const STORE_NAME = "لحوم الأستاذ";
const WHATSAPP_NUMBER = "201040123535"; // ضع رقم الواتساب بدون علامة + أو مسافات
const CURRENCY = "ج.م";

const products = [
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
    image: "assets/item4.png",
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
    image: "assets/rosto.png",
    alt: "الكولاته",
  },
];

const productGrid = document.getElementById("productGrid");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const whatsappBtn = document.getElementById("whatsappBtn");
const orderModal = document.getElementById("orderModal");
const orderForm = document.getElementById("orderForm");
const closeModalButtons = document.querySelectorAll("[data-close-modal]");

const cart = new Map();

function formatPrice(value) {
  return `${value.toFixed(2)} ${CURRENCY}`;
}

function renderProducts() {
  productGrid.innerHTML = "";

  products.forEach((product, index) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.style.animationDelay = `${index * 0.05}s`;

    card.innerHTML = `
      <div class="product-image">
        <img src="${product.image}" alt="${product.alt}" loading="lazy" />
      </div>
      <div class="price">${formatPrice(product.price)}</div>
      <button class="add-btn">إضافة للسلة</button>
    `;

    const button = card.querySelector("button");

    button.addEventListener("click", () => {
      button.classList.remove("bump");
      void button.offsetWidth;
      button.classList.add("bump");

      const current = cart.get(product.id);
      const qty = current ? current.qty + 1 : 1;
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

  let total = 0;

  cart.forEach((item) => {
    const subtotal = item.qty * item.price;
    total += subtotal;

    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <strong>${item.name}</strong>
      <div class="row">
        <div class="qty-controls" aria-label="تعديل الكمية">
          <button class="qty-btn" type="button" data-action="decrease">-</button>
          <span>${item.qty}</span>
          <button class="qty-btn" type="button" data-action="increase">+</button>
        </div>
        <span>${item.price} ${CURRENCY}</span>
        <span>${formatPrice(subtotal)}</span>
      </div>
      <button class="remove-btn" type="button">إزالة</button>
    `;

    row.querySelector('[data-action="increase"]').addEventListener("click", () => {
      cart.set(item.id, { ...item, qty: item.qty + 1 });
      renderCart();
    });

    row.querySelector('[data-action="decrease"]').addEventListener("click", () => {
      const nextQty = item.qty - 1;
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

function buildWhatsAppMessage() {
  const name = orderForm.elements.customerName.value.trim();
  const location = orderForm.elements.customerLocation.value.trim();
  const lines = [`طلب جديد من ${STORE_NAME}:`];

  lines.push(`الاسم: ${name}`);
  lines.push(`المكان: ${location}`);
  lines.push("الطلبات:");

  cart.forEach((item) => {
    const subtotal = item.qty * item.price;
    lines.push(
      `- ${item.name}: ${item.qty} × ${item.price} = ${subtotal.toFixed(2)} ${CURRENCY}`
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
});

renderProducts();
renderCart();
