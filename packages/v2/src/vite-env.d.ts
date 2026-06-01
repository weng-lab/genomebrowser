/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly SCREEN_API_KEY?: string;
}

declare module "axios/dist/axios.js" {
  import axios from "axios";
  export default axios;
}
