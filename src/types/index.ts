/** Tipos alineados con las respuestas serializadas de la API (`backend-gocompras`). */

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type OrigenPedido = "WEB" | "WHATSAPP" | "INSTAGRAM" | "MOSTRADOR";

export type EstadoPedido =
  | "PENDIENTE_PAGO"
  | "PAGADO"
  | "EN_PREPARACION"
  | "ENVIADO"
  | "ENTREGADO"
  | "CANCELADO";

export type TipoPromocion = "GENERAL" | "CATEGORIA" | "SUBCATEGORIA" | "PRODUCTO" | "MARCA";

export type AlcancePromocion = "ALL" | "CATEGORY" | "SUBCATEGORY" | "PRODUCT" | "MARCA";

export type MetodoPago = "EFECTIVO" | "TRANSFERENCIA";

export type MetodoPagoCheckout = MetodoPago;

export type EstadoPago = "PENDIENTE" | "PAGADO" | "RECHAZADO" | "REEMBOLSADO";

export type TipoEntrega = "ENVIO_DOMICILIO" | "PUNTO_SEGURO";

export interface Categoria {
  id: number;
  nombre: string;
  slug: string;
  activo?: boolean;
  esDestacada?: boolean;
  ordenDestacada?: number;
  subcategorias?: string[];
}

export interface CategoriaDestacada {
  id: number;
  titulo: string;
  nombre: string;
  slug: string;
  imagenUrl: string | null;
  orden?: number;
}

export interface Marca {
  id: number;
  nombre: string;
  activo?: boolean;
}

export interface Variante {
  id?: number;
  sku: string;
  nombre?: string | null;
  variante_nombre?: string | null;
  atributos: Record<string, string> | null;
  precio: string;
  precioLista?: string;
  precioOferta?: string | null;
  descuentoPorcentaje?: string | number | null;
  stock: number;
  stockReservado: number;
  stockDisponible: number;
  imagenUrl: string | null;
  activo?: boolean;
}

export interface Complemento {
  origen: "curado" | "fallback";
  productos: Producto[];
}

export interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
  imagenUrl: string | null;
  imagenes: string[];
  grupoId?: string | null;
  subcategoria?: string | null;
  orden?: number;
  destacado: boolean;
  activo: boolean;
  categoria: Pick<Categoria, "id" | "nombre" | "slug"> | null;
  marca: Pick<Marca, "id" | "nombre"> | null;
  variantes: Variante[];
  atributosDisponibles: Record<string, string[]>;
  precioDesde: string | null;
  complementos?: Complemento;
}

export interface ProductoGrupo {
  grupo_id: string;
  nombre: string;
  total_variantes?: number;
}

export interface ZonaEnvio {
  id: number;
  codigoPostalDesde: number;
  codigoPostalHasta: number;
  costoFlete: string;
  descripcion: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OpcionEntregaInfo {
  tipo: TipoEntrega;
  titulo: string;
  descripcion: string;
  zona?: string;
}

export interface OpcionesLogistica {
  aclaracion: string;
  tiposEntrega: OpcionEntregaInfo[];
}

export interface CartItem {
  productoId: string;
  varianteId: string;
  varianteSku: string;
  nombre: string;
  precioUnitario: number;
  precioLista?: number;
  descuentoPorcentaje?: number;
  cantidad: number;
  stockDisponible: number;
  imagenUrl: string | null;
}

export interface DetallePedido {
  id: number;
  productoId: number;
  productoNombre: string;
  productoVarianteId: number;
  sku: string;
  cantidad: number;
  precioUnitario: string;
  subtotal: string;
  imagenUrl: string | null;
}

export interface PedidoEnvio {
  tipoEntrega: TipoEntrega;
  barrioLocalidad: string | null;
  puntoReferencia: string | null;
  costoEnvio: string;
  montoAplicado: string | null;
  aConfirmar: boolean;
  bonificado: boolean;
  motivoBonificacion: string | null;
}

export interface PedidoCliente {
  id?: number;
  nombre: string | null;
  telefonoWhatsapp: string;
  email?: string | null;
  registrado?: boolean;
}

export interface Pedido {
  id: number;
  codigo: string;
  origen: OrigenPedido;
  estado: EstadoPedido;
  metodoPago?: MetodoPago;
  estadoPago?: EstadoPago;
  pago?: {
    metodo: MetodoPago;
    estado: EstadoPago;
  };
  pasarelaId?: string | null;
  subtotal: string;
  total: string;
  totalConEnvio: string | null;
  creadoPorIa: boolean;
  requiereAtencionHumana: boolean;
  createdAt: string;
  pdfUrl: string;
  envio: PedidoEnvio;
  cliente: PedidoCliente;
  items: DetallePedido[];
}

export interface CreatePedidoItemPayload {
  productoVarianteId: number;
  cantidad: number;
}

export interface CreatePedidoPayload {
  clienteId?: number;
  telefonoWhatsapp?: string;
  nombre?: string;
  email?: string;
  direccion?: string;
  notas?: string;
  origen?: OrigenPedido;
  items: CreatePedidoItemPayload[];
  tipoEntrega?: TipoEntrega;
  metodoPago?: MetodoPagoCheckout;
  barrioLocalidad?: string;
  puntoReferencia?: string;
  codigoPostal?: number;
  codigoCupon?: string;
}

export interface AjustesTienda {
  id: number;
  nombreTienda: string | null;
  whatsapp: string | null;
  telefono: string | null;
  emailContacto: string | null;
  direccion: string | null;
  instagram: string | null;
  facebook: string | null;
  textoFooter: string | null;
  umbralEnvioGratis: number | null;
  updatedAt: string;
}

export interface ConfiguracionComercio {
  id: string;
  nombreComercio: string;
  whatsappVentas: string;
  instagramUrl: string | null;
  facebookUrl: string | null;
  emailContacto: string | null;
  direccionLocal: string | null;
  horariosAtencion: string | null;
  mensajeFlete: string | null;
  updatedAt: string;
}

export interface AuthUser {
  id: number;
  nombre: string;
  email: string;
  telefono?: string | null;
  telefonoWhatsapp?: string | null;
  rol?: string;
  activo?: boolean;
  createdAt?: string;
  direccion?: string | null;
  localidad?: string | null;
  barrio?: string | null;
  codigoPostal?: string | null;
  notasDireccion?: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  nombre: string;
  email: string;
  telefono: string;
  password: string;
}

export interface UpdateProfilePayload {
  nombre: string;
  telefono: string;
  email?: string;
  direccion?: string;
  localidad?: string;
  barrio?: string;
  codigoPostal?: string;
  notasDireccion?: string;
}

export interface ChangePasswordPayload {
  contrasenaActual: string;
  nuevaContrasena: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface Promocion {
  id: number;
  titulo: string;
  descuentoPorcentaje: string;
  alcance?: AlcancePromocion;
  tipoAplicacion: TipoPromocion;
  categoriaId: number | null;
  subcategoriaId?: number | null;
  productoId: number | null;
  marcaId?: number | null;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Banner {
  id: number;
  titulo: string;
  subtitulo: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  linkDestino?: string | null;
  link_url?: string | null;
  linkUrl?: string | null;
  imagenUrl: string | null;
  imagen_url?: string | null;
  imagenMobileUrl?: string | null;
  imagen_mobile_url?: string | null;
  activo: boolean;
  publicado?: boolean;
  orden: number;
  tarjeta1Visible?: boolean;
  tarjeta2Visible?: boolean;
  tarjeta3Visible?: boolean;
  fechaInicio: string | null;
  fechaFin: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Cupon {
  id: number;
  codigo: string;
  descuentoPorcentaje: string | number | null;
  montoFijo?: number | null;
  limiteUso: number | null;
  usos: number;
  usosActuales?: number;
  fechaLimite: string | null;
  fechaExpiracion?: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCliente {
  id: number;
  telefonoWhatsapp: string;
  nombre: string | null;
  email: string | null;
  direccion: string | null;
  notas: string | null;
  notasInternas: string | null;
  registrado: boolean;
  origenAlta: string | null;
  totalPedidos: number;
  totalPresupuestos?: number;
  totalGastado?: string;
  ultimoPedido?: {
    estado: string;
    total: string;
    createdAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  historial?: {
    pedidos: Pedido[];
    presupuestos?: Pedido[];
  };
}

export interface CargaMasivaItem {
  nombre: string;
  sku: string;
  precio: number;
  precioOferta?: number;
  stock: number;
  categoria?: string;
  subcategoria?: string | null;
  marca?: string;
  descripcion?: string;
  imagenUrl?: string;
  imagen_url?: string;
  grupoId?: string | null;
  grupo_id?: string | null;
  varianteNombre?: string;
  variante_nombre?: string;
  destacado?: boolean;
  orden?: number;
}
