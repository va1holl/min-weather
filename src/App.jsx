import { useEffect, useRef, useState } from "react";

const API_KEY = import.meta.env.VITE_OWM_KEY;

export default function App() {
  const inputRef = useRef(null);

  const [inputCity, setInputCity] = useState("");
  const [lastCity, setLastCity] = useState("");
  const [weather, setWeather] = useState(null)
  const [error, setError] = useState("");
  const [requestCount, setRequestCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // история
  const [history, setHistory] = useState([]);

  // фокус
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // берём историю
  useEffect(() => {
    const raw = localStorage.getItem("mw_history");
    if (!raw) return;
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) setHistory(arr);
    } catch {
      // тишина
    }
  }, []);

  // save
  useEffect(() => {
    localStorage.setItem("mw_history", JSON.stringify(history));
  }, [history]);

  // 60s update
  useEffect(() => {
    if (!lastCity) return;
    const id = setInterval(() => fetchWeather(lastCity), 60_000);
    return () => clearInterval(id);
  }, [lastCity]);

  async function fetchWeather(city) {
    if (!API_KEY) {
      setError("Нет API ключа");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        city
      )}&appid=${API_KEY}&units=metric&lang=ru`;

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Ошибка запроса");

      const normalized = {
        city: data.name,
        temp: Math.round(data.main?.temp ?? 0),
        description: data.weather?.[0]?.description ?? "",
        humidity: data.main?.humidity ?? 0,
        wind: data.wind?.speed ?? 0,
      };

      setWeather(normalized);
      setLastCity(city);
      setRequestCount((c) => c + 1);

      // Обновить историю (уникальные, максимум 5)
      const name = (normalized.city || city || "").trim();
      setHistory((prev) => {
        if (!name) return prev;
        const noDup = prev.filter((x) => x.toLowerCase() !== name.toLowerCase());
        return [name, ...noDup].slice(0, 5);
      });
    } catch {
      setWeather(null);
      setError("Город не найден.");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    const city = inputCity.trim();
    if (city) fetchWeather(city);
  }

  function useFromHistory(city) {
    setInputCity(city);
    fetchWeather(city);
  }

  return (
    <div className="wrap">
      <h1>Погода</h1>

      <form className="controls" onSubmit={onSubmit}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Введите город"
          value={inputCity}
          onChange={(e) => setInputCity(e.target.value)}
        />
        <button type="submit" disabled={!inputCity.trim() || loading}>
          {loading ? "Жду..." : "Получить погоду"}
        </button>
      </form>

      {/* История поиска: всегда видна */}
      <div className="history">
        {history.length ? (
          <>
            {history.map((c) => (
              <button
                onClick={() => useFromHistory(c)}
                title={`Искать ${c}`}
              >
                {c}
              </button>
            ))}
            <button
              className="chip clear"
              onClick={() => {
                setHistory([]);
                localStorage.removeItem("mw_history");
              }}
              title="Очистить историю"
            >
              очистить
            </button>
          </>
        ) : (
          <span className="muted">История пуста</span>
        )}
      </div>

      <div className="card">
        {weather ? (
          <>
            <div className="city">{weather.city}</div>
            <div className="temp">{weather.temp}°C</div>
            <div className="desc">{weather.description}</div>
            <div className="row">
              <span>Влажность:</span> <b>{weather.humidity}%</b>
            </div>
            <div className="row">
              <span>Ветер:</span> <b>{weather.wind} м/с</b>
            </div>
          </>
        ) : (
          <div className="placeholder">Нет данных. Вбей город и нажми кнопку.</div>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      <div className="counter">
        Количество выполненных запросов к API: <b>{requestCount}</b>
      </div>
    </div>
  );
}
