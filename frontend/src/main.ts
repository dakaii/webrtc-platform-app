import { createApp } from "vue";
import { createPinia } from "pinia";
import router from "./router";
import App from "./App.vue";
import "./style.css";

console.log("Starting Vue app...");

const app = createApp(App);

console.log("App created, adding Pinia...");
app.use(createPinia());

console.log("Pinia added, adding router...");
app.use(router);

console.log("Router added, mounting app...");
app.mount("#app");

console.log("App mounted successfully!");
