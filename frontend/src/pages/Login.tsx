import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';
import { getBaccaratSkin, type BaccaratSkin } from '../config/baccaratSkins';

export default function Login() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const launchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const launchToken = launchParams.get('launchToken');
  const skin = useMemo(
    () => getBaccaratSkin(launchParams.get('skin'), launchParams.get('gameId')),
    [launchParams],
  );
  const [error, setError] = useState('');
  const [debug, setDebug] = useState<LaunchDebug | null>(null);
  const [trace, setTrace] = useState<LaunchTraceEntry[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isLoading, setIsLoading] = useState(Boolean(launchToken));
  const traceStartedAtRef = useRef(performance.now());
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  const addTrace = useCallback((label: string, detail?: string, tone: LaunchTraceEntry['tone'] = 'info') => {
    const entry: LaunchTraceEntry = {
      atMs: Math.round(performance.now() - traceStartedAtRef.current),
      label,
      detail,
      tone,
    };
    setTrace((prev) => [...prev.slice(-18), entry]);
    console.info('[BG Gateway Debug]', entry);
  }, []);

  useEffect(() => {
    if (!launchToken) return;

    const id = window.setInterval(() => {
      setElapsedMs(Math.round(performance.now() - traceStartedAtRef.current));
    }, 250);
    return () => window.clearInterval(id);
  }, [launchToken]);

  useEffect(() => {
    if (!launchToken) return;

    let cancelled = false;
    traceStartedAtRef.current = performance.now();
    setElapsedMs(0);
    const tokenPreview = `${launchToken.slice(0, 10)}...${launchToken.slice(-6)} (${launchToken.length} chars)`;
    const startEntry: LaunchTraceEntry = {
      atMs: 0,
      label: 'login route mounted',
      detail: `skin=${skin.id} gameId=${launchParams.get('gameId') || 'n/a'} token=${tokenPreview}`,
      tone: 'info',
    };
    setTrace([startEntry]);
    console.info('[BG Gateway Debug]', startEntry);
    setError('');
    setDebug(null);
    setIsLoading(true);

    const requestStartedAt = performance.now();
    addTrace('POST /auth/bg-launch start', `api=${apiUrl}`);
    authApi
      .bgLaunch(launchToken)
      .then(({ data }) => {
        if (cancelled) return;
        addTrace(
          'POST /auth/bg-launch ok',
          `${Math.round(performance.now() - requestStartedAt)}ms user=${data.user?.username ?? 'missing'} token=${data.token?.length ?? 0} chars`,
          'ok',
        );
        if (!data.token || !data.user) {
          addTrace('invalid launch response', 'missing token or user in response body', 'error');
          setError(i18n.language === 'zh' ? '百家樂啟動憑證無效' : 'Invalid baccarat launch token');
          return;
        }

        const storeStartedAt = performance.now();
        setAuth(data.token, data.user);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        addTrace(
          'auth saved',
          `${Math.round(performance.now() - storeStartedAt)}ms balance=${String(data.user.balance ?? 'n/a')}`,
          'ok',
        );
        addTrace('navigate /', 'replace=true; lobby route should mount next', 'ok');
        navigate('/', { replace: true });
      })
      .catch((err) => {
        if (cancelled) return;
        const nextError = getLaunchError(err, i18n.language);
        addTrace(
          'POST /auth/bg-launch failed',
          `after ${Math.round(performance.now() - requestStartedAt)}ms status=${nextError.debug.statusCode} message=${nextError.debug.backendMessage}`,
          'error',
        );
        console.error('[BG Gateway] bg-launch failed', nextError.debug, err);
        setError(nextError.message);
        setDebug(nextError.debug);
      })
      .finally(() => {
        if (!cancelled) {
          addTrace('launch promise settled', `total=${Math.round(performance.now() - traceStartedAtRef.current)}ms`);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [addTrace, apiUrl, i18n.language, launchParams, launchToken, navigate, setAuth, skin.id]);

  if (launchToken) {
    return (
      <LaunchScreen
        title={i18n.language === 'zh' ? `正在從 BG 進入${skin.brand}` : `Entering ${skin.brand} from BG`}
        subtitle={
          error
            ? error
            : i18n.language === 'zh'
              ? `正在同步會員資料與${skin.lobbyTitle}會話，請稍候。`
              : 'Synchronizing account and table session.'
        }
        isLoading={isLoading}
        tone={error ? 'error' : 'loading'}
        debug={debug}
        trace={trace}
        elapsedMs={elapsedMs}
        apiUrl={apiUrl}
        skin={skin}
      />
    );
  }

  return (
    <LaunchScreen
      title={i18n.language === 'zh' ? '請從 BG 平台進入百家樂' : 'Please launch Baccarat from BG'}
      subtitle={
        i18n.language === 'zh'
          ? '此站點不再提供獨立會員登入，請回到 BG 大廳從牌桌館進場。'
          : 'Standalone member login has been disabled. Please return to BG and launch from the table hall.'
      }
      isLoading={false}
      tone="idle"
      trace={trace}
      elapsedMs={elapsedMs}
      apiUrl={apiUrl}
      skin={skin}
    />
  );
}

interface LaunchTraceEntry {
  atMs: number;
  label: string;
  detail?: string;
  tone?: 'info' | 'ok' | 'warn' | 'error';
}

interface LaunchDebug {
  statusCode: string;
  errorCode: string;
  backendMessage: string;
  apiUrl: string;
}

function formatDebugMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function getLaunchError(error: unknown, language: string): { message: string; debug: LaunchDebug } {
  const axiosError = error as {
    message?: string;
    response?: { status?: number; data?: { code?: string; error?: string; message?: string } };
  };
  const statusCode = String(axiosError.response?.status ?? 'n/a');
  const errorCode = axiosError.response?.data?.code ?? 'BG_LAUNCH_FAILED';
  const backendMessage = axiosError.response?.data?.error ?? axiosError.response?.data?.message ?? axiosError.message ?? 'unknown';
  const debug = {
    statusCode,
    errorCode,
    backendMessage,
    apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  };

  if (statusCode === '409' || errorCode === 'BG_ACCOUNT_MAPPING_CONFLICT') {
    return {
      message:
        language === 'zh'
          ? '百家樂已有同名舊帳號，尚未綁定這個 BG 帳號。請通知管理員處理帳號映射。'
          : 'Baccarat already has an old account with this username. Ask an admin to resolve the account mapping.',
      debug,
    };
  }

  return {
    message:
      language === 'zh'
        ? `無法從 BG 自動登入百家樂：${backendMessage}`
        : `Failed to sign in from BG: ${backendMessage}`,
    debug,
  };
}

function LaunchScreen({
  title,
  subtitle,
  isLoading,
  tone,
  debug,
  trace,
  elapsedMs,
  apiUrl,
  skin,
}: {
  title: string;
  subtitle: string;
  isLoading: boolean;
  tone: 'loading' | 'error' | 'idle';
  debug?: LaunchDebug | null;
  trace?: LaunchTraceEntry[];
  elapsedMs?: number;
  apiUrl?: string;
  skin: BaccaratSkin;
}) {
  const accent =
    tone === 'error'
      ? {
          border: 'rgba(239, 68, 68, 0.35)',
          glow: 'rgba(239, 68, 68, 0.18)',
          text: '#fca5a5',
        }
      : {
          border: skin.id === 'nova' ? 'rgba(103, 232, 249, 0.30)' : skin.id === 'imperial' ? 'rgba(248, 198, 106, 0.32)' : 'rgba(212, 175, 55, 0.28)',
          glow: skin.id === 'nova' ? 'rgba(103, 232, 249, 0.18)' : skin.id === 'imperial' ? 'rgba(185, 28, 28, 0.22)' : 'rgba(212, 175, 55, 0.16)',
          text: skin.id === 'nova' ? '#a5f3fc' : skin.id === 'imperial' ? '#fde68a' : '#f5d87a',
        };
  const backdrop =
    skin.id === 'nova'
      ? `
            radial-gradient(ellipse 120% 80% at 80% 50%, rgba(124,58,237,0.16) 0%, transparent 50%),
            radial-gradient(ellipse 100% 100% at 20% 80%, rgba(6,182,212,0.12) 0%, transparent 40%),
            linear-gradient(135deg, #03131d 0%, #081723 50%, #050811 100%)
          `
      : skin.id === 'imperial'
        ? `
            radial-gradient(ellipse 120% 80% at 80% 50%, rgba(185,28,28,0.18) 0%, transparent 50%),
            radial-gradient(ellipse 100% 100% at 20% 80%, rgba(245,158,11,0.12) 0%, transparent 40%),
            linear-gradient(135deg, #180808 0%, #26100d 50%, #0d0505 100%)
          `
        : `
            radial-gradient(ellipse 120% 80% at 80% 50%, rgba(139,69,19,0.15) 0%, transparent 50%),
            radial-gradient(ellipse 100% 100% at 20% 80%, rgba(212,175,55,0.08) 0%, transparent 40%),
            linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0a0a0f 100%)
          `;

  return (
    <div className="min-h-screen w-full relative overflow-hidden" style={{ fontFamily: skin.fontFamily }}>
      <div
        className="absolute inset-0"
        style={{
          background: backdrop,
        }}
      />

      <div className="absolute inset-0 opacity-[0.03]" />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-8">
        <div
          className="w-full max-w-[620px] rounded-[28px] px-8 py-10 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(18,18,26,0.96) 0%, rgba(10,10,15,0.98) 100%)',
            border: `1px solid ${accent.border}`,
            boxShadow: `0 22px 60px ${accent.glow}`,
            backdropFilter: 'blur(18px)',
          }}
        >
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0c0c14] shadow-[0_0_32px_rgba(212,175,55,0.22)]">
            {isLoading ? (
              <Loader2 className="h-7 w-7 animate-spin" style={{ color: accent.text }} />
            ) : (
              <span className="text-2xl font-black" style={{ color: accent.text }}>{skin.logoText}</span>
            )}
          </div>
          <div className="text-[12px] tracking-[0.34em] uppercase" style={{ color: accent.text }}>{skin.english}</div>
          <h1 className="mt-4 text-[30px] font-bold text-white">{title}</h1>
          <p className="mt-3 text-[14px] leading-relaxed" style={{ color: accent.text }}>
            {subtitle}
          </p>
          {tone === 'error' && debug ? (
            <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-950/20 px-4 py-3 text-left font-mono text-[11px] leading-relaxed text-red-100/80">
              <div>status: {debug.statusCode}</div>
              <div>code: {debug.errorCode}</div>
              <div>message: {debug.backendMessage}</div>
              <div className="break-all">api: {debug.apiUrl}</div>
            </div>
          ) : null}
          <LaunchDebugPanel
            trace={trace ?? []}
            elapsedMs={elapsedMs ?? 0}
            apiUrl={apiUrl ?? ''}
            tone={tone}
          />
        </div>
      </div>
    </div>
  );
}

function LaunchDebugPanel({
  trace,
  elapsedMs,
  apiUrl,
  tone,
}: {
  trace: LaunchTraceEntry[];
  elapsedMs: number;
  apiUrl: string;
  tone: 'loading' | 'error' | 'idle';
}) {
  const toneClass = {
    info: 'text-white/72',
    ok: 'text-emerald-200',
    warn: 'text-yellow-200',
    error: 'text-red-200',
  };

  if (tone === 'idle' && trace.length === 0) return null;

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-black/28 px-4 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
        <div className="text-[11px] font-black uppercase tracking-[0.28em]" style={{ color: tone === 'error' ? '#fca5a5' : '#f5d87a' }}>
          Launch Debug
        </div>
        <div className="font-mono text-[11px] text-white/62">
          {tone.toUpperCase()} · {formatDebugMs(elapsedMs)}
        </div>
      </div>
      <div className="mt-2 break-all font-mono text-[10px] leading-relaxed text-white/45">
        api: {apiUrl || 'n/a'}
      </div>
      <div className="mt-3 max-h-[220px] space-y-1 overflow-auto pr-1 font-mono text-[10px] leading-relaxed">
        {trace.length > 0 ? (
          trace.map((entry, index) => (
            <div key={`${entry.atMs}-${entry.label}-${index}`} className={toneClass[entry.tone ?? 'info']}>
              <span className="text-white/34">+{formatDebugMs(entry.atMs)}</span>{' '}
              <span className="font-semibold">{entry.label}</span>
              {entry.detail ? <span className="text-white/46"> · {entry.detail}</span> : null}
            </div>
          ))
        ) : (
          <div className="text-white/45">waiting for launch token...</div>
        )}
      </div>
    </div>
  );
}
