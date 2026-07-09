import { loadFont as loadGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const grotesk = loadGrotesk("normal", { weights: ["500", "700"] });
const inter = loadInter("normal", { weights: ["400", "500", "600", "800"] });

export const DISPLAY_FONT = grotesk.fontFamily;
export const BODY_FONT = inter.fontFamily;
