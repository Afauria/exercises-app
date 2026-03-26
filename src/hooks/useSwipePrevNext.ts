import { useEffect, type MutableRefObject, type RefObject } from 'react';

const SWIPE_PX = 56;

/**
 * 在目标区域水平滑动：左划下一题、右划上一题
 * @param attachKey 变化时重新绑定（例如做题页从 loading 进入就绪后 ref 才挂到 DOM）
 */
export function useSwipePrevNext(
  targetRef: RefObject<HTMLElement | null>,
  handlersRef: MutableRefObject<{ prev: () => void; next: () => void }>,
  attachKey?: number | string
) {
  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    let startX: number | null = null;

    const onStart = (e: TouchEvent) => {
      startX = e.changedTouches[0]?.clientX ?? null;
    };

    const onEnd = (e: TouchEvent) => {
      if (startX == null) return;
      const x1 = e.changedTouches[0]?.clientX;
      const x0 = startX;
      startX = null;
      if (x1 == null) return;
      const dx = x1 - x0;
      if (Math.abs(dx) < SWIPE_PX) return;
      const { prev, next } = handlersRef.current;
      if (dx < 0) next();
      else prev();
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchend', onEnd);
    };
  }, [targetRef, handlersRef, attachKey]);
}
