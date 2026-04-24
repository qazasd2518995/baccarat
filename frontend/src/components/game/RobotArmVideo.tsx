import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react';
import type { Card } from '../../types';
import trackingData from '../../data/robot-arm-tracking.json';

// ── 追踪数据类型 ──
interface TrackingFrame {
  frame: number;
  time: number;
  visible: boolean;
  windowIndex?: number;
  corners?: number[][];
  brightness?: number;
}

interface TrackingData {
  fps: number;
  totalFrames: number;
  videoDuration: number;
  cardWindows?: { startFrame: number; endFrame: number; startTime: number; endTime: number }[];
  frames: TrackingFrame[];
}

const tracking = trackingData as unknown as TrackingData;
const trackingCardWindows = buildCardWindows(tracking);

function buildCardWindows(data: TrackingData): {
  startFrame: number;
  endFrame: number;
  startTime: number;
  endTime: number;
}[] {
  if (data.cardWindows?.length) return data.cardWindows;

  const byWindow = new Map<number, { startFrame: number; endFrame: number; startTime: number; endTime: number }>();
  for (const frame of data.frames) {
    if (!frame.visible || frame.windowIndex === undefined) continue;
    const existing = byWindow.get(frame.windowIndex);
    if (!existing) {
      byWindow.set(frame.windowIndex, {
        startFrame: frame.frame,
        endFrame: frame.frame,
        startTime: frame.time,
        endTime: frame.time,
      });
      continue;
    }
    existing.startFrame = Math.min(existing.startFrame, frame.frame);
    existing.endFrame = Math.max(existing.endFrame, frame.frame);
    existing.startTime = Math.min(existing.startTime, frame.time);
    existing.endTime = Math.max(existing.endTime, frame.time);
  }

  return Array.from(byWindow.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, window]) => window);
}

// ── 工具函数 ──

/** 将 4 角点坐标转为 CSS matrix3d (从 58x82 的牌面映射到视频坐标) */
function cornersToMatrix3d(
  corners: number[][],
  srcW: number,
  srcH: number,
  videoW: number,
  videoH: number,
  containerW: number,
  containerH: number,
): string {
  // 视频在 object-contain 模式下的实际显示区域
  const videoAspect = videoW / videoH;
  const containerAspect = containerW / containerH;

  let displayW: number, displayH: number, offsetX: number, offsetY: number;
  if (containerAspect > videoAspect) {
    displayH = containerH;
    displayW = containerH * videoAspect;
    offsetX = (containerW - displayW) / 2;
    offsetY = 0;
  } else {
    displayW = containerW;
    displayH = containerW / videoAspect;
    offsetX = 0;
    offsetY = (containerH - displayH) / 2;
  }

  const scaleX = displayW / videoW;
  const scaleY = displayH / videoH;

  // 将视频像素坐标转换为容器坐标
  const dst = corners.map(([x, y]) => [
    x * scaleX + offsetX,
    y * scaleY + offsetY,
  ]);

  // 源矩形 (牌面图片的四个角)
  const src = [
    [0, 0],
    [srcW, 0],
    [srcW, srcH],
    [0, srcH],
  ];

  // 计算 3x3 透视变换矩阵
  const matrix = getPerspectiveTransform(
    src.map(p => p as [number, number]),
    dst.map(p => p as [number, number]),
  );

  if (!matrix) return '';

  // 转换为 CSS matrix3d
  // CSS matrix3d 是列优先的 4x4 矩阵
  return `matrix3d(${matrix[0][0]},${matrix[1][0]},0,${matrix[2][0]},${matrix[0][1]},${matrix[1][1]},0,${matrix[2][1]},0,0,1,0,${matrix[0][2]},${matrix[1][2]},0,${matrix[2][2]})`;
}

/** 计算 3x3 透视变换矩阵 (简化版 getPerspectiveTransform) */
function getPerspectiveTransform(
  src: [number, number][],
  dst: [number, number][],
): number[][] | null {
  // 构建 8x8 线性方程组 Ax = b
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const [sx, sy] = src[i];
    const [dx, dy] = dst[i];
    A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
    b.push(dx);
    A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
    b.push(dy);
  }

  // 高斯消元求解
  const n = 8;
  const augmented = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(augmented[row][col]) > Math.abs(augmented[maxRow][col])) {
        maxRow = row;
      }
    }
    [augmented[col], augmented[maxRow]] = [augmented[maxRow], augmented[col]];

    if (Math.abs(augmented[col][col]) < 1e-10) return null;

    for (let row = col + 1; row < n; row++) {
      const factor = augmented[row][col] / augmented[col][col];
      for (let j = col; j <= n; j++) {
        augmented[row][j] -= factor * augmented[col][j];
      }
    }
  }

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = augmented[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= augmented[i][j] * x[j];
    }
    x[i] /= augmented[i][i];
  }

  // 组装 3x3 矩阵
  return [
    [x[0], x[1], x[2]],
    [x[3], x[4], x[5]],
    [x[6], x[7], 1],
  ];
}

/** 根据时间查找最近的追踪帧 (二分查找) */
function findTrackingFrame(time: number, windowIndex: number): TrackingFrame | null {
  const frames = tracking.frames.filter(
    f => f.visible && f.windowIndex === windowIndex,
  );
  if (frames.length === 0) return null;

  // 找最近的帧
  let best = frames[0];
  let bestDist = Math.abs(best.time - time);
  for (const f of frames) {
    const dist = Math.abs(f.time - time);
    if (dist < bestDist) {
      best = f;
      bestDist = dist;
    }
  }

  // 如果距离最近帧超过 2 帧的时间，不显示
  if (bestDist > 2 / tracking.fps) return null;
  return best;
}

/** 获取牌面图片 URL */
function getCardSrc(card: Card): string {
  const rank = card.rank.toLowerCase();
  const prefix =
    rank === 'a' ? 'ace' :
    rank === 'j' ? 'jack' :
    rank === 'q' ? 'queen' :
    rank === 'k' ? 'king' :
    rank;
  return new URL(`../../assets/cards/${prefix}_of_${card.suit}.svg`, import.meta.url).href;
}

// ── 组件 ──

interface RobotArmVideoProps {
  /** 当前要显示的牌（按发牌顺序排列） */
  cards: Card[];
  /** 游戏阶段 */
  phase: 'betting' | 'sealed' | 'dealing' | 'result';
  /** 子元素（叠加在影片上方的 UI） */
  children?: React.ReactNode;
}

/**
 * 机械手臂发牌视讯组件
 *
 * 用法: 取代 DealerTable3D，在 Game.tsx 中使用。
 * - 播放机械臂循环影片
 * - 使用 OpenCV 追踪数据精确定位牌面
 * - CSS matrix3d 透视变形叠加牌面
 * - 直播感视觉滤镜（模糊、扫描线、暗角、噪点）
 *
 * 每次影片循环展示 2 张牌:
 *   窗口0 (2.4s-4.5s) → cards[cycle*2]
 *   窗口1 (10.0s-12.0s) → cards[cycle*2+1]
 */
const RobotArmVideo = memo(function RobotArmVideo({
  cards,
  phase,
  children,
}: RobotArmVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [cycleIndex, setCycleIndex] = useState(0);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const rafRef = useRef<number>(0);

  // 视频原始尺寸
  const VIDEO_W = 1280;
  const VIDEO_H = 720;
  // 牌面图片原始尺寸 (用于透视变换的源矩形，匹配追踪角点覆盖范围)
  const CARD_W = 82;
  const CARD_H = 124;

  // ── 容器尺寸监听 ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerSize({
          w: entry.contentRect.width,
          h: entry.contentRect.height,
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ── 进入 dealing 阶段时重置 ──
  useEffect(() => {
    if (phase === 'dealing') {
      setCycleIndex(0);
      const video = videoRef.current;
      if (video) {
        video.currentTime = 0;
        video.play().catch(() => {});
      }
    }
  }, [phase]);

  // ── 影片循环时递增 cycleIndex ──
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    // 检测循环点 (影片快结束时)
    if (video.currentTime < 0.1 && currentTime > 14) {
      setCycleIndex(prev => prev + 1);
    }
  }, [currentTime]);

  // ── 帧同步追踪 ──
  useEffect(() => {
    const initialVideo = videoRef.current;
    if (!initialVideo) return;

    if ('requestVideoFrameCallback' in initialVideo) {
      let id: number;
      const update = (_now: DOMHighResTimeStamp, meta: { mediaTime: number }) => {
        setCurrentTime(meta.mediaTime);
        id = (initialVideo as HTMLVideoElement).requestVideoFrameCallback(update);
      };
      id = (initialVideo as HTMLVideoElement).requestVideoFrameCallback(update);
      return () => (initialVideo as HTMLVideoElement).cancelVideoFrameCallback(id);
    }

    // Fallback
    const tick = () => {
      const currentVideo = videoRef.current;
      if (currentVideo && !currentVideo.paused) {
        setCurrentTime(currentVideo.currentTime);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── 计算当前应显示的牌面叠加 ──
  const overlays = useMemo(() => {
    if (phase !== 'dealing' || containerSize.w === 0) return [];

    const result: {
      key: number;
      card: Card;
      transform: string;
      brightness: number;
      opacity: number;
    }[] = [];

    for (let wi = 0; wi < trackingCardWindows.length; wi++) {
      const cardIdx = cycleIndex * 2 + wi;
      const card = cards[cardIdx];
      if (!card) continue;

      const frame = findTrackingFrame(currentTime, wi);
      if (!frame || !frame.corners) continue;

      const transform = cornersToMatrix3d(
        frame.corners,
        CARD_W,
        CARD_H,
        VIDEO_W,
        VIDEO_H,
        containerSize.w,
        containerSize.h,
      );
      if (!transform) continue;

      // 在窗口边界淡入淡出
      const window = trackingCardWindows[wi];
      const fadeIn = Math.min(1, (currentTime - window.startTime) / 0.15);
      const fadeOut = Math.min(1, (window.endTime - currentTime) / 0.15);
      const opacity = Math.max(0, Math.min(1, fadeIn, fadeOut));

      result.push({
        key: wi,
        card,
        transform,
        brightness: frame.brightness ?? 0.9,
        opacity,
      });
    }

    return result;
  }, [phase, currentTime, cycleIndex, cards, containerSize]);

  return (
    <div
      ref={containerRef}
      className="flex-1 relative flex flex-col overflow-hidden min-h-[250px] sm:min-h-[320px] lg:min-h-[700px]"
      style={{ background: '#050a0d' }}
    >
      {/* ── 机械臂影片 ── */}
      <video
        ref={videoRef}
        src="/videos/dreamina-robot-arm-raw.mp4"
        loop
        autoPlay
        muted
        playsInline
        onTimeUpdate={handleTimeUpdate}
        className="absolute inset-0 w-full h-full object-contain"
        style={{
          filter: 'blur(0.6px) saturate(0.85) contrast(1.05)',
          background: '#0a0a0a',
        }}
      />

      {/* ── 透视变形牌面叠加 ── */}
      {overlays.map(({ key, card, transform, brightness, opacity }) => (
        <img
          key={`card-overlay-${key}`}
          src={getCardSrc(card)}
          alt=""
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: CARD_W,
            height: CARD_H,
            transform,
            transformOrigin: '0 0',
            opacity,
            filter: `brightness(${brightness}) blur(0.4px)`,
            pointerEvents: 'none',
            zIndex: 5,
          }}
        />
      ))}

      {/* ── 直播感滤镜层 ── */}

      {/* 扫描线 */}
      <div
        className="absolute inset-0 pointer-events-none z-[6]"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
          mixBlendMode: 'multiply',
        }}
      />

      {/* 暗角 (Vignette) */}
      <div
        className="absolute inset-0 pointer-events-none z-[6]"
        style={{
          background: 'radial-gradient(ellipse 75% 65% at 50% 45%, transparent 50%, rgba(0,0,0,0.45) 100%)',
        }}
      />

      {/* 噪点 */}
      <div
        className="absolute inset-0 pointer-events-none z-[6] animate-grain"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          opacity: 0.04,
          mixBlendMode: 'overlay',
        }}
      />

      {/* 轻微绿色色调 (监控摄像头感) */}
      <div
        className="absolute inset-0 pointer-events-none z-[6]"
        style={{
          background: 'rgba(0, 40, 20, 0.06)',
          mixBlendMode: 'overlay',
        }}
      />

      {/* ── 子元素 (游戏 UI) ── */}
      {children && (
        <div className="absolute inset-0 z-10">
          {children}
        </div>
      )}
    </div>
  );
});

export default RobotArmVideo;
