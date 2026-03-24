declare module 'mjml-browser' {
  interface MjmlResult {
    html: string;
    errors: any[];
  }
  interface MjmlOptions {
    validationLevel?: 'strict' | 'soft' | 'skip';
    [key: string]: any;
  }
  export default function mjml2html(mjml: string, options?: MjmlOptions): MjmlResult;
}
