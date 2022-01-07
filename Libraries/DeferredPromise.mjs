/**
 * This is a wrapper around the standard Promise to allow for nicer syntax when deferring promise resolutions. Example use:
 * <pre>
 *   const Wait = new DeferredPromise;
 *    setTimeout(function(){
 *      Wait.resolve();
 *    }, 1000);
 *    await Wait;
 *    console.log("1 second passed");
 * </pre>
 */
export default class DeferredPromise extends Promise{
  /*static{
    DeferredPromise.prototype.constructor = Promise;
  }*/ //these aren't a thing yet
  static #InitCaller = DeferredPromise.#StaticInit();
  static #StaticInit(){
    DeferredPromise.prototype.constructor = Promise;
  }
  constructor(Options = {}){
    let resolve, reject;
    super(function(Resolve, Reject){
      resolve = Resolve;
      reject = Reject;
    });
    this.resolve = resolve;
    this.reject = reject;
    if(Options.Timeout){
      globalThis.setTimeout(this.reject.bind(this), +Options.Timeout);
    }
  }
};