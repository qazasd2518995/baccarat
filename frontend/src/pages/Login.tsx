import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';

export default function Login() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const launchToken = useMemo(() => new URLSearchParams(window.location.search).get('launchToken'), []);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(Boolean(launchToken));

  useEffect(() => {
    if (!launchToken) return;

    let cancelled = false;
    setError('');
    setIsLoading(true);

    authApi
      .bgLaunch(launchToken)
      .then(({ data }) => {
        if (cancelled) return;
        if (!data.token || !data.user) {
          setError(i18n.language === 'zh' ? '百家樂啟動憑證無效' : 'Invalid baccarat launch token');
          return;
        }

        setAuth(data.token, data.user);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/', { replace: true });
      })
      .catch(() => {
        if (cancelled) return;
        setError(i18n.language === 'zh' ? '無法從 BG 自動登入百家樂' : 'Failed to sign in from BG');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [i18n.language, launchToken, navigate, setAuth]);

  if (launchToken) {
    return (
      <LaunchScreen
        title={i18n.language === 'zh' ? '正在從 BG 進入百家樂' : 'Entering Baccarat from BG'}
        subtitle={
          error
            ? error
            : i18n.language === 'zh'
              ? '正在同步會員資料與桌台會話，請稍候。'
              : 'Synchronizing account and table session.'
        }
        isLoading={isLoading}
        tone={error ? 'error' : 'loading'}
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
    />
  );
}

function LaunchScreen({
  title,
  subtitle,
  isLoading,
  tone,
}: {
  title: string;
  subtitle: string;
  isLoading: boolean;
  tone: 'loading' | 'error' | 'idle';
}) {
  const accent =
    tone === 'error'
      ? {
          border: 'rgba(239, 68, 68, 0.35)',
          glow: 'rgba(239, 68, 68, 0.18)',
          text: '#fca5a5',
        }
      : {
          border: 'rgba(212, 175, 55, 0.28)',
          glow: 'rgba(212, 175, 55, 0.16)',
          text: '#f5d87a',
        };

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 80% 50%, rgba(139,69,19,0.15) 0%, transparent 50%),
            radial-gradient(ellipse 100% 100% at 20% 80%, rgba(212,175,55,0.08) 0%, transparent 40%),
            linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0a0a0f 100%)
          `,
        }}
      />

      <div className="absolute inset-0 opacity-[0.03]" />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <div
          className="w-full max-w-[520px] rounded-[28px] px-8 py-10 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(18,18,26,0.96) 0%, rgba(10,10,15,0.98) 100%)',
            border: `1px solid ${accent.border}`,
            boxShadow: `0 22px 60px ${accent.glow}`,
            backdropFilter: 'blur(18px)',
          }}
        >
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0c0c14] shadow-[0_0_32px_rgba(212,175,55,0.22)]">
            {isLoading ? (
              <Loader2 className="h-7 w-7 animate-spin text-[#d4af37]" />
            ) : (
              <span className="text-2xl font-black text-[#d4af37]">JW</span>
            )}
          </div>
          <div className="text-[12px] tracking-[0.34em] text-amber-500/55 uppercase">BG Gateway</div>
          <h1 className="mt-4 text-[30px] font-bold text-white">{title}</h1>
          <p className="mt-3 text-[14px] leading-relaxed" style={{ color: accent.text }}>
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}
