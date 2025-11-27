export function serveMobileHtml(req, res) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>KOSH Mobile</title>
  <script src="https://unpkg.com/html5-qrcode" type="text/javascript"></script>
  <style>
    /* ... (All previous CSS remains the same) ... */
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; background-color: #f0f2f5; color: #333; padding-top: 60px; padding-bottom: 80px; /* Added padding for bottom button */ }
    
    /* ... (Header styles unchanged) ... */
    .header { background-color: #232f3e; color: white; padding: 0 16px; height: 60px; position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; gap: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
    .menu-btn { background: none; border: none; color: white; font-size: 24px; cursor: pointer; padding: 5px; display: flex; align-items: center; }
    .header h1 { margin: 0; font-size: 1.2rem; font-weight: 500; flex: 1; }
    .filter-badge { background: #febd69; color: #111; font-size: 0.75rem; padding: 2px 8px; border-radius: 10px; font-weight: bold; display: none; }

    /* --- SEARCH BAR (Simplified) --- */
    .search-container { padding: 10px 16px; background: white; border-bottom: 1px solid #eee; position: sticky; top: 60px; z-index: 90; }
    .search-box { display: flex; gap: 8px; }
    /* Removed .input-wrapper since we don't need the inner button anymore */
    input { flex: 1; padding: 12px; border: 1px solid #ccc; border-radius: 8px; font-size: 16px; outline: none; }
    button.search-btn { background: #febd69; color: #111; border: none; padding: 0 20px; border-radius: 8px; font-weight: bold; cursor: pointer; }

    /* ✅ FLOATING SCAN BUTTON */
    .fab-scan {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: #232f3e; /* Amazon Blue */
      color: white;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      border: none;
      cursor: pointer;
      z-index: 200;
      transition: transform 0.2s;
    }
    .fab-scan:active { transform: scale(0.95); }
    .fab-icon { width: 32px; height: 32px; }

    /* ... (Product Card styles unchanged) ... */
    #product-list { list-style: none; padding: 10px; margin: 0; }
    .product-card { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 10px; overflow: hidden; transition: box-shadow 0.2s; }
    .card-header { padding: 12px; display: flex; align-items: center; gap: 12px; cursor: pointer; }
    .product-avatar { width: 60px; height: 60px; background: #f9f9f9; border-radius: 6px; object-fit: cover; border: 1px solid #eee; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #ccc; font-size: 10px; }
    .header-info { flex: 1; }
    .p-name { font-weight: 600; font-size: 1rem; color: #0F1111; margin-bottom: 2px; }
    .p-code { font-size: 0.85rem; color: #565959; }
    .header-status { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;}
    .stock-pill { background: #e6f4ea; color: #1e7e34; font-size: 0.75rem; font-weight: bold; padding: 4px 8px; border-radius: 12px; white-space: nowrap; }
    .stock-pill.low { background: #fce8e6; color: #c5221f; }
    .expand-icon { font-size: 12px; color: #999; transition: transform 0.3s; margin-top: 4px; }
    .card-details { display: none; padding: 0 12px 12px 12px; border-top: 1px solid #f0f0f0; background-color: #fafafa; }
    .product-card.expanded .card-details { display: block; }
    .product-card.expanded .expand-icon { transform: rotate(180deg); }
    .detail-section { margin-top: 12px; }
    .section-label { font-size: 0.7rem; font-weight: bold; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; }
    .info-item { font-size: 0.9rem; }
    .info-label { color: #666; font-size: 0.8rem; display: block; }
    .info-value { color: #222; font-weight: 500; }
    .full-width { grid-column: span 2; }
    .large-image-container { width: 100%; height: 200px; background: #fff; border: 1px solid #eee; border-radius: 8px; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .large-image { width: 100%; height: 100%; object-fit: contain; }

    /* ... (Sidebar & Utils styles unchanged) ... */
    .sidenav { height: 100%; width: 280px; position: fixed; z-index: 200; top: 0; left: -280px; background-color: white; transition: 0.3s; box-shadow: 2px 0 5px rgba(0,0,0,0.3); display: flex; flex-direction: column; }
    .sidenav.open { left: 0; }
    .sidenav-header { background-color: #232f3e; color: white; padding: 20px 16px; font-weight: bold; font-size: 1.1rem; display: flex; align-items: center; gap: 10px; }
    .close-btn { margin-left: auto; cursor: pointer; font-size: 24px; }
    .sidenav-content { flex: 1; overflow-y: auto; padding-bottom: 50px; }
    .menu-item { padding: 15px 20px; border-bottom: 1px solid #f0f0f0; cursor: pointer; }
    .submenu { display: none; background-color: #f9f9f9; }
    .submenu.show { display: block; }
    .submenu-item { padding: 12px 20px 12px 35px; border-top: 1px solid #eee; color: #555; cursor: pointer;}
    .overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 150; display: none; opacity: 0; transition: opacity 0.3s; }
    .overlay.show { display: block; opacity: 1; }
    .hidden { display: none; }
    .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #febd69; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 20px auto; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .load-more-container { text-align: center; padding: 20px; }
    .load-more-btn { background: white; border: 1px solid #ccc; padding: 10px 30px; border-radius: 20px; cursor: pointer; }
    
    /* Scanner styles */
    #scanner-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 300; display: none; flex-direction: column; align-items: center; justify-content: center; }
    #scanner-container { width: 300px; height: 300px; background: #000; border: 2px solid #fff; border-radius: 8px; overflow: hidden; position: relative; }
    .scanner-controls { margin-top: 20px; display: flex; gap: 20px; }
    .scanner-btn { background: white; border: none; padding: 10px 20px; border-radius: 20px; font-weight: bold; font-size: 16px; }
    .scanner-btn.close { background: #c40000; color: white; }

  </style>
</head>
<body>

  <div id="overlay" class="overlay" onclick="closeNav()"></div>

  <div id="scanner-overlay">
    <div style="color:white; margin-bottom: 10px; font-weight:bold;">Scan a Barcode</div>
    <div id="scanner-container"></div>
    <div class="scanner-controls">
      <button class="scanner-btn close" onclick="stopScanner()">Close</button>
    </div>
  </div>

  <div id="mySidenav" class="sidenav">
    <div class="sidenav-header">
      <span>Categories</span>
      <span class="close-btn" onclick="closeNav()">&times;</span>
    </div>
    <div id="sidenav-list" class="sidenav-content"></div>
  </div>

  <div class="header">
    <button class="menu-btn" onclick="openNav()">&#9776;</button>
    <h1>KOSH <span id="filterBadge" class="filter-badge">Filtered</span></h1>
  </div>

  <div class="search-container">
    <div class="search-box">
      <input type="text" id="searchInput" placeholder="Search name, code, barcode...">
      <button class="search-btn" onclick="handleSearch()">GO</button>
    </div>
  </div>
  
  <button class="fab-scan" onclick="startScanner()" title="Scan Barcode">
     <svg class="fab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="10" height="10" rx="1"/><line x1="3" y1="12" x2="21" y2="12" stroke-dasharray="2 2" opacity="0.5"/></svg>
  </button>

  <div id="loading" class="spinner hidden"></div>
  
  <ul id="product-list"></ul>

  <div class="load-more-container">
    <button id="loadMoreBtn" class="load-more-btn hidden" onclick="loadMore()">Load More</button>
  </div>

  <script>
    // ... (All your JavaScript logic is unchanged) ...
    let page = 1;
    let currentQuery = "";
    let currentCategory = null;
    let currentSubcategory = null;
    let isLoading = false;
    let html5QrCode; 

    fetchCategories();
    fetchData(1);

    function startScanner() {
      document.getElementById('scanner-overlay').style.display = 'flex';
      html5QrCode = new Html5Qrcode("scanner-container");
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };
      html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
      .catch(err => { alert("Error starting camera: " + err); stopScanner(); });
    }
    
    function onScanSuccess(decodedText, decodedResult) {
      stopScanner();
      document.getElementById('searchInput').value = decodedText;
      handleSearch();
    }
    
    function stopScanner() {
      if (html5QrCode) {
        html5QrCode.stop().then(() => {
          html5QrCode.clear();
          document.getElementById('scanner-overlay').style.display = 'none';
        }).catch(err => { document.getElementById('scanner-overlay').style.display = 'none'; });
      } else { document.getElementById('scanner-overlay').style.display = 'none'; }
    }

    function toggleCard(id) { document.getElementById('card-' + id).classList.toggle('expanded'); }
    
    async function fetchCategories() { try { const res = await fetch('/api/categories'); const json = await res.json(); if(json.data) renderSidebar(json.data); } catch (e) {} }
    
    function renderSidebar(categories) {
      const list = document.getElementById('sidenav-list');
      let html = '<div class="menu-item" onclick="applyCategoryFilter(null, null)"><strong>All Products</strong></div>';
      categories.forEach(cat => {
        const hasSubs = cat.subcategories && cat.subcategories.length > 0;
        html += \`<div class="menu-item" onclick="toggleSubmenu('cat-\${cat.id}', \${hasSubs}, \${cat.id})"><span>\${cat.name}</span>\${hasSubs ? '<span id="chev-cat-'+cat.id+'" class="chevron">&#9660;</span>' : ''}</div>\`;
        if (hasSubs) {
          html += \`<div id="cat-\${cat.id}" class="submenu">\`;
          html += \`<div class="submenu-item" onclick="applyCategoryFilter(\${cat.id}, null)">All in \${cat.name}</div>\`;
          cat.subcategories.forEach(sub => { html += \`<div class="submenu-item" onclick="applyCategoryFilter(\${cat.id}, \${sub.id})">\${sub.name}</div>\`; });
          html += \`</div>\`;
        }
      });
      list.innerHTML = html;
    }
    
    function toggleSubmenu(id, has, catId) { if(!has) { applyCategoryFilter(catId, null); return; } document.getElementById(id).classList.toggle('show'); }
    
    function applyCategoryFilter(c, s) { currentCategory=c; currentSubcategory=s; closeNav(); document.getElementById('searchInput').value=""; currentQuery=""; page=1; document.getElementById('product-list').innerHTML=""; 
      const badge = document.getElementById('filterBadge'); if(c) badge.style.display="inline-block"; else badge.style.display="none";
      fetchData(1); 
    }
    
    function handleSearch() { currentQuery = document.getElementById('searchInput').value; page=1; document.getElementById('product-list').innerHTML=""; fetchData(1); }
    function loadMore() { page++; fetchData(page); }
    function openNav() { document.getElementById("mySidenav").classList.add("open"); document.getElementById("overlay").classList.add("show"); }
    function closeNav() { document.getElementById("mySidenav").classList.remove("open"); document.getElementById("overlay").classList.remove("show"); }

    async function fetchData(pageToFetch) {
      if (isLoading) return;
      isLoading = true;
      document.getElementById('loading').classList.remove('hidden');
      document.getElementById('loadMoreBtn').classList.add('hidden');
      try {
        const params = new URLSearchParams({ page: pageToFetch, limit: 20, isActive: 1 });
        if (currentQuery) params.append('query', currentQuery);
        if (currentCategory) params.append('category', currentCategory);
        if (currentSubcategory) params.append('subcategory', currentSubcategory);
        const res = await fetch(\`/api/products/mobile-view?\${params.toString()}\`);
        const json = await res.json();
        renderProducts(json.records);
        if (json.records.length >= 20) { document.getElementById('loadMoreBtn').classList.remove('hidden'); }
      } catch (err) { console.error(err); } 
      finally { isLoading = false; document.getElementById('loading').classList.add('hidden'); }
    }

    function renderProducts(products) {
      const list = document.getElementById('product-list');
      if (products.length === 0 && page === 1) { list.innerHTML = '<div style="text-align:center; padding:40px; color:#666;">No products found.</div>'; return; }
      products.forEach(p => {
        const li = document.createElement('li');
        li.id = 'card-' + p.id;
        li.className = 'product-card';
        
        let imgHtml = '<div class="product-avatar">No Img</div>';
        if (p.image_url) imgHtml = \`<img src="/images/products/\${p.image_url}" class="product-avatar" loading="lazy" />\`;
        
        let largeImgHtml = '';
        if (p.image_url) {
             largeImgHtml = \`
               <div class="large-image-container">
                 <img src="/images/products/\${p.image_url}" class="large-image" loading="lazy" />
               </div>
             \`;
        }

        const isLow = p.low_stock_threshold > 0 && p.quantity <= p.low_stock_threshold;
        const fmtMoney = (val) => val ? '₹' + val.toLocaleString('en-IN') : '—';
        const fmtVal = (val) => val || '—';
        const fmtDate = (val) => val ? new Date(val).toLocaleDateString('en-IN') : '—';

        li.innerHTML = \`
          <div class="card-header" onclick="toggleCard(\${p.id})">
            \${imgHtml}
            <div class="header-info">
              <div class="p-name">\${p.name}</div>
              <div class="p-code">\${p.product_code}</div>
            </div>
            <div class="header-status">
              <span class="stock-pill \${isLow ? 'low' : ''}">\${p.quantity} Left</span>
              <span class="expand-icon">&#9660;</span>
            </div>
          </div>

          <div class="card-details">
            \${largeImgHtml}
            <div class="detail-section">
              <div class="section-label">Identification</div>
              <div class="info-grid">
                <div class="info-item"><span class="info-label">Brand</span><span class="info-value">\${fmtVal(p.brand)}</span></div>
                <div class="info-item"><span class="info-label">Barcode</span><span class="info-value">\${fmtVal(p.barcode)}</span></div>
                <div class="info-item"><span class="info-label">HSN</span><span class="info-value">\${fmtVal(p.hsn)}</span></div>
                <div class="info-item"><span class="info-label">Location</span><span class="info-value">\${fmtVal(p.storage_location)}</span></div>
              </div>
            </div>
            <div class="detail-section">
              <div class="section-label">Pricing & Tax</div>
              <div class="info-grid">
                <div class="info-item"><span class="info-label">MRP</span><span class="info-value">\${fmtMoney(p.mrp)}</span></div>
                <div class="info-item"><span class="info-label">MOP</span><span class="info-value">\${fmtMoney(p.mop)}</span></div>
                <div class="info-item"><span class="info-label">MF/W</span><span class="info-value">\${fmtMoney(p.mfw_price)}</span></div>
                <div class="info-item"><span class="info-label">GST</span><span class="info-value">\${p.gst_rate}%</span></div>
                <div class="info-item full-width"><span class="info-label">Avg Purchase Price</span><span class="info-value">\${fmtMoney(p.average_purchase_price)}</span></div>
              </div>
            </div>
            <div class="detail-section">
              <div class="section-label">Specs</div>
              <div class="info-grid">
                <div class="info-item"><span class="info-label">Size</span><span class="info-value">\${fmtVal(p.size)}</span></div>
                <div class="info-item"><span class="info-label">Weight</span><span class="info-value">\${fmtVal(p.weight)}</span></div>
                <div class="info-item"><span class="info-label">Low Alert</span><span class="info-value">\${p.low_stock_threshold}</span></div>
              </div>
            </div>
            <div class="detail-section">
              <div class="section-label">Details</div>
              <div class="info-item full-width"><span class="info-value" style="font-weight:400">\${fmtVal(p.description)}</span></div>
            </div>
            <div class="detail-section" style="border-top:1px dashed #eee; padding-top:8px; margin-top:8px;">
              <div class="info-grid">
                <div class="info-item"><span class="info-label">Category</span><span class="info-value">\${fmtVal(p.category_name)}</span></div>
                <div class="info-item"><span class="info-label">Subcategory</span><span class="info-value">\${fmtVal(p.subcategory_name)}</span></div>
                <div class="info-item"><span class="info-label">Last Updated</span><span class="info-value">\${fmtDate(p.updated_at)}</span></div>
              </div>
            </div>
          </div>
        \`;
        list.appendChild(li);
      });
    }
  </script>
</body>
</html>
  `;

  res.send(html);
}
