import { makeError, Selection, Plugin, auditTime, merge, Subscription } from '@textbus/core'
import * as _ from 'lodash-es'
import { App, createApp, h, VNode } from 'vue'
import { Injector } from '@viewfly/core'
import { Tool } from './types'
import ToolbarView from './ToolbarView.vue'
import { UIConfig } from '../../common/_api'

const toolbarErrorFn = makeError('Toolbar')

interface ToolFactory {
  (): Tool
}
/**
 * 编辑器工具条
 */
export class Toolbar implements Plugin {
  private toolWrapper: HTMLElement | null = null
  private subs: Subscription[] = []
  public tools: Array<Tool | Tool[]>
  private components: VNode[] = []
  private toolbarView: App | null = null

  constructor(
    private toolFactories: Array<ToolFactory | ToolFactory[]> = [],
    host: HTMLElement
  ) {
    this.tools = this.toolFactories.map((i) => {
      return Array.isArray(i) ? i.map((j) => j()) : i()
    })
    this.toolWrapper = host
  }
  setup(injector: Injector): void {
    const selection = injector.get(Selection)
    this.tools.forEach((tool) => {
      // 如果是工具组
      if (Array.isArray(tool)) {
        const groupWrapper: VNode[] = []
        tool.forEach((t) => {
          groupWrapper.push(t.setup(injector, this.toolWrapper!))
        })
        this.components.push(h('div', { class: 'group-wrapper' }, groupWrapper))
        return
      }
        this.components.push(tool.setup(injector, this.toolWrapper!))
    })
    // 工具条主框架
    this.toolbarView = createApp(h(UIConfig, null, {
      default: () => h(ToolbarView, { cmpts: this.components })
    }))
    this.toolbarView.provide('injector', injector) // 向 vue 工具条注入编辑器依赖
    this.toolbarView.mount(this.toolWrapper!)
    // const tools = this.tools.flat()
    this.subs.push(
      merge(
        selection.onChange,
        // refreshService.onRefresh,
      ).pipe(auditTime(100)).subscribe(() => {
        this.tools.flat().forEach(tool => {
          tool.refreshState()
        })
      })
    )
  }

  onDestroy() {
    this.toolWrapper = null

    this.components.length = 0
    this.components = []
    
    this.toolbarView?.unmount()

    this.subs.forEach((i) => i.unsubscribe())

    this.toolFactories.length = 0
    this.toolFactories = []

    this.tools.length = 0
    this.tools = []
  }

}