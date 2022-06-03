export function postprocess(code: string): string {
  return code.replace(/<STR_LIT>/g, '').replace(/<NUM_LIT>/g, '0');
}
