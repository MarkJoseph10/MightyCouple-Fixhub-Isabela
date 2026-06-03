import { AliExpressService } from "./aliExpressService.js";
import { CJDropshippingService } from "./cjDropshippingService.js";
import { SpocketService } from "./spocketService.js";

export function getProvider(provider) {
  switch (provider) {
    case "cj-dropshipping":
      return new CJDropshippingService();
    case "spocket":
      return new SpocketService();
    case "aliexpress":
    default:
      return new AliExpressService();
  }
}

