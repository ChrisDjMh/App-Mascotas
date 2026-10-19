import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { getSessionUser, loginUser, logoutUser, registerUser, type User } from "./auth";
import { PETS, normalizeName, passwordChecks, validateConfirm, validateEmail, validateName, validatePassword } from "./validation";

type Page = "home" | "register" | "login" | "products";
type IconName =
  | "arrow"
  | "cart"
  | "check"
  | "chevron"
  | "eye"
  | "eyeOff"
  | "lock"
  | "paw"
  | "search"
  | "shield"
  | "sun"
  | "user";

const OPENWEATHER_KEY = import.meta.env.VITE_OPENWEATHER_KEY as string | undefined;
const EXCHANGERATE_KEY = import.meta.env.VITE_EXCHANGERATE_KEY as string | undefined;
const WEATHER_CITY = (import.meta.env.VITE_WEATHER_CITY as string | undefined) || "Mexico City";
const FALLBACK_USD_RATE = 17.2; // MXN por 1 USD si falla la API

type Weather = { temp: number; description: string; main: string; city: string };

function useWeather() {
  const [data, setData] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!OPENWEATHER_KEY) {
      setError("Falta VITE_OPENWEATHER_KEY en el archivo .env");
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(WEATHER_CITY)}&units=metric&lang=es&appid=${OPENWEATHER_KEY}`;
    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.json();
      })
      .then((json) => {
        setData({
          temp: Math.round(json.main.temp),
          description: json.weather?.[0]?.description ?? "",
          main: json.weather?.[0]?.main ?? "",
          city: json.name ?? WEATHER_CITY,
        });
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError("No se pudo cargar el clima");
        setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return { data, loading, error };
}

function useUsdRate() {
  const [rate, setRate] = useState(FALLBACK_USD_RATE);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!EXCHANGERATE_KEY) return;
    const controller = new AbortController();
    fetch(`https://v6.exchangerate-api.com/v6/${EXCHANGERATE_KEY}/pair/USD/MXN`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (json.result === "success" && typeof json.conversion_rate === "number") {
          setRate(json.conversion_rate);
          setLive(true);
        }
      })
      .catch(() => {
        /* se mantiene el valor de respaldo */
      });
    return () => controller.abort();
  }, []);

  return { rate, live };
}

function walkAdvice(weather: Weather) {
  const bad = ["Rain", "Drizzle", "Thunderstorm", "Snow"].includes(weather.main);
  if (bad) return "Mejor paseo corto: hay precipitación";
  if (weather.temp >= 32) return "Mucho calor: pasea temprano o al atardecer";
  if (weather.temp <= 8) return "Hace frío: abriga a tu mascota";
  return "Excelente clima para pasear a tu perro";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}

const productImages = [
  "https://images.unsplash.com/photo-1714068691210-073dc52c6c1d?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1631935091182-a7795017ce5f?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1620154562010-bbee2fa05f71?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1556229040-2a7bc8a00a3e?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1591946559594-8c6d3b7391eb?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1625126334963-67846ed79c20?auto=format&fit=crop&w=900&q=85",
];

const products = [
  { id: 1, name: "Nutrición natural", category: "Comida", price: 689, image: productImages[0] },
  { id: 2, name: "Set de juego suave", category: "Juguetes", price: 429, image: productImages[1] },
  { id: 3, name: "Comedero de cerámica", category: "Comida", price: 549, image: productImages[2] },
  { id: 4, name: "Kit de cuidado diario", category: "Salud", price: 799, image: productImages[3] },
  { id: 5, name: "Fórmula digestiva", category: "Salud", price: 615, image: productImages[4] },
  { id: 6, name: "Pelota interactiva", category: "Juguetes", price: 289, image: productImages[5] },
];

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    cart: <><path d="M3 3h2l2.4 11.3a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 7H6" /><circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m8 10 4 4 4-4" />,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></>,
    eyeOff: <><path d="m3 3 18 18" /><path d="M10.6 6.2A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-2 2.7M6.3 6.3C3.5 8.2 2 12 2 12s3.5 6 10 6a10 10 0 0 0 4-.8" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    paw: <><ellipse cx="12" cy="15.5" rx="5" ry="4" /><circle cx="6.3" cy="10" r="2" /><circle cx="10" cy="6.5" r="2" /><circle cx="14" cy="6.5" r="2" /><circle cx="17.7" cy="10" r="2" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
    sun: <><circle cx="12" cy="12" r="3.5" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Logo({ onClick }: { onClick: () => void }) {
  return (
    <button className="brand" onClick={onClick} aria-label="Ir al inicio">
      <span className="brand-mark"><Icon name="paw" size={22} /></span>
      <span>PetVerse</span>
    </button>
  );
}

function Header({ page, navigate, cartCount, user, onLogout }: { page: Page; navigate: (page: Page) => void; cartCount: number; user: User | null; onLogout: () => void }) {
  return (
    <header className="site-header">
      <Logo onClick={() => navigate("home")} />
      <nav className="main-nav" aria-label="Navegación principal">
        <button className={page === "home" ? "active" : ""} onClick={() => navigate("home")}>Inicio</button>
        <button className={page === "products" ? "active" : ""} onClick={() => navigate("products")}>Productos</button>
        <button onClick={() => navigate("home")}>Clima Paseo</button>
        <button onClick={() => navigate("home")}>Nosotros</button>
      </nav>
      <div className="header-actions">
        <button className="icon-button cart-button" aria-label={`Carrito, ${cartCount} productos`} onClick={() => navigate("products")}>
          <Icon name="cart" size={19} />
          {cartCount > 0 && <span>{cartCount}</span>}
        </button>
        {user ? (
          <>
            <button className="account-button" onClick={() => navigate("products")}>
              <Icon name="user" size={17} />
              <span>{user.name.split(" ")[0]}</span>
            </button>
            <button className="account-button" onClick={onLogout}>
              <span>Salir</span>
            </button>
          </>
        ) : (
          <button className="account-button" onClick={() => navigate("login")}>
            <Icon name="user" size={17} />
            <span>Ingresar</span>
          </button>
        )}
      </div>
    </header>
  );
}

function WeatherCard() {
  const { data, loading, error } = useWeather();

  let title = "Cargando clima...";
  let time = "Consultando OpenWeather";
  if (!loading && error) {
    title = error;
    time = "Sin conexión a la API";
  } else if (!loading && data) {
    title = `${data.temp}°C, ${data.description} — ${walkAdvice(data)}`;
    time = "Actualizado ahora";
  }

  return (
    <section className="weather-wrap" aria-label="Clima para paseo">
      <div className="weather-card">
        <span className="weather-icon"><Icon name="sun" size={24} /></span>
        <div>
          <span className="weather-kicker">OpenWeather API · {data?.city ?? WEATHER_CITY}</span>
          <strong>{title}</strong>
        </div>
        <span className="weather-time">{time}</span>
      </div>
    </section>
  );
}

function Home({ navigate }: { navigate: (page: Page) => void }) {
  return (
    <>
      <main>
        <section className="hero">
          <div className="hero-visual">
            <span className="eyebrow floating-label">Cuidado que se siente</span>
            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />
            <img
              src="https://images.unsplash.com/photo-1509205477838-a534e43a849f?auto=format&fit=crop&w=1200&q=90"
              alt="Un perro y un gato descansando juntos"
            />
            <div className="pet-note">
              <span>4.9</span>
              <div><strong>Familias felices</strong><small>Más de 2,000 reseñas</small></div>
            </div>
          </div>
          <div className="hero-copy">
            <span className="eyebrow">Bienestar para cada aventura</span>
            <h1>Everything for your <em>best friend!</em></h1>
            <p>Productos honestos, consejos expertos y cuidados pensados para acompañar cada etapa de su vida.</p>
            <div className="hero-actions">
              <button className="primary-button" onClick={() => navigate("products")}>Explorar Productos <Icon name="arrow" size={18} /></button>
              <button className="secondary-button" onClick={() => navigate("products")}>Ver Cuidados</button>
            </div>
            <div className="hero-stats">
              <div><strong>120+</strong><span>Productos elegidos</span></div>
              <div><strong>24/7</strong><span>Consejos a tu alcance</span></div>
              <div><strong>100%</strong><span>Amor por ellos</span></div>
            </div>
          </div>
        </section>
        <WeatherCard />
      </main>
      <footer>
        <Logo onClick={() => navigate("home")} />
        <p>Todo lo que necesitan, en un solo universo.</p>
        <div><button>Privacidad</button><button>Ayuda</button><span>© 2025 PetVerse</span></div>
      </footer>
    </>
  );
}

type FieldProps = {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder: string;
  error?: string;
  valid?: boolean;
  trailing?: ReactNode;
  autoComplete?: string;
  maxLength?: number;
};

function Field({ label, type = "text", value, onChange, onBlur, placeholder, error, valid, trailing, autoComplete, maxLength }: FieldProps) {
  return (
    <label className={`field ${error ? "field-error" : ""}`}>
      <span>{label}</span>
      <div className="input-wrap">
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
        />
        {valid && !error && !trailing && <span className="valid-icon"><Icon name="check" size={15} /></span>}
        {trailing}
      </div>
      {error && <small>{error}</small>}
    </label>
  );
}

type FieldName = "name" | "email" | "password" | "confirm";

function AuthShell({ type, navigate, onAuth }: { type: "login" | "register"; navigate: (page: Page) => void; onAuth: (user: User) => void }) {
  const isRegister = type === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pet, setPet] = useState<string>(PETS[0]);
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const errors: Record<FieldName, string | null> = {
    name: isRegister ? validateName(name) : null,
    email: validateEmail(email),
    password: isRegister ? validatePassword(password) : password ? null : "Escribe tu contraseña",
    confirm: isRegister ? validateConfirm(password, confirm) : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const touch = (field: FieldName) => setTouched((current) => ({ ...current, [field]: true }));
  const errorFor = (field: FieldName) => ((submitted || touched[field]) && errors[field] ? errors[field]! : undefined);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    setServerError(null);
    if (hasErrors) return;

    setLoading(true);
    try {
      const user = isRegister
        ? await registerUser(normalizeName(name), email.trim(), password, pet, remember)
        : await loginUser(email.trim(), password, remember);
      onAuth(user);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Ocurrió un error, intenta de nuevo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-aside">
        <button className="back-link" onClick={() => navigate("home")}><span>←</span> Volver al inicio</button>
        <div className="auth-quote">
          <span className="eyebrow">Tu universo PetVerse</span>
          <h2>{isRegister ? "Comienza una vida más feliz, juntos." : "Qué alegría tenerte de vuelta."}</h2>
          <p>{isRegister ? "Crea tu cuenta y descubre recomendaciones pensadas especialmente para tu mejor amigo." : "Tu selección favorita y los mejores cuidados te están esperando."}</p>
        </div>
        <div className="auth-pet-image">
          <img src={isRegister ? "https://images.unsplash.com/photo-1615394968637-de55ca4b2e64?auto=format&fit=crop&w=900&q=85" : "https://images.unsplash.com/photo-1606098216818-40939b7c98ad?auto=format&fit=crop&w=900&q=85"} alt={isRegister ? "Persona abrazando a su perro" : "Perro pug descansando"} />
        </div>
      </div>
      <div className="auth-content">
        <div className="auth-card">
          <Logo onClick={() => navigate("home")} />
          <div className="auth-heading">
            <span className="auth-step">{isRegister ? "Únete a la familia" : "Acceso personal"}</span>
            <h1>{isRegister ? "Registro de Usuario" : "Inicia sesión"}</h1>
            <p>{isRegister ? "Cuéntanos un poco sobre ti y tu compañero." : "Ingresa tus datos para continuar a tu cuenta."}</p>
          </div>
          <form onSubmit={handleSubmit} noValidate>
            {isRegister && (
              <Field
                label="Nombre completo"
                value={name}
                onChange={setName}
                onBlur={() => touch("name")}
                placeholder="Tu nombre y apellido"
                autoComplete="name"
                maxLength={60}
                valid={!errors.name}
                error={errorFor("name")}
              />
            )}
            <Field
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={setEmail}
              onBlur={() => touch("email")}
              placeholder="nombre@correo.com"
              autoComplete="email"
              maxLength={254}
              valid={!errors.email}
              error={errorFor("email")}
            />
            <Field
              label="Contraseña"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={setPassword}
              onBlur={() => touch("password")}
              placeholder={isRegister ? "Mínimo 8 caracteres" : "Tu contraseña"}
              autoComplete={isRegister ? "new-password" : "current-password"}
              maxLength={72}
              valid={password.length > 0 && !errors.password}
              error={errorFor("password")}
              trailing={<button type="button" className="field-action" onClick={() => setShowPassword(!showPassword)} aria-label="Mostrar u ocultar contraseña"><Icon name={showPassword ? "eyeOff" : "eye"} size={18} /></button>}
            />
            {isRegister && (password.length > 0 || touched.password) && (
              <ul aria-label="Requisitos de la contraseña" style={{ listStyle: "none", padding: 0, margin: "-4px 0 14px", display: "grid", gap: 4, fontSize: 13 }}>
                {passwordChecks(password).map((check) => (
                  <li key={check.id} style={{ color: check.ok ? "var(--success, #3d7a4f)" : "inherit", opacity: check.ok ? 1 : 0.7 }}>
                    {check.ok ? "✓" : "○"} {check.label}
                  </li>
                ))}
              </ul>
            )}
            {isRegister && (
              <>
                <Field
                  label="Confirmar contraseña"
                  type="password"
                  value={confirm}
                  onChange={setConfirm}
                  onBlur={() => touch("confirm")}
                  placeholder="Repite tu contraseña"
                  autoComplete="new-password"
                  maxLength={72}
                  valid={confirm.length > 0 && !errors.confirm}
                  error={errorFor("confirm")}
                />
                <label className="field"><span>Tipo de mascota</span><div className="select-wrap"><select value={pet} onChange={(event) => setPet(event.target.value)}>{PETS.map((option) => <option key={option}>{option}</option>)}</select><Icon name="chevron" size={17} /></div></label>
              </>
            )}
            {!isRegister && <div className="form-meta"><label><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> Recordarme</label><button type="button">Olvidé mi contraseña</button></div>}
            {!isRegister && <div className="security-badge"><Icon name="shield" size={17} /> Sesión protegida con JWT</div>}
            {serverError && <p role="alert" style={{ color: "var(--danger, #b3402f)", fontSize: 14, margin: "4px 0 12px" }}>{serverError}</p>}
            <button className="primary-button submit-button" type="submit" disabled={loading}>{loading ? "Procesando..." : isRegister ? "Crear Cuenta" : "Iniciar Sesión"} <Icon name="arrow" size={18} /></button>
          </form>
          <p className="auth-switch">{isRegister ? "¿Ya tienes cuenta?" : "¿Nuevo en PetVerse?"} <button onClick={() => navigate(isRegister ? "login" : "register")}>{isRegister ? "Inicia sesión" : "Crear una cuenta"}</button></p>
        </div>
      </div>
    </main>
  );
}

function Products({ navigate, addToCart, cartCount, user, onLogout }: { navigate: (page: Page) => void; addToCart: () => void; cartCount: number; user: User; onLogout: () => void }) {
  const [category, setCategory] = useState("Todos");
  const [query, setQuery] = useState("");
  const [currency, setCurrency] = useState<"MXN" | "USD">("MXN");
  const [added, setAdded] = useState<number | null>(null);
  const { rate, live } = useUsdRate();
  const visibleProducts = useMemo(() => products.filter((product) =>
    (category === "Todos" || product.category === category) &&
    product.name.toLowerCase().includes(query.toLowerCase())), [category, query]);

  function add(id: number) {
    addToCart();
    setAdded(id);
    window.setTimeout(() => setAdded(null), 1400);
  }

  return (
    <div className="catalog-page">
      <div className="protected-bar">
        <div><Icon name="shield" size={17} /><span>Área Protegida</span><i /> <strong>Sesión activa</strong></div>
        <div className="protected-user"><span className="avatar">{initials(user.name)}</span><span><strong>{user.name}</strong><small>Miembro PetVerse</small></span><button onClick={onLogout}>Cerrar Sesión</button></div>
      </div>
      <header className="catalog-header">
        <Logo onClick={() => navigate("home")} />
        <div className="catalog-header-actions"><button className="icon-button cart-button"><Icon name="cart" size={20} />{cartCount > 0 && <span>{cartCount}</span>}</button><button className="avatar-button">{initials(user.name)}</button></div>
      </header>
      <main className="catalog-main">
        <div className="catalog-intro">
          <div><span className="eyebrow">Selección PetVerse</span><h1>Productos & <em>Cuidados</em></h1><p>Esenciales elegidos para acompañar una vida más saludable y feliz.</p></div>
          <div className="api-status"><span /><div><strong>REST API conectada</strong><small>Catálogo actualizado en tiempo real</small></div></div>
        </div>
        <div className="tools-bar">
          <label className="search-box"><Icon name="search" size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar productos..." /></label>
          <div className="categories">
            {["Todos", "Comida", "Juguetes", "Salud"].map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}
          </div>
          <label className="currency-select"><span>Moneda</span><select value={currency} onChange={(event) => setCurrency(event.target.value as "MXN" | "USD")}><option>MXN</option><option>USD</option></select><Icon name="chevron" size={16} /></label>
        </div>
        <div className="results-meta">
          <span>{visibleProducts.length} productos</span>
          <span>{live ? `ExchangeRate API · 1 USD = $${rate.toFixed(2)} MXN` : `Tipo de cambio de respaldo · 1 USD = $${rate.toFixed(2)} MXN`}</span>
        </div>
        <div className="product-grid">
          {visibleProducts.map((product) => {
            const usd = (product.price / rate).toFixed(2);
            return (
              <article className="product-card" key={product.id}>
                <div className="product-image"><img src={product.image} alt={product.name} /><span>{product.category}</span></div>
                <div className="product-info">
                  <div><h2>{product.name}</h2><p>Selección premium para el bienestar diario de tu mascota.</p></div>
                  <div className="price-row">
                    <div><strong>{currency === "MXN" ? `$${product.price.toLocaleString("es-MX")} MXN` : `$${usd} USD`}</strong><small>{currency === "MXN" ? `≈ $${usd} USD` : `≈ $${product.price.toLocaleString("es-MX")} MXN`}</small></div>
                    <button className={added === product.id ? "added" : ""} onClick={() => add(product.id)} aria-label={`Agregar ${product.name} al carrito`}>{added === product.id ? <Icon name="check" size={18} /> : <Icon name="cart" size={18} />}</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [cartCount, setCartCount] = useState(0);
  const [user, setUser] = useState<User | null>(() => getSessionUser());

  const goTo = (next: Page) => {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Ruta protegida: sin sesión, "products" redirige al login
  const navigate = (next: Page) => {
    if (next === "products" && !getSessionUser()) {
      setUser(null);
      goTo("login");
      return;
    }
    goTo(next);
  };

  const handleAuth = (loggedUser: User) => {
    setUser(loggedUser);
    goTo("products");
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setCartCount(0);
    goTo("home");
  };

  // key: al cambiar entre login y registro el formulario empieza limpio
  if (page === "register") return <AuthShell key="register" type="register" navigate={navigate} onAuth={handleAuth} />;
  if (page === "login") return <AuthShell key="login" type="login" navigate={navigate} onAuth={handleAuth} />;
  if (page === "products" && user) return <Products navigate={navigate} cartCount={cartCount} addToCart={() => setCartCount((count) => count + 1)} user={user} onLogout={handleLogout} />;
  return <div className="app-shell"><Header page={page} navigate={navigate} cartCount={cartCount} user={user} onLogout={handleLogout} /><Home navigate={navigate} /></div>;
}