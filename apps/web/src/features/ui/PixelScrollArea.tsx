import { useCallback, useId, useLayoutEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type KeyboardEvent, type PointerEvent, type ReactNode, type Ref, type TextareaHTMLAttributes } from 'react';
import './PixelScrollArea.css';

type Axis = 'vertical' | 'horizontal';
interface ScrollMetrics { extent: number; offset: number; viewport: number; track: number; thumb: number; position: number }
const emptyMetrics = (): ScrollMetrics => ({ extent: 0, offset: 0, viewport: 0, track: 0, thumb: 0, position: 0 });
const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value));

export interface PixelScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  orientation?: Axis | 'both';
  viewportClassName?: string;
  contentClassName?: string;
  viewportRef?: Ref<HTMLDivElement>;
  /** Native editing and caret scrolling with the same rail as document areas. */
  textareaProps?: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'children' | 'className' | 'id' | 'role'>;
  children?: ReactNode;
}

/** Native content scrolling, with a stable pixel track shared by all browsers. */
export function PixelScrollArea({ label, orientation = 'vertical', className = '', viewportClassName = '', contentClassName = '', viewportRef, textareaProps, children, ...props }: PixelScrollAreaProps) {
  const viewport = useRef<HTMLDivElement | HTMLTextAreaElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const verticalTrack = useRef<HTMLDivElement>(null);
  const horizontalTrack = useRef<HTMLDivElement>(null);
  const drag = useRef<{ axis: Axis; pointer: number; coordinate: number; offset: number } | null>(null);
  const metricsRef = useRef({ vertical: emptyMetrics(), horizontal: emptyMetrics() });
  const [metrics, setMetrics] = useState(metricsRef.current);
  const [dragging, setDragging] = useState<Axis | null>(null);
  const viewportId = useId();
  const hasVertical = orientation !== 'horizontal';
  const hasHorizontal = orientation !== 'vertical';
  const isTextarea = Boolean(textareaProps);
  const refresh = useRef<() => void>(() => {});

  const assignViewport = useCallback((element: HTMLDivElement | null) => {
    viewport.current = element;
    if (typeof viewportRef === 'function') viewportRef(element);
    else if (viewportRef) viewportRef.current = element;
  }, [viewportRef]);
  const assignTextarea = useCallback((element: HTMLTextAreaElement | null) => {
    viewport.current = element;
  }, []);

  useLayoutEffect(() => {
    const node = viewport.current;
    if (!node) return;
    let frame = 0;
    let disposed = false;
    const measure = () => {
      frame = 0;
      const readAxis = (axis: Axis): ScrollMetrics => {
        const vertical = axis === 'vertical';
        const size = vertical ? node.clientHeight : node.clientWidth;
        const total = vertical ? node.scrollHeight : node.scrollWidth;
        const extent = Math.max(0, total - size);
        const offset = clamp(vertical ? node.scrollTop : node.scrollLeft, extent);
        const track = vertical ? verticalTrack.current?.clientHeight ?? 0 : horizontalTrack.current?.clientWidth ?? 0;
        const thumb = Math.min(track, Math.max(32, Math.round((total ? size / total : 1) * track / 2) * 2));
        const position = extent ? clamp(Math.round(offset / extent * (track - thumb) / 2) * 2, track - thumb) : 0;
        return { extent, offset, viewport: size, track, thumb, position };
      };
      const next = { vertical: readAxis('vertical'), horizontal: readAxis('horizontal') };
      metricsRef.current = next;
      setMetrics(previous => (['vertical', 'horizontal'] as const).every(axis =>
        (Object.keys(next[axis]) as (keyof ScrollMetrics)[]).every(key => previous[axis][key] === next[axis][key])) ? previous : next);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    refresh.current = schedule;
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
    for (const target of [node, content.current, verticalTrack.current, horizontalTrack.current]) if (target) observer?.observe(target);
    // Content may change without changing its wrapper's border box (tables, details, images).
    const mutation = new MutationObserver(schedule);
    if (content.current) mutation.observe(content.current, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['open', 'hidden'] });
    node.addEventListener('scroll', schedule, { passive: true });
    node.addEventListener('input', schedule);
    node.addEventListener('load', schedule, true);
    window.addEventListener('resize', schedule);
    // A textarea has a fixed border box. A newly loaded font can change its
    // scrollHeight without producing a ResizeObserver notification.
    const fonts = isTextarea ? document.fonts : undefined;
    fonts?.addEventListener('loadingdone', schedule);
    void fonts?.ready.then(() => { if (!disposed) schedule(); });
    // A rail is next to the native viewport. Wheel input on it must operate
    // this area rather than scroll a surrounding page or another panel.
    const railListeners: Array<[HTMLDivElement, (event: WheelEvent) => void]> = [];
    for (const axis of ['vertical', 'horizontal'] as const) {
      const rail = axis === 'vertical' ? verticalTrack.current : horizontalTrack.current;
      if (!rail) continue;
      const onWheel = (event: WheelEvent) => {
        if (event.ctrlKey) return; // Preserve browser zoom / trackpad pinch.
        const delta = axis === 'vertical' ? event.deltaY : event.deltaX || event.deltaY;
        if (!delta) return;
        const unit = event.deltaMode === 1 ? parseFloat(getComputedStyle(node).lineHeight) || 16
          : event.deltaMode === 2 ? (axis === 'vertical' ? node.clientHeight : node.clientWidth) : 1;
        event.preventDefault();
        event.stopPropagation();
        node.scrollBy({ [axis === 'vertical' ? 'top' : 'left']: delta * unit, behavior: 'instant' });
      };
      rail.addEventListener('wheel', onWheel, { passive: false });
      railListeners.push([rail, onWheel]);
    }
    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
      mutation.disconnect();
      node.removeEventListener('scroll', schedule);
      node.removeEventListener('input', schedule);
      node.removeEventListener('load', schedule, true);
      window.removeEventListener('resize', schedule);
      fonts?.removeEventListener('loadingdone', schedule);
      for (const [rail, onWheel] of railListeners) rail.removeEventListener('wheel', onWheel);
      drag.current = null;
      if (refresh.current === schedule) refresh.current = () => {};
    };
  }, [hasVertical, hasHorizontal, isTextarea]);

  // React writes controlled values as properties, outside MutationObserver.
  useLayoutEffect(() => { refresh.current(); }, [textareaProps?.value, textareaProps?.defaultValue, textareaProps?.rows, textareaProps?.cols, textareaProps?.wrap]);

  const scrollTo = (axis: Axis, offset: number) => {
    const node = viewport.current;
    if (!node) return;
    const next = clamp(offset, metricsRef.current[axis].extent);
    // Do not inherit smooth scrolling: dragging must follow the pointer immediately.
    node.scrollTo({ [axis === 'vertical' ? 'top' : 'left']: next, behavior: 'instant' });
  };
  const onTrackKeyDown = (axis: Axis, event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    const value = metricsRef.current[axis];
    const backwards = axis === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
    const forwards = axis === 'vertical' ? 'ArrowDown' : 'ArrowRight';
    let offset: number;
    if (event.key === backwards) offset = value.offset - 40;
    else if (event.key === forwards) offset = value.offset + 40;
    else if (event.key === 'PageUp') offset = value.offset - value.viewport * .9;
    else if (event.key === 'PageDown') offset = value.offset + value.viewport * .9;
    else if (event.key === 'Home') offset = 0;
    else if (event.key === 'End') offset = value.extent;
    else return;
    event.preventDefault();
    scrollTo(axis, offset);
  };
  const onPointerDown = (axis: Axis, event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !event.isPrimary || metricsRef.current[axis].extent <= 1) return;
    event.preventDefault();
    const track = event.currentTarget;
    track.focus({ preventScroll: true });
    const value = metricsRef.current[axis];
    const coordinate = axis === 'vertical' ? event.clientY : event.clientX;
    const bounds = track.getBoundingClientRect();
    const local = coordinate - (axis === 'vertical' ? bounds.top + track.clientTop : bounds.left + track.clientLeft);
    const onThumb = (event.target as Element).closest('.pixel-scroll-area__thumb');
    if (!onThumb) {
      scrollTo(axis, value.offset + (local < value.position ? -1 : 1) * value.viewport * .9);
      return;
    }
    drag.current = { axis, pointer: event.pointerId, coordinate, offset: value.offset };
    setDragging(axis);
    track.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const active = drag.current;
    if (!active || active.pointer !== event.pointerId) return;
    const value = metricsRef.current[active.axis];
    const distance = value.track - value.thumb;
    if (distance <= 0) return;
    const coordinate = active.axis === 'vertical' ? event.clientY : event.clientX;
    scrollTo(active.axis, active.offset + (coordinate - active.coordinate) * value.extent / distance);
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointer !== event.pointerId) return;
    drag.current = null;
    setDragging(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const renderTrack = (axis: Axis) => {
    const value = metrics[axis];
    const overflowing = value.extent > 1;
    const style: CSSProperties = axis === 'vertical'
      ? { height: value.thumb, transform: `translateY(${value.position}px)` }
      : { width: value.thumb, transform: `translateX(${value.position}px)` };
    return <div ref={axis === 'vertical' ? verticalTrack : horizontalTrack}
      className={`pixel-scroll-area__track pixel-scroll-area__track--${axis}`}
      role="scrollbar" aria-label={`${label}: ${axis === 'vertical' ? 'вертикальная' : 'горизонтальная'} прокрутка`}
      aria-controls={viewportId} aria-orientation={axis} aria-valuemin={0} aria-valuemax={Math.round(value.extent)}
      aria-valuenow={Math.round(value.offset)} aria-valuetext={`${value.extent ? Math.round(value.offset / value.extent * 100) : 0} %`}
      aria-hidden={!overflowing} tabIndex={overflowing ? 0 : -1} data-overflow={overflowing} data-dragging={dragging === axis}
      onKeyDown={event => onTrackKeyDown(axis, event)} onPointerDown={event => onPointerDown(axis, event)}
      onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}>
      <span className="pixel-scroll-area__thumb" style={style} aria-hidden="true" />
    </div>;
  };

  return <div className={`pixel-scroll-area pixel-scroll-area--${orientation} ${className}`.trim()}
    data-overflow-y={hasVertical && metrics.vertical.extent > 1} data-overflow-x={hasHorizontal && metrics.horizontal.extent > 1} {...props}>
    {textareaProps
      ? <textarea {...textareaProps} ref={assignTextarea} id={viewportId}
          className={`pixel-scroll-area__viewport ${viewportClassName}`.trim()} aria-label={textareaProps['aria-label'] ?? label} />
      : <div ref={assignViewport} id={viewportId} className={`pixel-scroll-area__viewport ${viewportClassName}`.trim()}
          role="region" aria-label={label} tabIndex={metrics.vertical.extent > 1 || metrics.horizontal.extent > 1 ? 0 : undefined}>
          <div ref={content} className={`pixel-scroll-area__content ${contentClassName}`.trim()}>{children}</div>
        </div>}
    {hasVertical && renderTrack('vertical')}
    {hasHorizontal && renderTrack('horizontal')}
  </div>;
}
