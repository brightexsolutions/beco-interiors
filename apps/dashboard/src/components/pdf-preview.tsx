'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Icon, Notice, Skeleton } from '@beco/ui';

type PdfJs = typeof import('pdfjs-dist');

const ZOOM_MIN = 100;
const ZOOM_MAX = 200;
const ZOOM_STEP = 25;

let pdfjsReady: Promise<PdfJs> | null = null;

function loadPdfjs() {
  pdfjsReady ??= (async () => {
    const pdfjs = await import('pdfjs-dist');
    // Run the worker on the main thread. A real Worker plus React Strict
    // Mode's double mount was leaving getDocument hanging after destroy.
    const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs');
    (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = worker;
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    return pdfjs;
  })();
  return pdfjsReady;
}

function clampZoom(value: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
}

/**
 * Live PDF viewer for quote, receipt, and sales-review dialogs.
 *
 * iPhone Safari blanks a PDF in an iframe or a blob URL. pdf.js paints
 * each page onto a canvas instead, which is real pixels the phone can
 * scroll. Fetch happens here so a closed dialog does not start a load,
 * and so the three document panels share one path. Zoom is buttons plus
 * pinch, because a fitted page is too small to read on a phone.
 */
export function PdfPreview({
  src,
  title,
  loadingLabel,
  fallbackError,
}: {
  src: string;
  title: string;
  loadingLabel: string;
  fallbackError: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);
  const zoomRef = useRef(ZOOM_MIN);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(ZOOM_MIN);
  zoomRef.current = zoom;

  const zoomIn = useCallback(() => setZoom((current) => clampZoom(current + ZOOM_STEP)), []);
  const zoomOut = useCallback(() => setZoom((current) => clampZoom(current - ZOOM_STEP)), []);

  useEffect(() => {
    setZoom(ZOOM_MIN);
  }, [src]);

  useEffect(() => {
    const controller = new AbortController();
    let loadingTask: { destroy: () => Promise<unknown> } | null = null;

    const load = async () => {
      setError(null);
      setReady(false);
      hostRef.current?.replaceChildren();
      try {
        const response = await fetch(src, {
          signal: controller.signal,
          credentials: 'same-origin',
          cache: 'no-store',
        });
        if (!response.ok) {
          const detail = await response.text();
          if (!controller.signal.aborted) setError(detail || fallbackError);
          return;
        }
        const bytes = new Uint8Array(await response.arrayBuffer());
        const pdfjs = await loadPdfjs();
        if (controller.signal.aborted) return;
        const task = pdfjs.getDocument({
          data: bytes,
          disableStream: true,
          disableAutoFetch: true,
          useWasm: false,
          useWorkerFetch: false,
        });
        loadingTask = task;
        const doc = await task.promise;
        if (controller.signal.aborted) {
          await task.destroy();
          return;
        }
        const host = hostRef.current;
        if (!host) {
          setError(fallbackError);
          return;
        }
        const count = doc.numPages;
        if (count < 1) {
          setError(fallbackError);
          return;
        }
        for (let i = 1; i <= count; i += 1) {
          const page = await doc.getPage(i);
          if (controller.signal.aborted) return;
          const canvas = document.createElement('canvas');
          canvas.setAttribute('role', 'img');
          canvas.setAttribute('aria-label', `${title}, page ${i} of ${count}`);
          canvas.className = 'mb-4 w-full bg-high-vis-white last:mb-0';
          const context = canvas.getContext('2d');
          if (!context) {
            // jsdom, and any browser that refuses a 2d context: still expose
            // the page so the preview is not a blank iframe.
            canvas.width = 1;
            canvas.height = 1;
            host.append(canvas);
            continue;
          }
          const unscaled = page.getViewport({ scale: 1 });
          const width = Math.max(host.clientWidth, 320);
          const dpr = window.devicePixelRatio || 1;
          // Paint sharp enough for 200 percent zoom, then CSS scales.
          const viewport = page.getViewport({
            scale: (width / unscaled.width) * Math.min(dpr, 2) * (ZOOM_MAX / ZOOM_MIN),
          });
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = '100%';
          canvas.style.height = 'auto';
          await page.render({ canvas, viewport }).promise;
          if (controller.signal.aborted) return;
          host.append(canvas);
        }
        setReady(true);
      } catch (caught) {
        if (controller.signal.aborted) return;
        if (caught instanceof DOMException && caught.name === 'AbortError') return;
        setError(caught instanceof Error ? caught.message : fallbackError);
      }
    };

    void load();
    return () => {
      controller.abort();
      void loadingTask?.destroy?.();
    };
  }, [src, title, fallbackError]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !ready) return;

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setZoom((current) => clampZoom(current + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)));
    };

    const touchDistance = (touches: TouchList) => {
      const first = touches.item(0);
      const second = touches.item(1);
      if (!first || !second) return 0;
      return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) {
        pinchRef.current = null;
        return;
      }
      pinchRef.current = { distance: touchDistance(event.touches), zoom: zoomRef.current };
    };

    const onTouchMove = (event: TouchEvent) => {
      const pinch = pinchRef.current;
      if (!pinch || event.touches.length !== 2) return;
      event.preventDefault();
      const next = pinch.distance > 0 ? pinch.zoom * (touchDistance(event.touches) / pinch.distance) : pinch.zoom;
      setZoom(clampZoom(next));
    };

    const onTouchEnd = () => {
      if (!pinchRef.current) return;
      pinchRef.current = null;
      setZoom((current) => Math.round(current / ZOOM_STEP) * ZOOM_STEP);
    };

    scroller.addEventListener('wheel', onWheel, { passive: false });
    scroller.addEventListener('touchstart', onTouchStart, { passive: true });
    scroller.addEventListener('touchmove', onTouchMove, { passive: false });
    scroller.addEventListener('touchend', onTouchEnd);
    scroller.addEventListener('touchcancel', onTouchEnd);
    return () => {
      scroller.removeEventListener('wheel', onWheel);
      scroller.removeEventListener('touchstart', onTouchStart);
      scroller.removeEventListener('touchmove', onTouchMove);
      scroller.removeEventListener('touchend', onTouchEnd);
      scroller.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [ready]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Notice tone="alert">{error}</Notice>
      </div>
    );
  }

  const atMin = zoom <= ZOOM_MIN;
  const atMax = zoom >= ZOOM_MAX;

  return (
    <div className="absolute inset-0 flex flex-col bg-neutral-100">
      <div
        ref={scrollerRef}
        role="region"
        aria-label={title}
        aria-busy={!ready}
        className="min-h-0 flex-1 overflow-auto overscroll-contain p-4 touch-pan-x touch-pan-y"
      >
        {ready ? null : (
          <div role="status" aria-busy="true" aria-label={loadingLabel} className="absolute inset-0 p-6">
            <Skeleton className="h-full w-full rounded-none" />
          </div>
        )}
        <div
          ref={hostRef}
          className="mx-auto"
          style={{ width: `${zoom}%`, maxWidth: `${(52 * zoom) / 100}rem` }}
        />
      </div>
      {ready ? (
        <div className="flex shrink-0 items-center justify-center gap-2 border-t border-neutral-200 bg-high-vis-white px-4 py-2">
          <Button
            type="button"
            variant="ghost"
            disabled={atMin}
            aria-label={atMin ? 'Zoom out, already at 100 percent' : 'Zoom out'}
            onClick={zoomOut}
            className="min-w-11 px-0"
          >
            <Icon name="minus" />
          </Button>
          <span aria-live="polite" className="min-w-16 text-center font-ui text-base tabular-nums text-charcoal">
            {Math.round(zoom)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            disabled={atMax}
            aria-label={atMax ? 'Zoom in, already at 200 percent' : 'Zoom in'}
            onClick={zoomIn}
            className="min-w-11 px-0"
          >
            <Icon name="plus" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
