import React, { useMemo, useState, useEffect, useCallback } from "react";
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';


// ====================================================================================
// --- بخش توابع منطقی تقویم (هسته الگوریتم) ---
// این توابع مسئولیت تبدیل تاریخ بین سیستم‌های میلادی و جلالی را بر عهده دارند.
// ====================================================================================

/** تابع کمکی برای تقسیم صحیح */
function div(a, b) { return ~~(a / b); }
/** تابع کمکی برای عملیات باقیمانده (مودولو) */
function mod(a, b) { return a - ~~(a / b) * b; }

/**
 * برای یک سال جلالی معین، سال میلادی و نقطه شروع ماه مارس در روزهای ژولین را محاسبه می‌کند.
 * این تابع برای مدیریت سال‌های کبیسه در تقویم جلالی حیاتی است.
 * @param {number} jy - سال جلالی.
 * @returns {{leap: number, gy: number, march: number}} - اطلاعات سال کبیسه، سال میلادی و آفست ماه مارس.
 */
function jalCal(jy) {
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  let bl = breaks.length, gy = jy + 621, leapJ = -14, jp = breaks[0], jm, jump = 0;
  for (let i = 1; i < bl; i++) {
    jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ++;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  return { leap: mod(n + 1, 33) - 1, gy, march };
}

/**
 * یک تاریخ میلادی را به شماره روز ژولین (JDN) تبدیل می‌کند.
 * @param {number} gy - سال میلادی.
 * @param {number} gm - ماه میلادی.
 * @param {number} gd - روز میلادی.
 * @returns {number} - شماره روز ژولین.
 */
function g2d(gy, gm, gd) {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

/**
 * یک شماره روز ژولین (JDN) را به تاریخ میلادی تبدیل می‌کند.
 * @param {number} jdn - شماره روز ژولین.
 * @returns {{gy: number, gm: number, gd: number}} - آبجکت تاریخ میلادی.
 */
function d2g(jdn) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

/**
 * یک تاریخ جلالی را به شماره روز ژولین (JDN) تبدیل می‌کند.
 * @param {number} jy - سال جلالی.
 * @param {number} jm - ماه جلالی.
 * @param {number} jd - روز جلالی.
 * @returns {number} - شماره روز ژولین.
 */
function j2d(jy, jm, jd) {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

/**
 * یک شماره روز ژولین (JDN) را به تاریخ جلالی تبدیل می‌کند.
 * @param {number} jdn - شماره روز ژولین.
 * @returns {{jy: number, jm: number, jd: number}} - آبجکت تاریخ جلالی.
 */
function d2j(jdn) {
  const g = d2g(jdn);
  let jy = g.gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(g.gy, 3, r.march);
  let k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) { return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 }; }
    else { k -= 186; }
  } else {
    jy--;
    const r2 = jalCal(jy);
    k = jdn - g2d(g.gy - 1, 3, r2.march);
  }
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

/** تابع پوششی برای تبدیل میلادی به جلالی. */
function toJalali(gy, gm, gd) { return d2j(g2d(gy, gm, gd)); }
/** تابع پوششی برای تبدیل جلالی به میلادی. */
function toGregorian(jy, jm, jd) { return d2g(j2d(jy, jm, jd)); }

/**
 * تعداد روزهای یک ماه خاص جلالی را برمی‌گرداند.
 * @param {number} jy - سال جلالی.
 * @param {number} jm - ماه جلالی.
 * @returns {number} - تعداد روزهای ماه.
 */
function jalaliMonthLength(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  const { leap } = jalCal(jy);
  return leap === -1 ? 30 : 29;
}

// ====================================================================================
// --- ثابت‌ها و کامپوننت‌های کمکی ---
// ====================================================================================
const faWeekdays = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
const faWeekdaysFull = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه"];
const faMonths = [ "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند" ];

/** یک عدد را در صورت تک‌رقمی بودن با صفر پیشوندی پد می‌کند. */
function pad2(n) { return n.toString().padStart(2, "0"); }
/** ارقام انگلیسی در یک رشته را به معادل فارسی آن‌ها تبدیل می‌کند. */
function toFaDigits(str) { return String(str).replace(/[0-9]/g, d => "۰۱۲۳۴۵۶۷۸۹"[parseInt(d, 10)]); }

/**
 * کامپوننتی برای نمایش آیکون آب‌وهوا بر اساس کد دریافت شده از API.
 */
function WeatherIcon({ code, className }) {
    const iconMap = {
      '113':<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 6.106a.75.75 0 0 1 0 1.06l-1.591 1.592a.75.75 0 0 1-1.06-1.061l1.591-1.592a.75.75 0 0 1 1.06 0ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM17.803 17.803a.75.75 0 0 1-1.06 0l-1.592-1.591a.75.75 0 0 1 1.06-1.06l1.592 1.591a.75.75 0 0 1 0 1.06ZM12 18a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V18.75a.75.75 0 0 1 .75-.75ZM5.636 17.803a.75.75 0 0 1 0-1.06l1.591-1.592a.75.75 0 0 1 1.06 1.06l-1.591 1.592a.75.75 0 0 1-1.06 0ZM3 12a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12ZM6.106 5.636a.75.75 0 0 1 1.06 0l1.592 1.591a.75.75 0 0 1-1.06 1.06L6.106 6.7a.75.75 0 0 1 0-1.06Z" /></svg>,
      '116':<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M11.992 1.99a.75.75 0 0 1 .744.832l-.001.07L12.5 5.25a.75.75 0 0 1-1.5-.062L11.25 2.8a.75.75 0 0 1 .742-.74Z" /><path fillRule="evenodd" d="M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9ZM8.25 12a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0Z" clipRule="evenodd" /><path d="M8.163 4.869a.75.75 0 0 1 1.058-.081l1.592 1.592a.75.75 0 0 1-1.058 1.06l-1.592-1.592a.75.75 0 0 1 .001-1.06Zm-3.35 1.528a.75.75 0 0 1 .08 1.058l-1.59 1.592a.75.75 0 0 1-1.06-1.058l1.59-1.592a.75.75 0 0 1 .98-.08Zm12.338.081a.75.75 0 0 1 1.058 1.06l-1.592 1.592a.75.75 0 0 1-1.06-1.06l1.592-1.592a.75.75 0 0 1 .002 0ZM18.75 12a.75.75 0 0 1 .75.75v.255a.75.75 0 0 1-1.5 0V12.75a.75.75 0 0 1 .75-.75Z" /></svg>,
      '119':<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M6.75 1.5a5.25 5.25 0 0 0-4.442 7.218 6.013 6.013 0 0 0-1.53 3.948 6.002 6.002 0 0 0 6.033 5.968h7.158a5.25 5.25 0 0 0 5.06-4.043 4.5 4.5 0 0 0-1.87-5.464 5.25 5.25 0 0 0-9.218-4.631A5.234 5.234 0 0 0 6.75 1.5ZM3.023 12.75a4.502 4.502 0 0 1 4.51-4.498h.001a4.502 4.502 0 0 1 4.498 4.512l-.002.247a.75.75 0 0 0 .75.75h7.158a3.75 3.75 0 0 1-3.659 3.513l-.119-.001H7.533a4.502 4.502 0 0 1-4.51-4.498Z" clipRule="evenodd" /></svg>,
      '266':<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M10.5 1.512a1.5 1.5 0 0 0-3 0V2.85a1.5 1.5 0 0 0 3 0V1.512Zm3.486 3.486a1.5 1.5 0 0 0-2.122-2.122l-1.06 1.06a1.5 1.5 0 0 0 2.122 2.122l1.06-1.06ZM1.512 10.5a1.5 1.5 0 0 0 0 3H2.85a1.5 1.5 0 0 0 0-3H1.512ZM19.5 12a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Zm-10.036 9.536a1.5 1.5 0 0 0 2.122-2.122l-1.06-1.06a1.5 1.5 0 0 0-2.122 2.122l1.06 1.06ZM22.488 10.5a1.5 1.5 0 0 0 0 3h1.338a1.5 1.5 0 0 0 0-3h-1.338Zm-4.022 9.022a1.5 1.5 0 0 0 2.122 2.122l1.06-1.06a1.5 1.5 0 0 0-2.122-2.122l-1.06 1.06ZM12 19.5a1.5 1.5 0 0 0-1.5 1.5v1.338a1.5 1.5 0 0 0 3 0V21a1.5 1.5 0 0 0-1.5-1.5Z" /></svg>,
      '302':<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" /></svg>,
      '338':<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M10.5 1.512a1.5 1.5 0 0 0-3 0V2.85a1.5 1.5 0 0 0 3 0V1.512Zm3.486 3.486a1.5 1.5 0 0 0-2.122-2.122l-1.06 1.06a1.5 1.5 0 0 0 2.122 2.122l1.06-1.06ZM1.512 10.5a1.5 1.5 0 0 0 0 3H2.85a1.5 1.5 0 0 0 0-3H1.512ZM19.5 12a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Zm-10.036 9.536a1.5 1.5 0 0 0 2.122-2.122l-1.06-1.06a1.5 1.5 0 0 0-2.122 2.122l1.06 1.06ZM22.488 10.5a1.5 1.5 0 0 0 0 3h1.338a1.5 1.5 0 0 0 0-3h-1.338Zm-4.022 9.022a1.5 1.5 0 0 0 2.122 2.122l1.06-1.06a1.5 1.5 0 0 0-2.122-2.122l-1.06 1.06ZM12 19.5a1.5 1.5 0 0 0-1.5 1.5v1.338a1.5 1.5 0 0 0 3 0V21a1.5 1.5 0 0 0-1.5-1.5Z" /></svg>,
    };
    // آیکون پیش‌فرض در صورت یافت نشدن کد
    return iconMap[code] || <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>;
}

const defaultSettings = {
    showNotifications: true,
    showSeconds: false,
    lightBg: false,
    glassTheme: false,
    font: 'system',
    textScale: 0,
    hour24: false,
    minimalMode: false,
    animationsEnabled: true,
    showWeekday: true,
    weatherCity: 'Tehran',
    dnd: false,
};

// ====================================================================================
// --- تعریف کامپوننت اصلی ---
// ====================================================================================
export default function ShamsiCalendarWidget() {
  
  // --- FIX START ---
// State for current time, updated every second to keep the widget live.
const [currentTime, setCurrentTime] = useState(new Date());

useEffect(() => {
    const timer = setInterval(() => {
    setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
}, []);

// All time-related variables are now derived from the `currentTime` state.
const now = currentTime;
// این بخش هنوز هر ثانیه اجرا می‌شود و بهینه نیست.
const todayJ = useMemo(() => toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate()), [now.getDate()]); // فقط وقتی روز عوض شد، دوباره محاسبه کن

const iranTime = useMemo(() => {
    const local = now;
    const utc = local.getTime() + local.getTimezoneOffset() * 60000;
    return new Date(utc + (3.5 * 60 * 60000));
}, [now]); // این هم هر ثانیه اجرا می‌شود
// --- FIX END ---
  
  const [settings, setSettings] = useState(defaultSettings);
  const [viewJ, setViewJ] = useState({ jy: todayJ.jy, jm: todayJ.jm });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [weather, setWeather] = useState({ loading: true, data: null, error: null });
  const [cityInput, setCityInput] = useState(settings.weatherCity);
  const [isEditingCity, setIsEditingCity] = useState(false);
  const [events, setEvents] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [eventText, setEventText] = useState('');
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsCleared, setNotificationsCleared] = useState(false);
  const [isWidgetVisible, setIsWidgetVisible] = useState(true);
  
  // State for desktop notifications
  const [notifPermission, setNotifPermission] = useState('default');
  const [desktopNotifsSent, setDesktopNotifsSent] = useState({});

  // Load settings and events from localStorage on initial render
  useEffect(() => {
    // Set permission state after hydration on client
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }
    try {
      const savedSettings = localStorage.getItem('shamsi-calendar-settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(s => ({...s, ...parsedSettings}));
        setCityInput(parsedSettings.weatherCity || 'Tehran');
      }
      const savedEvents = localStorage.getItem('shamsi-calendar-events');
      if (savedEvents) setEvents(JSON.parse(savedEvents));
    } catch (error) {
      console.error("Failed to load data from localStorage:", error);
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('shamsi-calendar-settings', JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }, [settings]);

  const saveEventsToStorage = useCallback((updatedEvents) => {
    setEvents(updatedEvents);
    localStorage.setItem('shamsi-calendar-events', JSON.stringify(updatedEvents));
  }, []);
 
  // Fetch weather data when city changes
  useEffect(() => {
    if (!settings.weatherCity) return;
    setWeather({ loading: true, data: null, error: null });
    fetch(`https://wttr.in/${settings.weatherCity}?format=j1`)
      .then(res => {
        if (!res.ok) throw new Error('City not found');
        return res.json();
      })
      .then(data => {
          setWeather({ loading: false, data, error: null });
          setIsEditingCity(false);
      })
      .catch(err => {
          setWeather({ loading: false, data: null, error: "شهر یافت نشد. (انگلیسی وارد کنید)" });
          setIsEditingCity(true);
      });
  }, [settings.weatherCity]);
 
  // Update notifications panel based on events and DND status
  useEffect(() => {
    if (settings.dnd || notificationsCleared) {
        if(notifications.length > 0) setNotifications([]);
        return;
    }
    const newNotifications = [];
    const todayStr = `${todayJ.jy}-${todayJ.jm}-${todayJ.jd}`;
    if (events[todayStr]) newNotifications.push({ title: 'امروز', text: events[todayStr]});
   
    // Use a deep comparison to avoid unnecessary re-renders
    if (JSON.stringify(newNotifications) !== JSON.stringify(notifications)) {
        setNotifications(newNotifications);
    }
  }, [events, todayJ, settings.dnd, notificationsCleared]);
  
  // Desktop Notifications Logic
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
        if (notifPermission === 'default' && settings.showNotifications) {
            Notification.requestPermission().then(setNotifPermission);
        }
    }
  }, [notifPermission, settings.showNotifications]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
        if (!settings.showNotifications || settings.dnd) return;

        const todayStr = `${todayJ.jy}-${todayJ.jm}-${todayJ.jd}`;
        const todaysEvent = events[todayStr];

        if (todaysEvent && notifPermission === 'granted' && !desktopNotifsSent[todayStr]) {
            try {
                new Notification('رویداد امروز', {
                    body: todaysEvent,
                    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📅</text></svg>'
                });
                setDesktopNotifsSent(prev => ({ ...prev, [todayStr]: true }));
            } catch(e) {
                console.error("Error creating notification:", e);
            }
        }
    }
  }, [events, todayJ, notifPermission, settings.showNotifications, settings.dnd, desktopNotifsSent]);


  // Reset notification cleared status on a new day
  useEffect(() => {
    setNotificationsCleared(false);
    setDesktopNotifsSent({}); // Reset sent notifications for the new day
  }, [todayJ.jd]);


  // --- UI Handlers ---
  const updateSetting = (key, value) => {
    setSettings(s => ({...s, [key]: value}));
  };

  const grid = useMemo(() => {
    const { gy, gm, gd } = toGregorian(viewJ.jy, viewJ.jm, 1);
    const dowG = new Date(gy, gm - 1, gd).getDay();
    const startIndex = (dowG + 1) % 7;
    const daysInMonth = jalaliMonthLength(viewJ.jy, viewJ.jm);
    const prevM = viewJ.jm === 1 ? 12 : viewJ.jm - 1;
    const prevY = viewJ.jm === 1 ? viewJ.jy - 1 : viewJ.jy;
    const daysInPrev = jalaliMonthLength(prevY, prevM);
   
    const cells = [];
    let dayCounter = 1;

    for (let i = 0; i < 42; i++) {
      let inMonth = false, d, jyC, jmC;
      if (i < startIndex) {
        d = daysInPrev - (startIndex - 1 - i);
        jyC = prevY; jmC = prevM;
      } else if (i < startIndex + daysInMonth) {
        d = dayCounter++; inMonth = true; jyC = viewJ.jy; jmC = viewJ.jm;
      } else {
        d = i - (startIndex + daysInMonth) + 1;
        jyC = viewJ.jm === 12 ? viewJ.jy + 1 : viewJ.jy;
        jmC = viewJ.jm === 12 ? 1 : viewJ.jm + 1;
      }
      const isToday = (jyC === todayJ.jy && jmC === todayJ.jm && d === todayJ.jd);
      const dateString = `${jyC}-${jmC}-${d}`;
      cells.push({ d, inMonth, jy: jyC, jm: jmC, jd: d, isToday, hasEvent: !!events[dateString] });
    }
    return { cells };
  }, [viewJ, events, todayJ]);

  const nextMonth = () => setViewJ(v => (v.jm === 12 ? { jy: v.jy + 1, jm: 1 } : { ...v, jm: v.jm + 1 }));
  const prevMonth = () => setViewJ(v => (v.jm === 1 ? { jy: v.jy - 1, jm: 12 } : { ...v, jm: v.jm - 1 }));

  const handleDayClick = (day) => {
    if (!day.inMonth) return;
    setSelectedDate(day);
    const dateString = `${day.jy}-${day.jm}-${day.jd}`;
    setEventText(events[dateString] || '');
    setIsEditingEvent(!events[dateString]);
  };
 
  const handleSaveEvent = () => {
    if (!selectedDate) return;
    const dateString = `${selectedDate.jy}-${selectedDate.jm}-${selectedDate.jd}`;
    const newEvents = { ...events };
    if (eventText.trim()) newEvents[dateString] = eventText.trim();
    else delete newEvents[dateString];
    saveEventsToStorage(newEvents);
    setIsEditingEvent(false);
    setSelectedDate(null); // Close event box on save
  };
 
  const handleDeleteEvent = () => {
    if (!selectedDate) return;
    const dateString = `${selectedDate.jy}-${selectedDate.jm}-${selectedDate.jd}`;
    const newEvents = { ...events };
    delete newEvents[dateString];
    saveEventsToStorage(newEvents);
    setSelectedDate(null);
    setEventText('');
  }
 
  const handleCitySubmit = (e) => {
    e.preventDefault();
    updateSetting('weatherCity', cityInput);
  }

  
  const resetDefaults = () => {
    setSettings(defaultSettings);
    setCityInput(defaultSettings.weatherCity);
    setSettingsOpen(false);
  }

  // --- Derived data for rendering ---
  const displayHours = useMemo(() => {
    if (weather.loading || weather.error || !weather.data?.weather) {
      return [];
    }
    
    const todayHourly = weather.data.weather[0]?.hourly || [];
    const tomorrowHourly = weather.data.weather[1]?.hourly || [];
    const fullForecast = [...todayHourly, ...tomorrowHourly];
    const currentHour = iranTime.getHours();
    const centeredForecast = [];

    if (fullForecast.length < 2) {
      return [];
    }

    for (let i = -2; i <= 2; i++) {
      const targetHour = currentHour + i;
      const normalizedTargetHour = (targetHour + 24) % 24;
      let prevPoint = null, nextPoint = null;

      for (let j = 0; j < fullForecast.length - 1; j++) {
        const p1 = fullForecast[j];
        const p2 = fullForecast[j + 1];
        const p1_hour = div(parseInt(p1.time, 10), 100);
        let p2_hour = div(parseInt(p2.time, 10), 100);
        if (p2_hour < p1_hour) p2_hour += 24;

        let effectiveTarget = targetHour;
        if (effectiveTarget < p1_hour) effectiveTarget += 24;

        if (effectiveTarget >= p1_hour && effectiveTarget <= p2_hour) {
          prevPoint = p1;
          nextPoint = p2;
          break;
        }
      }

      if (!prevPoint) { // Fallback if outside range
        prevPoint = nextPoint = targetHour < div(parseInt(fullForecast[0].time, 10), 100) ? fullForecast[0] : fullForecast[fullForecast.length - 1];
      }

      if (prevPoint && nextPoint) {
        const prevHour = div(parseInt(prevPoint.time, 10), 100);
        let nextHour = div(parseInt(nextPoint.time, 10), 100);
        if (nextHour < prevHour) nextHour += 24;

        let effectiveTarget = targetHour;
        if (effectiveTarget < prevHour) effectiveTarget += 24;

        const prevTemp = parseInt(prevPoint.tempC, 10);
        const nextTemp = parseInt(nextPoint.tempC, 10);

        const interpolatedTemp = (nextHour === prevHour)
          ? prevTemp
          : Math.round(prevTemp + ((nextTemp - prevTemp) * ((effectiveTarget - prevHour) / (nextHour - prevHour))));

        centeredForecast.push({
          time: normalizedTargetHour * 100,
          weatherCode: prevPoint.weatherCode,
          tempC: interpolatedTemp.toString()
        });
      }
    }
    return centeredForecast;
 }, [weather, iranTime]);
 
  const { dnd, glassTheme, lightBg, font, textScale, animationsEnabled, minimalMode, showWeekday, showNotifications } = settings;
 
  const hhRaw = iranTime.getHours();
  const mm = pad2(iranTime.getMinutes());
  const ss = pad2(iranTime.getSeconds());
  let displayHour = hhRaw;
  let ampm = '';
  if (!settings.hour24) { ampm = hhRaw >= 12 ? 'ب.ظ' : 'ق.ظ'; displayHour = hhRaw % 12 || 12; }
  const iranTimeStr = settings.hour24 ? `${toFaDigits(pad2(hhRaw))}:${toFaDigits(mm)}${settings.showSeconds ? ':' + toFaDigits(ss) : ''}` : `${toFaDigits(displayHour)}:${toFaDigits(mm)}${settings.showSeconds ? ':' + toFaDigits(ss) : ''} ${ampm}`;
  const todayStr = `${faMonths[todayJ.jm - 1]} ${toFaDigits(pad2(todayJ.jd))}، ${toFaDigits(todayJ.jy)}`;
  const todayName = faWeekdaysFull[now.getDay()];

  const fonts = { system: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial', vazir: 'Vazir, system-ui', shabnam: 'Shabnam, system-ui', sahel: 'Sahel, system-ui' };

  // Dynamic classes for styling
  const mainCardClasses = `grid grid-cols-1 md:grid-cols-2 gap-0 rounded-[32px] overflow-hidden shadow-2xl relative transition-all duration-300 w-full max-w-2xl ${glassTheme ? 'backdrop-blur-4xl bg-black/30 border border-white/10 text-neutral-100' : lightBg ? 'bg-white text-neutral-900' : 'bg-neutral-900 text-neutral-200'}`;
  const panelBg = glassTheme ? 'bg-white/10' : lightBg ? 'bg-neutral-100' : 'bg-neutral-800';
  const panelTextMuted = glassTheme ? 'text-neutral-300' : lightBg ? 'text-neutral-600' : 'text-neutral-400';
  const cellHover = animationsEnabled ? (glassTheme ? 'hover:bg-white/20' : (lightBg ? 'hover:bg-neutral-200' : 'hover:bg-neutral-700')) + ' transition-colors' : '';
  const wrapperStyle = { fontFamily: fonts[font] };
  const titleStyle = { fontSize: `${20 + textScale * 2}px` };
  const dayNumStyle = { fontSize: `${14 + textScale}px` };
  const smallTextStyle = { fontSize: `${13 + Math.max(0, textScale)}px` };
  const microTextStyle = { fontSize: `${12 + Math.max(0, textScale)}px` };

  const CalendarCell = React.memo(function CalendarCell({ day, onDayClick, styles, cellHover }) {
  const { d, inMonth, isToday, hasEvent } = day;
  const { dayNumStyle, panelBg } = styles;

  const handleClick = () => onDayClick(day);

  const cellClasses = `aspect-square flex items-center justify-center rounded-2xl text-sm cursor-pointer relative ${cellHover} ${!inMonth ? 'opacity-40' : ''} ${isToday && inMonth ? 'bg-blue-600 text-white' : panelBg} ${hasEvent && !isToday && inMonth ? 'text-red-500 font-bold' : ''}`;


  const calendarCellStyles = useMemo(() => ({
  dayNumStyle,
  panelBg
}), [dayNumStyle, panelBg]);
    
  return (
    <div onClick={handleClick} className={cellClasses} style={dayNumStyle}>
      {toFaDigits(d)}
    </div>
  );
});
  
  if (!isWidgetVisible) {
    return null;
  }

  return (
    <div className={`flex items-center data-tauri-drag-region justify-center min-h-screen p-4 ${lightBg ? 'light-theme' : ''} ${!lightBg && !glassTheme ? 'dark-theme' : ''} ${glassTheme ? 'glass-theme' : ''}`}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; } 
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } 
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(125, 125, 125, 0.5); border-radius: 10px; } 
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(150, 150, 150, 0.7); } 
        input[type=range]{-webkit-appearance:none;background:transparent}
        input[type=range]::-webkit-slider-runnable-track{height:4px;background:rgba(125,125,125,0.3);border-radius:4px}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;height:16px;width:16px;border-radius:50%;background:rgba(200,200,200,0.8);margin-top:-6px}
        .dark-theme select option { background: #27272a !important; color: #e5e5e5 !important; }
        .light-theme select option { background: #ffffff !important; color: #18181b !important; }
        .glass-theme select option { background: rgba(20, 20, 20, 0.8) !important; color: #e5e5e5 !important; }
      `}</style>
      <div data-tauri-drag-region className={mainCardClasses} style={wrapperStyle}>
       
        {/* Settings Button */}
        <button aria-label="تنظیمات" className={`absolute top-4 left-4 ${panelBg} rounded-2xl p-2 shadow-lg cursor-pointer ${animationsEnabled ? 'hover:scale-105 transition-transform' : ''} z-20`} onClick={() => setSettingsOpen(!settingsOpen)}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </button>
        
        
         {/* Close Button */}
          <button aria-label="بستن ویجت" 
            className={`absolute top-4 right-4 ${panelBg} rounded-2xl p-2 shadow-lg cursor-pointer ${ animationsEnabled ? 'hover:scale-105 transition-transform' : '' } z-20`} 
            onClick={async () => {
  const mainWindow = WebviewWindow.getByLabel('main');
  await mainWindow.close();
}}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* DND Icon */}
        {dnd && (
          <div className="absolute top-4 right-16 text-neutral-400 z-20 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M12 22a2.96 2.96 0 0 0 2.96-2.96H9.04A2.96 2.96 0 0 0 12 22zm7-4.58v-5.5a7 7 0 0 0-14 0v5.5l-2 2.13v.96h18v-.96l-2-2.13zM4.71 3.29a1 1 0 0 0-1.42 1.42l16 16a1 1 0 0 0 1.42-1.42z" />
            </svg>
          </div>
        )}

        {/* Settings Panel */}
        {settingsOpen && (<div className={`absolute top-16 left-4 rounded-xl p-4 text-sm w-80 shadow-2xl z-20 ${glassTheme ? 'backdrop-blur-lg bg-black/30 border border-white/10' : (lightBg ? 'bg-white border-neutral-200' : 'bg-neutral-900 border-neutral-700')}`}><div className="mb-3 font-medium">تنظیمات</div><div className="flex flex-col gap-3 max-h-[60vh] overflow-auto pr-1">
          {/* Settings Toggles and Inputs */}
          <div className="flex items-center justify-between"><div className={panelTextMuted}>نمایش اعلان‌ها</div><button role="switch" aria-checked={showNotifications} onClick={() => updateSetting('showNotifications', !showNotifications)} className={`relative inline-flex items-center w-10 h-6 rounded-full focus:outline-none ${showNotifications ? 'bg-blue-500' : panelBg}`}><span className={`absolute left-1 w-4 h-4 rounded-full transition-transform ${showNotifications ? 'translate-x-4 bg-white' : (glassTheme ? 'bg-neutral-200' : (lightBg ? 'bg-neutral-400' : 'bg-neutral-700'))}`} /></button></div>
          <div className="flex items-center justify-between"><div className={panelTextMuted}>پس‌زمینه روشن</div><button role="switch" aria-checked={lightBg} onClick={() => { updateSetting('lightBg', !lightBg); if(!lightBg) {updateSetting('glassTheme', false)} }} className={`relative inline-flex items-center w-10 h-6 rounded-full focus:outline-none ${lightBg ? 'bg-blue-500' : (glassTheme ? 'bg-white/10' : 'bg-neutral-800')}`}><span className={`absolute left-1 w-4 h-4 rounded-full transition-transform ${lightBg ? 'translate-x-4 bg-white' : (glassTheme ? 'bg-neutral-200' : 'bg-neutral-700')}`} /></button></div>
          <div className="flex items-center justify-between"><div className={panelTextMuted}>تم شیشه‌ای</div><button role="switch" aria-checked={glassTheme} onClick={() => { updateSetting('glassTheme', !glassTheme); if(!glassTheme) {updateSetting('lightBg', false)} }} className={`relative inline-flex items-center w-10 h-6 rounded-full focus:outline-none ${glassTheme ? 'bg-blue-500' : (lightBg ? 'bg-neutral-200' : 'bg-neutral-800')}`}><span className={`absolute left-1 w-4 h-4 rounded-full transition-transform ${glassTheme ? 'translate-x-4 bg-white' : (lightBg ? 'bg-neutral-400' : 'bg-neutral-700')}`} /></button></div>
          <div className="flex items-center justify-between"><div className={panelTextMuted}>اندازه متن</div><input type="range" min={-2} max={4} value={textScale} onChange={e => updateSetting('textScale', parseInt(e.target.value, 10))} className="ml-2 w-32" /></div>
          <div className="flex items-center justify-between"><div className={panelTextMuted}>حالت مینیمال</div><button role="switch" aria-checked={minimalMode} onClick={() => updateSetting('minimalMode', !minimalMode)} className={`relative inline-flex items-center w-10 h-6 rounded-full focus:outline-none ${minimalMode ? 'bg-blue-500' : (glassTheme ? 'bg-white/10' : (lightBg ? 'bg-neutral-200' : 'bg-neutral-800'))}`}><span className={`absolute left-1 w-4 h-4 rounded-full transition-transform ${minimalMode ? 'translate-x-4 bg-white' : (glassTheme ? 'bg-neutral-200' : (lightBg ? 'bg-neutral-400' : 'bg-neutral-700'))}`} /></button></div>
          <div className="flex items-center justify-between"><div className={panelTextMuted}>انیمیشن‌ها</div><button role="switch" aria-checked={animationsEnabled} onClick={() => updateSetting('animationsEnabled', !animationsEnabled)} className={`relative inline-flex items-center w-10 h-6 rounded-full focus:outline-none ${animationsEnabled ? 'bg-blue-500' : (glassTheme ? 'bg-white/10' : (lightBg ? 'bg-neutral-200' : 'bg-neutral-800'))}`}><span className={`absolute left-1 w-4 h-4 rounded-full transition-transform ${animationsEnabled ? 'translate-x-4 bg-white' : (glassTheme ? 'bg-neutral-200' : (lightBg ? 'bg-neutral-400' : 'bg-neutral-700'))}`} /></button></div>
          <div className="flex items-center justify-between"><div className={panelTextMuted}>نمایش ثانیه</div><button role="switch" aria-checked={settings.showSeconds} onClick={() => updateSetting('showSeconds', !settings.showSeconds)} className={`relative inline-flex items-center w-10 h-6 rounded-full focus:outline-none ${settings.showSeconds ? 'bg-blue-500' : panelBg}`}><span className={`absolute left-1 w-4 h-4 rounded-full transition-transform ${settings.showSeconds ? 'translate-x-4 bg-white' : (glassTheme ? 'bg-neutral-200' : (lightBg ? 'bg-neutral-400' : 'bg-neutral-700'))}`} /></button></div>
          <div className="flex items-center justify-between"><div className={panelTextMuted}>ساعت ۲۴ ساعته</div><button role="switch" aria-checked={settings.hour24} onClick={() => updateSetting('hour24', !settings.hour24)} className={`relative inline-flex items-center w-10 h-6 rounded-full focus:outline-none ${settings.hour24 ? 'bg-blue-500' : panelBg}`}><span className={`absolute left-1 w-4 h-4 rounded-full transition-transform ${settings.hour24 ? 'translate-x-4 bg-white' : (glassTheme ? 'bg-neutral-200' : (lightBg ? 'bg-neutral-400' : 'bg-neutral-700'))}`} /></button></div>
          <div className="pt-2 border-t border-neutral-700" />
          <div className="flex gap-2">
            <button onClick={resetDefaults} className="flex-1 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white">ریست</button>
            <button onClick={() => setSettingsOpen(false)} className={`flex-1 py-1 rounded-lg ${panelBg} ${cellHover}`}>بستن</button>
          </div>
        </div></div>)}
       
        {/* Left Panel: Notifications */}
        <div className={`w-full p-6 flex flex-col data-tauri-drag-region items-center relative md:border-r ${glassTheme ? 'border-white/20' : lightBg ? 'border-neutral-200' : 'border-neutral-800'}`}>
            <div className={`flex-grow flex flex-col w-full text-center ${notifications.length > 0 && showNotifications && !dnd ? 'justify-start pt-6' : 'justify-center items-center'}`}>
                {showNotifications && !dnd && notifications.length > 0 ? (
                    <div className="w-full flex flex-col gap-2">
                        {notifications.map((n, i) => (
                            <div key={i} className={`p-3 rounded-lg flex items-start gap-3 ${glassTheme ? 'bg-white/5' : lightBg ? 'bg-neutral-200/70' : 'bg-neutral-800'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 opacity-70 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <div className="flex flex-col text-right">
                                    <span className="font-semibold text-sm">{n.title}</span>
                                    <span className="text-sm opacity-80">{n.text}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        {dnd ? (
                            <svg viewBox="0 0 24 24" className="w-16 h-16 opacity-50 fill-current">
                                <path d="M12 22a2.96 2.96 0 0 0 2.96-2.96H9.04A2.96 2.96 0 0 0 12 22zm7-4.58v-5.5a7 7 0 0 0-14 0v5.5l-2 2.13v.96h18v-.96l-2-2.13zM4.71 3.29a1 1 0 0 0-1.42 1.42l16 16a1 1 0 0 0 1.42-1.42z" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" className="w-16 h-16 opacity-50 fill-current"><path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6V11a6 6 0 0 0-12 0v5l-2 2v1h16v-1l-2-2z"/></svg>
                        )}
                        <div className={`mt-6 w-full ${panelTextMuted}`}>
                            {dnd ? 'مزاحم نشوید فعال است' : 'هیچ اعلان تازه‌ای نیست'}
                        </div>
                    </>
                )}
            </div>
            <div className="flex items-center gap-3 w-full justify-between mt-6"><div className={`flex items-center gap-3 text-sm ${panelTextMuted} cursor-pointer`} onClick={() => updateSetting('dnd', !dnd)}><span className={`inline-flex items-center justify-center w-10 h-6 rounded-full relative ${dnd ? 'bg-blue-500' : panelBg}`}><span className={`absolute left-1 w-4 h-4 rounded-full transition-all ${dnd ? 'translate-x-4 bg-white' : 'bg-neutral-400'}`} /></span>مزاحم نشوید</div><button onClick={() => setNotificationsCleared(true)} disabled={notifications.length === 0} className={`text-xs p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${panelBg} ${cellHover}`}>پاک کردن</button></div>
        </div>
       
        {/* Right Panel: Calendar & Info */}
        <div className="w-full data-tauri-drag-region p-5 flex flex-col gap-3">
           <div className="w-full text-left">
              {showWeekday && <div className={`${panelTextMuted} text-sm`} style={smallTextStyle}>{todayName}</div>}
              <div className="text-2xl font-semibold" style={titleStyle}>{todayStr}</div>
          </div>
         
          {/* Calendar Grid */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-3">
                <button aria-label="ماه قبلی" onClick={prevMonth} className={`p-2 rounded-xl ${panelBg} ${cellHover}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                <div className="font-medium text-center text-lg">{toFaDigits(faMonths[viewJ.jm - 1])} {toFaDigits(viewJ.jy)}</div>
                <button aria-label="ماه بعدی" onClick={nextMonth} className={`p-2 rounded-xl ${panelBg} ${cellHover}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs text-neutral-400">{faWeekdays.map((w, i) => (<div key={i} className="py-1" style={smallTextStyle}>{w}</div>))}</div>
            <div className="grid grid-cols-7 gap-1">
              {grid.cells.map((c) => (
                <CalendarCell 
                  key={`${c.jy}-${c.jm}-${c.jd}`} 
                  day={c} 
                  onDayClick={handleDayClick} 
                  styles={{ dayNumStyle, panelBg }}
                  cellHover={cellHover}
                />
              ))}
            </div>
          </div>
         
           <div className="flex-grow flex flex-col justify-end min-h-[170px]">
                <div className={`transition-all duration-300 ease-in-out ${selectedDate ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 invisible'}`}>
                    {selectedDate && (
                        <div className={`${panelBg} mt-2 rounded-2xl p-3 flex flex-col gap-2`}>
                            <div className="relative flex justify-center items-center">
                                <div className="text-sm font-medium">رویداد برای {toFaDigits(selectedDate.jd)} {faMonths[selectedDate.jm - 1]}</div>
                                <button aria-label="بستن رویداد" onClick={() => setSelectedDate(null)} className="absolute -top-1 right-0 text-xl opacity-50 hover:opacity-100">×</button>
                            </div>
                            {isEditingEvent ? (
                                <>
                                    <textarea value={eventText} onChange={(e) => setEventText(e.target.value)} placeholder="رویداد خود را بنویسید..." className={`w-full p-2 rounded-lg text-sm bg-black/20 ${lightBg ? 'text-black bg-white' : 'text-white'} border-0 focus:ring-2 focus:ring-blue-500 max-h-24`}></textarea>
                                    <button onClick={handleSaveEvent} className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors">ذخیره</button>
                                </>
                            ) : (
                                <div className="relative flex items-center justify-center p-4">
                                    <p className="text-sm text-center">{eventText}</p>
                                    <button aria-label="حذف رویداد" onClick={handleDeleteEvent} className={`absolute top-0 left-0 p-2 rounded-full ${cellHover}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                    <button aria-label="ویرایش رویداد" onClick={() => setIsEditingEvent(true)} className={`absolute top-0 right-0 p-2 rounded-full ${cellHover}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg></button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className={`transition-all duration-300 ease-in-out ${!minimalMode && !selectedDate ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 invisible'}`}>
                    <div className="flex flex-col gap-3">
                        <div className={`${panelBg} rounded-2xl p-3`}>
                            <div className="flex items-center justify-between">
                                <div>ایران</div>
                                <div className="text-sm" style={smallTextStyle}>{iranTimeStr}</div>
                                <div className={`text-sm ${panelTextMuted}`}>+۳:۳۰</div>
                            </div>
                        </div>

                        <div className={`${panelBg} rounded-2xl p-3`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className={`text-sm ${panelTextMuted}`} style={smallTextStyle}>هواشناسی</div>
                                {isEditingCity ? (
                                    <form onSubmit={handleCitySubmit}><input type="text" value={cityInput} onChange={e => setCityInput(e.target.value)} autoFocus onBlur={handleCitySubmit} className="bg-transparent text-sm text-right w-24 outline-none focus:border-b" /></form>
                                ) : (
                                    <div className={`text-sm cursor-pointer`} style={smallTextStyle} onClick={() => setIsEditingCity(true)}>{weather.loading ? '...' : settings.weatherCity}</div>
                                )}
                            </div>
                            {weather.loading ? (
                                <div className={`text-sm ${panelTextMuted}`}>در حال بارگذاری...</div>
                            ) : weather.error ? (
                                <div className="text-sm text-red-400">{weather.error}</div>
                            ) : (
                                <div className="flex justify-around">
                                    {displayHours.map((hour, index) => {
                                        const hour_num = div(parseInt(hour.time), 100);
                                        return (
                                            <div key={index} className="flex flex-col items-center gap-2 flex-shrink-0 px-2">
                                                <div className={`text-xs ${panelTextMuted}`} style={microTextStyle}>{toFaDigits(`${hour_num}:00`)}</div>
                                                <WeatherIcon code={hour.weatherCode} className="w-8 h-8" />
                                                <div className="text-sm font-semibold" style={dayNumStyle}>{toFaDigits(hour.tempC)}°</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
    
  );

}

