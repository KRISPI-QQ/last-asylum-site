// === Last Asylum Tracker — Поиск игрока ===

const API_KEY = "lap_m4U38DE12SrZZ4Sr9uF5b4ynkTzLCwdwNVrsP102TPk"; // API-ключ от трекера
const BASE_URL = "https://api.lastasylumtracker.com";

const searchBtn = document.getElementById("search-btn");
const playerSearch = document.getElementById("player-search");
const loadingSection = document.getElementById("loading-section");
const errorSection = document.getElementById("error-section");
const playerSection = document.getElementById("player-section");
const emptySection = document.getElementById("empty-section");
const playerName = document.getElementById("player-name");
const playerUID = document.getElementById("player-uid");
const playerKingdom = document.getElementById("player-kingdom");
const powerValue = document.getElementById("power-value");
const statKills = document.getElementById("stat-kills");
const statSanctuary = document.getElementById("stat-sanctuary");
const statVip = document.getElementById("stat-vip");
const statCoords = document.getElementById("stat-coords");
const allianceName = document.getElementById("alliance-name");
const allianceTag = document.getElementById("alliance-tag");
const allianceLevel = document.getElementById("alliance-level");
const allianceMembers = document.getElementById("alliance-members");
const mapLink = document.getElementById("map-link");
const lastUpdated = document.getElementById("last-updated");
const errorTitle = document.getElementById("error-title");
const errorMessage = document.getElementById("error-message");

// Форматирование UID для отображения
function formatUID(uid) {
    if (!uid) return "—";
    return uid;
}

// Форматирование координат
function formatCoords(coords) {
    if (!coords) return "—";
    return `${coords.x}, ${coords.y}`;
}

// Форматирование уровня
function formatLevel(lvl) {
    if (!lvl) return "—";
    return String(lvl);
}

// Обновление времени последнего обновления
function updateLastUpdated() {
    const now = new Date();
    lastUpdated.textContent = now.toLocaleTimeString('ru-RU', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}

// Ключевая функция: получение данных игрока
async function fetchPlayerData(nick) {
    try {
        updateLastUpdated();
        loadingSection.classList.remove("hidden");
        errorSection.classList.add("hidden");
        playerSection.classList.add("hidden");
        emptySection.classList.add("hidden");

        // Используем эндпоинт с ником - API сам найдет правильный сервер
        const response = await fetch(
            `${BASE_URL}/v1/players/name/${encodeURIComponent(nick)}`,
            {
                headers: {
                    "Authorization": `Bearer ${API_KEY}`,
                    "X-API-Key": API_KEY,
                    "User-Agent": "LastAsylumTrackerSite/1.0"
                }
            }
        );

        if (response.status === 404) {
            showError("Игрок не найден", `Ник "${nick}" не найден в базе данных трекера`);
            return;
        }

        if (response.status === 401) {
            showError("Ошибка авторизации", "API-ключ неверен или устарел. Сгенерируйте новый на lastasylumtracker.com");
            return;
        }

        if (response.status === 429) {
            showError("Превышен лимит запросов", "Вы превысили дневной лимит (1000 запросов). Подождите до смены дня или обновите Patreon");
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        // Проверяем, что данные получены (cached может быть true, это нормально)
        if (!data.nick) {
            showError("Данные не получены", "Профиль найден, но данные пусты. Попробуйте позже");
            return;
        }

        // Обновляем интерфейс
        renderPlayerData(data);
        
        // Показываем карту
        showPlayerSection();

    } catch (error) {
        console.error("Ошибка запроса:", error);
        showError("Сеть или сервер", "Не удалось связаться с API. Проверьте интернет и ключ.");
    }
}

// Рендеринг данных игрока
function renderPlayerData(data) {
    const nickname = data.nick || "—";
    const uid = formatUID(data.uid);
    const kingdom = data.kingdom || "—";
    const power = formatNumber(data.power);
    const kills = formatNumber(data.kills);
    const sanctuary = formatLevel(data.sanctuary?.level);
    const vip = data.vip !== undefined ? (data.vip ? "Да" : "Нет") : "—";
    const coords = formatCoords(data);
    const onlineStatus = data.online === true ? "🟢 Онлайн" : "🔵 Оффлайн";
    
    // Alliance info
    const alliance = data.alliance || {};
    const allianceNameVal = alliance.name || "—";
    const allianceTagVal = alliance.tag || "—";
    const allianceLevelVal = formatLevel(alliance.level);
    const allianceMembersVal = alliance.members || "—";

    // Update DOM
    playerName.textContent = nickname;
    playerUID.textContent = `UID: ${uid}`;
    playerKingdom.textContent = `Королевство: ${kingdom}`;
    powerValue.textContent = power;
    statKills.textContent = kills;
    statSanctuary.textContent = sanctuary;
    statVip.textContent = vip;
    statCoords.textContent = coords;
    
    allianceName.textContent = allianceNameVal;
    allianceTag.textContent = `#${allianceTagVal}`;
    allianceLevel.textContent = allianceLevelVal;
    allianceMembers.textContent = allianceMembersVal;

    // Map link
    mapLink.href = `https://lastasylumtracker.com/map?kid=${kingdom === "—" ? 388 : kingdom}`;

    // Показываем секцию
    playerSection.classList.remove("hidden");
    emptySection.classList.add("hidden");
}

// Форматирование чисел
function formatNumber(num) {
    if (num === undefined || num === null) return "—";
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + "K";
    }
    return String(num);
}

// Показать секцию ошибки
function showError(title, message) {
    errorTitle.textContent = title;
    errorMessage.textContent = message;
    loadingSection.classList.add("hidden");
    errorSection.classList.remove("hidden");
    playerSection.classList.add("hidden");
    emptySection.classList.add("hidden");
}

// Показать секцию игрока
function showPlayerSection() {
    loadingSection.classList.add("hidden");
    errorSection.classList.add("hidden");
    playerSection.classList.remove("hidden");
    emptySection.classList.add("hidden");
}

// Обработчик кнопки поиска
searchBtn.addEventListener("click", () => {
    const nick = playerSearch.value.trim();
    if (nick) {
        fetchPlayerData(nick);
    }
});

// Поиск по Enter
playerSearch.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        searchBtn.click();
    }
});

// Фокус на поле ввода при загрузке
playerSearch.focus();

// Инициализация приветствия
updateLastUpdated();
</script>