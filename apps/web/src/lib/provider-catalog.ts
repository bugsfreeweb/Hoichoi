/**
 * The AI-provider catalogue lives in @hoichoi/shared-types so the web admin and
 * the desktop settings panel describe providers the same way. Re-exported here
 * so page components can keep importing from "@/lib/provider-catalog".
 */
export {
  CLOUDFLARE_ACCOUNT_ENV,
  hasAccountPlaceholder,
  resolveAccountPlaceholder,
  PROVIDER_META,
  PROVIDERS_GUIDE,
  metaFor,
  purposeLabelBn,
  looksLikeImageModel,
} from "@hoichoi/shared-types";
export type { ProviderMeta, ProviderPurpose } from "@hoichoi/shared-types";
