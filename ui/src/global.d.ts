export {};

declare global {
  interface Window {
    // /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    // circomlibjs: any;
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    snarkjs: any;
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    ethereum: any;
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    Buffer: any;
  }
  
  var Buffer: typeof import('buffer').Buffer;
  var global: typeof globalThis;
}