/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */
export default class Dep {
  static target: ?Watcher;
  id: number;
  subs: Array<Watcher>;

  constructor () {
    this.id = uid++
    this.subs = []
  }

  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  depend () {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }

  notify () {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      subs.sort((a, b) => a.id - b.id)
    }
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
Dep.target = null // 这个target是全局，是一个Watcher类型，只有调用pushTarget、popTarget的时候会挂上，实际上只有watcher在执行get时候才把Watcher自己推到target上
// Dep的depend方法只有Dep.target存在的时候才有意义，所以depend方法要与pushTarget/popTarget配套出现
const targetStack = [] // // Dep通过uid维持了一个顺序性，又通过statck维持了全局唯一和顺序

export function pushTarget (target: ?Watcher) {
  // 如果有当前target，先让它入站；然后让当前的target变成传入的
  // 在lifecycle.callHook、initData时都是先调用pushTarget()，不传参，过程结束后再popTarget()——这样的效果就是depend没有实际效果（所谓'disable dep collection'）
  // 在Watcher计算的时候(get)，会把自己（watcher）传进来，计算结束后同样调用popTarget()，并且调用cleanupDeps把watcher记录的deps结算一下
  // 总结：Watcher在计算的时候Dep.target会设置为自身，操作完会pop一个栈内的target出来，这样就实现了一个全局的target(Watcher)计算栈
  targetStack.push(target)
  Dep.target = target
}

export function popTarget () {
  // 将栈顶的target(Watcher)pop成当前的
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
