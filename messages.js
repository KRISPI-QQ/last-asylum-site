// === Сообщения для сайта Last Asylum Tracker ===

export const MESSAGES = {
  // Сообщения об ошибках
  ERROR: {
    UNKNOWN_PLAYER: "Похоже я тебя не знаю. Проверь правильно ли ты указал свой Name или UID.",
    NOT_FOUND: "Игрок не найден",
    NO_ALLIANCE: "Альянс не найден",
    SERVER_ERROR: "Ошибка сервера. Попробуйте позже",
    NETWORK_ERROR: "Ошибка сети. Проверьте соединение",
    INVALID_CREDENTIALS: "Неверный ник или UID",
    NO_DATA: "Нет данных для отображения",
    ACCESS_DENIED: "Доступ запрещён",
    TIMEOUT: "Превышено время ожидания"
  },
  
  // Сообщения успеха
  SUCCESS: {
    LOGIN_OK: "Добро пожаловать!",
    DATA_LOADED: "Данные загружены",
    SEARCH_FOUND: "Игрок найден",
    SEARCH_NOT_FOUND: "Игрок не найден в альянсе"
  },
  
  // UI тексты
  UI: {
    TITLE: "Last Asylum Tracker",
    SUBTITLE: "Поиск игроков альянса Святилище #388",
    SEARCH_PLACEHOLDER: "Введите ник игрока или UID...",
    SEARCH_BUTTON: "Найти",
    AUTHORIZE: "Авторизация",
    DASHBOARD: "Личный кабинет",
    VIEW_ALLIANCE: "Обзор",
    MANIFEST: "Состав",
    PLANNER: "Планировщик",
    WANTED: "Розыск",
    RANKINGS: "Рейтинги",
    PROGRESS: "Прогресс",
    SETTINGS: "Настройки",
    LOGOUT: "Выйти",
    LOGOUT_CONFIRM: "Вы уверены, что хотите выйти?",
    YES: "Да",
    NO: "Нет",
    BACK: "Назад",
    DELETE: "Удалить",
    ADD_WANTED: "Добавить в розыск",
    REMOVE_WANTED: "Удалить из розыска"
  }
};

export default MESSAGES;