import { MiniAppSDK } from "@farcaster/miniapp-sdk";

let sdk: MiniAppSDK | null = null;
export function getSDK() {
  if (!sdk) sdk = new MiniAppSDK();
  return sdk;
}
export function isInFarcaster() {
  return typeof window !== "undefined" && /Warpcast/i.test(navigator.userAgent);
}
