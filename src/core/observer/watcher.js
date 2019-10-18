/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  noop
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;   // Watcher的scheduler基于id实现调度
  deep: boolean;
  user: boolean;  // 用户定义的watch才是true的，理解上那些是用户的watcher，其他是为了响应而由框架建立的watcher
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  before: ?Function;
  getter: Function;
  value: any;

  constructor (
    vm: Component,
    expOrFn: string | Function,   // expOrFn是计算watcher时要调用的东西，就是getter
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean
  ) {
    this.vm = vm
    if (isRenderWatcher) {
      vm._watcher = this
    }
    vm._watchers.push(this)
    // options
    if (options) {
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy
      this.sync = !!options.sync
      this.before = options.before
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.lazy // for lazy watchers
    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = noop
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.  // 计算这个watcher，重新收集它依赖的订阅器
   */
  get () {
    pushTarget(this)  // 每次获取值的时候，使Dep的depend生效，使Dep可以调用这个watcher把dep添加为依赖（给自己添加了一个对应的订阅器）；新添的在newDeps中
    let value
    const vm = this.vm
    try {
      value = this.getter.call(vm, vm)  // 这个操作会触发相应的那个key（用户定义的）所产生的defineReactive中的dep对当前Watcher执行depend
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        traverse(value)   // 遍历对象，生成一个依赖的dep的Set（不重复）
      }
      popTarget()
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.   // 一方面，把这个传入的dep添加到依赖队列；另一方面，如果自己不在传入的dep的订阅者队列中，要加进去（是双方向的）
   */
  addDep (dep: Dep) {
    const id = dep.id
    if (!this.newDepIds.has(id)) {  // watcher维护的这个订阅队列，仅仅是检查增减，找出需要操作的dep；增了，要添加新增dep的订阅，减了，要取消对应dep的订阅——异步更新队列只更新一次
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        dep.addSub(this)  // 触发订阅
      }
    }
  }

  /**
   * Clean up for dependency collection.
   */
  cleanupDeps () {  // 如果新的依赖列表中不在存在某个dep，就叫这个dep不在通知当前Watcher（取消订阅）
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    // 用完了把新的变为当前的，把新的清空，准备下一次收集
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  update () { // 代码注释也说了，这个是订阅者模式的update接口，dep发布notify，watcher就更新
    /* istanbul ignore else */
    if (this.lazy) {  // 懒执行，只标记为脏
      this.dirty = true
    } else if (this.sync) { // 同步执行
      this.run()
    } else {
      queueWatcher(this)  // 异步队列中执行，加入队列，在nextTick执行flush
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  // Wathcer真正的计算步骤this.cb.call(this.vm, value, oldValue)，执行用户传入的回调，即watch:{}
  run () {
    if (this.active) {
      const value = this.get()
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value
        this.value = value
        if (this.user) {
          try {
            this.cb.call(this.vm, value, oldValue)
          } catch (e) {
            handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          }
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.  // 一次性给收集的到的所有dep添加订阅
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown () {   // 只有在生命周期destory和手动调用的时候Watcher才会teardown
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
