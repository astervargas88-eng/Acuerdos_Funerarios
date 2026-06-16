import { Hono } from "hono";
import { cors } from "hono/cors";
import { db } from "./database";
import * as schema from "./database/schema";
import { eq, desc, like, or } from "drizzle-orm";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "./lib/s3";
import { gateway } from "./lib/gateway";
import { generateText } from "ai";
import { execSync } from "child_process";
import { writeFileSync, unlinkSync, existsSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const app = new Hono()
  .basePath("api")
  .use(cors({ origin: "*" }))

  // Health
  .get("/health", (c) => c.json({ status: "ok" }, 200))

  // ── Acuerdos ─────────────────────────────────────────────────────────────

  .get("/acuerdos", async (c) => {
    const q = c.req.query("q");
    let acuerdos;
    if (q) {
      acuerdos = await db
        .select()
        .from(schema.acuerdos)
        .where(
          or(
            like(schema.acuerdos.clienteNombre, `%${q}%`),
            like(schema.acuerdos.clienteCedula, `%${q}%`),
            like(schema.acuerdos.asesorNombre, `%${q}%`)
          )
        )
        .orderBy(desc(schema.acuerdos.createdAt));
    } else {
      acuerdos = await db
        .select()
        .from(schema.acuerdos)
        .orderBy(desc(schema.acuerdos.createdAt));
    }
    return c.json({ acuerdos }, 200);
  })

  .get("/acuerdos/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const [acuerdo] = await db
      .select()
      .from(schema.acuerdos)
      .where(eq(schema.acuerdos.id, id));
    if (!acuerdo) return c.json({ error: "No encontrado" }, 404);

    let audioUrl: string | null = null;
    if (acuerdo.audioKey) {
      try {
        audioUrl = await getSignedUrl(
          s3,
          new GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: acuerdo.audioKey,
          }),
          { expiresIn: 3600 }
        );
      } catch {}
    }
    return c.json({ acuerdo: { ...acuerdo, audioUrl } }, 200);
  })

  .post("/acuerdos", async (c) => {
    const body = await c.req.json();
    const [acuerdo] = await db
      .insert(schema.acuerdos)
      .values({
        clienteNombre: body.clienteNombre,
        clienteCedula: body.clienteCedula,
        clienteTelefono: body.clienteTelefono,
        clienteDireccion: body.clienteDireccion ?? null,
        asesorNombre: body.asesorNombre,
        fallecidoNombre: body.fallecidoNombre ?? null,
        fallecidoCedula: body.fallecidoCedula ?? null,
        estado: "borrador",
      })
      .returning();
    return c.json({ acuerdo }, 201);
  })

  .put("/acuerdos/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const body = await c.req.json();
    const [acuerdo] = await db
      .update(schema.acuerdos)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(schema.acuerdos.id, id))
      .returning();
    return c.json({ acuerdo }, 200);
  })

  .delete("/acuerdos/:id", async (c) => {
    const id = Number(c.req.param("id"));
    await db.delete(schema.acuerdos).where(eq(schema.acuerdos.id, id));
    return c.json({ ok: true }, 200);
  })

  // ── Consentimiento de grabación (Ley 1581/2012 Colombia) ─────────────────

  .post("/acuerdos/:id/consentimiento", async (c) => {
    const id = Number(c.req.param("id"));
    const ip = c.req.header("x-forwarded-for") ?? c.req.header("cf-connecting-ip") ?? "desconocida";
    const [acuerdo] = await db
      .update(schema.acuerdos)
      .set({
        consentimientoGrabacion: true,
        consentimientoFecha: new Date(),
        consentimientoIp: ip,
        updatedAt: new Date(),
      })
      .where(eq(schema.acuerdos.id, id))
      .returning();
    return c.json({ acuerdo }, 200);
  })

  // ── Firma manuscrita (Ley 1581/2012 Colombia) ────────────────────────────

  .post("/acuerdos/:id/firma", async (c) => {
    const id = Number(c.req.param("id"));
    const body = await c.req.json() as {
      firmaBase64: string;
      firmaNombreResponsable: string;
      consentimientoDatos: boolean;
    };
    if (!body.firmaBase64 || !body.firmaNombreResponsable) {
      return c.json({ error: "Firma y nombre del responsable son requeridos" }, 400);
    }
    if (!body.consentimientoDatos) {
      return c.json({ error: "Debe aceptar el tratamiento de datos personales" }, 400);
    }
    const [acuerdo] = await db
      .update(schema.acuerdos)
      .set({
        firmaBase64: body.firmaBase64,
        firmaNombreResponsable: body.firmaNombreResponsable,
        consentimientoDatos: true,
        consentimientoDatosFecha: new Date(),
        firmaFecha: new Date(),
        estado: "firmado",
        updatedAt: new Date(),
      })
      .where(eq(schema.acuerdos.id, id))
      .returning();
    return c.json({ acuerdo }, 200);
  })

  // ── Upload Audio ─────────────────────────────────────────────────────────

  .post("/upload/presign", async (c) => {
    const { filename, contentType } = await c.req.json();
    const key = `audios/${Date.now()}-${filename}`;
    const url = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: 600 }
    );
    return c.json({ url, key }, 200);
  })

  // ── Upload directo de audio (multipart) ──────────────────────────────────
  // Recibe el audio como multipart/form-data y lo sube a S3
  .post("/acuerdos/:id/audio", async (c) => {
    const id = Number(c.req.param("id"));

    try {
      const formData = await c.req.formData();
      const file = formData.get("audio") as File | null;
      if (!file) return c.json({ error: "No se recibió audio" }, 400);

      const buffer = await file.arrayBuffer();
      const key = `audios/${Date.now()}-acuerdo-${id}.m4a`;

      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: key,
          Body: new Uint8Array(buffer),
          ContentType: "audio/m4a",
        })
      );

      // Guardar key en DB
      await db
        .update(schema.acuerdos)
        .set({ audioKey: key, updatedAt: new Date() })
        .where(eq(schema.acuerdos.id, id));

      return c.json({ key }, 200);
    } catch (err: any) {
      console.error("Error subiendo audio:", err);
      return c.json({ error: err?.message ?? "Error subiendo audio" }, 500);
    }
  })

  // ── IA: Transcribir + Analizar ───────────────────────────────────────────

  .post("/acuerdos/:id/transcribir", async (c) => {
    const id = Number(c.req.param("id"));
    const { audioKey } = await c.req.json();

    // Obtener audio desde S3 y transcribir con CLI
    let transcripcion = "";
    const tmpAudio = join(tmpdir(), `acuerdo-${id}-${Date.now()}.m4a`);
    const tmpTxt = join(tmpdir(), `acuerdo-${id}-${Date.now()}.txt`);
    try {
      const audioUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: audioKey,
        }),
        { expiresIn: 300 }
      );

      const audioResp = await fetch(audioUrl);
      if (!audioResp.ok) throw new Error(`S3 fetch error: ${audioResp.status}`);
      const audioBuffer = await audioResp.arrayBuffer();
      writeFileSync(tmpAudio, Buffer.from(audioBuffer));

      // Transcribir con CLI transcribe
      execSync(`transcribe "${tmpAudio}" -o "${tmpTxt}"`, { timeout: 120000 });
      if (existsSync(tmpTxt)) {
        transcripcion = readFileSync(tmpTxt, "utf8").trim();
      } else {
        transcripcion = "[Transcripción no generada]";
      }
    } catch (err: any) {
      console.error("Error en transcripción:", err?.message ?? err);
      transcripcion = "[No se pudo transcribir el audio]";
    } finally {
      if (existsSync(tmpAudio)) unlinkSync(tmpAudio);
      if (existsSync(tmpTxt)) unlinkSync(tmpTxt);
    }

    // Analizar con IA
    let resumen = "Acuerdo registrado — transcripción no disponible.";
    let serviciosPactados = "[]";

    if (transcripcion && !transcripcion.startsWith("[")) {
      try {
        const { text: analisis } = await generateText({
          model: gateway("openai/gpt-5.4-mini"),
          prompt: `Eres un asistente especializado en acuerdos de servicios funerarios colombianos.
Analiza la siguiente transcripción de una conversación entre un asesor y un cliente de SERFUNCOOP.

TRANSCRIPCIÓN:
${transcripcion}

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta (sin texto adicional):
{
  "resumen": "Resumen breve y claro del acuerdo (2-4 oraciones en español)",
  "serviciosPactados": [
    {
      "servicio": "Nombre del servicio",
      "detalle": "Descripción o especificación del servicio",
      "valor": "Valor o precio si se mencionó, sino null"
    }
  ],
  "datosAdicionales": {
    "lugarServicio": "lugar si se mencionó, sino null",
    "fechaServicio": "fecha si se mencionó, sino null",
    "observaciones": "acuerdos adicionales importantes, sino null"
  }
}`,
        });

        const jsonMatch = analisis.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          resumen = parsed.resumen ?? resumen;
          serviciosPactados = JSON.stringify(parsed.serviciosPactados ?? []);
          if (parsed.datosAdicionales) {
            const d = parsed.datosAdicionales;
            const extras = [
              d.lugarServicio ? `Lugar: ${d.lugarServicio}` : null,
              d.fechaServicio ? `Fecha: ${d.fechaServicio}` : null,
              d.observaciones ? `Observaciones: ${d.observaciones}` : null,
            ]
              .filter(Boolean)
              .join(" | ");
            if (extras) resumen += `\n\n${extras}`;
          }
        }
      } catch (err) {
        console.error("Error en análisis IA:", err);
        resumen = `Transcripción registrada. Resumen automático no disponible.\n\n${transcripcion.substring(0, 300)}`;
      }
    }

    // Guardar en DB
    const [acuerdo] = await db
      .update(schema.acuerdos)
      .set({
        audioKey,
        transcripcion,
        resumen,
        serviciosPactados,
        estado: "completado",
        updatedAt: new Date(),
      })
      .where(eq(schema.acuerdos.id, id))
      .returning();

    return c.json({ acuerdo, transcripcion, resumen, serviciosPactados }, 200);
  });

export type AppType = typeof app;
export default app;
