import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";

// Load Web Component template typings (compiled away, no runtime side-effects).
import "./custom-elements";

// Register the demo custom element at runtime
import "../../basic/src/my-component.js";

createApp(App).mount("#app");
