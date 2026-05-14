const API = 'http://18.191.69.90:8000';
let authUser = null;
let allVideos = [];
let categories = [];
let activeFilter = 'home';
let activeCatId = 'all';

/* ══ UTILS ══ */
function fmt(date) {
  return new Date(date).toLocaleDateString('es-ES', { year:'numeric', month:'short', day:'numeric' });
}

function fmtDuration(sec) {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2,'0')}`;
}

function fmtViews(n) {
  n = n ?? 0;
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M vistas`;
  if (n >= 1_000)     return `${(n/1_000).toFixed(1)}K vistas`;
  return `${n} vistas`;
}

function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.className = 'toast', 3000);
}

function saveAuthUser(user) {
  authUser = user;
  localStorage.setItem('streamvault_user', JSON.stringify(user));
  updateUserButton();
}

function loadAuthState() {
  try {
    authUser = JSON.parse(localStorage.getItem('streamvault_user')) || null;
  } catch {
    authUser = null;
  }
  updateUserButton();
}

function clearAuthState() {
  authUser = null;
  localStorage.removeItem('streamvault_user');
  updateUserButton();
}

function updateUserButton() {
  const userBtnText = document.getElementById('user-btn-text');
  const userBtn = document.getElementById('user-btn');
  if (!userBtnText || !userBtn) return;

  if (authUser) {
    userBtnText.textContent = authUser.username || 'Mi cuenta';
    userBtn.dataset.logged = 'true';
  } else {
    userBtnText.textContent = 'Entrar';
    delete userBtn.dataset.logged;
  }
}

function initial(str) {
  return (str || '?')[0].toUpperCase();
}

/* ══ DOM BUILDERS (Safe without innerHTML) ══ */
function createLoadingState() {
  const div = document.createElement('div');
  div.className = 'loading-state';
  div.setAttribute('role', 'status');
  
  const spinner = document.createElement('div');
  spinner.className = 'spinner';
  
  const p = document.createElement('p');
  p.textContent = 'Cargando…';
  
  div.appendChild(spinner);
  div.appendChild(p);
  return div;
}

function createEmptyState(icon, message) {
  const div = document.createElement('div');
  div.className = 'empty-state';
  div.setAttribute('role', 'status');
  
  const iconEl = document.createElement('div');
  iconEl.className = 'empty-icon';
  iconEl.textContent = icon;
  
  const p = document.createElement('p');
  p.textContent = message;
  
  div.appendChild(iconEl);
  div.appendChild(p);
  return div;
}

function createAvatarCircle(text) {
  const div = document.createElement('div');
  div.className = 'user-avatar-circle';
  div.textContent = initial(text);
  return div;
}

/* ══ SIDEBAR TOGGLE ══ */
const sidebarEl = document.getElementById('sidebar');
const appBody   = document.getElementById('app-body');

document.getElementById('sidebar-toggle').addEventListener('click', () => {
  if (window.innerWidth > 900) {
    sidebarEl.classList.toggle('hidden');
    appBody.classList.toggle('sidebar-collapsed');
  } else {
    sidebarEl.classList.toggle('mobile-open');
  }
});

/* ══ LOAD CATEGORIES ══ */
async function loadCategories() {
  try {
    const res = await fetch(`${API}/categories/`);
    if (!res.ok) throw new Error();
    categories = await res.json();

    const chipsBar = document.getElementById('chips-bar');
    const sidebarCats = document.getElementById('sidebar-cats');
    const uploadSelect = document.getElementById('upload-category');

    categories.forEach(cat => {
      // Chip
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.dataset.id = cat.id;
      chip.textContent = cat.name;
      chip.addEventListener('click', () => selectCategory(cat.id, chip));
      chipsBar.appendChild(chip);

      // Sidebar item
      const item = document.createElement('a');
      item.className = 'sidebar-item';
      item.href = '#';
      item.dataset.id = cat.id;

      const icon = document.createElement('span');
      icon.className = 'icon';
      icon.textContent = '📂';
      item.appendChild(icon);
      item.appendChild(document.createTextNode(' ' + cat.name));
      item.addEventListener('click', (e) => {
        e.preventDefault();
        selectCategory(cat.id, chip);
        if (window.innerWidth <= 900) sidebarEl.classList.remove('mobile-open');
      });
      sidebarCats.appendChild(item);

      // Upload select option
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      uploadSelect.appendChild(opt);
    });
  } catch {
    showToast('Error cargando categorías', 'error');
  }
}

function selectCategory(id, chipEl) {
  activeCatId = id;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  if (chipEl) chipEl.classList.add('active');

  if (id === 'all') {
    renderVideos(allVideos);
  } else {
    renderVideos(allVideos.filter(v => v.category_id === id));
  }
}

/* ══ LOAD VIDEOS ══ */
async function loadVideos(endpoint = `${API}/videos/`) {
  const grid = document.getElementById('videos-grid');
  grid.textContent = '';
  grid.appendChild(createLoadingState());

  try {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error();
    allVideos = await res.json();
    renderVideos(allVideos);
  } catch {
    grid.textContent = '';
    grid.appendChild(createEmptyState('📡', 'No se pudo conectar con el servidor.'));
  }
}

/* ══ RENDER VIDEOS ══ */
function renderVideos(videos) {
  const grid = document.getElementById('videos-grid');
  grid.textContent = '';

  if (!videos.length) {
    grid.appendChild(createEmptyState('🎬', 'No hay videos en esta categoría.'));
    return;
  }

  videos.forEach((video, i) => {
    const cat = categories.find(c => c.id === video.category_id);

    const article = document.createElement('article');
    article.className = 'video-card';
    article.setAttribute('role', 'listitem');
    article.style.animationDelay = `${i * 0.04}s`;

    const link = document.createElement('a');
    link.href = `player.html?id=${video.id}`;
    link.setAttribute('aria-label', `Ver ${video.title}`);

    /* Thumb */
    const thumbDiv = document.createElement('div');
    thumbDiv.className = 'card-thumb';

    const img = document.createElement('img');
    img.src = video.thumbnail_url || `https://placehold.co/480x270/111e38/2563eb?text=▶`;
    img.alt = video.title;
    img.loading = 'lazy';
    thumbDiv.appendChild(img);

    if (video.duration) {
      const dur = document.createElement('span');
      dur.className = 'thumb-duration';
      dur.textContent = fmtDuration(video.duration);
      thumbDiv.appendChild(dur);
    }

    const overlay = document.createElement('div');
    overlay.className = 'play-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    const playIcon = document.createElement('div');
    playIcon.className = 'play-icon';
    playIcon.textContent = '▶';
    overlay.appendChild(playIcon);
    thumbDiv.appendChild(overlay);

    link.appendChild(thumbDiv);

    /* Body */
    const body = document.createElement('div');
    body.className = 'card-body';

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'card-avatar';
    avatarDiv.textContent = initial(video.title);
    body.appendChild(avatarDiv);

    const metaCol = document.createElement('div');
    metaCol.className = 'card-meta-col';

    if (cat) {
      const badge = document.createElement('div');
      badge.className = 'card-category-badge';
      badge.textContent = cat.name;
      metaCol.appendChild(badge);
    }

    const titleEl = document.createElement('div');
    titleEl.className = 'card-title';
    titleEl.textContent = video.title;
    metaCol.appendChild(titleEl);

    const stats = document.createElement('div');
    stats.className = 'card-stats';

    const views = document.createElement('span');
    views.textContent = fmtViews(video.views);

    const date = document.createElement('span');
    date.textContent = fmt(video.created_at);

    stats.appendChild(views);
    stats.appendChild(date);
    metaCol.appendChild(stats);

    body.appendChild(metaCol);
    link.appendChild(body);
    article.appendChild(link);
    grid.appendChild(article);
  });
}

/* ══ SEARCH ══ */
async function searchVideos(q) {
  q = q.trim();
  if (!q) {
    renderVideos(allVideos);
    return;
  }
  const grid = document.getElementById('videos-grid');
  grid.textContent = '';
  grid.appendChild(createLoadingState());

  try {
    const res = await fetch(`${API}/videos/search?q=${encodeURIComponent(q)}`);
    const results = await res.json();
    renderVideos(results);
  } catch {
    showToast('Error en la búsqueda', 'error');
  }
}

document.getElementById('search-btn').addEventListener('click', () => {
  searchVideos(document.getElementById('search-input').value);
});

document.getElementById('search-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') searchVideos(e.target.value);
});

/* ══ SIDEBAR FILTER ITEMS ══ */
document.querySelectorAll('.sidebar-item[data-filter]').forEach(item => {
  item.addEventListener('click', async (e) => {
    e.preventDefault();
    activeFilter = item.dataset.filter;

    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    // reset chip "Todos"
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    const allChip = document.querySelector('.chip[data-id="all"]');
    if (allChip) allChip.classList.add('active');
    activeCatId = 'all';

    if (activeFilter === 'recent') {
      await loadVideos(`${API}/videos/recent`);
    } else if (activeFilter === 'recommended') {
      await loadVideos(`${API}/videos/recommended`);
    } else {
      await loadVideos();
    }

    if (window.innerWidth <= 900) sidebarEl.classList.remove('mobile-open');
  });
});

/* ══ CHIP "Todos" ══ */
document.querySelector('.chip[data-id="all"]').addEventListener('click', function() {
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  this.classList.add('active');
  activeCatId = 'all';
  renderVideos(allVideos);
});

/* ══ UPPER MODALS ══ */
const uploadModal      = document.getElementById('upload-modal');
const authModal        = document.getElementById('auth-modal');
const usersModal       = document.getElementById('users-modal');
const openUploadBtn    = document.getElementById('open-upload-btn');
const userBtn          = document.getElementById('user-btn');
const closeModalBtn    = document.getElementById('close-modal-btn');
const cancelUploadBtn  = document.getElementById('cancel-upload-btn');
const closeAuthBtn     = document.getElementById('close-auth-btn');
const authCancelBtn    = document.getElementById('auth-cancel-btn');
const authForm         = document.getElementById('auth-form');
const authFieldset     = document.getElementById('auth-fieldset');
const authTabs         = document.querySelectorAll('.auth-tab');
const closeUsersBtn    = document.getElementById('close-users-btn');
const refreshUsersBtn  = document.getElementById('refresh-users-btn');
const usersListEl      = document.getElementById('users-list');
const userDetailsEl    = document.getElementById('user-details');

let authMode = 'login';
let selectedUserId = null;

function openUploadModal() {
  if (!authUser) {
    showToast('Inicia sesión para subir videos', 'error');
    openAuthModal('login');
    return;
  }
  uploadModal.classList.add('open');
}

function closeUploadModal() {
  uploadModal.classList.remove('open');
}

function openAuthModal(mode = 'login') {
  authMode = mode;
  authModal.classList.add('open');
  renderAuthForm();
}

function closeAuthModal() {
  authModal.classList.remove('open');
}

function openUsersModal() {
  usersModal.classList.add('open');
  loadUsers();
}

function closeUsersModal() {
  usersModal.classList.remove('open');
}

function closeOnOutsideClick(e) {
  if (e.target === uploadModal) closeUploadModal();
  if (e.target === authModal) closeAuthModal();
  if (e.target === usersModal) closeUsersModal();
}

openUploadBtn.addEventListener('click', openUploadModal);
userBtn.addEventListener('click', () => {
  if (authUser) openUsersModal(); else openAuthModal('login');
});
closeModalBtn.addEventListener('click', closeUploadModal);
cancelUploadBtn.addEventListener('click', closeUploadModal);
closeAuthBtn.addEventListener('click', closeAuthModal);
authCancelBtn.addEventListener('click', closeAuthModal);
closeUsersBtn.addEventListener('click', closeUsersModal);
refreshUsersBtn.addEventListener('click', loadUsers);

authModal.addEventListener('click', closeOnOutsideClick);
uploadModal.addEventListener('click', closeOnOutsideClick);
usersModal.addEventListener('click', closeOnOutsideClick);

authTabs.forEach(tab => {
  tab.addEventListener('click', () => openAuthModal(tab.dataset.mode));
});

function renderAuthForm() {
  authTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.mode === authMode);
  });

  // Clear fieldset safely
  while (authFieldset.firstChild) {
    authFieldset.removeChild(authFieldset.firstChild);
  }

  const fields = [];

  if (authMode === 'register') {
    fields.push({ id: 'username', label: 'Nombre de usuario', type: 'text', placeholder: 'Elige un nombre de usuario' });
  }

  fields.push({ id: 'email', label: 'Correo electrónico', type: 'email', placeholder: 'tu@correo.com' });
  fields.push({ id: 'password', label: 'Contraseña', type: 'password', placeholder: '********' });

  fields.forEach(field => {
    const group = document.createElement('div');
    group.className = 'form-group';

    const label = document.createElement('label');
    label.className = 'form-label';
    label.htmlFor = `auth-${field.id}`;
    label.textContent = field.label;

    const input = document.createElement('input');
    input.className = 'form-input';
    input.type = field.type;
    input.id = `auth-${field.id}`;
    input.name = field.id;
    input.placeholder = field.placeholder;
    input.required = true;

    group.appendChild(label);
    group.appendChild(input);
    authFieldset.appendChild(group);
  });

  const submitBtn = document.getElementById('auth-submit-btn');
  submitBtn.textContent = authMode === 'register' ? 'Crear cuenta' : 'Ingresar';
  document.getElementById('auth-modal-title').textContent = authMode === 'register' ? 'Registrarse' : 'Iniciar sesión';
}

async function submitAuthForm(event) {
  event.preventDefault();
  const formData = new FormData(authForm);
  const payload = Object.fromEntries(formData.entries());

  if (authMode === 'register') {
    if (!payload.username || !payload.email || !payload.password) {
      showToast('Completa todos los campos.', 'error');
      return;
    }
  } else {
    if (!payload.email || !payload.password) {
      showToast('Completa todos los campos.', 'error');
      return;
    }
  }

  const endpoint = authMode === 'register' ? '/users/register' : '/users/login';
  const message = authMode === 'register' ? 'Cuenta creada' : 'Bienvenido de nuevo';

  try {
    const res = await fetch(`${API}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Error en autenticación');
    }
    saveAuthUser(data);
    closeAuthModal();
    showToast(`${message}: ${data.username || data.email}`, 'success');
  } catch (err) {
    showToast(err.message || 'Error en el servidor', 'error');
  }
}

authForm.addEventListener('submit', submitAuthForm);

async function loadUsers() {
  if (!usersListEl) return;
  
  while (usersListEl.firstChild) {
    usersListEl.removeChild(usersListEl.firstChild);
  }
  
  usersListEl.appendChild(createLoadingState());

  try {
    const res = await fetch(`${API}/users/`);
    if (!res.ok) throw new Error();
    const users = await res.json();
    renderUsersList(users);
  } catch {
    while (usersListEl.firstChild) {
      usersListEl.removeChild(usersListEl.firstChild);
    }
    usersListEl.appendChild(createEmptyState('⚠️', 'No se pudo cargar la lista de usuarios.'));
  }
}

function renderUsersList(users) {
  while (usersListEl.firstChild) {
    usersListEl.removeChild(usersListEl.firstChild);
  }

  if (!users.length) {
    usersListEl.appendChild(createEmptyState('👥', 'No hay usuarios disponibles.'));
    return;
  }

  users.forEach(user => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'user-card-button';
    button.dataset.userId = user.id;
    
    const avatar = createAvatarCircle(user.username);
    const span = document.createElement('span');
    span.textContent = user.username;
    
    button.appendChild(avatar);
    button.appendChild(span);
    button.addEventListener('click', () => showUserDetails(user.id, button));
    usersListEl.appendChild(button);
  });
}

async function showUserDetails(userId, selectedButton) {
  selectedUserId = userId;
  if (selectedButton) {
    document.querySelectorAll('.user-card-button').forEach(btn => btn.classList.toggle('active', btn === selectedButton));
  }

  while (userDetailsEl.firstChild) {
    userDetailsEl.removeChild(userDetailsEl.firstChild);
  }
  
  userDetailsEl.appendChild(createLoadingState());

  try {
    const [userRes, videosRes] = await Promise.all([
      fetch(`${API}/users/${userId}`),
      fetch(`${API}/users/${userId}/videos`)
    ]);

    if (!userRes.ok) throw new Error('Usuario no encontrado');
    const user = await userRes.json();
    const videos = videosRes.ok ? await videosRes.json() : [];
    renderUserDetails(user, videos);
  } catch (err) {
    while (userDetailsEl.firstChild) {
      userDetailsEl.removeChild(userDetailsEl.firstChild);
    }
    userDetailsEl.appendChild(createEmptyState('⚠️', err.message || 'No se pudo cargar el usuario.'));
  }
}

function renderUserDetails(user, videos) {
  while (userDetailsEl.firstChild) {
    userDetailsEl.removeChild(userDetailsEl.firstChild);
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'user-details';

  // Summary
  const summary = document.createElement('div');
  summary.className = 'user-details-summary';
  
  const avatarCircle = createAvatarCircle(user.username);
  summary.appendChild(avatarCircle);

  const infoDiv = document.createElement('div');
  const h3 = document.createElement('h3');
  h3.textContent = user.username;
  const meta = document.createElement('div');
  meta.className = 'user-details-meta';
  meta.textContent = `ID ${user.id} · ${user.email}`;
  
  infoDiv.appendChild(h3);
  infoDiv.appendChild(meta);
  summary.appendChild(infoDiv);
  wrapper.appendChild(summary);

  // Avatar if exists
  if (user.avatar_url) {
    const avatarRow = document.createElement('div');
    avatarRow.className = 'user-avatar-upload';
    
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    formGroup.style.flex = '1';
    formGroup.style.minWidth = '200px';
    
    const label = document.createElement('label');
    label.className = 'form-label';
    label.textContent = 'Avatar';
    
    const img = document.createElement('img');
    img.src = user.avatar_url;
    img.alt = 'Avatar';
    img.style.width = '100%';
    img.style.borderRadius = '12px';
    img.style.border = '1px solid var(--border)';
    
    formGroup.appendChild(label);
    formGroup.appendChild(img);
    avatarRow.appendChild(formGroup);
    wrapper.appendChild(avatarRow);
  }

  // Avatar upload if logged in user
  if (authUser && authUser.id === user.id) {
    const editSection = document.createElement('div');
    editSection.className = 'user-avatar-upload';
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.id = 'avatar-file-input';
    
    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.className = 'btn-primary';
    uploadBtn.textContent = 'Actualizar avatar';
    uploadBtn.addEventListener('click', () => updateAvatar(user.id, fileInput.files[0]));
    
    editSection.appendChild(fileInput);
    editSection.appendChild(uploadBtn);
    wrapper.appendChild(editSection);
  }

  // Videos section title
  const sectionTitle = document.createElement('h4');
  sectionTitle.textContent = `Videos de ${user.username}`;
  sectionTitle.style.marginTop = '1rem';
  wrapper.appendChild(sectionTitle);

  // Videos grid
  if (!videos.length) {
    wrapper.appendChild(createEmptyState('🎥', 'Este usuario aún no tiene videos.'));
  } else {
    const list = document.createElement('div');
    list.className = 'user-videos-grid';

    videos.forEach(video => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'user-video-card';
      card.addEventListener('click', () => {
        window.location.href = `player.html?id=${video.id}`;
      });

      const thumb = document.createElement('img');
      thumb.src = video.thumbnail_url || `https://placehold.co/320x180/111e38/2563eb?text=▶`;
      thumb.alt = video.title;
      card.appendChild(thumb);

      const body = document.createElement('div');
      body.className = 'user-video-card-body';
      
      const title = document.createElement('div');
      title.className = 'user-video-card-title';
      title.textContent = video.title;
      
      body.appendChild(title);
      card.appendChild(body);
      list.appendChild(card);
    });

    wrapper.appendChild(list);
  }

  userDetailsEl.appendChild(wrapper);
}

async function updateAvatar(userId, avatarFile) {
  if (!avatarFile) {
    showToast('Selecciona un archivo de imagen.', 'error');
    return;
  }

  const fd = new FormData();
  fd.append('avatar_file', avatarFile);

  try {
    const res = await fetch(`${API}/users/${userId}/avatar`, {
      method: 'PUT',
      body: fd
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    showToast('Avatar actualizado', 'success');
    showUserDetails(userId, document.querySelector(`.user-card-button.active`));
    if (authUser?.id === userId) {
      authUser.avatar_url = data.avatar_url;
      saveAuthUser(authUser);
    }
  } catch {
    showToast('Error actualizando avatar', 'error');
  }
}

/* Drop zones */
function setupDropZone(zoneId, inputId, nameId) {
  const zone  = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  const nameEl = document.getElementById(nameId);

  zone.addEventListener('click', () => input.click());

  input.addEventListener('change', () => {
    const file = input.files[0];
    nameEl.textContent = file ? file.name : '';
  });

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    nameEl.textContent = file.name;
  });
}

setupDropZone('video-drop-zone', 'video-file-input', 'video-file-name');
setupDropZone('thumb-drop-zone', 'thumb-file-input', 'thumb-file-name');

/* Form submit */
document.getElementById('upload-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const title      = document.getElementById('upload-title').value.trim();
  const desc       = document.getElementById('upload-desc').value.trim();
  const categoryId = document.getElementById('upload-category').value;
  const videoFile  = document.getElementById('video-file-input').files[0];
  const thumbFile  = document.getElementById('thumb-file-input').files[0];

  if (!title || !categoryId || !videoFile) {
    showToast('Completa los campos obligatorios', 'error');
    return;
  }

  const submitBtn = document.getElementById('upload-submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Subiendo…';

  const fd = new FormData();
  fd.append('title', title);
  fd.append('description', desc);
  fd.append('user_id', authUser?.id ?? 1);
  fd.append('category_id', categoryId);
  fd.append('video_file', videoFile);
  if (thumbFile) fd.append('thumbnail_file', thumbFile);

  try {
    const res = await fetch(`${API}/videos/`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error();
    showToast('¡Video publicado!', 'success');
    closeUploadModal();
    document.getElementById('upload-form').reset();
    document.getElementById('video-file-name').textContent = '';
    document.getElementById('thumb-file-name').textContent = '';
    await loadVideos();
  } catch {
    showToast('Error al subir el video', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Publicar video';
  }
});

/* ══ INIT ══ */
(async () => {
  loadAuthState();
  await loadCategories();
  await loadVideos();
})();
