import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const acuerdos = sqliteTable("acuerdos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Datos del cliente
  clienteNombre: text("cliente_nombre").notNull(),
  clienteCedula: text("cliente_cedula").notNull(),
  clienteTelefono: text("cliente_telefono").notNull(),
  clienteDireccion: text("cliente_direccion"),
  // Datos del asesor
  asesorNombre: text("asesor_nombre").notNull(),
  // Ser querido (puede llenarse después)
  fallecidoNombre: text("fallecido_nombre"),
  fallecidoCedula: text("fallecido_cedula"),
  // Consentimiento de grabación (Ley 1581/2012 Colombia)
  consentimientoGrabacion: integer("consentimiento_grabacion", { mode: "boolean" }).default(false),
  consentimientoFecha: integer("consentimiento_fecha", { mode: "timestamp" }),
  consentimientoIp: text("consentimiento_ip"),
  // Audio y transcripción
  audioKey: text("audio_key"),
  transcripcion: text("transcripcion"),
  resumen: text("resumen"),
  serviciosPactados: text("servicios_pactados"), // JSON string
  // Firma manuscrita del responsable
  firmaBase64: text("firma_base64"),       // data:image/png;base64,...
  firmaFecha: integer("firma_fecha", { mode: "timestamp" }),
  firmaNombreResponsable: text("firma_nombre_responsable"),
  consentimientoDatos: integer("consentimiento_datos", { mode: "boolean" }).default(false),
  consentimientoDatosFecha: integer("consentimiento_datos_fecha", { mode: "timestamp" }),
  // Estado
  estado: text("estado").notNull().default("borrador"), // borrador, completado, firmado
  // Metadata
  fechaAcuerdo: integer("fecha_acuerdo", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
