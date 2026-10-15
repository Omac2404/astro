// page-flip (StPageFlip, MIT) paketinin kullandığımız kısmı için tip bildirimi — paket kendi .d.ts'ini dağıtmıyor.
declare module "page-flip/dist/js/page-flip.module.js" {
  export class PageFlip {
    constructor(el: HTMLElement, opts: Record<string, unknown>);
    loadFromHTML(items: NodeListOf<HTMLElement> | HTMLElement[]): void;
    flipNext(corner?: "top" | "bottom"): void;
    flipPrev(corner?: "top" | "bottom"): void;
    turnToPage(n: number): void;
    getCurrentPageIndex(): number;
    getPageCount(): number;
    on(ev: "flip" | "changeOrientation" | "init", cb: (e: { data: unknown }) => void): void;
    destroy(): void;
  }
}
