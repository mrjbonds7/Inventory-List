const itemForm = document.getElementById('item-form');
const receiveForm = document.getElementById('receive-form');
const nameInput = document.getElementById('item-name');
const quantityInput = document.getElementById('item-quantity');
const thresholdInput = document.getElementById('low-stock-threshold');
const receiveNameInput = document.getElementById('receive-name');
const receiveQuantityInput = document.getElementById('receive-quantity');
const lowStockBody = document.getElementById('low-stock-body');
const inStockBody = document.getElementById('in-stock-body');
const summaryTotal = document.getElementById('summary-total');
const summaryLow = document.getElementById('summary-low');
const alertBox = document.getElementById('low-stock-alert');
const alertText = document.getElementById('low-stock-message');
const generatePdfButton = document.getElementById('generate-pdf');
const sendWhatsAppButton = document.getElementById('send-whatsapp');
const recordWeeklyButton = document.getElementById('record-weekly-count');
const weeklyHistory = document.getElementById('weekly-count-history');
const toggleScannerButton = document.getElementById('toggle-scanner');
const scannerContainer = document.getElementById('scanner-container');
const scannerVideo = document.getElementById('scanner-video');
const manualBarcodeInput = document.getElementById('manual-barcode');
const barcodeQuantityInput = document.getElementById('barcode-quantity');
const addFromBarcodeButton = document.getElementById('add-from-barcode');
const exportDataButton = document.getElementById('export-data');
const importDataButton = document.getElementById('import-data');

const STORAGE_KEY = 'inventory-items-v1';
const HISTORY_KEY = 'inventory-weekly-counts-v1';
const DELETED_KEY = 'inventory-deleted-items-v1';
let inventory = [];
let weeklyCounts = [];
let deletedItems = [];
let scanner = null;
let scannerActive = false;

function loadInventory() {
  const saved = localStorage.getItem(STORAGE_KEY);
  inventory = saved ? JSON.parse(saved) : [];
}

function loadWeeklyHistory() {
  const saved = localStorage.getItem(HISTORY_KEY);
  weeklyCounts = saved ? JSON.parse(saved) : [];
}

function loadDeletedItems() {
  const saved = localStorage.getItem(DELETED_KEY);
  deletedItems = saved ? JSON.parse(saved) : [];
}

function saveInventory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
}

function saveWeeklyHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(weeklyCounts));
}

function saveDeletedItems() {
  localStorage.setItem(DELETED_KEY, JSON.stringify(deletedItems));
}

function formatNumber(value) {
  return Number.isFinite(value) ? value.toLocaleString() : value;
}

function getLowStockItems() {
  return inventory.filter(item => item.quantity <= item.threshold);
}

function getHighStockItems() {
  return inventory.filter(item => item.quantity > item.threshold);
}

function updateSummary() {
  summaryTotal.textContent = inventory.length;
  summaryLow.textContent = getLowStockItems().length;
}

function createInventoryRow(item) {
  const row = document.createElement('tr');
  if (item.quantity <= item.threshold) {
    row.classList.add('low');
  }

  row.innerHTML = `
    <td>${item.name}</td>
    <td>${formatNumber(item.quantity)}</td>
    <td>${formatNumber(item.threshold)}</td>
    <td>${item.quantity <= item.threshold ? '<strong>Low stock</strong>' : 'OK'}</td>
    <td>
      <button type="button" class="receive-button" data-id="${item.id}">Receive</button>
      <button type="button" class="delete-button" data-id="${item.id}">Delete</button>
    </td>
  `;

  row.querySelector('.receive-button').addEventListener('click', () => receiveStockForItem(item.id));
  row.querySelector('.delete-button').addEventListener('click', () => deleteItem(item.id));
  return row;
}

function renderInventory() {
  lowStockBody.innerHTML = '';
  inStockBody.innerHTML = '';

  const lowStockItems = getLowStockItems();
  const highStockItems = getHighStockItems();
  let alertMessage = '';

  if (lowStockItems.length === 0) {
    const placeholder = document.createElement('tr');
    placeholder.innerHTML = `<td colspan="5" style="padding: 24px; text-align: center; color: #6b7280;">No low stock items.</td>`;
    lowStockBody.appendChild(placeholder);
  } else {
    lowStockItems.forEach(item => lowStockBody.appendChild(createInventoryRow(item)));
  }

  if (highStockItems.length === 0) {
    const placeholder = document.createElement('tr');
    placeholder.innerHTML = `<td colspan="5" style="padding: 24px; text-align: center; color: #6b7280;">No in-stock items yet.</td>`;
    inStockBody.appendChild(placeholder);
  } else {
    highStockItems.forEach(item => inStockBody.appendChild(createInventoryRow(item)));
  }

  if (lowStockItems.length > 0) {
    alertMessage = `Warning: ${lowStockItems.length} item(s) are low in stock. Check the low stock list and restock soon.`;
    alertBox.classList.add('show');
  } else {
    alertBox.classList.remove('show');
  }

  alertText.textContent = alertMessage;
  updateSummary();
}

function addItem(event) {
  event.preventDefault();

  const name = nameInput.value.trim();
  const quantity = Math.max(0, Number(quantityInput.value));
  const threshold = Math.max(0, Number(thresholdInput.value));

  if (!name) {
    window.alert('Please enter a valid item name.');
    return;
  }

  if (!Number.isFinite(quantity) || quantity < 0) {
    window.alert('Please enter a valid quantity.');
    return;
  }

  if (!Number.isFinite(threshold) || threshold < 0) {
    window.alert('Please enter a valid low stock threshold.');
    return;
  }

  inventory.push({
    id: Date.now().toString(),
    name,
    quantity,
    threshold,
  });

  saveInventory();
  renderInventory();
  itemForm.reset();
  nameInput.focus();
}

function receiveStock(event) {
  event.preventDefault();

  const name = receiveNameInput.value.trim();
  const quantity = Math.max(0, Number(receiveQuantityInput.value));

  if (!name) {
    window.alert('Please enter the existing item name.');
    return;
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    window.alert('Please enter a valid received quantity.');
    return;
  }

  const existingItem = inventory.find(item => item.name.toLowerCase() === name.toLowerCase());
  if (!existingItem) {
    window.alert('Item not found. Make sure you use the exact item name already in inventory.');
    return;
  }

  existingItem.quantity += quantity;
  saveInventory();
  renderInventory();
  receiveForm.reset();
  receiveNameInput.focus();
}

function receiveStockForItem(itemId) {
  const item = inventory.find(item => item.id === itemId);
  if (!item) {
    return;
  }

  const input = prompt(`Enter received quantity for ${item.name}:`, '0');
  if (input === null) {
    return;
  }

  const quantity = Math.max(0, Number(input));
  if (!Number.isFinite(quantity) || quantity <= 0) {
    window.alert('Please enter a valid quantity greater than zero.');
    return;
  }

  item.quantity += quantity;
  saveInventory();
  renderInventory();
}

function deleteItem(itemId) {
  const item = inventory.find(item => item.id === itemId);
  if (!item) return;

  const comment = window.prompt(`Delete "${item.name}"? (Add a comment for future reference)`, '');
  if (comment === null) return;

  deletedItems.unshift({
    id: itemId,
    name: item.name,
    quantity: item.quantity,
    threshold: item.threshold,
    barcode: item.barcode,
    deletedAt: new Date().toISOString(),
    comment: comment || 'No comment',
  });

  if (deletedItems.length > 100) {
    deletedItems.length = 100;
  }

  inventory = inventory.filter(item => item.id !== itemId);
  saveInventory();
  saveDeletedItems();
  renderInventory();
  renderDeletedItems();
}

function buildRestockText(items) {
  if (items.length === 0) {
    return 'No items need restocking right now.';
  }

  const lines = [
    'Restock Request',
    '-----------------------------',
    ...items.map(item => `${item.name}: ${item.quantity} in stock (threshold ${item.threshold})`),
    '',
    'Please restock these items as soon as possible.',
  ];

  return lines.join('\n');
}

function recordWeeklyCount() {
  const lowStock = getLowStockItems().length;
  const highStock = inventory.length - lowStock;
  const entry = {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    total: inventory.length,
    lowStock,
    highStock,
  };

  weeklyCounts.unshift(entry);
  if (weeklyCounts.length > 12) {
    weeklyCounts.length = 12;
  }

  saveWeeklyHistory();
  renderWeeklyHistory();
}

function renderWeeklyHistory() {
  weeklyHistory.innerHTML = '';

  if (weeklyCounts.length === 0) {
    weeklyHistory.innerHTML = '<p class="placeholder">No weekly counts recorded yet.</p>';
    return;
  }

  weeklyCounts.forEach(entry => {
    const card = document.createElement('div');
    card.className = 'weekly-entry';
    const timestamp = new Date(entry.date);
    card.innerHTML = `
      <time datetime="${entry.date}">${timestamp.toLocaleString()}</time>
      <div><strong>Total items:</strong> ${entry.total}</div>
      <div><strong>Low stock:</strong> ${entry.lowStock}</div>
      <div><strong>In stock:</strong> ${entry.highStock}</div>
    `;
    weeklyHistory.appendChild(card);
  });
}

async function generatePdf() {
  const lowStockItems = getLowStockItems();
  if (lowStockItems.length === 0) {
    window.alert('No low-stock items found. Nothing to include in the PDF.');
    return;
  }

  if (window.jspdf && window.jspdf.jsPDF) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFontSize(16);
    doc.text('Inventory Restock Report', 40, 50);
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 75);
    doc.setFontSize(11);

    lowStockItems.forEach((item, index) => {
      const y = 110 + index * 24;
      doc.text(`${index + 1}. ${item.name}`, 40, y);
      doc.text(`Qty: ${item.quantity}`, 320, y);
      doc.text(`Threshold: ${item.threshold}`, 420, y);
    });

    doc.save('restock-list.pdf');
  } else {
    const text = buildRestockText(lowStockItems);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'restock-list.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
}

function sendWhatsApp() {
  const lowStockItems = getLowStockItems();
  if (lowStockItems.length === 0) {
    window.alert('No low-stock items to send. Add items with low quantity first.');
    return;
  }

  const text = buildRestockText(lowStockItems);
  const message = encodeURIComponent(text);
  const whatsappUrl = `https://api.whatsapp.com/send?text=${message}`;

  window.open(whatsappUrl, '_blank');
}

function initScanner() {
  if (!scanner) {
    scanner = new Html5Qrcode('scanner-video');
  }
}

function toggleScanner() {
  if (scannerActive) {
    stopScanner();
  } else {
    startScanner();
  }
}

function startScanner() {
  initScanner();
  scannerContainer.style.display = 'block';
  toggleScannerButton.textContent = 'Close scanner';

  Html5Qrcode.getCameras()
    .then(devices => {
      if (devices && devices.length) {
        const cameraId = devices[0].id;
        scanner
          .start(
            cameraId,
            {
              fps: 10,
              qrbox: { width: 200, height: 200 },
            },
            onScanSuccess,
            null
          )
          .catch(err => {
            console.error('Failed to start scanner:', err);
            window.alert('Could not access camera. Please check permissions.');
            stopScanner();
          });
        scannerActive = true;
      }
    })
    .catch(err => {
      console.error('No cameras found:', err);
      window.alert('No camera found on this device.');
    });
}

function stopScanner() {
  if (scanner && scannerActive) {
    scanner
      .stop()
      .then(() => {
        scannerActive = false;
        scannerContainer.style.display = 'none';
        toggleScannerButton.textContent = 'Open scanner';
      })
      .catch(err => console.error('Failed to stop scanner:', err));
  }
}

function onScanSuccess(decodedText) {
  processBarcode(decodedText);
}

function processBarcode(code) {
  if (!code || code.trim() === '') {
    return;
  }

  const trimmedCode = code.trim();
  let existingItem = inventory.find(item => item.barcode && item.barcode.toLowerCase() === trimmedCode.toLowerCase());

  if (existingItem) {
    existingItem.quantity += 1;
    saveInventory();
    renderInventory();
    window.alert(`Updated ${existingItem.name}: +1 unit`);
    stopScanner();
  } else {
    const newItemName = window.prompt('Item not found in inventory. Enter a name for this new item:', `Item ${trimmedCode}`);
    if (newItemName) {
      const threshold = window.prompt('Enter low stock threshold for this item:', '5');
      const thresholdNum = Math.max(0, Number(threshold) || 5);
      
      inventory.push({
        id: Date.now().toString(),
        name: newItemName,
        quantity: 1,
        threshold: thresholdNum,
        barcode: trimmedCode,
      });

      saveInventory();
      renderInventory();
      window.alert(`Added new item: ${newItemName}`);
      stopScanner();
    }
  }
}

function addFromManualBarcode() {
  const code = manualBarcodeInput.value.trim();
  const quantity = Math.max(1, Number(barcodeQuantityInput.value));

  if (!code) {
    window.alert('Please enter a barcode.');
    return;
  }

  let existingItem = inventory.find(item => item.barcode && item.barcode.toLowerCase() === code.toLowerCase());

  if (existingItem) {
    existingItem.quantity += quantity;
    saveInventory();
    renderInventory();
    window.alert(`Updated ${existingItem.name}: +${quantity} units`);
    manualBarcodeInput.value = '';
    barcodeQuantityInput.value = '1';
    manualBarcodeInput.focus();
  } else {
    const newItemName = window.prompt('Item not found. Enter a name for this item:', `Item ${code}`);
    if (newItemName) {
      const threshold = window.prompt('Enter low stock threshold:', '5');
      const thresholdNum = Math.max(0, Number(threshold) || 5);
      
      inventory.push({
        id: Date.now().toString(),
        name: newItemName,
        quantity: quantity,
        threshold: thresholdNum,
        barcode: code,
      });

      saveInventory();
      renderInventory();
      window.alert(`Added new item: ${newItemName}`);
      manualBarcodeInput.value = '';
      barcodeQuantityInput.value = '1';
      manualBarcodeInput.focus();
    }
  }
}

itemForm.addEventListener('submit', addItem);
receiveForm.addEventListener('submit', receiveStock);
generatePdfButton.addEventListener('click', generatePdf);
sendWhatsAppButton.addEventListener('click', sendWhatsApp);
recordWeeklyButton.addEventListener('click', recordWeeklyCount);
toggleScannerButton.addEventListener('click', toggleScanner);
addFromBarcodeButton.addEventListener('click', addFromManualBarcode);
exportDataButton.addEventListener('click', exportData);
importDataButton.addEventListener('click', importData);
document.getElementById('toggle-deleted-items').addEventListener('click', toggleDeletedItems);
manualBarcodeInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addFromManualBarcode();
  }
});

function toggleDeletedItems() {
  const list = document.getElementById('deleted-items-list');
  const button = document.getElementById('toggle-deleted-items');
  const isHidden = list.style.display === 'none';
  list.style.display = isHidden ? 'grid' : 'none';
  button.textContent = isHidden ? 'Hide archive' : `Show archive (${deletedItems.length})`;
}

function renderDeletedItems() {
  const list = document.getElementById('deleted-items-list');
  const count = document.getElementById('deleted-count');
  count.textContent = deletedItems.length;

  if (deletedItems.length === 0) {
    list.innerHTML = '<p class="placeholder">No deleted items.</p>';
    return;
  }

  list.innerHTML = '';
  deletedItems.forEach(item => {
    const card = document.createElement('div');
    card.className = 'deleted-item-card';
    const deletedDate = new Date(item.deletedAt);
    card.innerHTML = `
      <div class="deleted-item-info">
        <strong>${item.name}</strong>
        <p>Qty: ${formatNumber(item.quantity)} | Threshold: ${formatNumber(item.threshold)}</p>
        <p class="deleted-comment"><strong>Comment:</strong> ${item.comment}</p>
        <p class="deleted-date">Deleted: ${deletedDate.toLocaleString()}</p>
      </div>
      <div class="deleted-item-actions">
        <button type="button" class="restore-button" data-id="${item.id}">Restore</button>
      </div>
    `;

    card.querySelector('.restore-button').addEventListener('click', () => restoreDeletedItem(item.id));
    list.appendChild(card);
  });
}

function restoreDeletedItem(itemId) {
  const deletedItem = deletedItems.find(item => item.id === itemId);
  if (!deletedItem) return;

  const confirmRestore = window.confirm(`Restore "${deletedItem.name}" to inventory?`);
  if (!confirmRestore) return;

  inventory.push({
    id: deletedItem.id,
    name: deletedItem.name,
    quantity: deletedItem.quantity,
    threshold: deletedItem.threshold,
    barcode: deletedItem.barcode,
  });

  deletedItems = deletedItems.filter(item => item.id !== itemId);
  saveInventory();
  saveDeletedItems();
  renderInventory();
  renderDeletedItems();
  window.alert(`Restored "${deletedItem.name}" to inventory.`);
}

function exportData() {
  const dataToExport = {
    inventory,
    weeklyCounts,
    exportedAt: new Date().toISOString(),
  };

  const json = JSON.stringify(dataToExport, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `inventory-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  window.alert('Inventory data exported successfully!');
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!data.inventory || !Array.isArray(data.inventory)) {
          throw new Error('Invalid backup file format');
        }

        const confirmImport = window.confirm(
          `This will replace your current inventory with ${data.inventory.length} items and ${data.weeklyCounts.length} weekly counts. Continue?`
        );

        if (confirmImport) {
          inventory = data.inventory;
          weeklyCounts = data.weeklyCounts || [];
          saveInventory();
          saveWeeklyHistory();
          renderInventory();
          renderWeeklyHistory();
          window.alert('Inventory data imported successfully!');
        }
      } catch (err) {
        console.error('Import error:', err);
        window.alert(`Failed to import data: ${err.message}`);
      }
    };
    reader.readAsText(file);
  });

  input.click();
}

loadInventory();
loadWeeklyHistory();
renderInventory();
renderWeeklyHistory();
