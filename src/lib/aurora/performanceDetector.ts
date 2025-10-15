/**
 * Performance Detector
 * Определяет производительность устройства для адаптации эффектов
 */

// Расширение типов для Navigator API
interface NavigatorWithDeviceMemory extends Navigator {
  deviceMemory?: number;
  connection?: {
    effectiveType?: string;
  };
}

// Расширение типов для WebGL Debug
interface WebGLDebugRendererInfo {
  UNMASKED_RENDERER_WEBGL: number;
}

export type DevicePerformance = 'high' | 'medium' | 'low';

export interface PerformanceMetrics {
  cpuCores: number;
  memory: number; // GB
  connection: 'slow' | 'fast' | 'unknown';
  gpu: 'high' | 'low' | 'unknown';
  prefersReducedMotion: boolean;
}

/**
 * Определяет производительность устройства
 */
export function detectDevicePerformance(): DevicePerformance {
  const metrics = getPerformanceMetrics();
  
  // Проверяем prefers-reduced-motion
  if (metrics.prefersReducedMotion) {
    return 'low';
  }

  // Подсчет баллов производительности
  let score = 0;

  // CPU
  if (metrics.cpuCores >= 8) score += 3;
  else if (metrics.cpuCores >= 4) score += 2;
  else score += 1;

  // Memory
  if (metrics.memory >= 8) score += 3;
  else if (metrics.memory >= 4) score += 2;
  else score += 1;

  // Connection
  if (metrics.connection === 'fast') score += 2;
  else if (metrics.connection === 'slow') score += 0;
  else score += 1;

  // GPU
  if (metrics.gpu === 'high') score += 2;
  else score += 1;

  // Определяем уровень производительности
  if (score >= 8) return 'high';
  if (score >= 5) return 'medium';
  return 'low';
}

/**
 * Получает метрики производительности
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  const metrics: PerformanceMetrics = {
    cpuCores: navigator.hardwareConcurrency || 4,
    memory: 4, // default
    connection: 'unknown',
    gpu: 'unknown',
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };

  // Memory (если доступно)
  const nav = navigator as NavigatorWithDeviceMemory;
  if ('deviceMemory' in nav && nav.deviceMemory) {
    metrics.memory = nav.deviceMemory;
  }

  // Connection
  if ('connection' in nav && nav.connection) {
    const conn = nav.connection;
    if (conn && conn.effectiveType) {
      const effectiveType = conn.effectiveType;
      metrics.connection = effectiveType === '4g' || effectiveType === '5g' ? 'fast' : 'slow';
    }
  }

  // GPU (простая эвристика через WebGL)
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl && gl instanceof WebGLRenderingContext) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info') as WebGLDebugRendererInfo | null;
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
        // Простая проверка на известные GPU
        if (renderer.match(/nvidia|amd|radeon|geforce/i)) {
          metrics.gpu = 'high';
        } else {
          metrics.gpu = 'low';
        }
      }
    }
  } catch (e) {
    // GPU detection failed
  }

  return metrics;
}

/**
 * Мониторит FPS для динамической адаптации
 */
export class FPSMonitor {
  private frames: number[] = [];
  private lastTime = performance.now();
  private running = false;
  private rafId?: number;
  private callback?: (fps: number) => void;

  start(callback: (fps: number) => void) {
    this.callback = callback;
    this.running = true;
    this.measure();
  }

  stop() {
    this.running = false;
    if (this.rafId !== undefined) {
      cancelAnimationFrame(this.rafId);
      this.rafId = undefined;
    }
  }

  private measure = () => {
    if (!this.running) return;

    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;

    const fps = 1000 / delta;
    this.frames.push(fps);

    // Храним последние 60 фреймов (примерно 1 секунда при 60 FPS)
    if (this.frames.length > 60) {
      this.frames.shift();
    }

    // Вычисляем средний FPS каждые 30 фреймов
    if (this.frames.length === 60) {
      const avgFps = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
      this.callback?.(avgFps);
      this.frames = [];
    }

    this.rafId = requestAnimationFrame(this.measure);
  };
}

/**
 * Определяет поддержку браузером современных фич
 */
export function getBrowserCapabilities() {
  return {
    intersectionObserver: 'IntersectionObserver' in window,
    resizeObserver: 'ResizeObserver' in window,
    requestIdleCallback: 'requestIdleCallback' in window,
    webGL: (() => {
      try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
      } catch {
        return false;
      }
    })(),
    webGL2: (() => {
      try {
        const canvas = document.createElement('canvas');
        return !!canvas.getContext('webgl2');
      } catch {
        return false;
      }
    })(),
    backdropFilter: typeof CSS !== 'undefined' && CSS.supports?.('backdrop-filter', 'blur(10px)') || false,
  };
}

/**
 * Рекомендации по эффектам на основе производительности
 */
export function getEffectRecommendations(performance: DevicePerformance) {
  const recommendations = {
    high: {
      particles: true,
      particleCount: 100,
      blur: true,
      shadows: true,
      animations: true,
      parallax: true,
      complexGradients: true,
    },
    medium: {
      particles: true,
      particleCount: 50,
      blur: true,
      shadows: true,
      animations: true,
      parallax: false,
      complexGradients: true,
    },
    low: {
      particles: false,
      particleCount: 0,
      blur: false,
      shadows: false,
      animations: false,
      parallax: false,
      complexGradients: false,
    },
  };

  return recommendations[performance];
}
