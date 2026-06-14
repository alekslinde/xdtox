// ── State ─────────────────────────────────────────────────────────────────────

var scanResult = null;
var currentScope = 'page';

var LOCATE_ICON = '<svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M10.4705 10.4706V11.4706H2.52932V10.4706H10.4705ZM10.4705 2.52939H2.52932V11.4706L2.42679 11.4647C1.95616 11.4168 1.58181 11.0429 1.53423 10.5722L1.52935 10.4706V2.52939C1.52935 1.97712 1.97705 1.52941 2.52932 1.52941H10.4705L10.5721 1.5343C11.0766 1.58529 11.4705 2.01147 11.4705 2.52939V10.4706L11.4647 10.5722C11.417 11.0431 11.0431 11.4171 10.5721 11.4647L10.4705 11.4706V2.52939Z" fill="currentColor"/><path d="M5.35292 5.35294H7.64704V7.64706H5.35292V5.35294Z" fill="currentColor"/><path d="M3.82353 6.11765V6.88235H0L3.34264e-08 6.11765H3.82353Z" fill="currentColor"/><path d="M13 6.11765V6.88235H9.17643V6.11765H13Z" fill="currentColor"/><path d="M6.88231 13H6.1176V9.17647H6.88231V13Z" fill="currentColor"/><path d="M6.88231 3.82353H6.1176V0L6.88231 6.68527e-08V3.82353Z" fill="currentColor"/></svg>';

var LIST_CLASS_FULL  = 'flex-1 overflow-y-auto mx-5 mb-3 border border-stone-200 bg-white divide-y divide-stone-100 min-h-0';
var LIST_CLASS_EMPTY = 'flex-1 mx-5 mb-3 flex flex-col items-center justify-center text-center gap-3 min-h-0';

// ── Navigation ────────────────────────────────────────────────────────────────

function setScope(s) {
  currentScope = s;
  document.getElementById('scopePage').className = 'scope-btn' + (s === 'page' ? ' active' : '');
  document.getElementById('scopeFile').className = 'scope-btn' + (s === 'file' ? ' active' : '');
}

function showHelp() {
  document.getElementById('pageMain').classList.remove('active');
  document.getElementById('pageHelp').classList.add('active');
  document.getElementById('headerMain').classList.add('hidden');
  document.getElementById('headerHelp').classList.remove('hidden');
  document.getElementById('headerHelp').classList.add('flex');
}

function showMain() {
  document.getElementById('pageHelp').classList.remove('active');
  document.getElementById('pageMain').classList.add('active');
  document.getElementById('headerHelp').classList.add('hidden');
  document.getElementById('headerHelp').classList.remove('flex');
  document.getElementById('headerMain').classList.remove('hidden');
}

function showView(name) {
  ['viewInitial', 'viewScanning', 'viewResults'].forEach(function(id) {
    var el = document.getElementById(id);
    if (id === name) {
      el.classList.remove('hidden');
      el.classList.add('flex');
    } else {
      el.classList.add('hidden');
      el.classList.remove('flex');
    }
  });
}

// ── Actions ───────────────────────────────────────────────────────────────────

function doFind() {
  document.getElementById('findLabel').textContent = 'Finding…';
  document.getElementById('btnFind').disabled = true;

  document.getElementById('scanList').innerHTML = '';
  document.getElementById('scanBar').style.width = '0%';
  document.getElementById('scanCount').textContent = '0 / 0';
  document.getElementById('scanFound').textContent = '0 found';
  document.getElementById('scanFound').className = 'text-stone-500 font-bold';
  showView('viewScanning');

  parent.postMessage({ pluginMessage: { type: 'scan', scope: currentScope } }, '*');
}

function doSearchAgain() {
  scanResult = null;
  document.getElementById('findLabel').textContent = 'Find';
  document.getElementById('btnFind').disabled = false;
  document.getElementById('stripSummary').classList.add('hidden');
  document.getElementById('btnStrip').classList.remove('hidden');
  showView('viewInitial');
}

function doStrip() {
  if (!scanResult || !scanResult.frames || !scanResult.frames.length) return;
  var ids = scanResult.frames.map(function(f) { return f.id; });

  ids.forEach(function(id) {
    var row = document.getElementById('row-' + id);
    var st  = document.getElementById('st-' + id);
    if (row) { row.setAttribute('data-status', 'queued'); row.removeAttribute('title'); }
    if (st)  { st.textContent = '·'; }
  });

  var btn = document.getElementById('btnStrip');
  btn.disabled = true;
  document.getElementById('stripLabel').textContent = 'Stripping…';

  parent.postMessage({ pluginMessage: { type: 'strip', ids: ids } }, '*');
}

function doLocate(nodeId) {
  parent.postMessage({ pluginMessage: { type: 'locate', id: nodeId } }, '*');
}

function doPause() {
  var btn = document.getElementById('btnPause');
  var paused = btn.dataset.paused === 'true';
  if (paused) {
    btn.dataset.paused = 'false';
    btn.textContent = 'Pause';
    parent.postMessage({ pluginMessage: { type: 'resume' } }, '*');
  } else {
    btn.dataset.paused = 'true';
    btn.textContent = 'Continue';
    parent.postMessage({ pluginMessage: { type: 'pause' } }, '*');
  }
}

// ── Message handler ───────────────────────────────────────────────────────────

window.onmessage = function(event) {
  var msg = event.data.pluginMessage;
  if (!msg) return;

  if (msg.type === 'scan-start') {
    document.getElementById('scanList').innerHTML = '';
    document.getElementById('scanBar').style.width = '0%';
    document.getElementById('scanCount').textContent = '0 / ' + msg.total;
    document.getElementById('scanFound').textContent = '0 found';
    document.getElementById('scanFound').className = 'text-stone-500 font-bold';
    var pauseBtn = document.getElementById('btnPause');
    pauseBtn.dataset.paused = 'false';
    pauseBtn.textContent = 'Pause';
    showView('viewScanning');
  }

  if (msg.type === 'scan-progress') {
    if (msg.hit && msg.id) {
      var list = document.getElementById('scanList');
      var row = document.createElement('div');
      row.className = 'frame-item';
      row.setAttribute('data-status', 'idle');
      row.id = 'scanrow-' + escAttr(msg.id);
      row.innerHTML =
        '<span class="frame-status">·</span>' +
        '<span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">' + escHtml(msg.name) + '</span>' +
        '<button onclick="doLocate(\'' + escAttr(msg.id) + '\')" title="Locate on canvas"' +
        ' class="shrink-0 ml-2 text-stone-400 hover:text-stone-700 transition-colors border-none bg-transparent cursor-pointer px-1 py-0 flex items-center">' +
        LOCATE_ICON + '</button>';
      list.appendChild(row);
      row.scrollIntoView({ block: 'nearest' });
    }

    var pct = msg.total ? Math.round(msg.index / msg.total * 100) : 100;
    document.getElementById('scanBar').style.width = pct + '%';
    document.getElementById('scanCount').textContent = msg.index + ' / ' + msg.total;

    var found = document.getElementById('scanFound');
    found.textContent = msg.found + ' found';
    found.className = msg.found > 0 ? 'text-stone-900 font-bold' : 'text-stone-500 font-bold';
  }

  if (msg.type === 'scan-result') {
    scanResult = msg;
    document.getElementById('findLabel').textContent = 'Find';
    document.getElementById('btnFind').disabled = false;

    var heading    = document.getElementById('resultsHeading');
    var headingWrap = document.getElementById('resultsHeadingWrap');
    var list       = document.getElementById('frameList');
    var stripBtn   = document.getElementById('btnStrip');
    var stripLabel = document.getElementById('stripLabel');

    stripBtn.classList.remove('hidden');
    document.getElementById('stripSummary').classList.add('hidden');

    heading.textContent = 'Scan report';

    if (msg.count === 0) {
      headingWrap.classList.add('hidden');
      stripBtn.classList.add('hidden');
      list.className = LIST_CLASS_EMPTY;

      var where = msg.mode === 'selection'
        ? 'None of the selected frames'
        : (msg.mode === 'file' ? 'Nothing in this file' : 'Nothing on this page');

      var hint = msg.mode === 'page'
        ? 'Want to be thorough? Run a <strong class="text-stone-700">Whole file</strong> scan to check every page.'
        : (msg.mode === 'selection'
          ? 'The selected frames look clean — no XD artifacts detected.'
          : 'Every page has been checked — nothing left to strip.');

      list.innerHTML =
        '<div class="w-11 h-11 rounded-sm border border-emerald-200 bg-emerald-50 flex items-center justify-center text-emerald-500 font-mono text-[20px]">✓</div>' +
        '<div class="flex flex-col gap-1.5 items-center">' +
          '<span class="font-display font-bold text-[15px] text-stone-700">You\'re in tip-top shape</span>' +
          '<span class="text-[10px] text-stone-500 leading-relaxed px-6">No XD artifacts found — your migration looks clean.</span>' +
          '<span class="text-[10px] text-stone-400 leading-relaxed px-6">' + hint + '</span>' +
        '</div>';
    } else {
      headingWrap.classList.remove('hidden');
      list.className = LIST_CLASS_FULL;
      list.innerHTML = msg.frames.map(function(f) {
        return '<div class="frame-item" data-status="idle" id="row-' + escAttr(f.id) + '">' +
          '<span class="frame-status" id="st-' + escAttr(f.id) + '">·</span>' +
          '<span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">' + escHtml(f.name) + '</span>' +
          '<button onclick="doLocate(\'' + escAttr(f.id) + '\')" title="Locate on canvas"' +
          ' class="shrink-0 ml-2 text-stone-400 hover:text-stone-700 transition-colors border-none bg-transparent cursor-pointer px-1 py-0 flex items-center">' +
          LOCATE_ICON + '</button>' +
          '</div>';
      }).join('');
      stripBtn.disabled = false;
      stripLabel.textContent = 'Strip ' + msg.count + ' frame' + (msg.count !== 1 ? 's' : '');
    }

    showView('viewResults');
  }

  if (msg.type === 'strip-progress') {
    var row = document.getElementById('row-' + msg.id);
    var st  = document.getElementById('st-' + msg.id);
    if (row) {
      row.setAttribute('data-status', msg.status);
      if (msg.reason) row.title = msg.reason; else row.removeAttribute('title');
      row.scrollIntoView({ block: 'nearest' });
    }
    if (st) {
      if (msg.status === 'in-progress')  st.innerHTML = '<span class="spin">◌</span>';
      else if (msg.status === 'done')    st.textContent = '✓';
      else if (msg.status === 'error')   st.textContent = '✕';
      else if (msg.status === 'skipped') st.textContent = '–';
      else                               st.textContent = '·';
    }
  }

  if (msg.type === 'done') {
    var stripBtn2 = document.getElementById('btnStrip');
    var summary   = document.getElementById('stripSummary');
    stripBtn2.classList.add('hidden');
    document.getElementById('resultsHeading').textContent = 'Strip results';

    var parts = [];
    parts.push(msg.stripped + ' stripped');
    if (msg.skipped) parts.push(msg.skipped + ' skipped');
    if (msg.errored) parts.push(msg.errored + ' failed');

    var ok = !msg.errored;
    summary.textContent = parts.join('  ·  ');
    summary.className = 'text-[10px] text-center px-3.5 py-3 rounded-sm border leading-relaxed ' +
      (ok ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
          : 'bg-amber-50 border-amber-100 text-amber-700');

    summary.classList.remove('hidden');
    scanResult = null;
  }
};

// ── Utilities ─────────────────────────────────────────────────────────────────

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(s) {
  return String(s).replace(/'/g, '&#39;');
}

// ── Resize ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
  var handle = document.getElementById('resize-handle');
  var startX, startY, startW, startH;
  handle.addEventListener('mousedown', function(e) {
    e.preventDefault();
    startX = e.clientX; startY = e.clientY;
    startW = window.innerWidth; startH = window.innerHeight;
    function onMove(e) {
      var w = Math.max(320, startW + (e.clientX - startX));
      var h = Math.max(400, startH + (e.clientY - startY));
      parent.postMessage({ pluginMessage: { type: 'resize', width: Math.round(w), height: Math.round(h) } }, '*');
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
});
