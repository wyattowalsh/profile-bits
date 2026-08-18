import type { PreviewPluginId, PreviewRequest } from "@/src/preview/types";

/** Locked card size. Do not invent another dimension. */
export const CARD_WIDTH = 480;
export const CARD_HEIGHT = 160;

/** v0 first-party pack. Do not add plugin ids. */
export const GENERATE_PLUGIN_ID: PreviewPluginId = "github";

export const DOWNLOAD_LABEL = "Download";
export const SHARE_LABEL = "Share";
export const COPY_GENERATOR_LINK_LABEL = "Copy generator link";
export const GENERATE_BUTTON_LABEL = "Generate";

export const PACK_STAGE_MODULE = "./pack-stage";
export const GLOBAL_BAR_MODULE = "../preview/global-bar";

export const DEFAULT_GENERATE_REQUEST: PreviewRequest = {
  scope: "plugin",
  plugin: GENERATE_PLUGIN_ID,
  options: {},
  format: "svg",
  theme: "dark",
  output_pair: false,
  user: "octocat",
};
