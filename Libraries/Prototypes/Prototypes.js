///https://johnresig.com/blog/partial-functions-in-javascript/
/*Function.prototype.Partial = function(){
  var fn = this, args = Array.prototype.slice.call(arguments);
  return function(){
    var arg = 0;
		let Args = {};
		Object.assign(Args, args);
		for ( var i = 0; i < Args.length && arg < arguments.length; i++ ) if ( Args[i] === undefined ) Args[i] = arguments[arg++];
    return fn.bind(this, Args);
  };
};*/

/*Function.prototype.Partial = function(){
		let fn = this;
    var bound_args = [].slice.call(arguments, 1);
    return function() {
        var args = [].concat.call(arguments, bound_args);
        return fn.apply(this, args);
    };
}
*/

///https://stackoverflow.com/a/16400626
Function.prototype.BindArgs =
    function (...boundArgs)
    {
        const targetFunction = this;
        return function (...args) { return targetFunction.call(this, ...boundArgs, ...args); };
    };

Array.prototype.AddItems = function(...Items){ //Used for chaining array calls.
  this.push(...Items);
  return this;
}

/*void function () { // https://gist.github.com/jussi-kalliokoski/5033123

if ("Dispose" in ArrayBuffer.prototype) return;

var blob = new Blob([''], {
    type: 'text/javascript'
})
var url = URL.createObjectURL(blob)
var worker = new Worker(url)
URL.revokeObjectURL(url)

Object.defineProperty(ArrayBuffer.prototype, "Dispose", {
    writable: true,
    enumerable: false,
    value: function () {
        worker.postMessage(this, [this])
    }
})

}()

void function () { // https://gist.github.com/jussi-kalliokoski/5033123

if ("Dispose" in SharedArrayBuffer.prototype) return;

var blob = new Blob([''], {
    type: 'text/javascript'
})
var url = URL.createObjectURL(blob)
var worker = new Worker(url)
URL.revokeObjectURL(url)

Object.defineProperty(SharedArrayBuffer.prototype, "Dispose", {
    writable: true,
    enumerable: false,
    value: function () {
        worker.postMessage(this, [this])
    }
})

}()*/

function bind_trailing_args(fn) {
    var bound_args = [].slice.call(arguments, 1);
    return function() {
        var args = [].concat.call(arguments, bound_args);
        return fn.apply(this, args);
    };
}
