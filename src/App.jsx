import React, { useCallback, useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import {
  scanImages,
  fetchMaterials,
  fetchLeaderboard,
  fetchHistory,
  getNickname,
  setNickname,
  ensureIdentity,
} from './api.js';

const BIN_EMOJI = {
  Verde: '🍾',
  Amarillo: '🥫',
  Azul: '📦',
  Marron: '🍎',
  Marrón: '🍎',
  Gris: '🗑️',
};

export default function App() {
  const [tab, setTab] = useState('scan');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [points, setPoints] = useState(() => Number(localStorage.getItem('ecosort_points') || 0));
  const [materials, setMaterials] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [history, setHistory] = useState([]);
  const [nickname, setNick] = useState(() => getNickname());
  const [nickInput, setNickInput] = useState('');
  const [showNickPrompt, setShowNickPrompt] = useState(() => !getNickname());
  // Miniaturas de las 3 capturas (data URL) para mostrar transparencia
  // del proceso de IA durante el analisis.
  const [frames, setFrames] = useState([]);
  // Guia de primer uso "como escanear bien" (solo la primera vez).
  const [showHowTo, setShowHowTo] = useState(
    () => !localStorage.getItem('ecosort_howto_seen')
  );
  const webcamRef = useRef(null);

  // Al montar, materializar la identidad del dispositivo (user_id + secreto).
  // Asi es estable desde el primer render y no depende de una peticion concreta.
  useEffect(() => {
    ensureIdentity();
  }, []);

  useEffect(() => {
    if (tab === 'guide' && materials.length === 0) {
      fetchMaterials().then(setMaterials).catch(() => {});
    }
    if (tab === 'rank') {
      fetchLeaderboard().then(setLeaders).catch(() => {});
    }
    if (tab === 'history') {
      fetchHistory().then(setHistory).catch(() => {});
    }
  }, [tab, materials.length]);

  const saveNickname = () => {
    const n = nickInput.trim().slice(0, 20);
    if (n.length < 2) return;
    setNickname(n);
    setNick(n);
    setShowNickPrompt(false);
  };

  const captureAndScan = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const video = webcamRef.current?.video;
      // Si hay flash/linterna disponible, encenderla para mejor luz.
      const track = video?.srcObject?.getVideoTracks?.()[0];
      const caps = track?.getCapabilities?.() || {};
      if (caps.torch) {
        try {
          await track.applyConstraints({ advanced: [{ torch: true }] });
        } catch {}
      }

      // Tomar 3 capturas con un pequeño intervalo. El backend promedia
      // las confianzas, lo que evita errores de una sola foto movida.
      const shots = [];
      const previews = [];
      for (let i = 0; i < 3; i++) {
        const shot = webcamRef.current?.getScreenshot();
        if (shot) {
          previews.push(shot); // data URL completa para la miniatura
          shots.push(shot.split(',')[1]); // quitar prefijo data:
        }
        if (i < 2) await new Promise((r) => setTimeout(r, 250));
      }
      setFrames(previews);
      if (track && caps.torch) {
        try {
          await track.applyConstraints({ advanced: [{ torch: false }] });
        } catch {}
      }

      if (shots.length === 0) throw new Error('No se pudo capturar la imagen');
      const data = await scanImages(shots, nickname);
      setResult(data);
      if (data.total_points != null) {
        setPoints(data.total_points);
        localStorage.setItem('ecosort_points', String(data.total_points));
      }
      // Tras el primer escaneo, ocultar la guia de uso.
      if (showHowTo) {
        localStorage.setItem('ecosort_howto_seen', '1');
        setShowHowTo(false);
      }
    } catch (e) {
      setError(e.message || 'Fallo la conexion con el servidor');
    } finally {
      setLoading(false);
    }
  }, [nickname, showHowTo]);

  return (
    <div className="app">
      <header className="top">
        <h1>♻️ EcoSort Vision</h1>
        <p>Aprende a clasificar tus residuos con IA real</p>
        <div className="points-pill">
          ⭐ {points} eco-puntos
          {nickname && <span className="nick-tag"> · {nickname}</span>}
        </div>
      </header>

      <nav className="tabs">
        <button className={`tab ${tab === 'scan' ? 'active' : ''}`} onClick={() => setTab('scan')}>
          <span className="tab-icon">📷</span>Escanear
        </button>
        <button className={`tab ${tab === 'guide' ? 'active' : ''}`} onClick={() => setTab('guide')}>
          <span className="tab-icon">📚</span>Guía
        </button>
        <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          <span className="tab-icon">🕘</span>Historial
        </button>
        <button className={`tab ${tab === 'rank' ? 'active' : ''}`} onClick={() => setTab('rank')}>
          <span className="tab-icon">🏆</span>Ranking
        </button>
      </nav>

      <main className="main" data-tab={tab}>
      {showNickPrompt && (
        <div className="nick-modal">
          <h2>👋 ¡Hola! Elige un apodo</h2>
          <p>Aparecerás con este nombre en el ranking de eco-héroes.</p>
          <input
            autoFocus
            maxLength={20}
            value={nickInput}
            onChange={(e) => setNickInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveNickname()}
            placeholder="Ej: AnaRecicla"
            aria-label="Tu apodo para el ranking"
          />
          <button className="btn btn-primary" onClick={saveNickname} disabled={nickInput.trim().length < 2}>
            Empezar a escanear
          </button>
          <p className="consent-note">
            Tu apodo y tus escaneos se guardan de forma anónima (sin correo ni contraseña).{' '}
            <a href="/privacidad.html" target="_blank" rel="noopener noreferrer">Política de privacidad</a>
          </p>
        </div>
      )}

      {showHowTo && !showNickPrompt && <HowToCard onDismiss={() => {
        localStorage.setItem('ecosort_howto_seen', '1');
        setShowHowTo(false);
      }} />}

      {tab === 'scan' && (
        <ScanTab
          webcamRef={webcamRef}
          onScan={captureAndScan}
          loading={loading}
          result={result}
          error={error}
          frames={frames}
          onRetry={() => setResult(null)}
        />
      )}
      {tab === 'guide' && <GuideTab materials={materials} />}
      {tab === 'rank' && <RankTab leaders={leaders} nickname={nickname} />}
      {tab === 'history' && <HistoryTab history={history} />}
      </main>

      <footer className="app-footer">
        <a href="/privacidad.html" target="_blank" rel="noopener noreferrer">Política de privacidad</a>
      </footer>
    </div>
  );
}

function HowToCard({ onDismiss }) {
  return (
    <div className="howto">
      <div className="howto-head">
        <h3>📷 Guía rápida para un buen escaneo</h3>
        <button className="howto-x" onClick={onDismiss} aria-label="Cerrar">✕</button>
      </div>
      <ul>
        <li><b>Centra</b> el residuo dentro del marco.</li>
        <li><b>Buena luz</b>: evita sombras fuertes o contraluz.</li>
        <li><b>Que llene</b> el encuadre, sin dejar mucho fondo.</li>
        <li>La IA analiza <b>3 capturas</b> y promedia para acertar más.</li>
      </ul>
    </div>
  );
}

function ScanTab({ webcamRef, onScan, loading, result, error, frames, onRetry }) {
  return (
    <div className="scan-layout">
      <div className="scan-cam">
        <div className="camera-wrap">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            screenshotQuality={0.92}
            videoConstraints={{
              facingMode: 'environment',
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            }}
          />
          <div className="scan-frame" />
          {!loading && <div className="laser" />}
          <div className="cam-hint">
            Centra el residuo · buena luz · que llene el marco
          </div>
        </div>

        <button className="btn btn-primary" onClick={onScan} disabled={loading}>
          {loading ? 'Analizando 3 capturas…' : '🎯 Identificar residuo'}
        </button>

        {loading && (
          <>
            <div className="loading">
              <div className="spinner" />
              La IA esta analizando 3 capturas…
            </div>
            {frames.length > 0 && (
              <div className="frames">
                {frames.map((f, i) => (
                  <img key={i} className="frame-thumb" src={f} alt={`captura ${i + 1}`} />
                ))}
              </div>
            )}
          </>
        )}

        {error && <div className="error-box">⚠️ {error}</div>}
      </div>

      <div className="scan-result">
        {!result && !loading && (
          <div className="scan-placeholder">
            🎯 Apunta a un residuo y pulsa "Identificar".<br />El resultado aparecerá aquí.
          </div>
        )}
        {result && !loading && <ResultCard result={result} onRetry={onRetry} />}
      </div>
    </div>
  );
}

function ResultCard({ result, onRetry }) {
  if (result.status === 'low_confidence') {
    return (
      <>
        <div className="result" style={{ borderColor: '#94a3b8', background: '#f1f5f9' }}>
          <div className="bin-emoji">🤔</div>
          <h2>No estoy seguro</h2>
          <p className="tip">{result.educational_tip}</p>
          <p className="conf">Confianza: {(result.confidence * 100).toFixed(0)}%</p>
          {onRetry && (
            <button className="btn btn-ghost" onClick={onRetry}>
              🔄 Escanear de nuevo
            </button>
          )}
        </div>
        <Alternatives alts={result.alternatives} />
      </>
    );
  }

  if (result.status !== 'ok') {
    return <div className="error-box">⚠️ Ocurrio un error. Intenta de nuevo.</div>;
  }

  const emoji = BIN_EMOJI[result.container_color] || '🗑️';

  return (
    <>
      <div
        className="result"
        style={{
          borderColor: result.container_hex,
          background: `${result.container_hex}22`,
        }}
      >
        <div className="bin-emoji">{emoji}</div>
        <h2>{result.material}</h2>
        <div className="bin-name">👉 Va en: {result.container_name_es}</div>
        <p className="conf">Confianza de la IA: {(result.confidence * 100).toFixed(1)}%</p>
        <p className="tip">💡 {result.educational_tip}</p>
        {result.examples_es && <p className="examples">Ejemplos: {result.examples_es}</p>}
        <div className="earned">+{result.points_earned} eco-puntos 🎉</div>
        <FeedbackButton result={result} onRetry={onRetry} />
      </div>
      <Alternatives alts={result.alternatives} />
    </>
  );
}

/** Boton discreto para reportar una clasificacion incorrecta. Es parte del
 *  compromiso de honestidad: si la IA se equivoca, el usuario lo sabe y puede
 *  re-escanear. Registra el evento en consola (listo para conectar a un
 *  endpoint de feedback en el futuro). */
function FeedbackButton({ result, onRetry }) {
  const [reported, setReported] = React.useState(false);
  if (reported) {
    return (
      <div className="feedback-thanks">
        ¡Gracias! Seguiremos mejorando. 🌱
      </div>
    );
  }
  return (
    <div className="feedback">
      <button
        className="feedback-btn"
        onClick={() => {
          // Registro listo para enviar a un endpoint de feedback en el futuro.
          console.info('[feedback] clasificacion_reportada', {
            material: result.material,
            confidence: result.confidence,
            at: new Date().toISOString(),
          });
          setReported(true);
          if (onRetry) setTimeout(onRetry, 1200);
        }}
      >
        🤔 ¿Está mal? Repórtalo
      </button>
    </div>
  );
}

function Alternatives({ alts }) {
  if (!alts || alts.length === 0) return null;
  return (
    <div className="alts">
      <h3>¿Tal vez quisiste decir?</h3>
      {alts.map((a, i) => (
        <div className="alt-row" key={i}>
          <span className="alt-dot" style={{ background: a.container_hex }} />
          <div className="alt-info">
            <div className="alt-name">{a.name_es}</div>
            <div className="alt-bin">Va en: {a.container_name_es}</div>
          </div>
          <span className="alt-conf">{(a.confidence * 100).toFixed(0)}%</span>
        </div>
      ))}
    </div>
  );
}

function GuideTab({ materials }) {
  if (materials.length === 0) {
    return <div className="loading">Cargando guía…</div>;
  }
  return (
    <>
      <div className="section-title">Los 9 tipos de residuo y su tacho</div>
      {materials.map((m) => (
        <div className="mat-card" key={m.model_class} style={{ borderLeftColor: m.container_hex }}>
          <div className="mat-head">
            <span className="mat-dot" style={{ background: m.container_hex }} />
            <h3>{m.name_es}</h3>
            <span className="mat-points">+{m.points} pts</span>
          </div>
          <div className="mat-bin">👉 {m.container_name_es}</div>
          <div className="mat-tip">💡 {m.educational_tip}</div>
          <div className="mat-examples">Ejemplos: {m.examples_es}</div>
        </div>
      ))}
    </>
  );
}

const MEDALS = ['🥇', '🥈', '🥉'];

function RankTab({ leaders, nickname }) {
  if (leaders.length === 0) {
    return <div className="loading">Sé el primero en escanear un residuo 🌱</div>;
  }
  return (
    <>
      <div className="section-title">Top eco-héroes</div>
      {leaders.map((l, i) => (
        <div
          className={`lb-row ${nickname && l.nickname === nickname ? 'me' : ''}`}
          key={i}
        >
          <span className="lb-rank">{MEDALS[i] || `#${i + 1}`}</span>
          <span className="lb-name">{l.nickname}</span>
          <span className="lb-pts">⭐ {l.eco_points}</span>
        </div>
      ))}
    </>
  );
}

function HistoryTab({ history }) {
  if (history.length === 0) {
    return (
      <div className="loading">
        Aun no has escaneado nada. Ve a la pestaña 📷 Escanear y separa
        tu primer residuo.
      </div>
    );
  }
  return (
    <>
      <div className="section-title">Lo que ya separaste bien</div>
      {history.map((h, i) => (
        <div className="mat-card" key={i} style={{ borderLeftColor: h.container_hex }}>
          <div className="mat-head">
            <span className="mat-dot" style={{ background: h.container_hex }} />
            <h3>{h.material}</h3>
            <span className="mat-points">+{h.points_awarded} pts</span>
          </div>
          <div className="mat-bin">👉 {h.container_name_es}</div>
          <div className="mat-examples">
            Confianza {(h.confidence * 100).toFixed(0)}% ·{' '}
            {new Date(h.scanned_at).toLocaleString('es')}
          </div>
        </div>
      ))}
    </>
  );
}
