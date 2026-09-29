import axios from "axios";
import type {
  ApiErrorResponse,
  ApiResponse,
  AuthSession,
  AuthUser,
  ChangePasswordPayload,
  LoginCredentials,
  RegisterPayload,
  UpdateProfilePayload,
} from "@/types";
import api from "@/services/api";

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    if (data && data.success === false && data.error?.message) {
      return data.error.message;
    }
    if (error.code === "ERR_NETWORK") {
      return "No pudimos conectar con el servidor. Verificá que el backend esté en marcha.";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function mapAuthUser(raw: unknown): AuthUser {
  const source = isRecord(raw)
    ? isRecord(raw.usuario)
      ? raw.usuario
      : isRecord(raw.user)
        ? raw.user
        : raw
    : {};

  const telefono = asString(source.telefono) ?? asString(source.telefonoWhatsapp);
  const localidad = asString(source.localidad) ?? asString(source.barrio);

  return {
    id: typeof source.id === "number" ? source.id : Number(source.id) || 0,
    nombre: asString(source.nombre) ?? "Usuario",
    email: asString(source.email) ?? "",
    telefono,
    telefonoWhatsapp: asString(source.telefonoWhatsapp) ?? telefono,
    rol: asString(source.rol) ?? undefined,
    activo: typeof source.activo === "boolean" ? source.activo : undefined,
    createdAt: asString(source.createdAt) ?? undefined,
    direccion: asString(source.direccion),
    localidad,
    barrio: asString(source.barrio) ?? localidad,
    codigoPostal: asString(source.codigoPostal),
    notasDireccion: asString(source.notasDireccion),
  };
}

function unwrapAuthSession(raw: unknown): AuthSession | null {
  if (!isRecord(raw)) return null;
  const token = asString(raw.token);
  if (!token) return null;
  return { token, user: mapAuthUser(raw) };
}

export async function login(credentials: LoginCredentials): Promise<AuthSession> {
  try {
    const { data } = await api.post<ApiResponse<unknown>>("/auth/login", credentials);
    const session = unwrapAuthSession(data.data);
    if (!session) {
      throw new Error("La respuesta de inicio de sesión no incluye un token válido.");
    }
    return session;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo iniciar sesión."));
  }
}

export async function register(payload: RegisterPayload): Promise<AuthSession> {
  try {
    const { data } = await api.post<ApiResponse<unknown>>("/auth/register", {
      nombre: payload.nombre,
      email: payload.email,
      telefono: payload.telefono,
      telefonoWhatsapp: payload.telefono,
      password: payload.password,
    });
    const session = unwrapAuthSession(data.data);
    if (session) return session;
    return login({ email: payload.email, password: payload.password });
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo crear la cuenta."));
  }
}

export async function getProfile(): Promise<AuthUser> {
  try {
    const { data } = await api.get<ApiResponse<unknown>>("/auth/me");
    return mapAuthUser(data.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo obtener el perfil."));
  }
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
  try {
    const { data } = await api.put<ApiResponse<unknown>>("/usuarios/me", {
      nombre: payload.nombre,
      telefono: payload.telefono,
      ...(payload.email ? { email: payload.email } : {}),
      ...(payload.direccion !== undefined ? { direccion: payload.direccion } : {}),
      ...(payload.localidad !== undefined || payload.barrio !== undefined
        ? { localidad: payload.localidad ?? payload.barrio ?? "" }
        : {}),
      ...(payload.codigoPostal !== undefined ? { codigoPostal: payload.codigoPostal } : {}),
      ...(payload.notasDireccion !== undefined ? { notasDireccion: payload.notasDireccion } : {}),
    });
    return mapAuthUser(data.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron guardar tus datos."));
  }
}

export async function changePassword(payload: ChangePasswordPayload): Promise<AuthUser> {
  try {
    const { data } = await api.put<ApiResponse<unknown>>("/usuarios/me", {
      contrasenaActual: payload.contrasenaActual,
      nuevaContrasena: payload.nuevaContrasena,
    });
    return mapAuthUser(data.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo actualizar la contraseña."));
  }
}
