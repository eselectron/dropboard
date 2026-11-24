/* =========================================================
   DROPBOARD V1.7
   Multiple brand workspaces
   Launch planner, products, tasks, content planner,
   AI prompt assistant, saved ideas, and workspace backups.
========================================================= */

const STORAGE_KEY = "dropboard_v1_data";
const DEFAULT_BRAND_NAME = "My First Brand";

const defaultBrand = () => ({
  id: makeId(),
  name: DEFAULT_BRAND_NAME,
  description: "",
  niche: "",
  targetAudience: "",
  visualStyle: "",
  website: "",
  instagram: "",
  tiktok: "",
  launches: [],
  products: [],
  tasks: [],
  contentPosts: [],
  savedIdeas: []
});

let workspaceState = loadWorkspace();
let data = getActiveBrand();
let currentPrompt = "";

/* =========================================================
   BASIC HELPERS
========================================================= */

function makeId() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2, 9);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => {
    const characters = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return characters[character];
  });
}

function formatDate(dateString) {
  if (!dateString) return "No date";

  const date = new Date(dateString + "T00:00:00");

  if (Number.isNaN(date.getTime())) return "No date";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function getElement(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const element = getElement(id);
  if (element) element.textContent = value;
}

function getValue(id) {
  const element = getElement(id);
  return element ? element.value.trim() : "";
}

function setValue(id, value) {
  const element = getElement(id);
  if (element) element.value = value ?? "";
}

function showMessage(id, message) {
  const element = getElement(id);
  if (element) element.textContent = message;
}

function emptyState(message) {
  return `
    <div class="empty-state">
      ${escapeHTML(message)}
    </div>
  `;
}

/* =========================================================
   BRAND WORKSPACE STORAGE
========================================================= */

function normalizeBrand(brand) {
  return {
    id: brand.id || makeId(),
    name: brand.name || DEFAULT_BRAND_NAME,
    description: brand.description || "",
    niche: brand.niche || "",
    targetAudience: brand.targetAudience || "",
    visualStyle: brand.visualStyle || "",
    website: brand.website || "",
    instagram: brand.instagram || "",
    tiktok: brand.tiktok || "",
    launches: Array.isArray(brand.launches) ? brand.launches : [],
    products: Array.isArray(brand.products) ? brand.products : [],
    tasks: Array.isArray(brand.tasks) ? brand.tasks : [],
    contentPosts: Array.isArray(brand.contentPosts) ? brand.contentPosts : [],
    savedIdeas: Array.isArray(brand.savedIdeas) ? brand.savedIdeas : []
  };
}

function loadWorkspace() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      const brand = defaultBrand();

      return {
        version: 2,
        activeBrandId: brand.id,
        brands: [brand]
      };
    }

    const parsed = JSON.parse(saved);

    if (
      parsed &&
      Array.isArray(parsed.brands) &&
      parsed.brands.length > 0
    ) {
      const brands = parsed.brands.map(normalizeBrand);

      const activeExists = brands.some(
        brand => brand.id === parsed.activeBrandId
      );

      return {
        version: 2,
        activeBrandId: activeExists
          ? parsed.activeBrandId
          : brands[0].id,
        brands
      };
    }

    const migratedBrand = normalizeBrand({
      ...parsed,
      id: makeId(),
      name: DEFAULT_BRAND_NAME
    });

    const migratedWorkspace = {
      version: 2,
      activeBrandId: migratedBrand.id,
      brands: [migratedBrand]
    };

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(migratedWorkspace)
    );

    return migratedWorkspace;

  } catch (error) {
    console.error("Could not load DROPBOARD data:", error);

    const brand = defaultBrand();

    return {
      version: 2,
      activeBrandId: brand.id,
      brands: [brand]
    };
  }
}

function getActiveBrand() {
  let brand = workspaceState.brands.find(
    item => item.id === workspaceState.activeBrandId
  );

  if (!brand) {
    brand = workspaceState.brands[0];
    workspaceState.activeBrandId = brand.id;
  }

  return brand;
}

function saveData() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(workspaceState)
    );
  } catch (error) {
    console.error("Could not save DROPBOARD data:", error);

    alert(
      "DROPBOARD could not save your changes. Your browser storage may be full. Consider removing some large product photos."
    );
  }
}

function switchBrand(brandId) {
  const brand = workspaceState.brands.find(
    item => item.id === brandId
  );

  if (!brand) return;

  workspaceState.activeBrandId = brand.id;
  data = brand;

  saveData();
  currentPrompt = "";

  setValue("assistant-result", "");

  if (getElement("copy-prompt")) {
    getElement("copy-prompt").disabled = true;
  }

  updateBrandUI();
  renderAll();
  fillBrandProfile();

  showMessage("assistant-message", "");
}

/* =========================================================
   BRAND SWITCHER AND BRAND MANAGEMENT
========================================================= */

function renderBrandSwitcher() {
  const selector = getElement("brand-switcher");
  if (!selector) return;

  selector.innerHTML = workspaceState.brands
    .map(brand => `
      <option
        value="${escapeHTML(brand.id)}"
        ${brand.id === data.id ? "selected" : ""}
      >
        ${escapeHTML(brand.name)}
      </option>
    `)
    .join("");
}

function updateBrandUI() {
  const brandName = data.name || DEFAULT_BRAND_NAME;

  setText("topbar-brand-name", brandName);
  setText("dashboard-brand-label", brandName);
  setText("assistant-brand-name", brandName);

  const avatar = getElement("brand-avatar");

  if (avatar) {
    avatar.textContent = brandName.charAt(0).toUpperCase();
  }

  renderBrandSwitcher();
}

function renderBrandList() {
  const container = getElement("brand-list");
  if (!container) return;

  if (workspaceState.brands.length === 0) {
    container.innerHTML = emptyState("No brands created yet.");
    return;
  }

  container.innerHTML = workspaceState.brands.map(brand => {
    const active = brand.id === data.id;

    return `
      <div class="brand-list-item ${active ? "active" : ""}">
        <div class="brand-list-info">
          <div class="brand-list-avatar">
            ${escapeHTML(brand.name.charAt(0).toUpperCase())}
          </div>

          <div>
            <strong>${escapeHTML(brand.name)}</strong>
            <small>${escapeHTML(brand.niche || "No niche added")}</small>
          </div>
        </div>

        ${
          active
            ? `<span class="brand-profile-badge">ACTIVE</span>`
            : `
              <button
                class="button button-secondary brand-open-button"
                type="button"
                data-switch-brand="${escapeHTML(brand.id)}"
              >
                Open
              </button>
            `
        }
      </div>
    `;
  }).join("");
}

function fillBrandProfile() {
  setValue("brand-profile-name", data.name);
  setValue("brand-profile-niche", data.niche);
  setValue("brand-profile-description", data.description);
  setValue("brand-profile-audience", data.targetAudience);
  setValue("brand-profile-style", data.visualStyle);
  setValue("brand-profile-website", data.website);
  setValue("brand-profile-instagram", data.instagram);
  setValue("brand-profile-tiktok", data.tiktok);
}

function createBrand(event) {
  event.preventDefault();

  const name = getValue("new-brand-name");
  const niche = getValue("new-brand-niche");

  if (!name) {
    showMessage("new-brand-message", "Enter a brand name.");
    return;
  }

  const duplicate = workspaceState.brands.some(
    brand => brand.name.toLowerCase() === name.toLowerCase()
  );

  if (duplicate) {
    showMessage(
      "new-brand-message",
      "A brand with that name already exists."
    );
    return;
  }

  const newBrand = normalizeBrand({
    ...defaultBrand(),
    name,
    niche
  });

  workspaceState.brands.push(newBrand);
  workspaceState.activeBrandId = newBrand.id;
  data = newBrand;

  saveData();

  getElement("new-brand-form").reset();

  showMessage("new-brand-message", "Brand created!");

  currentPrompt = "";
  setValue("assistant-result", "");

  if (getElement("copy-prompt")) {
    getElement("copy-prompt").disabled = true;
  }

  updateBrandUI();
  renderAll();
  fillBrandProfile();
}

function saveBrandProfile(event) {
  event.preventDefault();

  const name = getValue("brand-profile-name");

  if (!name) {
    showMessage("brand-profile-message", "Brand name is required.");
    return;
  }

  const duplicate = workspaceState.brands.some(
    brand =>
      brand.id !== data.id &&
      brand.name.toLowerCase() === name.toLowerCase()
  );

  if (duplicate) {
    showMessage(
      "brand-profile-message",
      "Another brand already uses that name."
    );
    return;
  }

  data.name = name;
  data.niche = getValue("brand-profile-niche");
  data.description = getValue("brand-profile-description");
  data.targetAudience = getValue("brand-profile-audience");
  data.visualStyle = getValue("brand-profile-style");
  data.website = getValue("brand-profile-website");
  data.instagram = getValue("brand-profile-instagram");
  data.tiktok = getValue("brand-profile-tiktok");

  saveData();
  updateBrandUI();
  renderBrandList();

  showMessage("brand-profile-message", "Profile saved successfully.");
}

/* =========================================================
   NAVIGATION
========================================================= */

function goToPage(pageName) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active-page");
  });

  document.querySelectorAll(".nav-link").forEach(link => {
    link.classList.remove("active");
  });

  const page = getElement(`${pageName}-page`);

  if (page) {
    page.classList.add("active-page");
  }

  const navLink = document.querySelector(
    `.nav-link[data-page="${pageName}"]`
  );

  if (navLink) {
    navLink.classList.add("active");
  }

  if (pageName === "brands") {
    renderBrandList();
    fillBrandProfile();
  }
}

/* =========================================================
   LAUNCH PLANNER
========================================================= */

function renderLaunches() {
  const container = getElement("launch-list");
  if (!container) return;

  setText(
    "launch-total-label",
    `${data.launches.length} launches`
  );

  if (data.launches.length === 0) {
    container.innerHTML = emptyState(
      "No launches yet. Create your first launch above."
    );
  } else {
    container.innerHTML = data.launches.map(launch => {
      const relatedTasks = data.tasks.filter(
        task => task.launchId === launch.id
      );

      const completedTasks = relatedTasks.filter(
        task => task.completed
      ).length;

      const totalTasks = relatedTasks.length;

      const progress = totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

      return `
        <article class="launch-card">

          <div class="launch-card-top">
            <span class="launch-date">
              ${escapeHTML(formatDate(launch.date))}
            </span>

            <button
              class="delete-button"
              type="button"
              data-delete-launch="${escapeHTML(launch.id)}"
              aria-label="Delete launch"
            >
              ×
            </button>
          </div>

          <h3>${escapeHTML(launch.name)}</h3>

          <p>${escapeHTML(launch.description || "No description added.")}</p>

          <div class="launch-progress-info">
            <span>Launch progress</span>
            <strong>${progress}%</strong>
          </div>

          <div class="progress-track">
            <div class="progress-fill" style="width:${progress}%"></div>
          </div>

          <small class="muted">
            ${completedTasks} of ${totalTasks} tasks completed
          </small>

        </article>
      `;
    }).join("");
  }

  renderLaunchSelectors();
  renderDashboardLaunches();
}

function renderLaunchSelectors() {
  const selectors = [
    getElement("task-launch"),
    getElement("assistant-launch")
  ];

  selectors.forEach(selector => {
    if (!selector) return;

    const previousValue = selector.value;

    const defaultLabel = selector.id === "task-launch"
      ? "No launch selected"
      : "No specific launch";

    selector.innerHTML = `
      <option value="">${defaultLabel}</option>
      ${data.launches.map(launch => `
        <option value="${escapeHTML(launch.id)}">
          ${escapeHTML(launch.name)}
        </option>
      `).join("")}
    `;

    if (data.launches.some(
      launch => launch.id === previousValue
    )) {
      selector.value = previousValue;
    }
  });
}

function addLaunch(event) {
  event.preventDefault();

  const name = getValue("launch-name");
  const date = getValue("launch-date");
  const description = getValue("launch-description");

  if (!name || !date) return;

  data.launches.push({
    id: makeId(),
    name,
    date,
    description,
    createdAt: new Date().toISOString()
  });

  saveData();
  getElement("launch-form").reset();
  renderAll();
}

function deleteLaunch(launchId) {
  const confirmed = confirm(
    "Delete this launch? Related tasks will remain, but they will no longer be linked to this launch."
  );

  if (!confirmed) return;

  data.launches = data.launches.filter(
    launch => launch.id !== launchId
  );

  data.tasks.forEach(task => {
    if (task.launchId === launchId) {
      task.launchId = "";
    }
  });

  saveData();
  renderAll();
}

function renderDashboardLaunches() {
  const container = getElement("dashboard-launches");
  if (!container) return;

  const launches = [...data.launches]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  if (launches.length === 0) {
    container.innerHTML = emptyState(
      "Your upcoming launches will appear here."
    );
    return;
  }

  container.innerHTML = launches.map(launch => `
    <div class="content-list-item">
      <div>
        <strong>${escapeHTML(launch.name)}</strong>
        <small>${escapeHTML(formatDate(launch.date))}</small>
      </div>
      <span class="list-arrow">→</span>
    </div>
  `).join("");
}

/* =========================================================
   PRODUCT ORGANIZER
========================================================= */

function renderProducts() {
  const container = getElement("product-list");
  if (!container) return;

  setText(
    "product-total-label",
    `${data.products.length} products`
  );

  if (data.products.length === 0) {
    container.innerHTML = emptyState(
      "No products yet. Add your first product above."
    );
  } else {
    container.innerHTML = data.products.map(product => `
      <article class="product-card">

        ${
          product.image
            ? `
              <div class="product-image">
                <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}">
              </div>
            `
            : `
              <div class="product-image product-image-placeholder">
                <span>◇</span>
              </div>
            `
        }

        <div class="product-card-content">

          <div class="product-card-top">
            <span class="product-category">
              ${escapeHTML(product.category)}
            </span>

            <button
              class="delete-button"
              type="button"
              data-delete-product="${escapeHTML(product.id)}"
              aria-label="Delete product"
            >
              ×
            </button>
          </div>

          <h3>${escapeHTML(product.name)}</h3>

          <div class="product-price">
            $${Number(product.price).toFixed(2)}
          </div>

          <span class="product-status">
            ${escapeHTML(product.status)}
          </span>

        </div>

      </article>
    `).join("");
  }

  renderAssistantSelectors();
}

function resizeProductImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = event => {
      const image = new Image();

      image.onload = () => {
        const maxSize = 850;

        let width = image.width;
        let height = image.height;

        if (width > height && width > maxSize) {
          height = Math.round(height * maxSize / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round(width * maxSize / height);
          height = maxSize;
        }

        const canvas = document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        context.drawImage(image, 0, 0, width, height);

        resolve(
          canvas.toDataURL("image/jpeg", 0.72)
        );
      };

      image.onerror = reject;
      image.src = event.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function addProduct(event) {
  event.preventDefault();

  const name = getValue("product-name");
  const price = Number(getValue("product-price"));
  const category = getValue("product-category");
  const status = getValue("product-status");

  const imageInput = getElement("product-image");
  const file = imageInput?.files?.[0];

  if (!name || !Number.isFinite(price) || price < 0) {
    return;
  }

  let image = "";

  if (file) {
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    try {
      image = await resizeProductImage(file);
    } catch (error) {
      console.error("Image processing failed:", error);
      alert("The image could not be processed.");
      return;
    }
  }

  data.products.push({
    id: makeId(),
    name,
    price,
    category,
    status,
    image,
    createdAt: new Date().toISOString()
  });

  saveData();
  getElement("product-form").reset();
  renderAll();
}

function deleteProduct(productId) {
  if (!confirm("Delete this product?")) return;

  data.products = data.products.filter(
    product => product.id !== productId
  );

  saveData();
  renderAll();
}

/* =========================================================
   CONTENT PLANNER
========================================================= */

function renderContentPosts() {
  const container = getElement("content-post-list");
  if (!container) return;

  setText(
    "content-total-label",
    `${data.contentPosts.length} posts`
  );

  if (data.contentPosts.length === 0) {
    container.innerHTML = emptyState(
      "No content planned yet. Add your first post above."
    );
    return;
  }

  const sortedPosts = [...data.contentPosts].sort(
    (a, b) => a.date.localeCompare(b.date)
  );

  container.innerHTML = sortedPosts.map(post => `
    <article class="content-post-card">

      <div class="content-post-top">
        <span class="content-platform">
          ${escapeHTML(post.platform)}
        </span>

        <button
          class="delete-button"
          type="button"
          data-delete-post="${escapeHTML(post.id)}"
          aria-label="Delete post"
        >
          ×
        </button>
      </div>

      <h3>${escapeHTML(post.title)}</h3>

      <div class="content-post-meta">
        ${escapeHTML(post.type)} · ${escapeHTML(formatDate(post.date))}
      </div>

      <p>${escapeHTML(post.caption || "No notes added.")}</p>

      <label class="content-status-label">
        Status

        <select data-post-status="${escapeHTML(post.id)}">
          <option value="Planned" ${post.status === "Planned" ? "selected" : ""}>Planned</option>
          <option value="In progress" ${post.status === "In progress" ? "selected" : ""}>In progress</option>
          <option value="Published" ${post.status === "Published" ? "selected" : ""}>Published</option>
        </select>
      </label>

    </article>
  `).join("");
}

function addContentPost(event) {
  event.preventDefault();

  const title = getValue("content-title");
  const platform = getValue("content-platform");
  const type = getValue("content-type");
  const date = getValue("content-date");
  const caption = getValue("content-caption");

  if (!title || !date) return;

  data.contentPosts.push({
    id: makeId(),
    title,
    platform,
    type,
    date,
    caption,
    status: "Planned",
    createdAt: new Date().toISOString()
  });

  saveData();
  getElement("content-post-form").reset();
  renderAll();
}

function updatePostStatus(postId, status) {
  const post = data.contentPosts.find(
    item => item.id === postId
  );

  if (!post) return;

  post.status = status;

  saveData();
  renderContentPosts();
}

function deleteContentPost(postId) {
  if (!confirm("Delete this content plan?")) return;

  data.contentPosts = data.contentPosts.filter(
    post => post.id !== postId
  );

  saveData();
  renderAll();
}

/* =========================================================
   TASK MANAGER
========================================================= */

function renderTasks() {
  const container = getElement("task-list");
  if (!container) return;

  const remaining = data.tasks.filter(
    task => !task.completed
  ).length;

  const completed = data.tasks.filter(
    task => task.completed
  ).length;

  setText("task-total-label", `${data.tasks.length} tasks`);

  if (data.tasks.length === 0) {
    container.innerHTML = emptyState(
      "No tasks yet. Add your first task above."
    );
  } else {
    container.innerHTML = data.tasks.map(task => {
      const launch = data.launches.find(
        item => item.id === task.launchId
      );

      return `
        <div class="task-item ${task.completed ? "task-completed" : ""}">

          <label class="task-checkbox">
            <input
              type="checkbox"
              data-complete-task="${escapeHTML(task.id)}"
              ${task.completed ? "checked" : ""}
            >

            <span class="task-checkmark"></span>
          </label>

          <div class="task-details">
            <strong>${escapeHTML(task.name)}</strong>

            <small>
              ${launch ? escapeHTML(launch.name) : "No linked launch"}
            </small>
          </div>

          <span class="task-priority priority-${escapeHTML(String(task.priority || "Normal").toLowerCase())}">
            ${escapeHTML(task.priority || "Normal")}
          </span>

          <button
            class="delete-button"
            type="button"
            data-delete-task="${escapeHTML(task.id)}"
            aria-label="Delete task"
          >
            ×
          </button>

        </div>
      `;
    }).join("");
  }

  renderDashboardTasks();
}

function addTask(event) {
  event.preventDefault();

  const name = getValue("task-name");
  const launchId = getValue("task-launch");
  const priority = getValue("task-priority");

  if (!name) return;

  data.tasks.push({
    id: makeId(),
    name,
    launchId,
    priority,
    completed: false,
    createdAt: new Date().toISOString()
  });

  saveData();
  getElement("task-form").reset();
  renderAll();
}

function toggleTask(taskId, completed) {
  const task = data.tasks.find(
    item => item.id === taskId
  );

  if (!task) return;

  task.completed = completed;

  saveData();
  renderAll();
}

function deleteTask(taskId) {
  data.tasks = data.tasks.filter(
    task => task.id !== taskId
  );

  saveData();
  renderAll();
}

function renderDashboardTasks() {
  const container = getElement("dashboard-tasks");
  if (!container) return;

  const recentTasks = [...data.tasks]
    .sort((a, b) => {
      return new Date(b.createdAt || 0) -
        new Date(a.createdAt || 0);
    })
    .slice(0, 5);

  if (recentTasks.length === 0) {
    container.innerHTML = emptyState(
      "Your recent tasks will appear here."
    );
    return;
  }

  container.innerHTML = recentTasks.map(task => `
    <div class="content-list-item">
      <div>
        <strong class="${task.completed ? "completed-text" : ""}">
          ${escapeHTML(task.name)}
        </strong>

        <small>
          ${task.completed ? "Completed" : "Still to do"}
        </small>
      </div>

      <span class="list-arrow">
        ${task.completed ? "✓" : "→"}
      </span>
    </div>
  `).join("");
}

/* =========================================================
   DASHBOARD STATISTICS
========================================================= */

function renderStats() {
  const remaining = data.tasks.filter(
    task => !task.completed
  ).length;

  const completed = data.tasks.filter(
    task => task.completed
  ).length;

  setText("launch-count", data.launches.length);
  setText("product-count", data.products.length);
  setText("task-count", remaining);
  setText("completed-count", completed);
}

/* =========================================================
   AI ASSISTANT
========================================================= */

function renderAssistantSelectors() {
  const launchSelector = getElement("assistant-launch");
  const productSelector = getElement("assistant-product");

  if (launchSelector) {
    const previousValue = launchSelector.value;

    launchSelector.innerHTML = `
      <option value="">No specific launch</option>

      ${data.launches.map(launch => `
        <option value="${escapeHTML(launch.id)}">
          ${escapeHTML(launch.name)}
        </option>
      `).join("")}
    `;

    if (data.launches.some(
      launch => launch.id === previousValue
    )) {
      launchSelector.value = previousValue;
    }
  }

  if (productSelector) {
    const previousValue = productSelector.value;

    productSelector.innerHTML = `
      <option value="">No specific product</option>

      ${data.products.map(product => `
        <option value="${escapeHTML(product.id)}">
          ${escapeHTML(product.name)}
        </option>
      `).join("")}
    `;

    if (data.products.some(
      product => product.id === previousValue
    )) {
      productSelector.value = previousValue;
    }
  }

  setText("assistant-brand-name", data.name);
}

function buildAssistantPrompt() {
  const mode = getValue("assistant-mode");
  const launchId = getValue("assistant-launch");
  const productId = getValue("assistant-product");
  const extraContext = getValue("assistant-context");

  const selectedLaunch = data.launches.find(
    launch => launch.id === launchId
  );

  const selectedProduct = data.products.find(
    product => product.id === productId
  );

  const modeInstructions = {
    strategy: `
Create a practical launch strategy for this brand.

Include:
- A clear launch concept
- A realistic timeline
- Preparation steps
- Marketing ideas
- Ways to build anticipation
- A launch-day plan
- Common mistakes to avoid
`,

    content: `
Create social media content ideas for this brand.

Include:
- TikTok ideas
- Instagram Reel ideas
- Story ideas
- Photo and carousel ideas
- Caption suggestions
- A realistic posting schedule
- Ways to build anticipation without a large budget
`,

    description: `
Write an appealing product description for this brand.

Include:
- A strong opening
- A clear description of the product
- The product's key features
- The brand's identity and tone
- A short version for social media
- A longer version for a product page

Do not invent product specifications that were not provided.
`,

    checklist: `
Create a detailed but manageable launch checklist.

Organize it into:
- Product preparation
- Branding and design
- Photography
- Social media
- Website preparation
- Launch day
- After-launch tasks

Make the checklist realistic for a small independent brand.
`,

    advice: `
Act as a thoughtful business and creative advisor.

Analyze this brand and provide:
- Its potential strengths
- Areas that need more development
- Ways to stand out
- Practical marketing ideas
- Low-cost improvements
- The next three useful actions

Be honest and realistic. Do not promise guaranteed sales or success.
`
  };

  const profile = `
BRAND PROFILE

Brand name: ${data.name}
Industry / niche: ${data.niche || "Not specified"}
Description: ${data.description || "Not specified"}
Target audience: ${data.targetAudience || "Not specified"}
Visual identity: ${data.visualStyle || "Not specified"}
Website: ${data.website || "Not specified"}
Instagram: ${data.instagram || "Not specified"}
TikTok: ${data.tiktok || "Not specified"}
`;

  const launches = data.launches.length
    ? data.launches.map(launch =>
        `- ${launch.name} | Date: ${launch.date} | Description: ${launch.description || "None"}`
      ).join("\n")
    : "No launches have been created.";

  const products = data.products.length
    ? data.products.map(product =>
        `- ${product.name} | Price: $${product.price} | Category: ${product.category} | Status: ${product.status}`
      ).join("\n")
    : "No products have been added.";

  const tasks = data.tasks.length
    ? data.tasks.map(task =>
        `- ${task.name} | Priority: ${task.priority} | Completed: ${task.completed ? "Yes" : "No"}`
      ).join("\n")
    : "No tasks have been created.";

  const contentPlans = data.contentPosts.length
    ? data.contentPosts.map(post =>
        `- ${post.title} | ${post.platform} | ${post.type} | ${post.date} | Status: ${post.status}`
      ).join("\n")
    : "No content plans have been created.";

  return `
You are an experienced creative strategist helping independent fashion and streetwear brands.

Your job is to provide practical, specific, and realistic advice.

Use the following information to understand the brand.

${profile}

CURRENT WORKSPACE INFORMATION

LAUNCHES
${launches}

PRODUCTS
${products}

TASKS
${tasks}

CONTENT PLANS
${contentPlans}

${selectedLaunch ? `
SELECTED LAUNCH
Name: ${selectedLaunch.name}
Date: ${selectedLaunch.date}
Description: ${selectedLaunch.description || "None"}
` : ""}

${selectedProduct ? `
SELECTED PRODUCT
Name: ${selectedProduct.name}
Price: $${selectedProduct.price}
Category: ${selectedProduct.category}
Status: ${selectedProduct.status}
` : ""}

ADDITIONAL INFORMATION
${extraContext || "No additional information provided."}

YOUR TASK

${modeInstructions[mode] || modeInstructions.advice}

IMPORTANT GUIDELINES

- Make your recommendations specific to this brand.
- Respect its visual identity and target audience.
- Work within the resources of a small independent brand.
- Prioritize low-cost and practical ideas.
- Explain your recommendations clearly.
- Avoid unrealistic promises.
- Organize your answer with useful headings and bullet points.
`;
}

function generatePrompt() {
  currentPrompt = buildAssistantPrompt();

  setValue("assistant-result", currentPrompt);

  if (getElement("copy-prompt")) {
    getElement("copy-prompt").disabled = false;
  }

  const selectedMode = getValue("assistant-mode");
  const titleInput = getElement("saved-idea-title");

  if (titleInput && !titleInput.value.trim()) {
    const titles = {
      strategy: "Launch strategy",
      content: "Social media ideas",
      description: "Product description",
      checklist: "Launch checklist",
      advice: "Brand advice"
    };

    titleInput.value = titles[selectedMode] || "Brand idea";
  }

  setValue("saved-idea-category", selectedMode);

  showMessage(
    "assistant-message",
    "Your prompt is ready. Copy it into ChatGPT."
  );
}

async function copyPrompt() {
  const prompt = getValue("assistant-result");
  if (!prompt) return;

  try {
    await navigator.clipboard.writeText(prompt);
    showMessage("assistant-message", "Prompt copied!");
  } catch (error) {
    const textarea = getElement("assistant-result");

    textarea.focus();
    textarea.select();

    const copied = document.execCommand("copy");

    showMessage(
      "assistant-message",
      copied ? "Prompt copied!" : "Select and copy the prompt manually."
    );
  }
}

/* =========================================================
   SAVED IDEAS LIBRARY
========================================================= */

const IDEA_CATEGORIES = {
  strategy: "Launch Strategy",
  content: "Social Media",
  description: "Product Descriptions",
  checklist: "Launch Checklists",
  advice: "Brand Advice",
  other: "Other"
};

function renderSavedIdeas() {
  const container = getElement("saved-ideas-list");
  if (!container) return;

  const filter = getValue("saved-ideas-filter") || "all";

  const ideas = data.savedIdeas.filter(idea => {
    return filter === "all" || idea.category === filter;
  });

  setText(
    "saved-ideas-count",
    `${ideas.length} ${ideas.length === 1 ? "idea" : "ideas"}`
  );

  if (ideas.length === 0) {
    container.innerHTML = emptyState(
      data.savedIdeas.length === 0
        ? "No saved ideas yet. Generate a prompt and save it from the AI Assistant."
        : "No ideas match this category."
    );

    return;
  }

  container.innerHTML = ideas.map(idea => `
    <article class="saved-idea-card">

      <div class="saved-idea-top">
        <span class="saved-idea-category">
          ${escapeHTML(IDEA_CATEGORIES[idea.category] || "Other")}
        </span>

        <button
          class="delete-button"
          type="button"
          data-delete-idea="${escapeHTML(idea.id)}"
          aria-label="Delete idea"
        >
          ×
        </button>
      </div>

      <h3>${escapeHTML(idea.title)}</h3>

      <small class="muted">
        Saved ${escapeHTML(formatDate(
          idea.createdAt
            ? idea.createdAt.slice(0, 10)
            : ""
        ))}
      </small>

      <p>${escapeHTML(
        idea.prompt.length > 180
          ? idea.prompt.slice(0, 180) + "..."
          : idea.prompt
      )}</p>

      <div class="saved-idea-actions">
        <button
          class="button button-secondary"
          type="button"
          data-copy-idea="${escapeHTML(idea.id)}"
        >
          Copy
        </button>
      </div>

    </article>
  `).join("");
}

function saveCurrentIdea() {
  const prompt = getValue("assistant-result");

  if (!prompt) {
    showMessage(
      "assistant-message",
      "Generate a prompt before saving an idea."
    );
    return;
  }

  const title = getValue("saved-idea-title") || "Untitled idea";
  const category = getValue("saved-idea-category") || "other";

  data.savedIdeas.unshift({
    id: makeId(),
    title,
    category,
    prompt,
    createdAt: new Date().toISOString()
  });

  saveData();
  renderSavedIdeas();

  showMessage("assistant-message", "Idea saved to your library!");
}

async function copySavedIdea(ideaId) {
  const idea = data.savedIdeas.find(
    item => item.id === ideaId
  );

  if (!idea) return;

  try {
    await navigator.clipboard.writeText(idea.prompt);
    alert("Saved idea copied!");
  } catch (error) {
    alert("Could not copy automatically. Please open the idea and copy its text.");
  }
}

function deleteSavedIdea(ideaId) {
  if (!confirm("Delete this saved idea?")) return;

  data.savedIdeas = data.savedIdeas.filter(
    idea => idea.id !== ideaId
  );

  saveData();
  renderSavedIdeas();
}

/* =========================================================
   RENDER EVERYTHING
========================================================= */

function renderAll() {
  data = getActiveBrand();

  updateBrandUI();

  renderLaunches();
  renderProducts();
  renderTasks();
  renderContentPosts();
  renderStats();
  renderAssistantSelectors();
  renderSavedIdeas();
  renderBrandList();
}

/* =========================================================
   EVENT LISTENERS
========================================================= */

// Sidebar navigation.
document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", () => {
    goToPage(link.dataset.page);
  });
});

// Buttons that navigate to another page.
document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => {
    goToPage(button.dataset.go);
  });
});

// Brand switcher.
getElement("brand-switcher")?.addEventListener("change", event => {
  switchBrand(event.target.value);
});

// Create and edit brands.
getElement("new-brand-form")?.addEventListener(
  "submit",
  createBrand
);

getElement("brand-profile-form")?.addEventListener(
  "submit",
  saveBrandProfile
);

// Switch brands from the brand list.
getElement("brand-list")?.addEventListener("click", event => {
  const button = event.target.closest("[data-switch-brand]");

  if (!button) return;

  switchBrand(button.dataset.switchBrand);
  renderBrandList();
});

// Launch planner.
getElement("launch-form")?.addEventListener(
  "submit",
  addLaunch
);

getElement("hero-add-launch")?.addEventListener("click", () => {
  goToPage("launches");
  getElement("launch-name")?.focus();
});

getElement("launch-list")?.addEventListener("click", event => {
  const button = event.target.closest("[data-delete-launch]");

  if (!button) return;

  deleteLaunch(button.dataset.deleteLaunch);
});

// Products.
getElement("product-form")?.addEventListener(
  "submit",
  addProduct
);

getElement("product-list")?.addEventListener("click", event => {
  const button = event.target.closest("[data-delete-product]");

  if (!button) return;

  deleteProduct(button.dataset.deleteProduct);
});

// Content planner.
getElement("content-post-form")?.addEventListener(
  "submit",
  addContentPost
);

getElement("content-post-list")?.addEventListener("click", event => {
  const button = event.target.closest("[data-delete-post]");

  if (!button) return;

  deleteContentPost(button.dataset.deletePost);
});

getElement("content-post-list")?.addEventListener("change", event => {
  const select = event.target.closest("[data-post-status]");

  if (!select) return;

  updatePostStatus(select.dataset.postStatus, select.value);
});

// Tasks.
getElement("task-form")?.addEventListener(
  "submit",
  addTask
);

getElement("task-list")?.addEventListener("change", event => {
  const checkbox = event.target.closest("[data-complete-task]");

  if (!checkbox) return;

  toggleTask(
    checkbox.dataset.completeTask,
    checkbox.checked
  );
});

getElement("task-list")?.addEventListener("click", event => {
  const button = event.target.closest("[data-delete-task]");

  if (!button) return;

  deleteTask(button.dataset.deleteTask);
});

// AI Assistant.
getElement("generate-prompt")?.addEventListener(
  "click",
  generatePrompt
);

getElement("copy-prompt")?.addEventListener(
  "click",
  copyPrompt
);

getElement("save-prompt")?.addEventListener(
  "click",
  saveCurrentIdea
);

// Saved ideas.
getElement("saved-ideas-filter")?.addEventListener(
  "change",
  renderSavedIdeas
);

getElement("saved-ideas-list")?.addEventListener("click", event => {
  const deleteButton = event.target.closest("[data-delete-idea]");
  const copyButton = event.target.closest("[data-copy-idea]");

  if (deleteButton) {
    deleteSavedIdea(deleteButton.dataset.deleteIdea);
  }

  if (copyButton) {
    copySavedIdea(copyButton.dataset.copyIdea);
  }
});

/* =========================================================
   STARTUP
========================================================= */

function startDropboard() {
  data = getActiveBrand();

  updateBrandUI();
  fillBrandProfile();
  renderAll();

  console.log("DROPBOARD V1.7 is ready!");
  console.log("Multiple brand workspaces are enabled.");
  console.log("Saved workspace data:", workspaceState);
}

startDropboard();

/* =========================================================
   V1.7 — WORKSPACE BACKUP AND RESTORE
========================================================= */

function createBackupPanel() {
  const brandsPage = getElement("brands-page");

  if (!brandsPage || getElement("backup-panel")) return;

  const panel = document.createElement("section");
  panel.id = "backup-panel";
  panel.className = "panel";
  panel.style.marginTop = "24px";

  panel.innerHTML = `
    <div class="panel-heading">
      <div>
        <span class="eyebrow">DATA PROTECTION</span>
        <h2>Workspace backup</h2>
        <p class="muted">
          Download a copy of all your brands and their information, or
          restore a previous DROPBOARD backup.
        </p>
      </div>
    </div>

    <div class="backup-actions" style="display:flex;flex-wrap:wrap;gap:12px;margin-top:18px;">
      <button class="button button-primary" id="backup-export-button" type="button">
        Download backup
      </button>

      <button class="button button-secondary" id="backup-import-button" type="button">
        Restore backup
      </button>

      <input
        id="backup-file-input"
        type="file"
        accept=".json,application/json"
        hidden
      >
    </div>

    <p
      id="backup-message"
      class="muted"
      role="status"
      aria-live="polite"
      style="margin-top:14px;"
    >
      Backups include every brand workspace and its saved information.
    </p>
  `;

  brandsPage.appendChild(panel);

  getElement("backup-export-button")?.addEventListener(
    "click",
    exportWorkspaceBackup
  );

  getElement("backup-import-button")?.addEventListener("click", () => {
    getElement("backup-file-input")?.click();
  });

  getElement("backup-file-input")?.addEventListener(
    "change",
    importWorkspaceBackup
  );
}

function exportWorkspaceBackup() {
  const backup = {
    format: "dropboard-workspace-backup",
    backupVersion: 1,
    appVersion: "1.7",
    exportedAt: new Date().toISOString(),
    workspace: workspaceState
  };

  try {
    const file = new Blob(
      [JSON.stringify(backup, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `dropboard-backup-${date}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    showMessage(
      "backup-message",
      "Backup downloaded. Keep the file somewhere safe."
    );

  } catch (error) {
    console.error("Could not export DROPBOARD backup:", error);

    showMessage(
      "backup-message",
      "The backup could not be downloaded. Please try again."
    );
  }
}

function validateBackupWorkspace(workspace) {
  if (
    !workspace ||
    typeof workspace !== "object" ||
    !Array.isArray(workspace.brands) ||
    workspace.brands.length === 0
  ) {
    return {
      valid: false,
      message: "This file does not contain a valid DROPBOARD workspace."
    };
  }

  const requiredCollections = [
    "launches",
    "products",
    "tasks",
    "contentPosts",
    "savedIdeas"
  ];

  for (const brand of workspace.brands) {
    if (!brand || typeof brand !== "object" || Array.isArray(brand)) {
      return {
        valid: false,
        message: "The backup contains an invalid brand entry."
      };
    }

    for (const collection of requiredCollections) {
      if (
        brand[collection] !== undefined &&
        !Array.isArray(brand[collection])
      ) {
        return {
          valid: false,
          message: `The backup has invalid ${collection} data. Nothing was changed.`
        };
      }
    }
  }

  return { valid: true };
}

async function importWorkspaceBackup(event) {
  const input = event.target;
  const file = input.files?.[0];

  if (!file) return;

  try {
    const fileText = await file.text();
    const backup = JSON.parse(fileText);

    if (
      !backup ||
      backup.format !== "dropboard-workspace-backup" ||
      backup.backupVersion !== 1
    ) {
      showMessage(
        "backup-message",
        "That file is not a supported DROPBOARD backup."
      );

      input.value = "";
      return;
    }

    const validation = validateBackupWorkspace(backup.workspace);

    if (!validation.valid) {
      showMessage("backup-message", validation.message);
      input.value = "";
      return;
    }

    const confirmed = confirm(
      "Restore this backup? This will replace all DROPBOARD brand workspaces currently saved in this browser. Export your current data first if you want to keep a separate copy."
    );

    if (!confirmed) {
      showMessage(
        "backup-message",
        "Restore cancelled. Your current data was not changed."
      );

      input.value = "";
      return;
    }

    const importedBrands = backup.workspace.brands.map(normalizeBrand);
    const usedIds = new Set();

    importedBrands.forEach(brand => {
      if (!brand.id || usedIds.has(brand.id)) {
        brand.id = makeId();
      }

      usedIds.add(brand.id);
    });

    const requestedActiveId = backup.workspace.activeBrandId;

    const activeBrandExists = importedBrands.some(
      brand => brand.id === requestedActiveId
    );

    const nextWorkspace = {
      version: 2,
      activeBrandId: activeBrandExists
        ? requestedActiveId
        : importedBrands[0].id,
      brands: importedBrands
    };

    // Save first. Only update the live app after browser storage succeeds.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextWorkspace));

    workspaceState = nextWorkspace;
    data = getActiveBrand();
    currentPrompt = "";

    setValue("assistant-result", "");

    if (getElement("copy-prompt")) {
      getElement("copy-prompt").disabled = true;
    }

    updateBrandUI();
    fillBrandProfile();
    renderAll();

    showMessage(
      "backup-message",
      `Backup restored successfully. ${workspaceState.brands.length} brand workspace${workspaceState.brands.length === 1 ? "" : "s"} restored.`
    );

  } catch (error) {
    console.error("Could not restore DROPBOARD backup:", error);

    showMessage(
      "backup-message",
      error instanceof SyntaxError
        ? "The selected file is not valid JSON."
        : "The backup could not be restored. Your existing data was not intentionally replaced."
    );

  } finally {
    input.value = "";
  }
}

// Add the V1.7 backup tools after the existing app has initialized.
createBackupPanel();

/* =========================================================
   DROPBOARD V1.8 — LAUNCH CALENDAR
========================================================= */

let calendarMonth = new Date();
calendarMonth = new Date(
  calendarMonth.getFullYear(),
  calendarMonth.getMonth(),
  1
);

let calendarSelectedDate = calendarDateKey(new Date());

function calendarDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseCalendarDate(value) {
  if (!value || typeof value !== "string") return null;

  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) {
    return null;
  }

  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function getCalendarEvents() {
  const launches = data.launches.map(launch => ({
    id: `launch-${launch.id}`,
    title: launch.name || "Untitled launch",
    date: launch.date,
    type: "launch",
    label: "Launch"
  }));

  const posts = data.contentPosts.map(post => ({
    id: `content-${post.id}`,
    title: post.title || "Untitled content",
    date: post.date,
    type: "content",
    label: post.platform || "Content",
    status: post.status || "Planned"
  }));

  return [...launches, ...posts]
    .filter(event => parseCalendarDate(event.date))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function createLaunchCalendarPanel() {
  const dashboard = getElement("dashboard-page");

  if (!dashboard || getElement("launch-calendar-panel")) return;

  const panel = document.createElement("section");
  panel.id = "launch-calendar-panel";
  panel.className = "panel";
  panel.style.marginTop = "24px";

  panel.innerHTML = `
    <div class="panel-heading calendar-heading">
      <div>
        <span class="eyebrow">V1.8 · PLAN AHEAD</span>
        <h2>Launch calendar</h2>
        <p class="muted">
          Keep your launches and content schedule in one place.
        </p>
      </div>

      <div class="calendar-controls">
        <button class="button button-secondary"
          type="button" data-calendar-action="today">
          Today
        </button>

        <button class="button button-secondary"
          type="button" data-calendar-action="previous"
          aria-label="Previous month">
          ‹
        </button>

        <button class="button button-secondary"
          type="button" data-calendar-action="next"
          aria-label="Next month">
          ›
        </button>
      </div>
    </div>

    <div id="calendar-month-label" class="calendar-month-label"></div>

    <div class="calendar-weekdays">
      <span>Sun</span><span>Mon</span><span>Tue</span>
      <span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
    </div>

    <div id="calendar-grid" class="calendar-grid"></div>

    <div class="calendar-legend">
      <span><i class="calendar-dot launch-dot"></i> Launch</span>
      <span><i class="calendar-dot content-dot"></i> Content post</span>
    </div>

    <div class="calendar-selected">
      <div class="calendar-selected-heading">
        <div>
          <span class="eyebrow">SELECTED DATE</span>
          <h3 id="calendar-selected-date">Choose a day</h3>
        </div>
        <span id="calendar-event-count" class="muted"></span>
      </div>

      <div id="calendar-day-events"></div>
    </div>
  `;

  const style = document.createElement("style");

  style.textContent = `
    #launch-calendar-panel {
      overflow: hidden;
    }

    .calendar-heading {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .calendar-controls {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .calendar-month-label {
      margin: 22px 0 14px;
      font-size: 18px;
      font-weight: 700;
    }

    .calendar-weekdays,
    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 6px;
    }

    .calendar-weekdays {
      margin-bottom: 7px;
      color: var(--muted, #aaa);
      font-size: 12px;
      text-align: center;
    }

    .calendar-day {
      min-width: 0;
      min-height: 74px;
      padding: 8px 5px;
      border: 1px solid var(--border, rgba(255,255,255,.1));
      border-radius: 10px;
      background: var(--card, rgba(255,255,255,.025));
      color: inherit;
      text-align: left;
      cursor: pointer;
      overflow: hidden;
    }

    .calendar-day:hover {
      border-color: var(--accent, #9b8cff);
    }

    .calendar-day.outside-month {
      opacity: .38;
    }

    .calendar-day.is-today {
      outline: 1px solid var(--accent, #9b8cff);
    }

    .calendar-day.is-selected {
      border-color: var(--accent, #9b8cff);
      background: rgba(155,140,255,.12);
    }

    .calendar-day-number {
      display: block;
      margin-bottom: 7px;
      font-size: 13px;
      font-weight: 700;
    }

    .calendar-markers {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .calendar-marker {
      display: block;
      width: 100%;
      padding: 3px 4px;
      border-radius: 4px;
      font-size: 10px;
      line-height: 1.25;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .calendar-marker.launch-marker {
      background: rgba(155,140,255,.2);
    }

    .calendar-marker.content-marker {
      background: rgba(70,190,160,.17);
    }

    .calendar-legend {
      display: flex;
      gap: 18px;
      flex-wrap: wrap;
      margin-top: 14px;
      color: var(--muted, #aaa);
      font-size: 12px;
    }

    .calendar-legend span {
      display: inline-flex;
      align-items: center;
      gap: 7px;
    }

    .calendar-dot {
      width: 8px;
      height: 8px;
      display: inline-block;
      border-radius: 50%;
    }

    .launch-dot {
      background: #9b8cff;
    }

    .content-dot {
      background: #46bea0;
    }

    .calendar-selected {
      margin-top: 22px;
      padding-top: 18px;
      border-top: 1px solid var(--border, rgba(255,255,255,.1));
    }

    .calendar-selected-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    .calendar-selected-heading h3 {
      margin: 5px 0 0;
    }

    .calendar-event {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid var(--border, rgba(255,255,255,.08));
    }

    .calendar-event-bar {
      width: 4px;
      min-height: 38px;
      flex: 0 0 4px;
      border-radius: 5px;
    }

    .calendar-event-bar.launch-bar {
      background: #9b8cff;
    }

    .calendar-event-bar.content-bar {
      background: #46bea0;
    }

    .calendar-event strong {
      display: block;
    }

    .calendar-event small {
      display: block;
      margin-top: 4px;
      color: var(--muted, #aaa);
    }

    @media (max-width: 600px) {
      .calendar-weekdays,
      .calendar-grid {
        gap: 3px;
      }

      .calendar-day {
        min-height: 58px;
        padding: 6px 3px;
        border-radius: 7px;
      }

      .calendar-marker {
        width: 7px;
        height: 7px;
        padding: 0;
        border-radius: 50%;
        font-size: 0;
      }

      .calendar-markers {
        flex-direction: row;
        flex-wrap: wrap;
      }

      .calendar-controls {
        width: 100%;
      }
    }
  `;

  document.head.appendChild(style);
  dashboard.appendChild(panel);

  panel.addEventListener("click", event => {
    const actionButton = event.target.closest("[data-calendar-action]");
    const dayButton = event.target.closest("[data-calendar-date]");

    if (actionButton) {
      const action = actionButton.dataset.calendarAction;

      if (action === "previous") {
        calendarMonth = new Date(
          calendarMonth.getFullYear(),
          calendarMonth.getMonth() - 1,
          1
        );
      }

      if (action === "next") {
        calendarMonth = new Date(
          calendarMonth.getFullYear(),
          calendarMonth.getMonth() + 1,
          1
        );
      }

      if (action === "today") {
        const today = new Date();
        calendarMonth = new Date(
          today.getFullYear(),
          today.getMonth(),
          1
        );
        calendarSelectedDate = calendarDateKey(today);
      }

      renderLaunchCalendar();
      return;
    }

    if (dayButton) {
      calendarSelectedDate = dayButton.dataset.calendarDate;
      renderLaunchCalendar();
    }
  });

  renderLaunchCalendar();
}

function renderLaunchCalendar() {
  if (!getElement("launch-calendar-panel")) return;

  const monthLabel = getElement("calendar-month-label");
  const grid = getElement("calendar-grid");
  const selectedLabel = getElement("calendar-selected-date");
  const eventCount = getElement("calendar-event-count");
  const dayEventsContainer = getElement("calendar-day-events");

  if (!monthLabel || !grid || !selectedLabel || !dayEventsContainer) {
    return;
  }

  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();

  monthLabel.textContent = calendarMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });

  const events = getCalendarEvents();
  const eventsByDate = new Map();

  events.forEach(event => {
    if (!eventsByDate.has(event.date)) {
      eventsByDate.set(event.date, []);
    }

    eventsByDate.get(event.date).push(event);
  });

  const firstDay = new Date(year, month, 1);
  const startDate = new Date(
    year,
    month,
    1 - firstDay.getDay()
  );

  const todayKey = calendarDateKey(new Date());
  const cells = [];

  for (let i = 0; i < 42; i++) {
    const date = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate() + i
    );

    const dateKey = calendarDateKey(date);
    const dayEvents = eventsByDate.get(dateKey) || [];

    const classes = [
      "calendar-day",
      date.getMonth() !== month ? "outside-month" : "",
      dateKey === todayKey ? "is-today" : "",
      dateKey === calendarSelectedDate ? "is-selected" : ""
    ].filter(Boolean).join(" ");

    const markers = dayEvents.slice(0, 2).map(item => `
      <span class="calendar-marker ${
        item.type === "launch" ? "launch-marker" : "content-marker"
      }">
        ${escapeHTML(item.title)}
      </span>
    `).join("");

    const more = dayEvents.length > 2
      ? `<span class="muted" style="font-size:10px;">+${dayEvents.length - 2} more</span>`
      : "";

    cells.push(`
      <button
        class="${classes}"
        type="button"
        data-calendar-date="${dateKey}"
        aria-pressed="${dateKey === calendarSelectedDate}"
      >
        <span class="calendar-day-number">${date.getDate()}</span>
        <span class="calendar-markers">${markers}${more}</span>
      </button>
    `);
  }

  grid.innerHTML = cells.join("");

  if (!parseCalendarDate(calendarSelectedDate)) {
    calendarSelectedDate = todayKey;
  }

  const selectedEvents = eventsByDate.get(calendarSelectedDate) || [];
  const selectedDate = parseCalendarDate(calendarSelectedDate);

  selectedLabel.textContent = selectedDate
    ? selectedDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
      })
    : "Selected date";

  if (eventCount) {
    eventCount.textContent =
      `${selectedEvents.length} ${
        selectedEvents.length === 1 ? "event" : "events"
      }`;
  }

  if (selectedEvents.length === 0) {
    dayEventsContainer.innerHTML = emptyState(
      "Nothing scheduled for this day. Add a launch or content post to see it here."
    );
    return;
  }

  dayEventsContainer.innerHTML = selectedEvents.map(item => `
    <div class="calendar-event">
      <span class="calendar-event-bar ${
        item.type === "launch" ? "launch-bar" : "content-bar"
      }"></span>
      <div>
        <strong>${escapeHTML(item.title)}</strong>
        <small>
          ${escapeHTML(item.label)}
          ${item.status ? ` · ${escapeHTML(item.status)}` : ""}
        </small>
      </div>
    </div>
  `).join("");
}

/* Keep the calendar refreshed whenever DROPBOARD updates. */
const originalRenderAllV18 = renderAll;

renderAll = function() {
  originalRenderAllV18();
  renderLaunchCalendar();
};

/* Create the calendar after the existing app loads. */
createLaunchCalendarPanel();

console.log("DROPBOARD V1.8 Launch Calendar is ready!");

/* =========================================================
   DROPBOARD — COMPLETE DELETE SYSTEM FIX
   Adds brand deletion, consistent confirmations,
   and clear Delete buttons throughout the app.
========================================================= */

// Make all existing delete buttons clearly readable.
function updateDeleteButtonLabels() {
  document.querySelectorAll(".delete-button").forEach(button => {
    button.textContent = "Delete";
    button.setAttribute("aria-label", "Delete item");

    button.style.width = "auto";
    button.style.minWidth = "62px";
    button.style.height = "auto";
    button.style.padding = "7px 11px";
    button.style.fontSize = "12px";
    button.style.borderRadius = "7px";
    button.style.cursor = "pointer";
  });
}

/* =========================================================
   BRAND DELETION
========================================================= */

// Replace the brand list renderer with one that includes
// a Delete button for every brand workspace.
renderBrandList = function() {
  const container = getElement("brand-list");
  if (!container) return;

  if (workspaceState.brands.length === 0) {
    container.innerHTML = emptyState("No brands created yet.");
    return;
  }

  container.innerHTML = workspaceState.brands.map(brand => {
    const active = brand.id === data.id;

    return `
      <div class="brand-list-item ${active ? "active" : ""}">
        <div class="brand-list-info">
          <div class="brand-list-avatar">
            ${escapeHTML(brand.name.charAt(0).toUpperCase())}
          </div>

          <div>
            <strong>${escapeHTML(brand.name)}</strong>
            <small>${escapeHTML(brand.niche || "No niche added")}</small>
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          ${
            active
              ? `<span class="brand-profile-badge">ACTIVE</span>`
              : `
                <button
                  class="button button-secondary brand-open-button"
                  type="button"
                  data-switch-brand="${escapeHTML(brand.id)}"
                >
                  Open
                </button>
              `
          }

          <button
            class="delete-button"
            type="button"
            data-delete-brand="${escapeHTML(brand.id)}"
            aria-label="Delete ${escapeHTML(brand.name)} workspace"
          >
            Delete
          </button>
        </div>
      </div>
    `;
  }).join("");

  updateDeleteButtonLabels();
};

function deleteBrand(brandId) {
  const brand = workspaceState.brands.find(
    item => item.id === brandId
  );

  if (!brand) return;

  // Keep at least one workspace so DROPBOARD always has
  // an active brand to work with.
  if (workspaceState.brands.length <= 1) {
    alert(
      "You must keep at least one brand workspace. Create another brand before deleting this one."
    );
    return;
  }

  const confirmed = confirm(
    `Delete the "${brand.name}" workspace?\n\nThis permanently deletes its launches, products, tasks, content plans, and saved ideas from this browser.\n\nExport a backup first if you want to keep this information.`
  );

  if (!confirmed) return;

  workspaceState.brands = workspaceState.brands.filter(
    item => item.id !== brandId
  );

  // If the deleted workspace was active, switch to
  // the first remaining workspace.
  if (workspaceState.activeBrandId === brandId) {
    workspaceState.activeBrandId = workspaceState.brands[0].id;
  }

  data = getActiveBrand();

  currentPrompt = "";
  setValue("assistant-result", "");

  if (getElement("copy-prompt")) {
    getElement("copy-prompt").disabled = true;
  }

  saveData();
  updateBrandUI();
  fillBrandProfile();
  renderAll();

  showMessage("brand-profile-message", "Brand workspace deleted.");
}

// Brand delete button listener.
getElement("brand-list")?.addEventListener("click", event => {
  const button = event.target.closest("[data-delete-brand]");

  if (!button) return;

  event.stopPropagation();
  deleteBrand(button.dataset.deleteBrand);
});

/* =========================================================
   CONSISTENT DELETE CONFIRMATIONS
========================================================= */

// Launches.
deleteLaunch = function(launchId) {
  const launch = data.launches.find(
    item => item.id === launchId
  );

  if (!launch) return;

  if (!confirm(
    `Delete the launch "${launch.name}"?\n\nRelated tasks will remain, but they will no longer be linked to this launch.`
  )) return;

  data.launches = data.launches.filter(
    item => item.id !== launchId
  );

  data.tasks.forEach(task => {
    if (task.launchId === launchId) {
      task.launchId = "";
    }
  });

  saveData();
  renderAll();
};

// Products.
deleteProduct = function(productId) {
  const product = data.products.find(
    item => item.id === productId
  );

  if (!product) return;

  if (!confirm(`Delete the product "${product.name}"?`)) return;

  data.products = data.products.filter(
    item => item.id !== productId
  );

  saveData();
  renderAll();
};

// Tasks.
deleteTask = function(taskId) {
  const task = data.tasks.find(
    item => item.id === taskId
  );

  if (!task) return;

  if (!confirm(`Delete the task "${task.name}"?`)) return;

  data.tasks = data.tasks.filter(
    item => item.id !== taskId
  );

  saveData();
  renderAll();
};

// Content posts.
deleteContentPost = function(postId) {
  const post = data.contentPosts.find(
    item => item.id === postId
  );

  if (!post) return;

  if (!confirm(`Delete the content plan "${post.title}"?`)) return;

  data.contentPosts = data.contentPosts.filter(
    item => item.id !== postId
  );

  saveData();
  renderAll();
};

// Saved ideas.
deleteSavedIdea = function(ideaId) {
  const idea = data.savedIdeas.find(
    item => item.id === ideaId
  );

  if (!idea) return;

  if (!confirm(`Delete the saved idea "${idea.title}"?`)) return;

  data.savedIdeas = data.savedIdeas.filter(
    item => item.id !== ideaId
  );

  saveData();
  renderSavedIdeas();
  updateDeleteButtonLabels();
};

/* =========================================================
   KEEP DELETE BUTTONS CONSISTENT AFTER RENDERING
========================================================= */

const originalRenderAllDeleteFix = renderAll;

renderAll = function() {
  originalRenderAllDeleteFix();
  updateDeleteButtonLabels();
};

// Apply the updated labels to the current screen.
renderBrandList();
updateDeleteButtonLabels();

console.log("DROPBOARD delete system is ready!");

/* =========================================================
   DROPBOARD — DASHBOARD TASK ARROW FIX
   Makes each recent task arrow open its exact task.
========================================================= */

// Give each task its own ID in the Tasks page.
const originalRenderTasksWithIds = renderTasks;

renderTasks = function() {
  originalRenderTasksWithIds();

  const taskElements = document.querySelectorAll(
    "#task-list .task-item"
  );

  taskElements.forEach((element, index) => {
    if (data.tasks[index]) {
      element.dataset.taskId = data.tasks[index].id;
    }
  });
};

// Make dashboard task arrows clickable.
renderDashboardTasks = function() {
  const container = getElement("dashboard-tasks");
  if (!container) return;

  const recentTasks = [...data.tasks]
    .sort((a, b) => {
      return new Date(b.createdAt || 0) -
        new Date(a.createdAt || 0);
    })
    .slice(0, 5);

  if (recentTasks.length === 0) {
    container.innerHTML = emptyState(
      "Your recent tasks will appear here."
    );
    return;
  }

  container.innerHTML = recentTasks.map(task => `
    <div class="content-list-item">
      <div>
        <strong class="${task.completed ? "completed-text" : ""}">
          ${escapeHTML(task.name)}
        </strong>

        <small>
          ${task.completed ? "Completed" : "Still to do"}
        </small>
      </div>

      <button
        class="list-arrow"
        type="button"
        data-open-task="${escapeHTML(task.id)}"
        aria-label="Open task: ${escapeHTML(task.name)}"
        title="Open this task"
      >
        ${task.completed ? "✓" : "→"}
      </button>
    </div>
  `).join("");
};

// Handle clicks on individual dashboard task arrows.
getElement("dashboard-tasks")?.addEventListener(
  "click",
  event => {
    const button = event.target.closest("[data-open-task]");

    if (!button) return;

    const taskId = button.dataset.openTask;

    const taskExists = data.tasks.some(
      task => task.id === taskId
    );

    if (!taskExists) return;

    // Open the Tasks page.
    goToPage("tasks");

    // Find the exact task.
    const taskElement = Array.from(
      document.querySelectorAll("#task-list .task-item")
    ).find(element => element.dataset.taskId === taskId);

    if (taskElement) {
      taskElement.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

      taskElement.style.outline = "2px solid #9b8cff";
      taskElement.style.outlineOffset = "4px";

      setTimeout(() => {
        taskElement.style.outline = "";
        taskElement.style.outlineOffset = "";
      }, 2500);

      taskElement.setAttribute("tabindex", "-1");
      taskElement.focus({ preventScroll: true });
    }
  }
);

// Refresh the dashboard and task IDs.
renderTasks();
renderDashboardTasks();

console.log("DROPBOARD dashboard task arrows are working!");
