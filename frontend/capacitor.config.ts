import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mightycouple.commerce",
  appName: "Mighty Couple Commerce",
  webDir: "dist",
  bundledWebRuntime: false,
  android: {
    backgroundColor: "#070B1F",
    allowMixedContent: false
  }
};

export default config;
