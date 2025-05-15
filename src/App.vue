<script setup lang="ts">
import { createEditor } from '@/editor/createEditor'
// import {  } from '@textbus/adapter-vue'
import { Subject, Textbus } from '@textbus/core'
import { create } from 'domain';
import { App, VNode, cloneVNode, createApp, onMounted, ref, useTemplateRef, render } from 'vue'
import { renderToString } from "vue/server-renderer"
import { AdapterInjectToken, TextbusInjectToken } from './editor/tokens';
import { VueAdapter } from '@textbus/adapter-vue';
const editorEl = useTemplateRef<HTMLElement>('editorEl')
const jsonStr = ref('')
const htmlStr = ref('') 
const onRender = new Subject<void>()
let editor: Textbus | null = null
onMounted(async () => {
  const { textbus, getHtmlStr } = await createEditor(editorEl.value!)
  editor = textbus
  onRender.subscribe(async () => {
    htmlStr.value = await getHtmlStr()
  })
})
function renderJson() {
  const json = editor?.getJSON()
  jsonStr.value = JSON.stringify(json)
}

async function renderHtml() {
  onRender.next()
}

// async function renderHtml2() {
//   console.log(appInstance)
//   if(!appInstance || !editor || !adapterInstance) return
//   try {
//     const newVnode = cloneVNode(vnodeInstance!)
//     const newApp = createApp(newVnode).provide(TextbusInjectToken, editor).provide(AdapterInjectToken, adapterInstance)
//     const html = await renderToString(newApp)
//     htmlStr.value = html
//   } catch (error) {
//     console.log(error)
//   }
// }

// async function renderHtml3() {
//   console.log(appInstance)
//   if(!appInstance || !editor || !adapterInstance || !host) return
//   try {
//     // const newVnode = cloneVNode(vnodeInstance!)
//     // const newApp = createApp(newVnode).provide(TextbusInjectToken, editor).provide(AdapterInjectToken, adapterInstance)
//     // // const html = await renderToString(newApp)
//     // const div = document.createElement('div')
//     // render(newVnode, div)
//     htmlStr.value = host.innerHTML
//   } catch (error) {
//     console.log(error)
//   }
// }

</script>

<template>
  <h1>textbus4.0 - vue3 项目</h1>
  <div ref="editorEl" id="editor" class="editor">
    
  </div>
  <div class="render">
    <h1>render to html str</h1>
    <div class="btn" @click="renderJson()">RenderJSON</div>
    <div class="btn" @click="renderHtml()">RenderHTML</div>
  </div>
  <div class="render-content">
    <div class="r-html">
      html:
      <div class="r-html-content">{{ htmlStr }}</div>
    </div>
    <div class="r-json">
      json:
      <div class="r-json-content">{{ jsonStr }}</div>
    </div>
  </div>
</template>

<style scoped>
.editor {
  width: 100%;
  height: 350px;
  color: black;
  background-color: rgb(216, 216, 216);
  padding: 6px;
}
.render {
  display: flex;
  flex-direction: row;
  align-items: center;
}
.render-content {
  width: 100%;
  height: 200px;
  margin-top: 20px;
  color: black;
  background-color: rgb(156, 156, 156);
  padding: 6px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  .r-html {
    width: 48%;
    background-color: #464646;
  }
  .r-json {
    width: 48%;
    background-color: #585858;
  }
}
.btn {
  margin-left: 18px;
  padding: 6px;
  border-radius: 6px;
  background-color: #727272bd;
  cursor: pointer;
  user-select: none;
  &:hover {
    background-color: #727272;
  }
  &:active {
    background-color: #464646;
  }
}
</style>
