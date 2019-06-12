let Vue = {
  version: null,    // 版本

  $isServer: null,
}

Vue.prototype = {
  $isServer: null,  // 是否服务端渲染
  $options: null,   // 参数对象（由默认参数、传入的参数）
  $ssrContext: null,
  $vnode: null,
}