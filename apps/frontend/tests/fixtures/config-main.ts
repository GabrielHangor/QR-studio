import ui from "@nuxt/ui/vue-plugin";
import { createApp } from "vue";

import "../../src/style.css";
import ConfigEditor from "./ConfigEditor.vue";
import PreviewFeedback from "./PreviewFeedback.vue";

createApp(new URLSearchParams(location.search).has("feedback") ? PreviewFeedback : ConfigEditor)
  .use(ui)
  .mount("#app");
