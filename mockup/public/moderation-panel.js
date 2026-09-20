/* Shared, framework-free moderation UI. No secrets, comments or decisions in localStorage. */
(() => {
  if (customElements.get('hoichoi-moderation')) return;
  const labels = { pending: 'অপেক্ষমাণ', approved: 'অনুমোদিত', rejected: 'প্রত্যাখ্যাত', spam: 'স্প্যাম', all: 'সব মন্তব্য' };
  const bn = value => String(value).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[+d]);
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (name, size = 16, cls = '') => {
    const paths = { shield: '<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z"/><path d="m8 12 3 3 5-6"/>', refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 7a8 8 0 0 1 13-2L20 7M4 17l1.5 2a8 8 0 0 0 13-2"/>', check: '<path d="m5 12 4 4L19 6"/>', x: '<path d="m6 6 12 12M6 18 18 6"/>', mail: '<path d="M4 4h16v13H9l-5 4V4Z"/><path d="M8 8h8M8 12h5"/>', history: '<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2"/>', lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>' };
    return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.mail}</svg>`;
  };
  function when(value) { try { return new Intl.DateTimeFormat('bn-BD', { timeZone: 'Asia/Dhaka', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); } catch { return '—'; } }
  class ModerationPanel extends HTMLElement {
    constructor() {
      super(); this.attachShadow({ mode: 'open' });
      this.session = null; this.data = null; this.status = 'pending'; this.q = ''; this.page = 1;
      this.selected = new Set(); this.activeId = null; this.note = ''; this.dirty = false;
      this.busy = false; this.loading = false; this.feedback = ''; this.error = false;
      this.online = true; this.paused = false; this.confirmAction = null;
    }
    connectedCallback() {
      this.controller = new AbortController();
      this.shadowRoot.innerHTML = '<link rel="stylesheet" href="/moderation-panel.css"><div class="root"><div class="loading">' + icon('refresh', 20, 'spinner') + 'মডারেশন ডেস্ক খুলছে…</div></div>';
      this.shadowRoot.addEventListener('click', e => this.click(e), { signal: this.controller.signal });
      this.shadowRoot.addEventListener('input', e => this.input(e), { signal: this.controller.signal });
      this.shadowRoot.addEventListener('change', e => this.change(e), { signal: this.controller.signal });
      this.shadowRoot.addEventListener('submit', e => this.submit(e), { signal: this.controller.signal });
      if (!this.hasAttribute('theme')) {
        this.syncTheme = () => this.setAttribute('theme', document.documentElement.getAttribute('data-theme') || 'dark');
        this.syncTheme(); this.themeObserver = new MutationObserver(this.syncTheme);
        this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      }
      this.boot();
      this.timer = setInterval(() => { if (!this.paused && !document.hidden && this.getClientRects().length && this.session?.authenticated && !this.busy) this.load(true); }, 10000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden && !this.paused && this.session?.authenticated) this.load(true); }, { signal: this.controller.signal });
    }
    disconnectedCallback() { this.controller?.abort(); clearInterval(this.timer); clearTimeout(this.searchTimer); this.themeObserver?.disconnect(); }
    async api(path, options = {}) {
      const response = await fetch(path, { cache: 'no-store', credentials: 'same-origin', ...options, signal: this.controller.signal, headers: { 'Content-Type': 'application/json', ...options.headers } });
      const data = await response.json();
      if (!response.ok) { const error = new Error(data.error || 'সার্ভারের সঙ্গে যোগাযোগ হয়নি।'); error.status = response.status; throw error; }
      return data;
    }
    async boot() {
      try { this.session = await this.api('/api/admin/session'); if (this.session.authenticated) await this.load(); else this.render(); }
      catch (e) { if (e.name !== 'AbortError') { this.feedback = e.message; this.error = true; this.render(); } }
    }
    async load(quiet = false) {
      if (this.loading || this.busy || !this.session?.authenticated) return;
      if (quiet && this.shadowRoot.querySelector('dialog[open]')) return;
      this.loading = true; if (!quiet) this.render();
      try {
        const data = await this.api(`/api/admin/comments?status=${this.status}&q=${encodeURIComponent(this.q)}&page=${this.page}`);
        this.data = data; this.page = data.page; this.online = true;
        this.selected = new Set([...this.selected].filter(id => data.rows.some(c => c.id === id)));
        if (!data.rows.some(c => c.id === this.activeId)) { this.activeId = data.rows[0]?.id || null; this.dirty = false; }
        if (!this.dirty) this.note = data.rows.find(c => c.id === this.activeId)?.moderatorNote || '';
        this.dispatchEvent(new CustomEvent('moderation-counts', { detail: data.counts, bubbles: true, composed: true }));
      } catch (e) {
        if (e.name === 'AbortError') return;
        this.online = false; this.feedback = e.message; this.error = true;
        if (e.status === 401) this.session.authenticated = false;
      } finally { this.loading = false; if (this.isConnected) this.render(); }
    }
    render() {
      const active = this.shadowRoot.activeElement;
      const focus = active?.id; const start = active?.selectionStart; const end = active?.selectionEnd;
      const root = this.shadowRoot.querySelector('.root'); if (!root) return;
      const session = this.session;
      if (!session?.authenticated) {
        root.innerHTML = `<div class="top"><div><p class="kicker">HOICHOI · EDITORIAL DESK</p><h2 class="heading">মন্তব্য মডারেশন</h2></div></div><div class="login">${icon('lock',32)}<h3>সম্পাদকীয় প্রবেশাধিকার</h3><p>${session?.mode === 'unconfigured' ? 'Web-এর Environment Variables-এ অন্তত ২৪ অক্ষরের ADMIN_SECRET সেট করে আবার ডিপ্লয় করুন।' : 'মন্তব্য পর্যালোচনা ও প্রকাশের জন্য অ্যাডমিন কী দিয়ে প্রবেশ করুন।'}</p>${session?.mode !== 'unconfigured' ? '<form id="login-form"><input type="password" id="admin-secret" autocomplete="current-password" placeholder="অ্যাডমিন কী" aria-label="অ্যাডমিন কী" required><button class="btn primary" type="submit">ডেস্ক আনলক করুন</button></form>' : ''}${this.feedback ? `<p role="alert" style="margin-top:15px;color:var(--red)">${esc(this.feedback)}</p>` : ''}<button class="btn flat" data-action="boot" style="margin-top:12px">সংযোগ আবার পরীক্ষা</button></div>`;
        return;
      }
      const data = this.data; const counts = data?.counts || { pending:0, approved:0, rejected:0, spam:0 };
      const activeRow = data?.rows.find(c => c.id === this.activeId);
      root.innerHTML = `<header class="top"><div><p class="kicker">HOICHOI · COMMUNITY & TRUST</p><h2 class="heading">ভালো আলোচনার শুরু এখানেই।</h2><p class="lead">মন্তব্য পড়ুন, যাচাই করুন, তারপর প্রকাশ করুন। সব সিদ্ধান্ত একই ডাটাবেসে সংরক্ষিত।</p></div><div class="head-actions"><span class="connection ${!this.online || this.paused ? 'off' : ''}"><i class="dot"></i>${!this.online ? 'সংযোগ বিচ্ছিন্ন' : this.paused ? 'আপডেট বিরতিতে' : '১০ সেকেন্ডে সিঙ্ক'}</span><button class="btn" data-action="refresh" ${this.loading ? 'disabled' : ''} aria-label="মন্তব্য রিফ্রেশ">${icon('refresh',14,this.loading?'spinner':'')}রিফ্রেশ</button>${session.mode === 'protected' ? '<button class="btn flat" data-action="logout">লক</button>' : ''}</div></header>
        <div class="badges">${Object.keys(counts).map(s => `<div class="metric"><span>${labels[s]}</span><strong style="color:var(--${s === 'pending'?'amber':s === 'approved'?'green':'red'})">${bn(counts[s])}</strong></div>`).join('')}</div>
        <div class="filters">${['pending','approved','rejected','spam','all'].map(s => `<button class="tab ${this.status === s ? 'active' : ''}" data-status="${s}">${labels[s]}</button>`).join('')}<input id="comment-search" class="search" type="search" maxlength="100" placeholder="নাম, মন্তব্য বা প্রতিবেদন…" aria-label="মন্তব্য খুঁজুন" value="${esc(this.q)}"></div>
        ${this.feedback ? `<div class="feedback ${this.error ? 'error' : ''}" role="${this.error ? 'alert' : 'status'}">${esc(this.feedback)}</div>` : ''}
        <div class="grid"><div class="queue"><div class="list-head"><label class="check-label"><input id="select-all" type="checkbox" ${data?.rows.length && this.selected.size === data.rows.length ? 'checked' : ''}>এই পাতার সব</label><span>${bn(data?.total || 0)}টি মন্তব্য</span></div>
        ${this.selected.size ? `<div class="bulk"><span>${bn(this.selected.size)}টি নির্বাচিত</span><button class="btn" data-bulk="approved">অনুমোদন</button><button class="btn danger" data-bulk="rejected">প্রত্যাখ্যান</button><button class="btn danger" data-bulk="spam">স্প্যাম</button></div>` : ''}
        ${!data && this.loading ? '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>' : data?.rows.length ? data.rows.map(c => this.row(c)).join('') : `<div class="empty">${icon('shield',38)}<b>${this.q ? 'কোনো মন্তব্য মেলেনি' : 'এই সারি এখন খালি'}</b><span>${this.q ? 'অন্য শব্দ দিয়ে খুঁজে দেখুন।' : 'নতুন মন্তব্য এলে এখানেই দেখা যাবে।'}</span></div>`}
        <div class="pager"><span>পাতা ${bn(this.page)} / ${bn(data?.pages || 1)}</span><div><button class="btn" data-page="${this.page-1}" ${this.page <= 1 ? 'disabled' : ''} aria-label="আগের পাতা">←</button><button class="btn" data-page="${this.page+1}" ${this.page >= (data?.pages || 1) ? 'disabled' : ''} aria-label="পরের পাতা">→</button></div></div></div>
        <aside class="inspector">${activeRow ? this.detail(activeRow) : `<div class="empty">${icon('mail',36)}<b>একটি মন্তব্য বেছে নিন</b><span>পুরো মন্তব্য ও পর্যালোচনার নিয়ন্ত্রণ এখানে পাবেন।</span></div>`}</aside></div>
        <details class="history" ${this.historyOpen ? 'open' : ''}><summary data-action="history">${icon('history',15)}সিদ্ধান্তের ইতিহাস <span class="label">${bn(data?.history.length || 0)}</span></summary>${data?.history.length ? data.history.map(h => `<div class="history-row"><i class="dot" style="color:var(--${h.toStatus === 'approved' ? 'green' : 'amber'})"></i><b>${esc(h.author)}</b><span>${labels[h.fromStatus] || esc(h.fromStatus)} → ${labels[h.toStatus] || esc(h.toStatus)}</span><small>${when(h.createdAt)} · ${esc(h.origin)}</small>${h.note ? `<span class="reason">${esc(h.note)}</span>` : ''}</div>`).join('') : '<p class="lead" style="padding-bottom:15px">প্রথম সিদ্ধান্ত থেকেই এখানে ইতিহাস জমা হবে।</p>'}</details>
        <footer class="bottom"><span>${session.mode === 'demo' ? '<span class="demo">নমুনা ওয়ার্কস্পেস</span> · ' : ''}শুধু অনুমোদিত মন্তব্য পাঠকের কাছে দৃশ্যমান</span><button class="btn flat" data-action="pause">${this.paused ? 'স্বয়ংক্রিয় আপডেট চালু' : 'আপডেট বিরতি'}</button></footer>
        <dialog id="bulk-dialog"><h3>একসঙ্গে সিদ্ধান্ত নেবেন?</h3><p>${bn(this.selected.size)}টি মন্তব্য “${labels[this.confirmAction] || ''}” করা হবে। ইতিহাসে এই সিদ্ধান্ত সংরক্ষিত থাকবে। পরে পরিবর্তন করতে পারবেন।</p><div class="head-actions"><button class="btn" data-action="cancel-bulk">ফিরে যান</button><button class="btn primary" data-action="confirm-bulk">নিশ্চিত করুন</button></div></dialog>`;
      if (focus) { const el = this.shadowRoot.getElementById(focus); if (el) { el.focus({ preventScroll:true }); try { el.setSelectionRange(start,end); } catch {} } }
    }
    row(c) {
      return `<div class="comment ${c.id === this.activeId ? 'active' : ''}"><input type="checkbox" data-check="${c.id}" ${this.selected.has(c.id) ? 'checked' : ''} aria-label="${esc(c.author)}-এর মন্তব্য নির্বাচন"><button class="select-comment" data-select="${c.id}" aria-label="${esc(c.author)}-এর মন্তব্য পর্যালোচনা"><div class="row-top"><span class="author"><span class="avatar">${esc(Array.from(c.author)[0])}</span>${esc(c.author)}</span><span class="status ${c.status}">${labels[c.status]}</span></div><p class="excerpt">${esc(c.body)}</p><div class="meta"><span>${when(c.createdAt)}</span><span class="post">${esc(c.articleTitle)}</span></div></button></div>`;
    }
    detail(c) {
      return `<div class="detail-head"><span class="label">COMMENT #${String(c.id).padStart(3,'0')}</span><span class="status ${c.status}">${labels[c.status]}</span></div><p class="detail-body">${esc(c.body)}</p><div class="author"><span class="avatar">${esc(Array.from(c.author)[0])}</span>${esc(c.author)}<span class="label">${when(c.createdAt)}</span></div><a class="article-ref" href="/news/${c.articleId}#comments" target="_blank" rel="noopener" style="margin-top:18px"><small>সংশ্লিষ্ট প্রতিবেদন ↗</small>${esc(c.articleTitle)}</a><label class="note-label" for="review-note">সম্পাদকীয় নোট · শুধু অ্যাডমিন দেখতে পাবেন</label><textarea id="review-note" class="note" maxlength="500" placeholder="সিদ্ধান্তের কারণ লিখুন (ঐচ্ছিক)…">${esc(this.note)}</textarea><div class="review-actions"><button class="btn primary" data-review="approved" ${this.busy ? 'disabled' : ''}>${icon('check',15)}${c.status === 'approved' ? 'অনুমোদন সংরক্ষণ' : 'অনুমোদন ও প্রকাশ'}</button><button class="btn danger" data-review="rejected" ${this.busy ? 'disabled' : ''}>${icon('x',14)}প্রত্যাখ্যান</button><button class="btn danger" data-review="spam" ${this.busy ? 'disabled' : ''}>স্প্যাম হিসেবে চিহ্নিত</button>${c.status !== 'pending' ? `<button class="btn flat" style="grid-column:span 2" data-review="pending" ${this.busy ? 'disabled' : ''}>পুনরায় পর্যালোচনায় পাঠান</button>` : ''}</div><p class="review-info">${icon('shield',12)} ${c.reviewedAt ? 'শেষ সিদ্ধান্ত: ' + when(c.reviewedAt) : 'এখনো পর্যালোচনা করা হয়নি।'}<br>প্রত্যাখ্যান বা স্প্যাম করলে মন্তব্যটি পাবলিক সাইট থেকে সরবে।</p>`;
    }
    async mutate(ids, status, note) {
      if (this.busy) return;
      this.busy = true; this.feedback = ''; this.render();
      try {
        const result = await this.api('/api/admin/comments', { method:'PATCH', body:JSON.stringify({ ids, status, note, origin:this.getAttribute('origin') || 'vanilla' }) });
        this.feedback = `${bn(result.updated.length)}টি মন্তব্যের সিদ্ধান্ত সংরক্ষিত হয়েছে।`; this.error = false; this.selected.clear(); this.dirty = false;
      } catch(e) { if(e.name === 'AbortError') return; this.error = true; this.feedback = e.message; }
      finally { this.busy = false; await this.load(true); }
    }
    async click(event) {
      const b = event.target.closest('button,summary'); if (!b || b.disabled) return;
      if (b.dataset.status) { this.status = b.dataset.status; this.page = 1; this.selected.clear(); this.dirty = false; this.activeId = null; await this.load(); }
      if (b.dataset.select) { this.activeId = +b.dataset.select; this.dirty = false; this.note = this.data.rows.find(c=>c.id === this.activeId)?.moderatorNote || ''; this.render(); }
      if (b.dataset.page) { this.page = +b.dataset.page; this.selected.clear(); await this.load(); }
      if (b.dataset.review) await this.mutate([this.activeId], b.dataset.review, this.note);
      if (b.dataset.bulk) { this.confirmAction = b.dataset.bulk; this.render(); this.shadowRoot.getElementById('bulk-dialog').showModal(); }
      if (b.dataset.action === 'cancel-bulk') this.shadowRoot.getElementById('bulk-dialog').close();
      if (b.dataset.action === 'confirm-bulk') { this.shadowRoot.getElementById('bulk-dialog').close(); await this.mutate([...this.selected], this.confirmAction, 'একসঙ্গে পর্যালোচনা'); }
      if (b.dataset.action === 'refresh') { this.feedback=''; await this.load(); }
      if (b.dataset.action === 'boot') { this.feedback=''; await this.boot(); }
      if (b.dataset.action === 'pause') { this.paused=!this.paused; this.render(); if(!this.paused) await this.load(true); }
      if (b.dataset.action === 'history') this.historyOpen = !this.historyOpen;
      if (b.dataset.action === 'logout') { await this.api('/api/admin/session', { method:'DELETE' }); this.session.authenticated=false; this.data=null; this.render(); }
    }
    input(event) {
      if(event.target.id === 'comment-search') { this.q=event.target.value; clearTimeout(this.searchTimer); this.searchTimer=setTimeout(()=>{ this.page=1; this.load(); },350); }
      if(event.target.id === 'review-note') { this.note=event.target.value; this.dirty=true; }
    }
    change(event) {
      if(event.target.dataset.check) { const id=+event.target.dataset.check; if(event.target.checked) this.selected.add(id); else this.selected.delete(id); this.render(); }
      if(event.target.id === 'select-all') { this.selected=event.target.checked ? new Set(this.data.rows.map(c=>c.id)) : new Set(); this.render(); }
    }
    async submit(event) {
      event.preventDefault(); if(event.target.id !== 'login-form') return;
      const secret=this.shadowRoot.getElementById('admin-secret').value;
      try { this.session=await this.api('/api/admin/session',{method:'POST',body:JSON.stringify({secret})}); this.feedback=''; await this.load(); }
      catch(e) { this.feedback=e.message; this.error=true; this.render(); }
    }
  }
  customElements.define('hoichoi-moderation',ModerationPanel);
})();
