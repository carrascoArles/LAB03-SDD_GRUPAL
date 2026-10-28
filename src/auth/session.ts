import type { AuthState, Session } from "./model";

// Requisito: RF-012; exponer solo el identificador de una sesión validada.
export function sessionFromState(state: AuthState): Session | null {
  return state.sessionUserId === null
    ? null
    : { userId: state.sessionUserId };
}

// Requisitos: RF-008–RF-009; actualizar únicamente la referencia de sesión.
export function withSessionUser(
  state: AuthState,
  userId: string | null,
): AuthState {
  return {
    ...state,
    sessionUserId: userId,
  };
}
