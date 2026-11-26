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
- Pantalla de importación aún en simulación; publicación y ranking no conectados a ella.
- Registro de participantes e inicialización del catálogo no conectados a la interfaz.
- Reglas sin prueba en emulador ni en Firebase real.
- GitHub Actions pendiente de verificar.
- No hay acceso directo fiable a actas FCF.
- El dominio de prueba y su despliegue deben confirmarse antes de invitar participantes.

No utilizar actas reales ni datos personales adicionales en pruebas públicas.
