/* @flow */

let Vue = {
  version: null,    // 版本
  config: null,     // Vue的全局配置，修改全局配置的方法就是直接Vue.config.key = xxx
  options: {
    component: 'component',  // 初始化为空对象
    directive: 'directive',  // 初始化为空对象
    filter: 'filter',  // 初始化为空对象

    _base: null,  // 指向Vue构造函数

    components: {
      KeepAlive: null
    },

    use,  // 带缓存，将Vue实例传给plugin(.install)，完成安装
    mixin, // 把混入的内容合并到options中
    extend, // 带缓存，新建了一个Sub构造函数，继承自Vue，把一些静态的方法和属性也继承下载，并且初始化了Props和Computed
  },
  component: null,  // 通过extend方法用传入的配置产生一个集成Vue的子类（构造函数），挂到options.component['传入id']下
  directive: null,    // 把传入的定义转为{ bind: definition, update: definition }，挂到options.directive['传入id']下
  filter: null,       // 直接挂到options.filter['传入id']下

  $isServer: null,
  FunctionalRenderContext: null,    

  _init: null,  // Vue不直接把真正构造函数暴露出来，使用_init方法返回一个Vue实例；接受参数options，就是传给Vue的参数

}

Vue.prototype = {
  _isVue: true,     // 代表是个Vue的实例
  $isServer: null,  // 是否服务端渲染
  $options: null,   // 参数对象（由默认参数、传入的参数、父类中的options？？？合并而来）
  $ssrContext: null,
  $vnode: null,

  $parent: null,  // 非抽象父节点
  $root: parent ? parent.$root : vm,  // 根组件
  $children: null,  // 
  $refs: null,  // 
  $attrs: null,  // 
  $listeners: null,  // 
  _staticTrees: null, // v-once cached trees

  // 状态
  _watcher: null,
  _inactive: null,
  _directInactive: false,
  _isMounted: false,
  _isDestroyed: false,
  _isBeingDestroyed: false,

  _events: null,  // 在initEvents阶段会把父组件的监听函数更新到子组件

  _renderProxy: 'new Proxy(vm, handlers)',   // 通过初始化时initProxy过程生成，使用Proxy特性把_renderProxy的has（get）操作代理到vm；
                                          // 从名字可以看出来_renderProxy时用来访问实例的数据，他给vm上的数据添加了名称、是否被占用的合法性检查
  _c: null,
  $createElement: null,

}

let Config = {
  optionMergeStrategies: { [key: string]: Function };   // 父、子组件选项合并函数
  silent: boolean;  // 是否把warning关闭掉
  productionTip: boolean; // 设置为 false 以阻止 vue 在启动时生成生产提示。
  performance: boolean; // 设置为 true 以在浏览器开发工具的性能/时间线面板中启用对组件初始化、编译、渲染和打补丁的性能追踪。
  devtools: boolean;  // 配置是否允许 vue-devtools 检查代码
  errorHandler: ?(err: Error, vm: Component, info: string) => void; // 指定组件的渲染和观察期间未捕获错误的处理函数
  warnHandler: ?(msg: string, vm: Component, trace: string) => void;
  ignoredElements: Array<string | RegExp>;  // 须使 Vue 忽略在 Vue 之外的自定义元素
  keyCodes: { [key: string]: number | Array<number> };    // 给 v-on 自定义键位别名
}

let GlobalAPI = {
  
}

let VNode = {
  data: {
    slot,
  }
}