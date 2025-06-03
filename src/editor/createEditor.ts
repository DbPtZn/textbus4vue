import { BrowserModule, Parser } from '@textbus/platform-browser'
import { Component, ContentType, Slot, Textbus } from '@textbus/core'
import { App, VNode, createApp, createVNode, h } from 'vue'
import { VueAdapter, VueAdapterComponents } from '@textbus/adapter-vue'
import { RootComponent, rootComponentLoader } from './components/root/root.component'
import { ParagraphComponent, deltaToBlock } from './components/paragraph/paragraph.component'
import RootView from './components/root/root.view.vue'
import ParagraphView from './components/paragraph/paragraph.view.vue'
import { AdapterInjectToken, TextbusInjectToken } from './tokens'
import { renderToString } from 'vue/server-renderer'

export const defaultViews: VueAdapterComponents = {
  [RootComponent.componentName]: RootView as any,
  [ParagraphComponent.componentName]: ParagraphView,
}

export async function createEditor(host: HTMLElement) {
  // let app: App | null = null
  // let vnode: VNode | null = null
  // let container: Element | null = null
  // 实例化 Vue 适配器 (依赖：textbus组件（组件名称）、vue组件) （textbus实例）
  const adapter = new VueAdapter(
    {
      // 添加渲染组件映射关系
      ...defaultViews,
    },
    (_host, _root) => {
      // container = _host
      // 使用 Vue 渲染 Textbus 视图
      // vnode = _root
      const app = createApp(_root).provide(TextbusInjectToken, textbus).provide(AdapterInjectToken, adapter)
      // console.log('_host', _host)
      app.mount(_host)
      return () => {
        app?.unmount()
      }
    }
  )

  function getHtmlStr() {
    // console.log('getHtmlStr')
    return new Promise<string>((resolve, reject) => {
      const renderAdapter = new VueAdapter({
        // 添加渲染组件映射关系
        ...defaultViews,
        },
        (_host, _root) => {
          const app = createApp(_root).provide(TextbusInjectToken, textbus).provide(AdapterInjectToken, renderAdapter)
          console.log(_host)
          renderToString(app).then((html) => {
            resolve(html)
            // app?.unmount()
          })
        }
      )
      renderAdapter.render(rootComp, textbus)
    })
  }

  // 实例化浏览器模块 （依赖：host， adapter 适配器）
  const browserModule = new BrowserModule({
    adapter,
    renderTo(): HTMLElement {
      return host
    }
  })

  // 实例化 Textbus （依赖： 浏览器模块实例）
  const textbus = new Textbus({
    imports: [browserModule],
    components: [
      RootComponent,
      ParagraphComponent
    ]
  })
  let rootComp: Component
  const parse = textbus.get(Parser)
  const doc = parse.parseDoc(htmlStr, rootComponentLoader)
  
  if(doc instanceof Component) {
    rootComp = doc
  } else {
    const content = new Slot([ContentType.BlockComponent])
    if (doc instanceof Slot) {
      deltaToBlock(doc.toDelta(), textbus).forEach(item => {
        content.insert(item)
      })
    }
    rootComp = new RootComponent(textbus, { slot: content })
  }

  // 使用 Textbus 启动渲染
  const tb = await textbus.render(rootComp)
  return { textbus: tb, getHtmlStr }
}

const jsonStr = `{"name":"RootComponent","state":{"slot":{"schema":[3],"content":[{"name":"ParagraphComponent","state":{"slot":{"schema":[1,2],"content":["在浩瀚无垠的宇宙中，我们不过是一粒微尘，却有幸窥见这壮丽的画卷。夜幕降临，星辰如钻石般镶嵌在黑色的天鹅绒上，每一颗都承载着亿万年的故事，静静地诉说着宇宙的奥秘。\n"],"attributes":{},"formats":{}}}}],"attributes":{},"formats":{}}}}`
const htmlStr = `<p>在浩瀚无垠的宇宙中，我们不过是一粒微尘，却有幸窥见这壮丽的画卷。夜幕降临，星辰如钻石般镶嵌在黑色的天鹅绒上，每一颗都承载着亿万年的故事，静静地诉说着宇宙的奥秘。</p>`