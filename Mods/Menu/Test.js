const Files = (ctx => {
  let OriginalNames = ctx.keys(); //Get original file names
  let WebpackNames = OriginalNames.map(ctx); //Get webpack file names
  return OriginalNames.reduce((o, k, i) => { o[k] = WebpackNames[i]; return o; }, {}); //Create map object
})(require.context('./lang', true, /.json/));

export default Files;
