import {
  ContentType,
  Component,
  onContentInsert,
  Selection,
  Slot,
  Textbus,
  useContext,
  ComponentStateLiteral, Registry,
  Subject,
  CompositionStartEventData,
  Event,
  onCompositionStart
} from '@textbus/core'
import { ParagraphComponent, deltaToBlock } from '../paragraph/paragraph.component'
import { ComponentLoader, SlotParser } from '@textbus/platform-browser'
import { useBlockContent } from './use-block-content'

export interface RootComponentState {
  content: Slot
}

// 创建 Textbus 根组件
export class RootComponent extends Component<RootComponentState> {
  static componentName = 'RootComponent'
  static type = ContentType.BlockComponent

  static fromJSON (textbus: Textbus, state: ComponentStateLiteral<RootComponentState>) {
    const content = textbus.get(Registry).createSlot(state.content)
    return new RootComponent(textbus, {
      content
    })
  }

  onCompositionStart = new Subject<Event<Slot, CompositionStartEventData>>()

  getSlots() {
    return [this.state.content]
  }

  setup () {
    const selection = useContext(Selection)
    const textbus = useContext()
    // 监听内容插入事件

    useBlockContent((slot) => slot === this.state.content)

    onCompositionStart(ev => {
      this.onCompositionStart.next(ev)
    })

    onContentInsert(ev => {
      // 当插入的内容是一个字符串或行内组件时，我们将创建新的段落
      if (typeof ev.data.content === 'string' || ev.data.content.type !== ContentType.BlockComponent) {
        // 创建新的插槽，并把内容插入在新插槽内
        const slot = new Slot([
          ContentType.Text,
          ContentType.InlineComponent
        ])
        slot.insert(ev.data.content)

        // 创建新的段落组件，并把插槽传给段落组件
        const p = new ParagraphComponent(textbus, {
          slot
        })
        // 在 rootComponent 的插槽内插入新段落
        ev.target.insert(p)
        // 设置光标为段落组件插槽的索引位置
        selection.setPosition(slot, slot.index)
        // 阻止默认的插入事件
        ev.preventDefault()
      }
    })
  }
}


export const rootComponentLoader: ComponentLoader = {
  match(): boolean {
    return true
  },
  read(element: HTMLElement, textbus: Textbus, slotParser: SlotParser): Component | Slot {
    const delta = slotParser(new Slot([
      ContentType.BlockComponent,
      ContentType.InlineComponent,
      ContentType.Text
    ]), element).toDelta()
    const slot = new Slot([
      ContentType.BlockComponent
    ])

    deltaToBlock(delta, textbus).forEach(i => {
      slot.insert(i)
    })
    return slot
  }
}
