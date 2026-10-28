# Investigación y decisiones

## Contexto

El diseño debe cumplir la especificación de cuentas y sesión, el modo local y
didáctico indicado por la constitución, y las decisiones técnicas expresas del
usuario: `localStorage` detrás de `StoragePort`, SHA-256 con sal, Vite, TypeScript
estricto, Vitest y fast-check.

## Decisión 1: Hash de contraseña con SHA-256 y sal aleatoria

**Decisión**: Usar Web Crypto para generar una sal aleatoria independiente por cuenta
y calcular SHA-256 sobre la sal y la contraseña codificada en UTF-8. Persistir la sal
y el hash, nunca la contraseña. Esta selección respeta el algoritmo solicitado; la
sal se genera con `crypto.getRandomValues`, no con un generador pseudoaleatorio
general.

**Justificación**: Web Crypto ofrece la generación criptográfica de sal y el resumen
SHA-256 en el navegador. El alcance prohíbe un backend y declara la autenticación
didáctica. El servicio calcula el hash de forma asíncrona y la vista no debe bloquear
el hilo de interfaz.

**Riesgo y mitigación**: SHA-256 es rápido y no está diseñado para derivar claves de
contraseñas; una sal evita hashes idénticos y tablas precalculadas, pero no dificulta
suficientemente los ataques de fuerza bruta fuera de línea. La interfaz local tampoco
es una frontera de seguridad frente a quien controla el navegador. La documentación
debe explicitar ambas limitaciones. Una futura migración a PBKDF2 u otra función de
derivación requiere una propuesta de cambio de contrato y un formato versionado de
credenciales.

**Alternativas consideradas**:

- PBKDF2-HMAC-SHA-256 con Web Crypto: es más apropiado para contraseñas de baja
  entropía y dificulta los intentos fuera de línea, pero no es el algoritmo pedido
  para esta funcionalidad.
- Argon2id: es una alternativa de almacenamiento de contraseñas recomendada, pero
  no forma parte de la API Web Crypto estándar y requeriría añadir una implementación.

**Fuentes**:

- [MDN: `SubtleCrypto.digest()`](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest)
- [MDN: `Crypto.getRandomValues()`](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues)
- [OWASP: Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

## Decisión 2: `localStorage` con coordinación Web Locks

**Decisión**: Mantener `localStorage` detrás de `StoragePort` para persistir una
estructura validada de cuentas y el identificador de sesión. Añadir un `LockPort`
para serializar cada operación de lectura-modificación-escritura mediante un bloqueo
exclusivo Web Locks del mismo origen. Calcular el hash de registro antes de pedir el
bloqueo; dentro del bloqueo, releer el estado, comprobar unicidad, asignar el rol y
confirmar la escritura sin intercalar otra operación.

Si Web Locks no está disponible, los cambios que requieran coordinación devuelven un
error explícito y no se ejecutan sin bloqueo. Las lecturas de inicio siguen validando
los datos. La plataforma objetivo requiere navegadores modernos en contexto seguro.

**Justificación**: `localStorage` es síncrono y práctico para la persistencia local,
pero no proporciona transacciones ni bloqueo entre pestañas. Dos pestañas podrían
leer una lista vacía y asignar ambas el rol administrador. Web Locks permite coordinar
el acceso entre pestañas del mismo origen sin abandonar `localStorage`. El bloqueo no
protege los datos frente a una persona que los edita localmente.

**Manejo de fallos**: Las excepciones de acceso, cuota agotada y errores de
serialización se convierten en errores tipados. El registro, login o cierre de sesión
solo se muestran como exitosos tras confirmar la escritura. Un almacén corrupto se
valida, se ignora como fuente de cuentas y genera el aviso en español requerido; no
se restaura una sesión no verificada.

**Alternativas consideradas**:

- `localStorage` sin bloqueo: menos dependencias, pero no puede garantizar la
  asignación única del primer administrador entre pestañas.
- IndexedDB: ofrece transacciones de datos, pero sustituiría la tecnología de
  persistencia expresamente elegida.
- Web Locks con fallback de escritura sin bloqueo: descartado, porque el fallback
  volvería a permitir la carrera.

**Fuentes**:

- [WHATWG HTML: Web Storage y concurrencia](https://html.spec.whatwg.org/multipage/webstorage.html#webstorage)
- [MDN: Web Locks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)
- [MDN: `Window.localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [WHATWG: `Storage.setItem()` y `QuotaExceededError`](https://html.spec.whatwg.org/multipage/webstorage.html#dom-storage-setitem-dev)

## Decisión 3: Pruebas generativas con fast-check y Vitest

**Decisión**: Integrar fast-check con Vitest y ejecutar cada propiedad al menos 100
veces. Cubrir la normalización de correo, límites de entradas, roles, resultados de
error sin excepciones, mensajes genéricos y transiciones de sesión. Acompañar las
propiedades generativas con casos unitarios explícitos para cada límite requerido.

Las pruebas de dominio inyectan un hasher simulado para no depender de Web Crypto ni
de su tiempo de ejecución. Un conjunto pequeño de pruebas de integración ejercita el
hasher real cuando el entorno lo permite. Cada prueba de integración recibe su
almacenamiento y bloqueo simulado aislados; los casos que comparten estado se ejecutan
secuencialmente. Si una propiedad falla, se conserva la semilla y la ruta de fast-check
para poder reproducir el contraejemplo.

**Justificación**: fast-check genera entradas más amplias que una lista fija y reduce
los fallos a contraejemplos pequeños. Los casos unitarios exactos siguen siendo
necesarios para demostrar los límites 1/2/50/51 y 7/8/64/65.

**Alternativas consideradas**:

- Solo casos unitarios: claros para límites conocidos, pero insuficientes para
  explorar variaciones de correo, caracteres y secuencias de operaciones.
- Ejecutar el hash real en todas las propiedades: innecesariamente costoso y vincula
  las propiedades a las APIs del navegador; se reserva el hasher real para
  integración.

**Fuentes**:

- [fast-check: introducción y propiedades](https://fast-check.dev/docs/introduction/getting-started/)
- [fast-check: parámetros y reproducción](https://fast-check.dev/docs/api/interfaces/Parameters/)
- [Vitest: paralelismo](https://vitest.dev/guide/parallelism)
- [Vitest: simulación de globals](https://vitest.dev/guide/mocking/globals)

## Resultado de la investigación

No quedan decisiones técnicas bloqueantes sin resolver. Se conserva SHA-256 con sal
por ser el algoritmo solicitado, con advertencia de su limitación; se mantiene
`localStorage` y se añade coordinación Web Locks para proteger la regla del primer
administrador entre pestañas.
