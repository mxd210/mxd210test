// REPLACE WHOLE FILE: /assets/js/mxd-at-harvest.js
// MXD AT HARVEST v1 — client cho /auto/harvest

const MXD_HARVEST_ENDPOINT = 'https://botbuyauto.mxd6686.workers.dev/auto/harvest';

(function(){
  'use strict';

  function $(id){ return document.getElementById(id); }

  const inputCmd = $('mxd-harvest-command');
  const btnRun   = $('mxd-harvest-run');
  const btnCopy  = $('mxd-harvest-copy');
  const statusEl = $('mxd-harvest-status');
  const tbody    = $('mxd-harvest-tbody');
  const jsonBox  = $('mxd-harvest-json');

  if (!inputCmd) return;

  btnRun.addEventListener('click', runHarvest);
  inputCmd.addEventListener('keydown', function(e){
    if (e.key === 'Enter') {
      e.preventDefault();
      runHarvest();
    }
  });

  btnCopy.addEventListener('click', function(){
    const text = jsonBox.textContent || '';
    if (!text.trim()) {
      setStatus('Chưa có JSON để copy.', 'err');
      return;
    }
    navigator.clipboard.writeText(text).then(function(){
      setStatus('Đã copy JSON vào clipboard.', 'ok');
    }, function(){
      setStatus('Không copy được JSON (trình duyệt chặn?).', 'err');
    });
  });

  function parseCommand() {
    const cmd = (inputCmd.value || '').trim();
    if (!cmd) return null;
    const parts = cmd.split(/\s+/);
    const category = parts[0];              // ví dụ: do-gia-dung
    const limit = parseInt(parts[1] || '50', 10) || 50;
    return { category, limit };
  }

  async function runHarvest() {
    clearStatus();
    tbody.innerHTML = '';
    jsonBox.textContent = '';

    const info = parseCommand();
    if (!info) {
      setStatus('Hãy gõ lệnh dạng: do-gia-dung 50', 'err');
      return;
    }

    btnRun.disabled = true;
    setStatus('Đang gọi MXD-AT-GATEWAY…', 'info');

    try {
      const params = new URLSearchParams();
      params.set('category', info.category);
      params.set('limit', String(info.limit));

      const url = MXD_HARVEST_ENDPOINT + '?' + params.toString();
      const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
      const data = await resp.json().catch(() => ({}));

      if (!resp.ok || !data || data.state !== 'ok') {
        const msg = data && data.message ? data.message : 'Worker trả lỗi';
        setStatus('Lỗi harvest: ' + msg, 'err');
        jsonBox.textContent = JSON.stringify(data, null, 2);
        return;
      }

      const products = Array.isArray(data.products) ? data.products : [];
      if (!products.length) {
        setStatus('Không lấy được sản phẩm nào (có thể sai cate/limit).', 'err');
        jsonBox.textContent = JSON.stringify(data, null, 2);
        return;
      }

      const rows = [];
      products.forEach(function(p, idx){
        const tr = document.createElement('tr');

        const tdIndex = document.createElement('td');
        tdIndex.textContent = String(idx + 1);
        tr.appendChild(tdIndex);

        const tdName = document.createElement('td');
        tdName.textContent = p.name || '';
        tr.appendChild(tdName);

        const tdPrice = document.createElement('td');
        tdPrice.textContent = p.price ? p.price.toLocaleString('vi-VN') : '';
        tr.appendChild(tdPrice);

        const tdMerchant = document.createElement('td');
        tdMerchant.textContent = p.merchant || '';
        tr.appendChild(tdMerchant);

        const tdSku = document.createElement('td');
        tdSku.textContent = p.sku || '';
        tr.appendChild(tdSku);

        rows.push(tr);
      });
      rows.forEach(r => tbody.appendChild(r));

      jsonBox.textContent = JSON.stringify(products, null, 2);
      setStatus(`Đã vớt ${products.length} sản phẩm cho category ${data.category} (${data.domain}).`, 'ok');
    } catch (err) {
      setStatus('Lỗi kết nối tới Worker: ' + err, 'err');
    } finally {
      btnRun.disabled = false;
    }
  }

  function setStatus(text, type) {
    statusEl.textContent = text || '';
    statusEl.classList.remove('ok','err');
    if (type === 'ok') statusEl.classList.add('ok');
    if (type === 'err') statusEl.classList.add('err');
  }
  function clearStatus() { setStatus('', ''); }

  // Gợi ý mặc định
  if (!inputCmd.value) inputCmd.value = 'do-gia-dung 50';
})();
