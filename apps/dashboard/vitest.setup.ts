import { vi } from 'vitest';

/**
 * pdf.js talks to a worker and a real canvas. jsdom has neither, and the
 * dashboard tests only need to prove the preview asked for the file and
 * exposed a page, not that Mozilla's renderer painted glyphs.
 */
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: async () => ({
        getViewport: ({ scale }: { scale: number }) => ({
          width: 595 * scale,
          height: 842 * scale,
        }),
        render: () => ({ promise: Promise.resolve() }),
      }),
    }),
    destroy: async () => {},
  })),
}));

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs', () => ({
  WorkerMessageHandler: {},
}));
