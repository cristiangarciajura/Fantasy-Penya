# Lista de activación del piloto (28–29 noviembre 2026)

No desplegar en main hasta completar las comprobaciones. No crear config/competition durante el piloto.

## Firebase
- Confirmar proyecto fantasy-penya, Firestore Madrid y plan Spark.
- Confirmar Google y correo/contraseña habilitados y dominio de prueba autorizado.
- Revisar y publicar firestore.rules desde firebase-v6; comprobar compilación.
- Crear cuenta administradora, verificar correo y obtener UID desde Authentication.
- Crear admins/{UID} desde la consola con un campo booleano active=true (la regla actual comprueba existencia, no el campo).
- Inicializar config/roster con el mapa players y la lista coaches de firebase-roster.json. La función initializeRoster existe pero todavía no está conectada a la interfaz.
- Crear jornada piloto con fechas de apertura/cierre y reglamento provisional. No cerrar antes de que los participantes puedan guardar.

## Pruebas obligatorias
- Dos cuentas verificadas distintas: guardar alineaciones válidas y comprobar aislamiento.
- Rechazar alineaciones incompletas, duplicadas y fuera de plazo.
- Comprobar que un participante no puede publicar resultados ni cambiar el reglamento.
- Probar importación parcial, repetición y rectificación, con resultados ficticios.
- Comprobar ranking desde ambas cuentas.
- Confirmar que no se mezclan datos piloto y oficiales.

## Bloqueos actuales
- Pantalla import-preview.html conectada a publicación y ranking; requiere prueba real. Validar lote antes de publicar; ejemplo ficticio bloqueado.
- Inicialización del catálogo no conectada a la interfaz. Seguimiento incluye perfiles guardados, pero no detecta cuentas sin perfil ni registro independiente.
- Reglas sin prueba en emulador ni en Firebase real.
- GitHub Actions pendiente de verificar; pruebas puras ampliadas y ejecutadas con éxito en entorno de desarrollo.
- Un fallo de lectura del ranking durante el acceso puede bloquear la carga del equipo.
- No hay acceso directo fiable a actas FCF.
- El dominio de prueba y su despliegue deben confirmarse antes de invitar participantes.

No utilizar actas reales ni datos personales adicionales en pruebas públicas.

## Publicación durante el piloto
- Publicación manual y masiva recalculan con la política almacenada de la jornada.
- Si falla el ranking tras guardar resultados, usar Publicar clasificación sin reintroducir partidos.
- La pantalla independiente import-preview.html requiere sesión administradora verificada en el mismo navegador.
- La vista de simulación usa política provisional; comprobar diferencias con la política real antes de publicar.
- Un partido por categoría y jornada; no reutilizar identificadores entre categorías.
