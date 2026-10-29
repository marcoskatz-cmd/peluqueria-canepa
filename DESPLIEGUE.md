# Andrea Canepa — Caja · Despliegue

Web App de Google Apps Script (proyecto **standalone**). La planilla es la base de datos: la crea el propio sistema en el primer arranque. Una sola URL: según el PIN que ingreses entra a la **Caja** (tablet) o al **Panel + Tablero**.

## 1. Requisitos

- Node.js y clasp: `npm install -g @google/clasp`
- Una cuenta de Google que va a ser dueña del proyecto y la planilla (si es Workspace y no permite acceso anónimo, usar una cuenta personal).

## 2. Subir el código

```bash
clasp login
cd peluqueria-canepa
clasp create --type standalone --title "Andrea Canepa - Caja"
clasp push -f
```

`clasp create` escribe `.clasp.json` con el `scriptId` (no se sube al repo). Si el proyecto ya existe, copiá su `scriptId` en `.clasp.json` y hacé `clasp push -f`.

## 3. Inicializar la base (una sola vez)

`clasp open-script` → en el editor elegí la función **`inicializarSistema`** y ejecutala (va a pedir permisos la primera vez). Eso:

- Crea la planilla "Andrea Canepa — Caja" en el Drive de la cuenta y guarda su ID en Script Properties.
- Arma las hojas CONFIG, SERVICIOS, COBROS, COBROS_DETALLE.
- Carga el catálogo de la hoja de papel con precio 0 (se completan desde el panel).
- PINs iniciales: **Caja 1111 · Panel 2222**. Cambialos desde Panel → Ajustes.

Es idempotente: podés volver a correrla sin perder datos.

## 4. Publicar

En el editor: **Implementar → Nueva implementación → Aplicación web**. Ejecutar como *Yo*; acceso *Cualquier usuario*. Copiá la URL `/exec`: esa es la app.

Con clasp: `clasp deploy` (primera vez) y después `clasp push -f && clasp deploy -i <deploymentId>` para actualizar sin cambiar la URL.

## 5. Instalar en la tablet

Abrí la URL en Chrome de la tablet → menú ⋮ → *Agregar a pantalla de inicio*. Ingresá el PIN de caja una vez: queda recordado 90 días.

## Notas

- **Precio editado a mano en un ticket:** la caja puede tocar el precio de un servicio ya marcado y cambiarlo solo para ese cobro. El catálogo no se altera.
- **Sin señal:** los cobros quedan en la tablet y se envían solos. Arriba se ve cuántos faltan.
- **Nada se borra:** servicios se apagan, tickets se anulan. El historial queda intacto.
- **Probar sin Apps Script:** abrir `index.html` directo en un navegador usa datos de prueba en memoria (PINs 1111 / 2222).
- **Zona horaria:** America/Argentina/Tucuman (`appsscript.json`).
