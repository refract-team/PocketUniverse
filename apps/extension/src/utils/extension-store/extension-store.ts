import { Storage } from "@plasmohq/storage";

// Chrome extension local storage
export const extensionStore = new Storage({
  area: "local"
});

export const storeName = (name: string) => `pocket.store.${name}`;

// Id for this extension.
export const POCKET_ID = storeName("id");

export const optionsName = (optionName: string) => storeName(`option.${optionName}`);
export const SIMULATIONS_ON = optionsName("simulations-on");
export const SKIP_MARKETPLACES = optionsName("skip-marketplaces");
