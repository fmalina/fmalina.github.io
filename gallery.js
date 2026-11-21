// micro lib
window.D$ = (s, ctx = document) => ctx.querySelector(s);
window.D$$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];
window.Id = id => document.getElementById(id);

EventTarget.prototype.on = function (e, cb, opts) {
  this.addEventListener(e, cb, opts); return this;
};
Element.prototype.appendTo = function(parent) {
  parent.appendChild(this); return this;
};
window.ready = function (fn) {
  if (document.readyState !== "loading") fn();
  else document.addEventListener("DOMContentLoaded", fn);
};
window.getHTML = (url, opts) =>
  fetch(url, opts).then(r => r.text());
window.el = (tag, attrs = {}, ...children) => {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) =>
    k.startsWith('on') ? e.on(k.slice(2), v)
    : k in e ? e[k] = v : e.setAttribute(k, v)
  );
  children.flat().forEach(c =>
    e.append(c.nodeType ? c : document.createTextNode(c))
  );
  return e;
};
const fill = (id, data) => { Id(id).innerHTML = data; };

// gallery
ready(() => {
  const galleries = D$$('details.sg-gallery');
  if (!galleries.length) return;

  // Shared lightbox
  const dlg = el('dialog', {className:'sg-viewer', 'aria-label':'Prehliadač fotografií'});
  const pic = el('img', {className:'sg-viewer__image', alt:''});
  const cap = el('p', {className:'sg-viewer__caption', 'aria-hidden':'true'});
  let photos = [], index = 0, opener, touchX;

  const btn = (cls, label, text) =>
    el('button', {className:cls, type:'button', 'aria-label':label}, text)
      .appendTo(dlg);

  btn('sg-viewer__close', 'Zavrieť', '×').on('click', () => dlg.close());
  btn('sg-viewer__prev', 'Predchádzajúca fotografia', '‹')
    .on('click', () => show(index - 1));
  pic.appendTo(dlg);
  btn('sg-viewer__next', 'Nasledujúca fotografia', '›')
    .on('click', () => show(index + 1));
  cap.appendTo(dlg);
  dlg.appendTo(document.body);

  function show(n) {
    index = (n + photos.length) % photos.length;
    const img = D$('img', photos[index]);
    pic.src = img.currentSrc || img.src;
    pic.alt = cap.textContent = img.dataset.caption;
    D$('.sg-viewer__prev', dlg).hidden =
      D$('.sg-viewer__next', dlg).hidden = photos.length < 2;
  }

  function open(items, n, trigger) {
    photos = items;
    opener = trigger;
    show(n);
    dlg.showModal();
    D$('.sg-viewer__close', dlg).focus();
  }

  dlg.on('close', () => opener?.isConnected && opener.focus());
  dlg.on('click', e => { if (e.target === dlg) dlg.close(); });

  // Build galleries from plain img tags
  galleries.forEach(g => {
    const summary = D$(':scope > summary', g);
    const imgs = D$$(':scope > img', g);
    if (!summary || !imgs.length) return;

    const rail = el('div', {
      className:'sg-gallery__rail',
      'aria-label':`${summary.textContent.trim()} – fotografie`
    });
    summary.after(rail);

    const items = imgs.map((img, n) => {
      const label = img.alt.trim();
      img.dataset.caption = label;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';

      const thumb = el('button', {
        className:'sg-gallery__item', type:'button'
      }, img, el('span', {className:'sg-gallery__caption'}, label))
        .appendTo(rail);

      if (!label) thumb.setAttribute('aria-label', `Fotografia ${n + 1}`);
      return thumb;
    });

    items.forEach((item, n) =>
      item.on('click', () => open(items, n, item))
    );
  });

  // Keyboard navigation
  dlg.on('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
  });

  // Touch swipe
  dlg.on('touchstart', e => touchX = e.changedTouches[0].screenX, {passive:true});
  dlg.on('touchend', e => {
    const dx = e.changedTouches[0].screenX - touchX;
    if (Math.abs(dx) > 55) show(index + (dx < 0 ? 1 : -1));
  }, {passive:true});

  // open from link
  const openGallery = hash => {
    const g = Id(hash.slice(1));
    if (g?.matches('details.sg-gallery')) g.open = true;
  };

  document.on('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (a) openGallery(a.hash);
  });

  window.addEventListener('hashchange', () => openGallery(location.hash));
  openGallery(location.hash); // Also works on direct links / page reload
});