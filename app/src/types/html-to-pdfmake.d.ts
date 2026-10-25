declare module "html-to-pdfmake" {
  interface HtmlToPdfmakeOptions {
    window?: Window;
    defaultStyles?: Record<string, Record<string, unknown>>;
    tableAutoSize?: boolean;
    removeExtraBlanks?: boolean;
  }
  export default function htmlToPdfmake(
    html: string,
    options?: HtmlToPdfmakeOptions,
  ): unknown;
}
