// Requisito 004: contrato público del servicio y la vista de administración.
export { createAdminService } from "./service";
export type {
  AdminDependencies,
  AdminError,
  AdminErrorCode,
  AdminService,
} from "./model";
export { mountAdminView } from "./view";
