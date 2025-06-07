import {
  Commander,
  ContentType,
  Selection,
  Component,
  onBreak,
  Slot,
  useContext,
  Textbus, ComponentStateLiteral, Registry, DeltaLite,
} from '@textbus/core'
import { ComponentLoader, SlotParser } from '@textbus/platform-browser'

export interface ParagraphComponentState {
  slot: Slot
}

// 创建 Textbus 段落组件
export class ParagraphComponent extends Component<ParagraphComponentState> {
  static componentName = 'ParagraphComponent'
  static type = ContentType.BlockComponent

  static fromJSON (textbus: Textbus, state: ComponentStateLiteral<ParagraphComponentState>) {
    const slot = textbus.get(Registry).createSlot(state.slot)
    return new ParagraphComponent(textbus, {
      slot
    })
  }

  constructor(textbus: Textbus, state: ParagraphComponentState = {
    slot: new Slot([
      ContentType.InlineComponent,
      ContentType.Text
    ])
  }) {
    super(textbus, state)
  }

  getSlots() {
    return [this.state.slot]
  }

  setup () {
    const context = useContext()
    const commander = useContext(Commander)
    const selection = useContext(Selection)

    onBreak(ev => {
      ev.preventDefault()
      const nextContent = ev.target.cut(ev.data.index)
      const p = new ParagraphComponent(context, {
        slot: nextContent
      })
      commander.insertAfter(p, this)
      selection.setPosition(p.state.slot, 0)
    })
  }
}


export const paragraphComponentLoader: ComponentLoader = {
  match(element: HTMLElement, returnableContentTypes): boolean {
    return returnableContentTypes.includes(ContentType.BlockComponent) && (element.dataset.component === ParagraphComponent.componentName || /^P|H[1-6]$/.test(element.tagName))
  },
  read(element: HTMLElement, textbus: Textbus, slotParser: SlotParser): Component | Slot {
    let content: HTMLElement
    if (/^P|H[1-6]$/.test(element.tagName)) {
      content = element
    } else {
      content = element.children[0] as HTMLElement
      if (!content) {
        const p = document.createElement('p')
        p.append(element.innerText)
        content = p
      }
    }

    const delta = slotParser(new Slot([
      ContentType.Text,
      ContentType.InlineComponent,
      ContentType.BlockComponent
    ]), content).toDelta()

    const results = deltaToBlock(delta, textbus)

    if (results.length === 1) {
      return results[0]
    }

    const containerSlot = new Slot([
      ContentType.BlockComponent
    ])

    results.forEach(item => {
      containerSlot.insert(item)
    })
    return containerSlot
  }
}

export function deltaToBlock(delta: DeltaLite, textbus: Textbus) {
  const results: Component[] = []

  let slot: Slot | null = null
  for (const item of delta) {
    if (typeof item.insert === 'string' || item.insert.type === ContentType.InlineComponent) {
      if (!slot) {
        slot = new Slot([
          ContentType.InlineComponent,
          ContentType.Text
        ])
        delta.attributes.forEach((value, key) => {
          slot!.setAttribute(key, value)
        })
        results.push(new ParagraphComponent(textbus, {
          slot
        }))
      }
      slot.insert(item.insert, item.formats)
    } else {
      results.push(item.insert)
      slot = null
    }
  }
  return results
}

