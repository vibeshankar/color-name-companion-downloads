import { identifyColor, normalizeHex, buildProjectName } from './colors.mjs';

const byId = id => document.getElementById(id);
const storageKey = 'color-name-companion-v1';
const state = {
  history: [], label: '', includeHex: false, autoSpeak: false,
  lastHex: null, nameStyle: 'shade', personal: {}
};
let current;
let selected;
const hasSpeech = 'speechSynthesis' in window;
const hasPicker = 'EyeDropper' in window;

function announce(message) {
  byId('status').textContent = message;
}

function cleanName(value, limit = 50) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

async function load() {
  try {
    const saved = (await chrome.storage.local.get(storageKey))[storageKey];
    if (!saved || typeof saved !== 'object') return;
    const seen = new Set();
    for (const item of Array.isArray(saved.history) ? saved.history : []) {
      const hex = normalizeHex(typeof item === 'string' ? item : item?.hex);
      if (!hex || seen.has(hex)) continue;
      seen.add(hex);
      state.history.push({ hex, name: cleanName(item?.name) });
      if (state.history.length === 12) break;
    }
    for (const [key, value] of Object.entries(saved.personal ?? {})) {
      const hex = normalizeHex(key);
      const name = cleanName(value);
      if (hex && name) state.personal[hex] = name;
    }
    state.lastHex = normalizeHex(saved.lastHex);
    state.label = typeof saved.label === 'string' ? saved.label.slice(0, 180) : '';
    state.includeHex = saved.includeHex === true;
    state.autoSpeak = saved.autoSpeak === true;
    state.nameStyle = saved.nameStyle === 'family' ? 'family' : 'shade';
  } catch {
    announce('Saved data could not be loaded. You can still identify colors.');
  }
}

async function save() {
  try {
    await chrome.storage.local.set({ [storageKey]: state });
  } catch {
    announce('Chrome could not save your latest changes.');
  }
}

function updateProjectName() {
  if (!current) return;
  const name = state.nameStyle === 'family' && !selected.personal ? selected.family : selected.name;
  byId('project-name').value = buildProjectName(name, state.label, current.hex, state.includeHex);
}

function makeButton(text, className, action) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = text;
  button.addEventListener('click', action);
  return button;
}

function updateSelectionView() {
  byId('color-name').textContent = selected.name;
  byId('color-family').textContent = selected.personal
    ? selected.family + ' · Saved name'
    : selected.family;
  for (const button of byId('alternatives').children) {
    button.setAttribute('aria-pressed', String(button.textContent === selected.name));
  }
  updateProjectName();
}

function choices() {
  const name = state.personal[current.hex];
  if (!name) return current.matches;
  return [{ name, family: current.matches[0].family, personal: true },
    ...current.matches.filter(match => match.name !== name)];
}

function recordName() {
  const name = state.nameStyle === 'family' && !selected.personal ? selected.family : selected.name;
  state.history = [{ hex: current.hex, name }, ...state.history.filter(item => item.hex !== current.hex)].slice(0, 12);
  state.lastHex = current.hex;
  renderHistory();
  void save();
}

function renderAlternatives() {
  const list = byId('alternatives');
  list.replaceChildren();
  for (const match of choices()) {
    const button = makeButton(match.name, 'choice', () => {
      selected = match;
      updateSelectionView();
      recordName();
      announce(match.name + ' selected.');
    });
    list.append(button);
  }
}

function renderHistory() {
  byId('history-section').hidden = state.history.length === 0;
  const list = byId('history');
  list.replaceChildren();
  for (const { hex, name } of state.history) {
    const defaultName = state.personal[hex] || identifyColor(hex).matches[0].name;
    const button = makeButton('', 'history-item', () => {
      selectColor(hex, { previousName: name });
      byId('copy-name').focus();
    });
    const chip = document.createElement('span');
    chip.className = 'history-chip';
    chip.style.backgroundColor = hex;
    chip.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'history-label';
    label.textContent = name || defaultName;
    const code = document.createElement('span');
    code.className = 'code';
    code.textContent = hex;
    button.append(chip, label, code);
    list.append(button);
  }
}

function speakColor() {
  if (!current || !hasSpeech) return;
  speechSynthesis.cancel();
  const speech = new SpeechSynthesisUtterance(selected.name);
  speech.lang = 'en';
  speech.rate = 0.95;
  speechSynthesis.speak(speech);
}

function renderColor() {
  byId('result').hidden = false;
  byId('swatch').style.backgroundColor = current.hex;
  byId('hex-value').textContent = current.hex;
  byId('hex-input').value = current.hex;
  byId('hex-input').removeAttribute('aria-invalid');
  byId('rgb-value').hidden = false;
  byId('rgb-value').textContent = 'RGB ' + current.rgb.join(', ');
  byId('speak').hidden = !hasSpeech;
  const notice = byId('ambiguity');
  notice.hidden = !(current.close || current.approximate);
  if (current.approximate) {
    notice.textContent = 'Approximate shade. Check the nearby names.';
  } else if (current.close) {
    notice.textContent = 'Close call between ' + current.matches[0].name.toLowerCase() +
      ' and ' + current.close.name.toLowerCase() + '.';
  }
  byId('personal-name').value = state.personal[current.hex] || '';
  byId('personal-name').removeAttribute('aria-invalid');
  byId('forget-name').hidden = !state.personal[current.hex];
  renderAlternatives();
  updateSelectionView();
}

function selectColor(hex, { remember = true, speak = true, previousName = '' } = {}) {
  current = identifyColor(hex);
  const candidates = choices();
  selected = candidates[0];
  if (previousName && !selected.personal) {
    selected = candidates.find(match => match.name === previousName) || selected;
  }
  renderColor();
  if (remember) recordName();
  const uncertainty = current.close ? ' Close call. Nearby names are available.' :
    current.approximate ? ' Approximate shade.' : '';
  announce(selected.name + ', ' + current.hex + '.' + uncertainty);
  if (speak && state.autoSpeak) speakColor();
}

async function copyText(value, message, fallback) {
  if (!value.trim()) {
    announce('Enter a project name before copying.');
    return false;
  }
  try {
    await navigator.clipboard.writeText(value);
    announce(message);
    return true;
  } catch {
    if (fallback === 'hex-input') {
      byId('manual-entry').open = true;
      byId(fallback).value = value;
    }
    byId(fallback).focus();
    byId(fallback).select();
    announce('Clipboard access was unavailable. The text is selected for copying.');
    return false;
  }
}

await load();
byId('project-label').value = state.label;
byId('include-hex').checked = state.includeHex;
byId('auto-speak').checked = state.autoSpeak;
byId('auto-speak').disabled = !hasSpeech;
byId('name-style').value = state.nameStyle;
renderHistory();
if (state.lastHex) {
  const previousName = state.history.find(item => item.hex === state.lastHex)?.name;
  selectColor(state.lastHex, { remember: false, speak: false, previousName });
}
if (!hasPicker) {
  byId('pick').disabled = true;
  byId('manual-entry').open = true;
  announce('Screen picking is unavailable here. You can enter a HEX color below.');
}

byId('pick').addEventListener('click', async () => {
  byId('pick').disabled = true;
  announce('Click a pixel in your design, or press Escape to cancel.');
  try {
    const result = await new EyeDropper().open();
    selectColor(result.sRGBHex);
    byId('copy-name').focus();
  } catch (error) {
    announce(error.name === 'AbortError' ? 'Pick cancelled.' : 'The picker could not start. Try again or enter a HEX color.');
  } finally {
    byId('pick').disabled = false;
  }
});

byId('hex-form').addEventListener('submit', event => {
  event.preventDefault();
  const field = byId('hex-input');
  const hex = normalizeHex(field.value);
  if (hex) {
    selectColor(hex);
    byId('manual-entry').open = false;
    byId('copy-name').focus();
  } else {
    field.setAttribute('aria-invalid', 'true');
    announce('Enter three or six HEX digits, for example #008080.');
    field.focus();
  }
});

byId('personal-form').addEventListener('submit', event => {
  event.preventDefault();
  const field = byId('personal-name');
  const name = cleanName(field.value);
  if (!name) {
    field.setAttribute('aria-invalid', 'true');
    announce('Enter the name you want to remember.');
    field.focus();
    return;
  }
  state.personal[current.hex] = name;
  selectColor(current.hex, { speak: false });
  announce('Saved ' + name + ' for ' + current.hex + '.');
});

byId('forget-name').addEventListener('click', () => {
  delete state.personal[current.hex];
  selectColor(current.hex, { speak: false });
  byId('personal-name').focus();
  announce('Saved name removed for ' + current.hex + '.');
});

for (const [id, property, eventName, attribute] of [
  ['project-label', 'label', 'input', 'value'],
  ['name-style', 'nameStyle', 'change', 'value'],
  ['include-hex', 'includeHex', 'change', 'checked'],
  ['auto-speak', 'autoSpeak', 'change', 'checked']
]) {
  byId(id).addEventListener(eventName, event => {
    state[property] = event.target[attribute];
    if (property !== 'autoSpeak') updateProjectName();
    void save();
  });
}

byId('copy-name').addEventListener('click', async () => {
  if (await copyText(byId('project-name').value, 'Project name copied. Paste it into Adobe Express.', 'project-name')) recordName();
});
byId('copy-hex').addEventListener('click', () => copyText(current.hex, 'HEX copied.', 'hex-input'));
byId('speak').addEventListener('click', speakColor);
byId('clear-history').addEventListener('click', () => {
  state.history = [];
  renderHistory();
  byId('manual-entry').querySelector('summary').focus();
  void save();
  announce('Recent picks cleared.');
});
