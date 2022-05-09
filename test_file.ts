/**
 * asd
 */
async function test(x: number);
async function test(x: bigint);
async function test() {
  return 123;
}

class MyClass {
  /**
   * jsdoc 2
   */
  async aaaa(x: string);
  async aaaa(x: number);
  async aaaa(x: number|string) {
      console.log('yeet')
  }
}  
