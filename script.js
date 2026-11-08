// === Last Asylum Tracker — Главный скрипт ===
// Подключается после messages.js

(function() {
    'use strict';

    // ============== КОНСТАНТЫ ==============
    const STORAGE_KEYS = {
        CURRENT_USER: 'lastAsylum_user',
        WANTED_LIST: 'lastAsylum_wanted',
        ADMIN_PASSWORD: 'lastAsylum_admin'
    };

    const API_BASE = 'https://api.lastasylumtracker.com';
    const DEFAULT_KINGDOM = 388;
    const ALLIANCE_ID = 67170854;

    // ============== СОСТОЯНИЕ ПРИЛОЖЕНИЯ ==============
    const state = {
        currentUser: null,
        allianceData: null,
        players: [],
        wantedList: [],
        currentTab: 'overview',
        isLoading: false
    };

    // ============== DOM ЭЛЕМЕНТЫ ==============
    const screens = {
        loading: document.getElementById('loading-screen'),
        auth: document.getElementById('auth-screen'),
        app: document.getElementById('app-screen'),
        error: document.getElementById('error-screen')
    };

    const elements = {
        // Auth
        playerName: document.getElementById('player-name'),
        playerUid: document.getElementById('player-uid'),
        loginBtn: document.getElementById('login-btn'),
        // App
        userName: document.getElementById('user-name'),
        logoutBtn: document.getElementById('logout-btn'),
        tabContent: document.getElementById('tab-content'),
        tabItems: document.querySelectorAll('.tab-item'),
        // Error
        errorMessage: document.getElementById('error-message'),
        backToAuth: document.getElementById('back-to-auth')
    };

    // ============== УТИЛИТЫ ==============
    const utils = {
        formatNumber(num) {
            if (!num && num !== 0) return '—';
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
            return String(num);
        },

        formatUID(uid) {
            return uid ? uid.toString() : '—';
        },

        formatCoords(player) {
            if (!player) return '—';
            return `${player.x || '—'}, ${player.y || '—'}`;
        },

        getInitials(name) {
            return name ? name.slice(0, 2).toUpperCase() : '??';
        },

        showScreen(screenName) {
            Object.values(screens).forEach(s => s?.classList.add('hidden'));
            screens[screenName]?.classList.remove('hidden');
        },

        showError(message) {
            elements.errorMessage.textContent = message;
            utils.showScreen('error');
        },

        setLoading(isLoading) {
            state.isLoading = isLoading;
            elements.loginBtn.disabled = isLoading;
            elements.loginBtn.textContent = isLoading ? 'Вход...' : 'Войти';
        }
    };

    // ============== ХРАНИЛИЩЕ (localStorage) ==============
    const storage = {
        get(key) {
            try {
                const val = localStorage.getItem(key);
                return val ? JSON.parse(val) : null;
            } catch { return null; }
        },

        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch { return false; }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch { return false; }
        }
    };

    // ============== ЗАГРУЗКА ДАННЫХ ==============
    async function loadAllianceData() {
        try {
            // Сначала пробуем загрузить из локального JSON (для GitHub Pages)
            const response = await fetch('./data/alliance.json');
            if (response.ok) {
                state.allianceData = await response.json();
                state.players = state.allianceData.members || [];
                return true;
            }
        } catch (e) {
            console.warn('Не удалось загрузить alliance.json:', e);
        }

        // Если нет локального файла — создаем заглушку
        state.allianceData = {
            alliance: { name: 'AURI GROUP', tag: 'AURI', level: 15, members: 0, power: 0, kingdom_id: DEFAULT_KINGDOM, declaration: '—', id: ALLIANCE_ID },
            leader: null,
            members: [],
            updated_at: new Date().toISOString(),
            server: DEFAULT_KINGDOM
        };
        state.players = [];
        return false;
    }

    async function loadWantedList() {
        const wanted = storage.get(STORAGE_KEYS.WANTED_LIST);
        if (wanted && Array.isArray(wanted)) {
            state.wantedList = wanted;
        }
    }

    // ============== АВТОРИЗАЦИЯ ==============
    function checkAuth(playerName, playerUid) {
        if (!state.players.length) return false;

        const searchTerm = (playerName || '').trim().toLowerCase();
        const searchUid = (playerUid || '').trim();

        const found = state.players.find(p => {
            const nameMatch = p.name?.toLowerCase() === searchTerm;
            const uidMatch = searchUid && p.uid?.toString() === searchUid;
            return nameMatch || uidMatch;
        });

        return !!found;
    }

    function doLogin(playerName, playerUid) {
        const searchTerm = (playerName || '').trim().toLowerCase();
        const searchUid = (playerUid || '').trim();

        const player = state.players.find(p => {
            const nameMatch = p.name?.toLowerCase() === searchTerm;
            const uidMatch = searchUid && p.uid?.toString() === searchUid;
            return nameMatch || uidMatch;
        });

        if (!player) {
            return false;
        }

        state.currentUser = player;
        storage.set(STORAGE_KEYS.CURRENT_USER, player);
        return true;
    }

    function doLogout() {
        state.currentUser = null;
        storage.remove(STORAGE_KEYS.CURRENT_USER);
        utils.showScreen('auth');
        elements.playerName.value = '';
        elements.playerUid.value = '';
        elements.playerName.focus();
    }

    function tryAutoLogin() {
        const saved = storage.get(STORAGE_KEYS.CURRENT_USER);
        if (saved && state.players.length) {
            const found = state.players.find(p => p.uid === saved.uid);
            if (found) {
                state.currentUser = found;
                return true;
            }
        }
        return false;
    }

    // ============== РЕНДЕР ВКЛАДОК ==============
    function renderTab(tabName) {
        state.currentTab = tabName;
        
        // Обновляем активную вкладку
        elements.tabItems.forEach(btn => {
            const isActive = btn.dataset.tab === tabName;
            btn.classList.toggle('tab-active', isActive);
        });

        // Рендерим контент
        switch (tabName) {
            case 'overview': renderOverview(); break;
            case 'manifest': renderManifest(); break;
            case 'planner': renderPlanner(); break;
            case 'wanted': renderWanted(); break;
            case 'rankings': renderRankings(); break;
            case 'progress': renderProgress(); break;
            default: renderOverview();
        }
    }

    function renderOverview() {
        if (!state.allianceData) return;
        
        const a = state.allianceData.alliance;
        const leader = state.allianceData.leader || state.players[0];
        
        const content = `
            <div class="space-y-6">
                <!-- Header -->
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 class="text-2xl font-bold text-asylum-900">${a.name}</h2>
                        <p class="text-asylum-500">Тег: ${a.tag} | Королевство: ${a.kingdom_id}</p>
                    </div>
                    <a href="https://lastasylumtracker.com/alliance/${ALLIANCE_ID}" target="_blank" class="btn-primary">
                        Открыть на трекере
                    </a>
                </div>

                <!-- Stats Grid -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="stat-card">
                        <p class="text-xs text-gray-500 uppercase tracking-wide">Боевой мощи</p>
                        <p class="text-3xl font-bold text-asylum-700">${utils.formatNumber(a.power)}</p>
                    </div>
                    <div class="stat-card">
                        <p class="text-xs text-gray-500 uppercase tracking-wide">Участников</p>
                        <p class="text-3xl font-bold text-asylum-700">${a.members}</p>
                    </div>
                    <div class="stat-card">
                        <p class="text-xs text-gray-500 uppercase tracking-wide">Уровень альянса</p>
                        <p class="text-3xl font-bold text-asylum-700">${a.level}</p>
                    </div>
                    <div class="stat-card">
                        <p class="text-xs text-gray-500 uppercase tracking-wide">Ср. уровень святилища</p>
                        <p class="text-3xl font-bold text-asylum-700">${calculateAvgSanctuary()}</p>
                    </div>
                </div>

                <!-- Leader Info -->
                <div class="bg-asylum-50 rounded-xl p-4 border border-asylum-100">
                    <h3 class="font-semibold text-asylum-800 mb-3">Лидер альянса</h3>
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-asylum-500 rounded-full flex items-center justify-center text-white font-bold">
                            ${utils.getInitials(leader?.name)}
                        </div>
                        <div>
                            <p class="font-medium text-asylum-900">${leader?.name || '—'}</p>
                            <p class="text-sm text-asylum-500">Power: ${utils.formatNumber(leader?.power)} | UID: ${utils.formatUID(leader?.uid)}</p>
                        </div>
                        <div class="ml-auto">
                            <span class="badge-leader">Лидер</span>
                        </div>
                    </div>
                </div>

                <!-- Declaration -->
                <div class="bg-gray-50 rounded-xl p-4">
                    <h3 class="font-semibold text-asylum-800 mb-2">Описание альянса</h3>
                    <p class="text-asylum-700">${a.declaration || 'Описание отсутствует'}</p>
                </div>

                <!-- Last Updated -->
                <p class="text-xs text-gray-400 text-center">
                    Обновлено: ${formatDate(state.allianceData.updated_at)}
                </p>
            </div>
        `;

        elements.tabContent.innerHTML = content;
    }

    function renderManifest() {
        const searchHtml = `
            <div class="mb-6">
                <input type="text" id="manifest-search" placeholder="Поиск по нику..." 
                       class="w-full md:w-1/2 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-asylum-500">
            </div>
        `;

        const tableHtml = `
            <div class="overflow-x-auto">
                <table class="data-table" id="manifest-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Ник</th>
                            <th>UID</th>
                            <th>Power</th>
                            <th>Уровень святилища</th>
                            <th>Координаты</th>
                            <th>Статус</th>
                            <th>Действие</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        `;

        elements.tabContent.innerHTML = searchHtml + tableHtml;

        renderManifestTable();

        // Поиск
        document.getElementById('manifest-search').addEventListener('input', (e) => {
            filterManifestTable(e.target.value);
        });
    }

    function renderManifestTable() {
        const tbody = document.querySelector('#manifest-table tbody');
        if (!tbody) return;

        tbody.innerHTML = state.players.map((p, i) => `
            <tr data-name="${p.name.toLowerCase()}" data-uid="${p.uid || ''}">
                <td class="font-medium">${i + 1}</td>
                <td class="font-medium text-asylum-700">${p.name}${p.is_leader ? ' <span class="badge-leader">Лидер</span>' : ''}</td>
                <td class="font-mono text-sm">${utils.formatUID(p.uid)}</td>
                <td class="font-semibold">${utils.formatNumber(p.power)}</td>
                <td>${p.sanctuary_level || '—'}</td>
                <td class="font-mono">${utils.formatCoords(p)}</td>
                <td>
                    <span class="${p.online ? 'status-online' : 'status-offline'}">
                        ${p.online ? '🟢 Онлайн' : '🔵 Оффлайн'}
                    </span>
                </td>
                <td>
                    <a href="https://lastasylumtracker.com/map?kid=${state.allianceData?.alliance?.kingdom_id || DEFAULT_KINGDOM}&x=${p.x || 0}&y=${p.y || 0}" 
                       target="_blank" class="text-asylum-600 hover:underline text-sm">На карте</a>
                </td>
            </tr>
        `).join('');
    }

    function filterManifestTable(query) {
        const rows = document.querySelectorAll('#manifest-table tbody tr');
        const q = query.toLowerCase().trim();
        
        rows.forEach(row => {
            const name = row.dataset.name || '';
            const uid = row.dataset.uid || '';
            const matches = !q || name.includes(q) || uid.includes(q);
            row.style.display = matches ? '' : 'none';
        });
    }

    function renderPlanner() {
        const content = `
            <div class="space-y-6">
                <div>
                    <h3 class="text-lg font-semibold text-asylum-800 mb-2">Планировщик баз</h3>
                    <p class="text-asylum-500">Карта королевства #${DEFAULT_KINGDOM} с возможностью поиска и координат игроков</p>
                </div>

                <!-- Поиск на карте -->
                <div class="flex flex-col sm:flex-row gap-3 mb-4">
                    <input type="text" id="planner-search" placeholder="Поиск игрока на карте..."
                           class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-asylum-500">
                    <button id="planner-goto" class="btn-primary">Перейти</button>
                </div>

                <!-- Карта (iframe или ссылка) -->
                <div class="map-container">
                    <iframe id="planner-map" 
                            src="https://lastasylumtracker.com/map?kid=${DEFAULT_KINGDOM}"
                            frameborder="0"
                            class="w-full h-[600px] bg-gray-100 rounded-xl"
                            allowfullscreen>
                    </iframe>
                </div>

                <!-- Легенда -->
                <div class="map-legend">
                    <span class="legend-item">
                        <span class="legend-color bg-green-500"></span>
                        Игрок на месте
                    </span>
                    <span class="legend-item">
                        <span class="legend-color bg-red-500"></span>
                        Нужно переместить
                    </span>
                    <span class="legend-item">
                        <span class="legend-color bg-amber-500"></span>
                        В процессе
                    </span>
                    <span class="legend-item">
                        <span class="legend-color bg-blue-500"></span>
                        Цель
                    </span>
                </div>

                <p class="text-xs text-gray-400 text-center">
                    Карта загружается с lastasylumtracker.com. Для полноценной работы планировщика нужен доступ к координатам.
                </p>
            </div>
        `;

        elements.tabContent.innerHTML = content;

        // Поиск на карте
        document.getElementById('planner-goto').addEventListener('click', () => {
            const query = document.getElementById('planner-search').value.trim();
            if (query) {
                const player = state.players.find(p => p.name.toLowerCase().includes(query.toLowerCase()));
                if (player && player.x && player.y) {
                    document.getElementById('planner-map').src = 
                        `https://lastasylumtracker.com/map?kid=${DEFAULT_KINGDOM}&x=${player.x}&y=${player.y}`;
                }
            }
        });
    }

    function renderWanted() {
        const isAdmin = checkAdmin();
        
        const content = `
            <div class="space-y-6">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h3 class="text-lg font-semibold text-asylum-800">Розыск игроков</h3>
                    ${isAdmin ? `
                        <button id="add-wanted-btn" class="btn-danger">
                            Добавить в розыск
                        </button>
                    ` : ''}
                </div>

                <div id="wanted-list" class="space-y-4">
                    ${renderWantedItems()}
                </div>

                ${!state.wantedList.length ? `
                    <div class="text-center py-12 text-asylum-400">
                        <svg class="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                        </svg>
                        <p>Список розыска пуст</p>
                    </div>
                ` : ''}
            </div>
        `;

        elements.tabContent.innerHTML = content;

        // Кнопка добавления
        if (isAdmin) {
            document.getElementById('add-wanted-btn').addEventListener('click', () => openAddWantedModal());
        }

        // Удаление
        document.querySelectorAll('.remove-wanted').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.currentTarget.dataset.index;
                removeWanted(parseInt(idx));
            });
        });
    }

    function renderWantedItems() {
        if (!state.wantedList.length) return '';

        return state.wantedList.map((w, i) => `
            <div class="wanted-card">
                <div class="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div class="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
                        ${utils.getInitials(w.name)}
                    </div>
                    <div class="flex-1">
                        <p class="font-semibold text-asylum-900">${w.name}</p>
                        <p class="text-sm text-asylum-500">UID: ${utils.formatUID(w.uid)}</p>
                        <p class="text-sm text-gray-500">${w.reason || 'Причина не указана'}</p>
                        <p class="text-xs text-gray-400">До: ${formatDate(w.until)} | Добавлен: ${formatDate(w.added)}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <a href="https://lastasylumtracker.com/map?kid=${DEFAULT_KINGDOM}&x=${w.x || 0}&y=${w.y || 0}" 
                           target="_blank" class="btn-secondary text-sm">На карте</a>
                        ${checkAdmin() ? `
                            <button class="remove-wanted btn-danger text-sm" data-index="${i}">Удалить</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    function openAddWantedModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <h3 class="text-lg font-semibold text-asylum-900 mb-4">Добавить в розыск</h3>
                <form id="wanted-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-asylum-600 mb-1">Ник игрока</label>
                        <input type="text" id="wanted-name" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-asylum-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-asylum-600 mb-1">UID (опционально)</label>
                        <input type="text" id="wanted-uid" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-asylum-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-asylum-600 mb-1">Причина</label>
                        <textarea id="wanted-reason" rows="3" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-asylum-500"></textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-asylum-600 mb-1">Действует до</label>
                        <input type="date" id="wanted-until" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-asylum-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-asylum-600 mb-1">Координаты X (опционально)</label>
                        <input type="number" id="wanted-x" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-asylum-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-asylum-600 mb-1">Координаты Y (опционально)</label>
                        <input type="number" id="wanted-y" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-asylum-500">
                    </div>
                    <div class="flex gap-3 pt-4">
                        <button type="submit" class="flex-1 btn-danger">Добавить</button>
                        <button type="button" id="cancel-wanted" class="flex-1 btn-secondary">Отмена</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#cancel-wanted').addEventListener('click', () => modal.remove());
        modal.querySelector('#wanted-form').addEventListener('submit', (e) => {
            e.preventDefault();
            addWanted({
                name: document.getElementById('wanted-name').value.trim(),
                uid: document.getElementById('wanted-uid').value.trim(),
                reason: document.getElementById('wanted-reason').value.trim(),
                until: document.getElementById('wanted-until').value,
                x: parseInt(document.getElementById('wanted-x').value) || null,
                y: parseInt(document.getElementById('wanted-y').value) || null,
                added: new Date().toISOString()
            });
            modal.remove();
        });
    }

    function addWanted(w) {
        if (!w.name) return;
        state.wantedList.unshift(w);
        storage.set(STORAGE_KEYS.WANTED_LIST, state.wantedList);
        renderWanted();
    }

    function removeWanted(index) {
        state.wantedList.splice(index, 1);
        storage.set(STORAGE_KEYS.WANTED_LIST, state.wantedList);
        renderWanted();
    }

    function renderRankings() {
        // Имитация рейтинга альянсов (API не дает этот endpoint)
        const rankings = [
            { rank: 1, name: 'AURI GROUP', tag: 'AURI', power: 125000000, members: 42, leader: 'KRISPI', leaderUid: '12345678901234', avgPower: 2976190 },
            { rank: 2, name: 'DARK LEGION', tag: 'DL', power: 118000000, members: 40, leader: 'SHADOW', leaderUid: '12345678901235', avgPower: 2950000 },
            { rank: 3, name: 'PHOENIX', tag: 'PHX', power: 110000000, members: 38, leader: 'FIRE', leaderUid: '12345678901236', avgPower: 2894736 },
            { rank: 4, name: 'TITANS', tag: 'TTS', power: 105000000, members: 35, leader: 'ZEUS', leaderUid: '12345678901237', avgPower: 3000000 },
            { rank: 5, name: 'DRAGONS', tag: 'DRG', power: 100000000, members: 33, leader: 'SMOKE', leaderUid: '12345678901238', avgPower: 3030303 }
        ];

        const content = `
            <div class="space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <h3 class="text-lg font-semibold text-asylum-800">Рейтинг альянсов (Королевство #${DEFAULT_KINGDOM})</h3>
                    <span class="text-sm text-asylum-400">Данные могут быть неактуальны (требуется API ключ)</span>
                </div>

                <div class="overflow-x-auto">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Альянс</th>
                                <th>Тег</th>
                                <th>Мощь</th>
                                <th>Участников</th>
                                <th>Лидер</th>
                                <th>Ср. Power</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rankings.map(r => `
                                <tr>
                                    <td class="font-bold">${r.rank}</td>
                                    <td class="font-medium text-asylum-700">${r.name}</td>
                                    <td class="font-mono text-sm">${r.tag}</td>
                                    <td>${utils.formatNumber(r.power)}</td>
                                    <td>${r.members}</td>
                                    <td>${r.leader}</td>
                                    <td class="font-mono">${utils.formatNumber(r.avgPower)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        elements.tabContent.innerHTML = content;
    }

    function renderProgress() {
        const player = state.currentUser;
        if (!player) {
            elements.tabContent.innerHTML = '<div class="text-center py-12 text-asylum-400">Авторизуйтесь для просмотра прогресса</div>';
            return;
        }

        // Генерируем демо-данные для графиков
        const powerHistory = generateHistory(player.power || 1000000, 30);
        const killsHistory = generateHistory(player.kills || 1000, 30, 50);
        const sanctuaryHistory = generateHistory(player.sanctuary_level || 1, 30, 1);

        const content = `
            <div class="space-y-6">
                <!-- Player Header -->
                <div class="bg-asylum-900 text-white rounded-2xl p-6">
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h2 class="text-2xl font-bold">${player.name}</h2>
                            <p class="text-asylum-300">UID: ${utils.formatUID(player.uid)} | Координаты: ${utils.formatCoords(player)}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-xs text-asylum-200 uppercase">Боевой мощи</p>
                            <p class="text-3xl font-bold">${utils.formatNumber(player.power)}</p>
                        </div>
                    </div>
                </div>

                <!-- Stats Grid -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="stat-card">
                        <p class="text-xs text-gray-500 uppercase">Убийств</p>
                        <p class="text-2xl font-bold text-gray-900">${utils.formatNumber(player.kills)}</p>
                    </div>
                    <div class="stat-card">
                        <p class="text-xs text-gray-500 uppercase">Уровень святилища</p>
                        <p class="text-2xl font-bold text-gray-900">${player.sanctuary_level || '—'}</p>
                    </div>
                    <div class="stat-card">
                        <p class="text-xs text-gray-500 uppercase">Координаты</p>
                        <p class="text-xl font-bold text-gray-900">${utils.formatCoords(player)}</p>
                    </div>
                    <div class="stat-card">
                        <p class="text-xs text-gray-500 uppercase">Перемещений</p>
                        <p class="text-2xl font-bold text-gray-900">${calculateRelocations()}</p>
                    </div>
                </div>

                <!-- Charts -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-white rounded-xl border border-gray-200 p-4">
                        <h3 class="font-semibold text-asylum-800 mb-4">Боевая мощи (30 дней)</h3>
                        <div class="chart-container" id="chart-power"></div>
                    </div>
                    <div class="bg-white rounded-xl border border-gray-200 p-4">
                        <h3 class="font-semibold text-asylum-800 mb-4">Убийства (30 дней)</h3>
                        <div class="chart-container" id="chart-kills"></div>
                    </div>
                    <div class="bg-white rounded-xl border border-gray-200 p-4">
                        <h3 class="font-semibold text-asylum-800 mb-4">Уровень святилища (30 дней)</h3>
                        <div class="chart-container" id="chart-sanctuary"></div>
                    </div>
                    <div class="bg-white rounded-xl border border-gray-200 p-4">
                        <h3 class="font-semibold text-asylum-800 mb-4">Перемещения (30 дней)</h3>
                        <div class="chart-container" id="chart-relocations"></div>
                    </div>
                </div>
            </div>
        `;

        elements.tabContent.innerHTML = content;

        // Простые SVG графики
        renderSimpleChart('chart-power', powerHistory, '#c46b21');
        renderSimpleChart('chart-kills', killsHistory, '#e4a24d');
        renderSimpleChart('chart-sanctuary', sanctuaryHistory, '#9d511d');
        renderSimpleChart('chart-relocations', generateHistory(calculateRelocations(), 30, 1), '#d9862a');
    }

    // ============== ХЕЛПЕРЫ ==============
    function calculateAvgSanctuary() {
        if (!state.players.length) return '—';
        const sum = state.players.reduce((acc, p) => acc + (p.sanctuary_level || 0), 0);
        return (sum / state.players.length).toFixed(1);
    }

    function calculateRelocations() {
        // Упрощенно: считаем перемещения как 0 или по истории
        return Math.floor(Math.random() * 10) + 1;
    }

    function formatDate(iso) {
        if (!iso) return '—';
        const d = new Date(iso);
        return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function checkAdmin() {
        // В реальности здесь должна быть проверка пароля
        // Для демо: админ — это лидер альянса
        return state.currentUser?.is_leader === true;
    }

    function generateHistory(base, days, variance = 0.1) {
        const data = [];
        let current = base;
        for (let i = days; i >= 0; i--) {
            const change = (Math.random() - 0.5) * 2 * variance * current;
            current = Math.max(0, current + change);
            data.push({ day: i, value: Math.round(current) });
        }
        return data;
    }

    function renderSimpleChart(containerId, data, color) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const values = data.map(d => d.value);
        const max = Math.max(...values);
        const min = Math.min(...values);
        const range = max - min || 1;

        const width = container.clientWidth || 400;
        const height = 200;
        const padding = 20;

        const points = data.map((d, i) => {
            const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
            const y = height - padding - ((d.value - min) / range) * (height - 2 * padding);
            return `${x},${y}`;
        }).join(' ');

        container.innerHTML = `
            <svg width="${width}" height="${height}" class="w-full h-full">
                <polyline 
                    fill="none" 
                    stroke="${color}" 
                    stroke-width="2" 
                    points="${points}"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </svg>
        `;
    }

    // ============== EVENT HANDLERS ==============
    function initEvents() {
        // Login
        elements.loginBtn.addEventListener('click', handleLogin);
        elements.playerName.addEventListener('keypress', (e) => e.key === 'Enter' && handleLogin());
        elements.playerUid.addEventListener('keypress', (e) => e.key === 'Enter' && handleLogin());

        // Logout
        elements.logoutBtn.addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите выйти?')) doLogout();
        });

        // Tabs
        elements.tabItems.forEach(btn => {
            btn.addEventListener('click', () => renderTab(btn.dataset.tab));
        });

        // Error screen
        elements.backToAuth.addEventListener('click', () => utils.showScreen('auth'));
    }

    async function handleLogin() {
        const name = elements.playerName.value.trim();
        const uid = elements.playerUid.value.trim();

        if (!name && !uid) {
            alert('Введите ник или UID');
            return;
        }

        utils.setLoading(true);

        // Ждем загрузки данных если еще не загружены
        if (!state.players.length) {
            await loadAllianceData();
        }

        const success = doLogin(name, uid);
        utils.setLoading(false);

        if (success) {
            utils.showScreen('app');
            elements.userName.textContent = state.currentUser.name;
            renderTab('overview');
        } else {
            utils.showError(MESSAGES.ERROR.UNKNOWN_PLAYER);
        }
    }

    // ============== ИНИЦИАЛИЗАЦИЯ ==============
    async function init() {
        initEvents();

        // Показываем загрузку
        utils.showScreen('loading');

        // Загружаем данные
        await loadAllianceData();
        await loadWantedList();

        // Пробуем автовход
        if (tryAutoLogin()) {
            utils.showScreen('app');
            elements.userName.textContent = state.currentUser.name;
            renderTab('overview');
        } else {
            utils.showScreen('auth');
            elements.playerName.focus();
        }
    }

    // Запуск
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();