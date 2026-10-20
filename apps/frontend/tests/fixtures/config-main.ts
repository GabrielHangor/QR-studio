import ui from "@nuxt/ui/vue-plugin";
import { createApp } from "vue";

import "../../src/style.css";
import ConfigEditor from "./ConfigEditor.vue";

createApp(ConfigEditor).use(ui).mount("#app");
