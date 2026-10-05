/**
 * Single source of truth for the public build stamp.
 *
 * The footer previously hardcoded "BUILD 3.2", which drifted several releases
 * behind reality. Importing the version from package.json keeps the stamp
 * correct for every release without anyone remembering to edit a string.
 */
// Default import, not `{ version }`: JSON modules default-export the whole
// object, and the named import made the build emit a warning on every deploy.
import pkg from "../../package.json";

export const SITE_BUILD = pkg.version;
