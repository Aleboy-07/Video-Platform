const API = 'http://18.191.69.90:8000';
const USER_ID = 1; // temporal

let currentVideo = null;
let categories = [];

/* ══ UTILS ══ */
function fmt(date) {
  return new Date(date).toLocaleDateString('es-ES', { year:'numeric', month:'short', day:'numeric' });
}

function fmtViews(n) {
  n = n ?? 0;
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M vistas`;
  if (n >= 1_000)     return `${(n/1_000).toFixed(1)}K vistas`;
  return `${n} vistas`;
}

function fmtDuration(sec) {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2,'0')}`;
}

function initial(str) { return (str || '?')[0].toUpperCase(); }

function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.className = 'toast', 3000);
}

function getVideoId() {
  return new URLSearchParams(window.location.search).get('id');
}

/* ══ SIDEBAR TOGGLE ══ */
const sidebarEl = document.getElementById('sidebar');

document.getElementById('sidebar-toggle').addEventListener('click', () => {
  if (window.innerWidth > 900) {
    sidebarEl.classList.toggle('hidden');
  } else {
    sidebarEl.classList.toggle('mobile-open');
  }
});

/* ══ LOAD CATEGORIES (for sidebar) ══ */
async function loadCategories() {
  try {
    const res = await fetch(`${API}/categories/`);
    if (!res.ok) return;
    categories = await res.json();

    const sidebarCats = document.getElementById('sidebar-cats');
    categories.forEach(cat => {
      const item = document.createElement('a');
      item.className = 'sidebar-item';
      item.href = `index.html?cat=${cat.id}`;

      const icon = document.createElement('span');
      icon.className = 'icon';
      icon.textContent = '📂';
      item.appendChild(icon);
      item.appendChild(document.createTextNode(' ' + cat.name));
      sidebarCats.appendChild(item);
    });
  } catch { /* silencioso */ }
}

/* ══ LOAD VIDEO ══ */
async function loadVideo(id) {
  try {
    const res = await fetch(`${API}/videos/${id}`);
    if (!res.ok) {
      document.getElementById('player-info').textContent = 'Video no encontrado.';
      return;
    }
    currentVideo = await res.json();
    renderVideoInfo(currentVideo);
    document.title = `${currentVideo.title} — StreamVault`;

    await loadComments(id);
    await loadRecommended(currentVideo.category_id, id);
  } catch {
    showToast('Error cargando el video', 'error');
  }
}

/* ══ RENDER VIDEO INFO ══ */
function renderVideoInfo(video) {
  const videoEl = document.getElementById('video-player');
  videoEl.src = video.video_url;

  const infoSection = document.getElementById('player-info');
  infoSection.textContent = '';

  /* Title */
  const titleEl = document.createElement('h1');
  titleEl.className = 'player-title';
  titleEl.textContent = video.title;
  infoSection.appendChild(titleEl);

  /* Meta row */
  const metaRow = document.createElement('div');
  metaRow.className = 'player-meta-row';

  const statsDiv = document.createElement('div');
  statsDiv.className = 'player-stats';

  const viewsSpan = document.createElement('span');
  viewsSpan.textContent = fmtViews(video.views);

  const dateSpan = document.createElement('span');
  dateSpan.textContent = fmt(video.created_at);

  statsDiv.appendChild(viewsSpan);
  statsDiv.appendChild(dateSpan);

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'player-actions';

  const likeBtn = document.createElement('button');
  likeBtn.className = 'action-btn';
  likeBtn.id = 'like-btn';
  likeBtn.setAttribute('aria-label', 'Me gusta');

  const likeCount = document.createElement('span');
  likeCount.id = 'like-count';
  likeCount.textContent = `👍 ${video.likes ?? 0}`;
  likeBtn.appendChild(likeCount);
  likeBtn.addEventListener('click', () => likeVideo(video.id));

  actionsDiv.appendChild(likeBtn);
  metaRow.appendChild(statsDiv);
  metaRow.appendChild(actionsDiv);
  infoSection.appendChild(metaRow);

  /* Channel row */
  const channelRow = document.createElement('div');
  channelRow.className = 'player-channel-row';

  const chanAvatar = document.createElement('div');
  chanAvatar.className = 'channel-avatar';
  chanAvatar.textContent = initial(video.title);

  const chanInfo = document.createElement('div');
  const chanName = document.createElement('div');
  chanName.className = 'channel-name';
  chanName.textContent = `Usuario #${video.user_id}`;
  const chanSub = document.createElement('div');
  chanSub.className = 'channel-sub';
  chanSub.textContent = 'StreamVault Creator';
  chanInfo.appendChild(chanName);
  chanInfo.appendChild(chanSub);

  channelRow.appendChild(chanAvatar);
  channelRow.appendChild(chanInfo);
  infoSection.appendChild(channelRow);

  /* Description */
  if (video.description) {
    const descBox = document.createElement('div');
    descBox.className = 'player-desc-box collapsed';
    descBox.textContent = video.description;

    const showMore = document.createElement('div');
    showMore.className = 'show-more';
    showMore.textContent = 'Mostrar más';

    let expanded = false;
    showMore.addEventListener('click', () => {
      expanded = !expanded;
      descBox.classList.toggle('collapsed', !expanded);
      showMore.textContent = expanded ? 'Mostrar menos' : 'Mostrar más';
    });

    infoSection.appendChild(descBox);
    infoSection.appendChild(showMore);
  }

  /* Show comments section */
  const commentsSection = document.getElementById('comments-section');
  commentsSection.hidden = false;
}

/* ══ LIKE ══ */
async function likeVideo(id) {
  try {
    const res = await fetch(`${API}/videos/${id}/like`, { method: 'PUT' });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const likeCount = document.getElementById('like-count');
    if (likeCount) likeCount.textContent = `👍 ${data.likes}`;
    const likeBtn = document.getElementById('like-btn');
    if (likeBtn) likeBtn.classList.add('liked');
  } catch {
    showToast('Error al dar like', 'error');
  }
}

/* ══ LOAD COMMENTS ══ */
async function loadComments(videoId) {
  try {
    const res = await fetch(`${API}/videos/${videoId}/comments`);
    if (!res.ok) throw new Error();
    const comments = await res.json();
    renderComments(comments);

    const heading = document.getElementById('comments-heading');
    if (heading) heading.textContent = `Comentarios (${comments.length})`;
  } catch {
    showToast('Error cargando comentarios', 'error');
  }
}

/* ══ RENDER COMMENTS ══ */
function renderComments(comments) {
  const list = document.getElementById('comments-list');
  list.textContent = '';

  if (!comments.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const icon = document.createElement('div');
    icon.className = 'empty-icon';
    icon.textContent = '💬';
    const msg = document.createElement('p');
    msg.textContent = 'Sé el primero en comentar.';
    empty.appendChild(icon);
    empty.appendChild(msg);
    list.appendChild(empty);
    return;
  }

  comments.forEach(c => {
    const item = document.createElement('article');
    item.className = 'comment-item';
    item.setAttribute('role', 'listitem');

    const avatar = document.createElement('div');
    avatar.className = 'comment-avatar';
    avatar.textContent = `U${c.user_id}`;

    const body = document.createElement('div');
    body.className = 'comment-body';

    const header = document.createElement('div');
    header.className = 'comment-header';

    const user = document.createElement('span');
    user.className = 'comment-user';
    user.textContent = `Usuario #${c.user_id}`;

    const date = document.createElement('span');
    date.className = 'comment-date';
    date.textContent = new Date(c.created_at).toLocaleString('es-ES');

    header.appendChild(user);
    header.appendChild(date);

    const text = document.createElement('p');
    text.className = 'comment-text';
    text.textContent = c.content;

    body.appendChild(header);
    body.appendChild(text);
    item.appendChild(avatar);
    item.appendChild(body);
    list.appendChild(item);
  });
}

/* ══ POST COMMENT ══ */
async function postComment(videoId) {
  const input = document.getElementById('comment-input');
  const content = input.value.trim();
  if (!content) return;

  const postBtn = document.getElementById('post-comment-btn');
  postBtn.disabled = true;

  try {
    const res = await fetch(`${API}/comments/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, user_id: USER_ID, video_id: parseInt(videoId) })
    });
    if (!res.ok) throw new Error();
    input.value = '';
    document.getElementById('composer-actions').style.display = 'none';
    await loadComments(videoId);
  } catch {
    showToast('Error publicando comentario', 'error');
  } finally {
    postBtn.disabled = false;
  }
}

/* ══ LOAD RECOMMENDED ══ */
async function loadRecommended(categoryId, currentId) {
  const list = document.getElementById('rec-list');
  list.textContent = '';

  const loader = document.createElement('div');
  loader.className = 'loading-state';
  const sp = document.createElement('div');
  sp.className = 'spinner';
  loader.appendChild(sp);
  list.appendChild(loader);

  try {
    const res = await fetch(`${API}/videos/category/${categoryId}/random`);
    if (!res.ok) throw new Error();
    const videos = await res.json();
    const filtered = videos.filter(v => v.id !== parseInt(currentId));
    renderRecommended(filtered);
  } catch {
    list.textContent = '';
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const icon = document.createElement('div');
    icon.className = 'empty-icon';
    icon.textContent = '📭';
    const msg = document.createElement('p');
    msg.textContent = 'Sin recomendaciones disponibles.';
    empty.appendChild(icon);
    empty.appendChild(msg);
    list.appendChild(empty);
  }
}

/* ══ RENDER RECOMMENDED ══ */
function renderRecommended(videos) {
  const list = document.getElementById('rec-list');
  list.textContent = '';

  if (!videos.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const icon = document.createElement('div');
    icon.className = 'empty-icon';
    icon.textContent = '📭';
    const msg = document.createElement('p');
    msg.textContent = 'Sin recomendaciones.';
    empty.appendChild(icon);
    empty.appendChild(msg);
    list.appendChild(empty);
    return;
  }

  videos.forEach(v => {
    const a = document.createElement('a');
    a.className = 'rec-card';
    a.href = `player.html?id=${v.id}`;
    a.setAttribute('aria-label', `Ver ${v.title}`);

    const thumbDiv = document.createElement('div');
    thumbDiv.className = 'rec-thumb';

    const img = document.createElement('img');
    img.src = v.thumbnail_url || `https://placehold.co/320x180/111e38/2563eb?text=▶`;
    img.alt = v.title;
    img.loading = 'lazy';
    thumbDiv.appendChild(img);

    if (v.duration) {
      const dur = document.createElement('span');
      dur.className = 'rec-duration';
      dur.textContent = fmtDuration(v.duration);
      thumbDiv.appendChild(dur);
    }

    const infoDiv = document.createElement('div');
    infoDiv.className = 'rec-info';

    const title = document.createElement('div');
    title.className = 'rec-title';
    title.textContent = v.title;

    const channel = document.createElement('div');
    channel.className = 'rec-channel';
    channel.textContent = `Usuario #${v.user_id}`;

    const stats = document.createElement('div');
    stats.className = 'rec-stats';
    stats.textContent = `${fmtViews(v.views)} · ${fmt(v.created_at)}`;

    infoDiv.appendChild(title);
    infoDiv.appendChild(channel);
    infoDiv.appendChild(stats);

    a.appendChild(thumbDiv);
    a.appendChild(infoDiv);
    list.appendChild(a);
  });
}

/* ══ COMMENT COMPOSER INTERACTIONS ══ */
const commentInput = document.getElementById('comment-input');
const composerActions = document.getElementById('composer-actions');
const cancelCommentBtn = document.getElementById('cancel-comment-btn');

commentInput.addEventListener('focus', () => {
  composerActions.style.display = 'flex';
  commentInput.rows = 3;
});

cancelCommentBtn.addEventListener('click', () => {
  commentInput.value = '';
  composerActions.style.display = 'none';
  commentInput.rows = 1;
  commentInput.blur();
});

/* ══ SEARCH (redirect to index) ══ */
document.getElementById('search-btn').addEventListener('click', () => {
  const q = document.getElementById('search-input').value.trim();
  if (q) window.location.href = `index.html?search=${encodeURIComponent(q)}`;
});

document.getElementById('search-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const q = e.target.value.trim();
    if (q) window.location.href = `index.html?search=${encodeURIComponent(q)}`;
  }
});

/* ══ INIT ══ */
const videoId = getVideoId();

if (!videoId) {
  window.location.href = 'index.html';
} else {
  loadCategories();
  loadVideo(videoId);

  document.getElementById('post-comment-btn').addEventListener('click', () => postComment(videoId));
  commentInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      postComment(videoId);
    }
  });
}
