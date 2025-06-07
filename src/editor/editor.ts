import {
  AttributeLoader,
  BrowserModule,
  ComponentLoader,
  DomAdapter,
  FormatLoader,
  isMobileBrowser,
  Parser,
  ViewOptions
} from '@textbus/platform-browser'
import {
  AsyncComponentConstructor,
  Attribute,
  Plugin,
  Component,
  ComponentConstructor,
  ComponentLiteral,
  ComponentStateLiteral,
  ContentType,
  Formatter,
  Metadata,
  Module,
  Slot,
  State,
  Textbus,
  TextbusConfig,
  RootComponentRef
} from '@textbus/core'
import { App, VNode, cloneVNode, createApp, createVNode, h, createRenderer } from 'vue'
import { VueAdapter, VueAdapterComponents } from '@textbus/adapter-vue'
import { RootComponent, rootComponentLoader, RootComponentState } from './components/root/root.component'
import { ParagraphComponent, deltaToBlock } from './components/paragraph/paragraph.component'
import RootView from './components/root/root.view.vue'
import ParagraphView from './components/paragraph/paragraph.view.vue'
import { AdapterInjectToken, TextbusInjectToken } from './tokens'
import { renderToString } from 'vue/server-renderer'
import { I18NConfig } from './i18n'
// import { InjectionToken } from '@viewfly/core'

// export const OutputInjectionToken = new InjectionToken<boolean>('OutputInjectionToken')
// interface EditorOptions {
//   i18n?: I18NConfig
//   content?: ComponentLiteral
//   textbusOptions?: TextbusConfig
//   viewOptions?: Omit<ViewOptions, 'adapter'>
//   adapterComponents?: VueAdapterComponents
// }

/**
 * XNote 配置项
 */
export interface EditorConfig extends TextbusConfig {
  /** 默认 HTML 内容*/
  content?: string | ComponentStateLiteral<RootComponentState>
  /** 协作服务配置 */
  // collaborateConfig?: XNoteCollaborateConfig,
  /** 视图配置项 */
  viewOptions?: Partial<ViewOptions>
}

// 桥接视图
export const defaultViews: VueAdapterComponents = {
  [RootComponent.componentName]: RootView as any,
  [ParagraphComponent.componentName]: ParagraphView
}

// 格式
export const defaultFormatters: Formatter<any>[] = []

// 格式加载器
export const defaultFormatLoaders: FormatLoader<any>[] = []

// 属性
export const defaultAttributes: Attribute<any>[] = []

// 属性加载器
export const defaultAttributeLoaders: AttributeLoader<any>[] = []

// 组件
export const defaultComponents: (ComponentConstructor<State> | AsyncComponentConstructor<Metadata, State>)[] = [ParagraphComponent, RootComponent]

// 插件
export const defaultPlugins: Plugin[] = []

// 组件加载器
export const defaultComponentLoaders: ComponentLoader[] = []

export class Editor extends Textbus {
  // translator = new OutputTranslator()
  private host!: HTMLElement
  private vDomAdapter!: VueAdapter
  private vDomApp!: App
  private tempContainer!: HTMLElement

  constructor(private editorConfig: EditorConfig = {}) {
    const adapter = new VueAdapter(
      {
        // 添加渲染组件映射关系
        ...defaultViews
      },
      (host, root, injector) => {
        // class Editor extends Textbus ---> editor 实例就是 Textbus 实例
        const textbus = injector.get(Textbus)
        const app = createApp(root).provide(TextbusInjectToken, textbus).provide(AdapterInjectToken, adapter)
        console.log(app)
        app.mount(host)
        return () => {
          app?.unmount()
        }
      }
    )

    const browserModule = new BrowserModule({
      renderTo: (): HTMLElement => {
        return this.host
      },
      useContentEditable: isMobileBrowser(),
      adapter,
      componentLoaders: [...defaultComponentLoaders],
      formatLoaders: [...defaultFormatLoaders],
      attributeLoaders: [...defaultAttributeLoaders],
      ...editorConfig.viewOptions
    })

    const modules: Module[] = [browserModule]

    const vDomAdapter = new VueAdapter(
      {
        // 添加渲染组件映射关系
        ...defaultViews
      },
      (host, root, injector) => {
        const textbus = injector.get(Textbus)
        // this.tempContainer = host as HTMLElement
        const app = createApp({
          render: () => root
        }).provide(TextbusInjectToken, textbus).provide(AdapterInjectToken, vDomAdapter)
        // console.log(app)
        app.mount(host)
        this.vDomApp = app

        return () => {
          app?.unmount()
        }
      }
    )

    super({
      zenCoding: true,
      additionalAdapters: [vDomAdapter],
      imports: modules,
      components: [...defaultComponents],
      formatters: [...defaultFormatters],
      attributes: [...defaultAttributes],
      plugins: [...defaultPlugins],
      providers: [],
      onAfterStartup(textbus: Textbus) {
        // 依赖注入
        // 注册快捷键
      },
      ...editorConfig
    })

    this.vDomAdapter = vDomAdapter
  }

  mount(host: HTMLElement) {
    this.host = host
    let rootComp: Component
    const config = this.editorConfig
    if (config.content) {
      rootComp = this.createModel(config.content)
    } else {
      rootComp = new RootComponent(this, {
        content: new Slot([ContentType.BlockComponent])
      })
    }
    return this.render(rootComp)
  }

  setContent(content: string | ComponentStateLiteral<RootComponentState>) {
    this.guardReady()
    const newModel = this.createModel(content)
    const rootComponent = this.get(RootComponentRef).component
    Object.assign(rootComponent.state, newModel.state)
  }

  getHtml() {
    // this.vDomAdapter.host.innerHTML
    const str = renderToString(this.vDomApp)
    return str
    // return this.vDomAdapter.host.innerHTML
    // console.log('getHtml')
    // return new Promise<string>((resolve, reject) => {
    //   const vDomAdapter = new VueAdapter(
    //     {
    //       // 添加渲染组件映射关系
    //       ...defaultViews
    //     },
    //     (host, root, injector) => {
    //       const textbus = injector.get(Textbus)
        
    //       const app = createApp({
    //         render: () => root
    //       })
    //         .provide(TextbusInjectToken, textbus)
    //         .provide(AdapterInjectToken, vDomAdapter)
    //       console.log('renderToString')
    //       app.mount(host)
    //       renderToString(app).then(str => {
    //         resolve(str)
    //       })

    //       return () => {
    //         app?.unmount()
    //       }
    //     }
    //   )
    //   const rootComponent = this.get(RootComponentRef).component
    //   const textbus = this.get(Textbus)
    //   vDomAdapter.render(rootComponent, textbus)
    // })
  }

  private createModel(content: string | ComponentStateLiteral<RootComponentState>) {
    if (typeof content === 'string') {
      return this.createModelFromHTML(content)
    }
    return this.createModelFromState(content)
  }

  private createModelFromState(state: ComponentStateLiteral<RootComponentState>) {
    return RootComponent.fromJSON(this, state)
  }

  private createModelFromHTML(html: string) {
    const parser = this.get(Parser)
    const doc = parser.parseDoc(html, rootComponentLoader)
    if (doc instanceof Component) {
      return doc
    }
    const content = new Slot([ContentType.BlockComponent])
    if (doc instanceof Slot) {
      deltaToBlock(doc.toDelta(), this).forEach(i => {
        content.insert(i)
      })
    }
    return new RootComponent(this, {
      content
    })
  }
}

// export async function createEditor(host: HTMLElement) {
//   // let app: App | null = null
//   // let vnode: VNode | null = null
//   // let container: Element | null = null
//   // 实例化 Vue 适配器 (依赖：textbus组件（组件名称）、vue组件) （textbus实例）
//   const adapter = new VueAdapter(
//     {
//       // 添加渲染组件映射关系
//       ...defaultViews
//     },
//     (_host, _root) => {
//       // container = _host
//       // 使用 Vue 渲染 Textbus 视图
//       // vnode = _root
//       const app = createApp(_root).provide(TextbusInjectToken, textbus).provide(AdapterInjectToken, adapter)
//       // console.log('_host', _host)
//       app.mount(_host)
//       return () => {
//         app?.unmount()
//       }
//     }
//   )

//   function getHtmlStr() {
//     // console.log('getHtmlStr')
//     return new Promise<string>((resolve, reject) => {
//       const renderAdapter = new VueAdapter(
//         {
//           // 添加渲染组件映射关系
//           ...defaultViews
//         },
//         (_host, _root) => {
//           const app = createApp(_root).provide(TextbusInjectToken, textbus).provide(AdapterInjectToken, renderAdapter)
//           console.log(_host)
//           renderToString(app).then(html => {
//             resolve(html)
//             // app?.unmount()
//           })
//         }
//       )
//       renderAdapter.render(rootComp, textbus)
//     })
//   }

//   // 实例化浏览器模块 （依赖：host， adapter 适配器）
//   const browserModule = new BrowserModule({
//     adapter,
//     renderTo(): HTMLElement {
//       return host
//     }
//   })

//   // 实例化 Textbus （依赖： 浏览器模块实例）
//   const textbus = new Textbus({
//     imports: [browserModule],
//     components: [RootComponent, ParagraphComponent]
//   })
//   let rootComp: Component
//   const parse = textbus.get(Parser)
//   const doc = parse.parseDoc(htmlStr, rootComponentLoader)

//   if (doc instanceof Component) {
//     rootComp = doc
//   } else {
//     const content = new Slot([ContentType.BlockComponent])
//     if (doc instanceof Slot) {
//       deltaToBlock(doc.toDelta(), textbus).forEach(item => {
//         content.insert(item)
//       })
//     }
//     rootComp = new RootComponent(textbus, { content })
//   }

//   // 使用 Textbus 启动渲染
//   const tb = await textbus.render(rootComp)
//   return { textbus: tb, getHtmlStr }
// }
const jsonStr = `{"name":"RootComponent","state":{"slot":{"schema":[3],"content":[{"name":"ParagraphComponent","state":{"slot":{"schema":[1,2],"content":["在浩瀚无垠的宇宙中，我们不过是一粒微尘，却有幸窥见这壮丽的画卷。夜幕降临，星辰如钻石般镶嵌在黑色的天鹅绒上，每一颗都承载着亿万年的故事，静静地诉说着宇宙的奥秘。\n"],"attributes":{},"formats":{}}}}],"attributes":{},"formats":{}}}}`
const htmlStr = `<p>在浩瀚无垠的宇宙中，我们不过是一粒微尘，却有幸窥见这壮丽的画卷。夜幕降临，星辰如钻石般镶嵌在黑色的天鹅绒上，每一颗都承载着亿万年的故事，静静地诉说着宇宙的奥秘。</p>`
