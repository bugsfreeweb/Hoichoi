/**
 * Single source of truth for the public build stamp.
 *
 * The footer previously hardcoded "BUILD 3.2", which drifted several releases
 * behind reality. Importing the version from package.json keeps the stamp
 * correct for every release without anyone remembering to edit a string.
 */
import { version } from "../../package.json";

export const SITE_BUILD = version;
