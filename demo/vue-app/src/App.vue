<script setup lang="ts">
import { onMounted, ref } from "vue";
import HelloWorld from "./components/HelloWorld.vue";
import "../types/custom-elements.generated.d.ts";

// This is a runtime import (the element is registered in main.ts), but we can
// still import the type for refs.
import type { MyComponent } from "../../basic/src/my-component.js";

const count = ref(2);
const disabled = ref(false);
const el = ref<MyComponent | null>(null);

onMounted(() => {
  // Methods are available on the element instance.
  el.value?.focusButton();
});
</script>

<template>
  <HelloWorld />

  <div style="margin-top: 24px">
    <h2>Custom Element (Web Component)</h2>

    <div style="display: flex; gap: 8px; margin-bottom: 12px">
      <button type="button" @click="count++">count++</button>
      <button type="button" @click="disabled = !disabled">
        toggle disabled ({{ disabled }})
      </button>
      <button type="button" @click="el?.reset()">reset via method()</button>
    </div>

    <my-component
      ref="el"
      title="Vue + Custom Element"
      :count="count"
      :disabled="disabled"
      variant="primary"
      @value-submit="console.log('value-submit', $event.detail.value)"
      @ready="console.log('ready', $event.type)"
    >
      <p>Default slot content from Vue.</p>
      <span slot="icon">🔧</span>
      <div slot="footer">Footer slot content from Vue.</div>
    </my-component>
  </div>
</template>
