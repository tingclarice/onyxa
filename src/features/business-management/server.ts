// Public server entry for authorized business context; adapters remain private.
import "server-only";
export { getBusinessWorkspace, requireActiveBusiness } from "./ui/queries";
