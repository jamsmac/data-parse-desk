/**
 * WebGL Context Manager
 * Управление WebGL контекстами для оптимизации производительности
 */

class WebGLContextManager {
  private static instance: WebGLContextManager;
  private contexts: Set<WebGLRenderingContext | WebGL2RenderingContext> = new Set();
  private maxContexts: number = 2;
  private contextQueue: Array<() => void> = [];

  private constructor() {
    // Ограничиваем количество контекстов
    this.maxContexts = this.detectOptimalContextLimit();
  }

  static getInstance(): WebGLContextManager {
    if (!WebGLContextManager.instance) {
      WebGLContextManager.instance = new WebGLContextManager();
    }
    return WebGLContextManager.instance;
  }

  /**
   * Определяет оптимальное количество WebGL контекстов
   */
  private detectOptimalContextLimit(): number {
    // Проверяем возможности устройства
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (!gl) {
      return 0; // WebGL не поддерживается
    }

    // Получаем информацию о GPU
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      
      // Определяем лимит на основе GPU
      if (renderer.includes('NVIDIA') || renderer.includes('AMD')) {
        return 3; // Высокопроизводительные GPU
      } else if (renderer.includes('Intel')) {
        return 2; // Интегрированная графика
      } else if (renderer.includes('Mali') || renderer.includes('Adreno')) {
        return 1; // Мобильные GPU
      }
    }

    // Fallback на основе памяти
    const memory = (navigator as any).deviceMemory || 4;
    if (memory >= 8) return 3;
    if (memory >= 4) return 2;
    return 1;
  }

  /**
   * Создает новый WebGL контекст с ограничениями
   */
  createContext(canvas: HTMLCanvasElement): WebGLRenderingContext | WebGL2RenderingContext | null {
    if (this.contexts.size >= this.maxContexts) {
      console.warn(`WebGL context limit reached (${this.maxContexts}). Queuing context creation.`);
      return this.queueContextCreation(canvas);
    }

    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (gl) {
      this.contexts.add(gl);
      
      // Добавляем обработчик для очистки при потере контекста
      canvas.addEventListener('webglcontextlost', () => {
        this.contexts.delete(gl);
        this.processQueue();
      });
    }

    return gl;
  }

  /**
   * Очередь для создания контекстов
   */
  private queueContextCreation(canvas: HTMLCanvasElement): WebGLRenderingContext | WebGL2RenderingContext | null {
    return new Promise((resolve) => {
      this.contextQueue.push(() => {
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (gl) {
          this.contexts.add(gl);
          canvas.addEventListener('webglcontextlost', () => {
            this.contexts.delete(gl);
            this.processQueue();
          });
        }
        resolve(gl);
      });
    }) as any;
  }

  /**
   * Обрабатывает очередь создания контекстов
   */
  private processQueue(): void {
    if (this.contextQueue.length > 0 && this.contexts.size < this.maxContexts) {
      const createContext = this.contextQueue.shift();
      if (createContext) {
        createContext();
      }
    }
  }

  /**
   * Удаляет контекст
   */
  removeContext(gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    this.contexts.delete(gl);
    this.processQueue();
  }

  /**
   * Получает информацию о контекстах
   */
  getContextInfo(): {
    active: number;
    max: number;
    queued: number;
  } {
    return {
      active: this.contexts.size,
      max: this.maxContexts,
      queued: this.contextQueue.length,
    };
  }

  /**
   * Очищает все контексты
   */
  clearAllContexts(): void {
    this.contexts.forEach(gl => {
      const canvas = gl.canvas as HTMLCanvasElement;
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) {
        ext.loseContext();
      }
    });
    this.contexts.clear();
    this.contextQueue = [];
  }
}

/**
 * Hook для управления WebGL контекстом в React компонентах
 */
export function useWebGLContext(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const manager = WebGLContextManager.getInstance();
  const [context, setContext] = React.useState<WebGLRenderingContext | WebGL2RenderingContext | null>(null);
  const [isQueued, setIsQueued] = React.useState(false);

  React.useEffect(() => {
    if (!canvasRef.current) return;

    const gl = manager.createContext(canvasRef.current);
    if (gl) {
      setContext(gl);
      setIsQueued(false);
    } else {
      setIsQueued(true);
    }

    return () => {
      if (context) {
        manager.removeContext(context);
      }
    };
  }, [canvasRef, context, manager]);

  return { context, isQueued, contextInfo: manager.getContextInfo() };
}

/**
 * Компонент для условного рендеринга WebGL контента
 */
export function WebGLConditionalRenderer({ 
  children, 
  fallback 
}: { 
  children: React.ReactNode; 
  fallback: React.ReactNode; 
}) {
  const manager = WebGLContextManager.getInstance();
  const [canRender, setCanRender] = React.useState(false);

  React.useEffect(() => {
    const info = manager.getContextInfo();
    setCanRender(info.active < info.max);
  }, [manager]);

  return canRender ? children : fallback;
}

/**
 * Оптимизированный Aurora Background с ограничением контекстов
 */
export function OptimizedAuroraBackground({ 
  children, 
  ...props 
}: { 
  children: React.ReactNode; 
  [key: string]: unknown;
}) {
  const manager = WebGLContextManager.getInstance();
  const [shouldRender, setShouldRender] = React.useState(false);

  React.useEffect(() => {
    const info = manager.getContextInfo();
    setShouldRender(info.active < info.max);
  }, [manager]);

  if (!shouldRender) {
    // Fallback без WebGL эффектов
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
        {children}
      </div>
    );
  }

  // Рендерим с WebGL эффектами
  return (
    <WebGLConditionalRenderer
      fallback={
        <div className="relative min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
          {children}
        </div>
      }
    >
      <AuroraBackground {...props}>
        {children}
      </AuroraBackground>
    </WebGLConditionalRenderer>
  );
}

/**
 * Performance мониторинг для WebGL
 */
export class WebGLPerformanceMonitor {
  private static instance: WebGLPerformanceMonitor;
  private frameCount: number = 0;
  private lastTime: number = 0;
  private fps: number = 60;
  private isMonitoring: boolean = false;

  static getInstance(): WebGLPerformanceMonitor {
    if (!WebGLPerformanceMonitor.instance) {
      WebGLPerformanceMonitor.instance = new WebGLPerformanceMonitor();
    }
    return WebGLPerformanceMonitor.instance;
  }

  start(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.lastTime = performance.now();
    this.measureFPS();
  }

  stop(): void {
    this.isMonitoring = false;
  }

  private measureFPS(): void {
    if (!this.isMonitoring) return;

    const currentTime = performance.now();
    this.frameCount++;

    if (currentTime - this.lastTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
      this.frameCount = 0;
      this.lastTime = currentTime;

      // Автоматически ограничиваем контексты при низком FPS
      if (this.fps < 30) {
        const manager = WebGLContextManager.getInstance();
        manager.clearAllContexts();
        console.warn('Low FPS detected, clearing WebGL contexts');
      }
    }

    requestAnimationFrame(() => this.measureFPS());
  }

  getFPS(): number {
    return this.fps;
  }

  getPerformanceLevel(): 'high' | 'medium' | 'low' {
    if (this.fps >= 50) return 'high';
    if (this.fps >= 30) return 'medium';
    return 'low';
  }
}

// Экспорт синглтона
export const webglManager = WebGLContextManager.getInstance();
export const webglMonitor = WebGLPerformanceMonitor.getInstance();

// Автоматический мониторинг в development
if (import.meta.env.DEV) {
  webglMonitor.start();
}