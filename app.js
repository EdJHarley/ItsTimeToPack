/* app.js
   Minimal, readable JS for ItsTimeToPack prototype
   - loads data/packing-items.json (fallback to embedded)
   - renders lists, persists checks to localStorage
   - supports adding custom items (stored in localStorage)
*/

const DATA_URL = 'data/packing-items.json';
const STORAGE_KEYS = {
  CHECKS: 'ittp_checks_v1',        // checked items per list
  CUSTOM: 'ittp_custom_v1',        // custom items added by user
  SELECTED_LIST: 'ittp_selected_list'
};

const qs = sel => document.querySelector(sel);
const listSelect = qs('#listSelect');
const listName = qs('#listName');
const listArea = qs('#listArea');
const metaCounts = qs('#metaCounts');
const addBtn = qs('#addItemBtn');
const newItemName = qs('#newItemName');
const newItemCategory = qs('#newItemCategory');
const embeddedDataScript = qs('#embedded-data');

let appData = null;

// load JSON: try fetch first, fallback to embedded
async function loadData(){
  try{
    const res = await fetch(DATA_URL, {cache:'no-store'});
    if(res.ok){
      appData = await res.json();
      return;
    }
  }catch(e){ /* ignore and fallback */ }

  // fallback: parse embedded script
  try{
    appData = JSON.parse(embeddedDataScript.textContent);
  }catch(e){
    console.error('Failed to load data', e);
    appData = {meta:{lists:[]}, items:[]};
  }
}

// prettify list key to human text
function niceName(key){
  return key.replace(/[_-]/g,' ').replace(/\b(\w)/g, s => s.toUpperCase());
}

// localStorage helpers
function getAllChecks(){
  const raw = localStorage.getItem(STORAGE_KEYS.CHECKS);
  if(!raw) return {};
  try { return JSON.parse(raw); } catch(e){ return {}; }
}
function getChecksFor(listKey){
  const all = getAllChecks();
  return all[listKey] || {};
}
function saveCheck(listKey, itemId, checked){
  const all = getAllChecks();
  all[listKey] = all[listKey] || {};
  all[listKey][itemId] = !!checked;
  localStorage.setItem(STORAGE_KEYS.CHECKS, JSON.stringify(all));
}

function getCustomItems(){
  const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM);
  if(!raw) return [];
  try { return JSON.parse(raw); } catch(e){ return []; }
}
function addCustomItem(obj){
  const arr = getCustomItems();
  arr.push(obj);
  localStorage.setItem(STORAGE_KEYS.CUSTOM, JSON.stringify(arr));
}

// render helpers
function renderCounts(listKey, items){
  const saved = getChecksFor(listKey);
  const total = items.length;
  const checked = items.filter(it => saved[it.id]).length;
  metaCounts.textContent = `${checked} of ${total} items checked`;
}

function renderList(listKey){
  if(!appData) return;
  // items where lists[listKey] === true
  const items = appData.items.filter(it => it.lists && it.lists[listKey]);
  // include custom items created for this list
  const customs = getCustomItems().filter(c => c.listKey === listKey);
  const merged = [...items, ...customs];

  listArea.innerHTML = '';
  renderCounts(listKey, merged);

  if(merged.length === 0){
    const empty = document.createElement('div');
    empty.style.padding = '18px';
    empty.style.color = 'var(--muted)';
    empty.textContent = 'This list is empty. Add an item below.';
    listArea.appendChild(empty);
    return;
  }

  merged.forEach(item => {
    const card = document.createElement('div');
    card.className = 'item-card';

    const cbWrap = document.createElement('div');
    cbWrap.className = 'checkbox-wrap';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `cb_${item.id}`;

    const saved = getChecksFor(listKey);
    checkbox.checked = !!saved[item.id];

    checkbox.addEventListener('change', () => {
      saveCheck(listKey, item.id, checkbox.checked);
      renderCounts(listKey, merged);
    });

    cbWrap.appendChild(checkbox);

    const info = document.createElement('div');
    info.className = 'item-info';
    const nameEl = document.createElement('p');
    nameEl.className = 'item-name';
    nameEl.textContent = item.name || item.id;
    const catEl = document.createElement('div');
    catEl.className = 'item-category';
    catEl.textContent = item.category ? item.category : '';

    info.appendChild(nameEl);
    if(item.category) info.appendChild(catEl);

    card.appendChild(cbWrap);
    card.appendChild(info);

    listArea.appendChild(card);
  });
}

// populate list selector from meta
function populateListSelector(){
  const lists = (appData.meta && appData.meta.lists) ? appData.meta.lists : [];
  listSelect.innerHTML = '';
  lists.forEach(key => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = niceName(key);
    listSelect.appendChild(opt);
  });

  // select saved or first
  const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_LIST);
  const chosen = (saved && lists.includes(saved)) ? saved : (lists[0] || '');
  if(chosen) listSelect.value = chosen;

  listName.textContent = chosen ? niceName(chosen) : 'Packing — no lists';
  renderList(chosen);
}

// events
listSelect.addEventListener('change', () => {
  const key = listSelect.value;
  localStorage.setItem(STORAGE_KEYS.SELECTED_LIST, key);
  listName.textContent = niceName(key);
  renderList(key);
});

addBtn.addEventListener('click', () => {
  const name = newItemName.value.trim();
  if(!name) return;
  const cat = newItemCategory.value.trim() || 'Misc';
  const listKey = listSelect.value;
  const id = 'custom_' + Date.now();
  const obj = { id, name, category: cat, listKey };
  addCustomItem(obj);
  newItemName.value = '';
  newItemCategory.value = '';
  renderList(listKey);
});

// init
(async function init(){
  await loadData();
  populateListSelector();
})();
