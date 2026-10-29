// Compatibility bridge for modules not yet migrated to js/config/firebase.js.
export {
  app,
  auth,
  authPersistenceReady,
  db,
  storage
} from "./config/firebase.js";
