// Genera una coleccion importable. No contiene cuentas ni tokens reales.
import { readFile, writeFile } from 'node:fs/promises';

const folders = [];
let folder;
let sequence;
const group = (name, prefix) => { folder = { name, item: [] }; folders.push(folder); sequence = { prefix, n: 0 }; };
const v = (key) => `{{${key}}}`;
const expect = (name, expression) => `pm.test(${JSON.stringify(name)}, () => { ${expression} });`;
const array = expect('Lista JSON', 'pm.expect(pm.response.json()).to.be.an("array");');
const capture = (key, expression = 'pm.response.json().id') => `if (pm.response.code < 300) pm.environment.set(${JSON.stringify(key)}, ${expression});`;
const request = (name, method, route, status, body, token = 'token_bibliotecario', extra = []) => {
    const header = [];
    if (token) header.push({ key: 'Authorization', value: `Bearer ${v(token)}` });
    if (body !== undefined) header.push({ key: 'Content-Type', value: 'application/json' });
    const exec = [
        expect(`HTTP ${status}`, `pm.response.to.have.status(${status});`),
        expect('Respuesta JSON', 'pm.expect(pm.response.headers.get("Content-Type")).to.include("application/json");'),
        expect('Sin credenciales en respuesta', 'pm.expect(pm.response.text()).not.to.include("password_hash"); pm.expect(pm.response.text()).not.to.include(pm.environment.get("test_password"));')
    ];
    if (status >= 400) exec.push(expect('Error informado', 'pm.expect(pm.response.json().error).to.be.a("string").and.not.empty;'));
    folder.item.push({
        name: `${sequence.prefix}-${String(++sequence.n).padStart(2, '0')} ${name}`,
        request: { method, header, url: `{{url_backend}}${route}`, ...(body === undefined ? {} : { body: { mode: 'raw', raw: JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } } }) },
        event: [{ listen: 'test', script: { type: 'text/javascript', exec: [...exec, ...extra] } }], response: []
    });
};
const personal = (prefix) => ({ ci: v(`${prefix}_ci`), nombres: 'Prueba', ap: 'E3', am: 'Temporal', correo: v(`${prefix}_correo`), tipo_lector: 'EXTERNO' });
const user = { ...personal('usuario'), username: v('usuario_username'), password: v('test_password'), rol_id: v('rol_lector') };
const lector = personal('nuevo_lector');
const libro = { codigo_topografico: v('libro_codigo'), titulo: 'Libro temporal E3', anio_publicacion: 2026, area_id: v('area_id'), tipo_recurso: 'LIBRO', autor: 'Autor ficticio', cantidad_total: 2 };
const tesis = { codigo_topografico: v('tesis_codigo'), titulo: 'Tesis temporal E3', anio_publicacion: 2026, area_id: v('area_id'), tipo_recurso: 'TESIS', autor_postulante: 'Autor ficticio', tutor_guia: 'Tutor ficticio', gestion_defensa: '2026' };
const loan = { lector_id: v('lector_id'), recurso_id: v('libro_id'), fecha_devolucion_prevista: v('fecha_hoy'), tipo_prestamo: 'DOMICILIO' };

group('Usuarios', 'U');
request('Sin token', 'GET', '/api/usuarios', 401, undefined, null);
request('Lector no administra usuarios', 'GET', '/api/usuarios', 403, undefined, 'token_lector');
request('Listado bibliotecario', 'GET', '/api/usuarios', 200, undefined, undefined, [array]);
request('ID invalido', 'GET', '/api/usuarios/no-numero', 400);
request('Usuario inexistente', 'GET', '/api/usuarios/{{id_inexistente}}', 404);
request('Faltan datos', 'POST', '/api/usuarios', 400, {});
request('Correo invalido', 'POST', '/api/usuarios', 400, { ...user, correo: 'invalido' });
request('Rol inexistente', 'POST', '/api/usuarios', 400, { ...user, rol_id: v('id_inexistente') });
request('Lector no crea usuarios', 'POST', '/api/usuarios', 403, user, 'token_lector');
request('Crear usuario lector y persona', 'POST', '/api/usuarios', 201, user, undefined, [capture('usuario_id', 'pm.response.json().data.login.id')]);
request('Lectores sincronizados', 'GET', '/api/usuarios/{{usuario_id}}', 200, undefined, undefined, [capture('usuario_lector_id', 'pm.response.json().lector_id'), expect('Lector asociado', 'pm.expect(pm.response.json().rol).to.eql("LECTOR"); pm.expect(pm.response.json().lector_id).to.be.a("number");')]);
request('CI duplicado', 'POST', '/api/usuarios', 409, user);
request('Correo duplicado', 'POST', '/api/usuarios', 409, { ...user, ci: v('usuario_ci_alternativo') });
request('Username duplicado', 'POST', '/api/usuarios', 409, { ...user, ci: v('usuario_ci_alternativo'), correo: v('usuario_correo_alternativo') });
request('Actualizar usuario', 'PUT', '/api/usuarios/{{usuario_id}}', 200, { ...user, nombres: 'Actualizado' }, undefined, [expect('Nombre actualizado', 'pm.expect(pm.response.json().data.nombres).to.eql("Actualizado");')]);
request('Actualizar inexistente', 'PUT', '/api/usuarios/{{id_inexistente}}', 404, user);
request('Password vacio', 'PATCH', '/api/usuarios/{{usuario_id}}/password', 400, { password: '' });
request('Cambiar password', 'PATCH', '/api/usuarios/{{usuario_id}}/password', 200, { password: v('password_nuevo') });
request('Login con nuevo password', 'POST', '/api/auth/login', 200, { username: v('usuario_username'), password: v('password_nuevo') }, null, [expect('JWT emitido', 'pm.expect(pm.response.json().token).to.be.a("string").and.not.empty;')]);
request('Estado invalido', 'PATCH', '/api/usuarios/{{usuario_id}}/estado', 400, { estado: 'INVALIDO' });
request('Desactivar cuenta', 'PATCH', '/api/usuarios/{{usuario_id}}/estado', 200, { estado: 'INACTIVO' });
request('Login cuenta desactivada', 'POST', '/api/auth/login', 403, { username: v('usuario_username'), password: v('password_nuevo') }, null);
request('Reactivar cuenta', 'PATCH', '/api/usuarios/{{usuario_id}}/estado', 200, { estado: 'ACTIVO' });
request('Persona inexistente', 'POST', '/api/usuarios/persona/{{id_inexistente}}', 404, { username: v('persona_username'), password: v('test_password'), rol_id: v('rol_lector') });
for (const [method, route, body] of [['PUT', '/api/usuarios/{{usuario_id}}', user], ['PATCH', '/api/usuarios/{{usuario_id}}/password', { password: v('password_nuevo') }], ['PATCH', '/api/usuarios/{{usuario_id}}/estado', { estado: 'INACTIVO' }]]) request('Lector sin permiso de modificar', method, route, 403, body, 'token_lector');

group('Lectores', 'L');
request('Sin token', 'GET', '/api/lectores', 401, undefined, null);
request('Listado bibliotecario', 'GET', '/api/lectores', 200, undefined, undefined, [array, expect('Usuario nuevo aparece como lector', 'pm.expect(pm.response.json().some(x => x.ci === pm.environment.get("usuario_ci"))).to.eql(true);')]);
request('Lector no administra lectores', 'GET', '/api/lectores', 403, undefined, 'token_lector');
request('Perfil lector propio', 'GET', '/api/lectores/mi-perfil', 200, undefined, 'token_lector', [expect('Identidad del lector', 'pm.expect(pm.response.json().username).to.eql(pm.environment.get("lector_username")); pm.expect(pm.response.json().rol).to.eql("LECTOR");')]);
request('Perfil bibliotecario propio', 'GET', '/api/lectores/mi-perfil', 200, undefined, undefined, [expect('Identidad del bibliotecario', 'pm.expect(pm.response.json().username).to.eql(pm.environment.get("bibliotecario_username")); pm.expect(pm.response.json().rol).to.eql("BIBLIOTECARIO");')]);
request('Faltan datos', 'POST', '/api/lectores', 400, {});
request('Tipo invalido', 'POST', '/api/lectores', 400, { ...lector, tipo_lector: 'INVALIDO' });
request('Crear lector', 'POST', '/api/lectores', 201, lector, undefined, [capture('nuevo_lector_id'), capture('nuevo_persona_id', 'pm.response.json().persona_id')]);
request('Duplicado', 'POST', '/api/lectores', 409, lector);
request('Editar lector', 'PUT', '/api/lectores/{{nuevo_lector_id}}', 200, { ...lector, nombres: 'Actualizado' }, undefined, [expect('Nombre actualizado', 'pm.expect(pm.response.json().nombres).to.eql("Actualizado");')]);
request('ID invalido', 'PUT', '/api/lectores/no-numero', 400, lector);
request('Lector inexistente', 'PUT', '/api/lectores/{{id_inexistente}}', 404, lector);
request('Sancionar lector', 'PATCH', '/api/lectores/estado/{{nuevo_lector_id}}', 200, undefined, undefined, [expect('Estado sancionado', 'pm.expect(pm.response.json().estado).to.eql("SANCIONADO");')]);
request('Reactivar lector', 'PATCH', '/api/lectores/estado/{{nuevo_lector_id}}', 200, undefined, undefined, [expect('Estado activo', 'pm.expect(pm.response.json().estado).to.eql("ACTIVO");')]);
for (const [method, route, body] of [['POST', '/api/lectores', lector], ['PUT', '/api/lectores/{{nuevo_lector_id}}', lector], ['PATCH', '/api/lectores/estado/{{nuevo_lector_id}}', undefined], ['DELETE', '/api/lectores/{{nuevo_lector_id}}', undefined]]) request('Lector sin permiso de modificar', method, route, 403, body, 'token_lector');
request('Crear acceso de persona existente', 'POST', '/api/usuarios/persona/{{nuevo_persona_id}}', 201, { username: v('persona_username'), password: v('test_password'), rol_id: v('rol_lector') }, undefined, [capture('persona_usuario_id', 'pm.response.json().data.login.id')]);
request('Acceso ya existente', 'POST', '/api/usuarios/persona/{{nuevo_persona_id}}', 409, { username: v('persona_username'), password: v('test_password'), rol_id: v('rol_lector') });
request('Eliminar lector sin prestamos', 'DELETE', '/api/lectores/{{nuevo_lector_id}}', 200);
request('Lector eliminado no existe', 'DELETE', '/api/lectores/{{nuevo_lector_id}}', 404);
request('Cuenta asociada eliminada', 'GET', '/api/usuarios/{{persona_usuario_id}}', 404);

group('Areas', 'AR');
request('Sin token', 'GET', '/api/areas', 401, undefined, null);
request('Lector sin permiso', 'GET', '/api/areas', 403, undefined, 'token_lector');
request('Listar areas', 'GET', '/api/areas', 200, undefined, undefined, [array]);
request('Nombre vacio', 'POST', '/api/areas', 400, { nombre: '' });
request('Nombre no textual', 'POST', '/api/areas', 400, { nombre: 123 });
request('Crear area', 'POST', '/api/areas', 201, { nombre: v('area_nombre') }, undefined, [capture('area_id')]);
request('Nombre duplicado', 'POST', '/api/areas', 409, { nombre: v('area_nombre') });
request('Actualizar area', 'PUT', '/api/areas/{{area_id}}', 200, { nombre: v('area_nombre_editado') });
request('ID invalido', 'PUT', '/api/areas/no-numero', 400, { nombre: v('area_nombre') });
request('Area inexistente', 'PUT', '/api/areas/{{id_inexistente}}', 404, { nombre: v('area_nombre') });
request('Desactivar area', 'PATCH', '/api/areas/{{area_id}}/estado', 200, undefined, undefined, [expect('Estado inactivo', 'pm.expect(pm.response.json().area.estado).to.eql("INACTIVO");')]);
request('Activas excluyen area desactivada', 'GET', '/api/areas/activas', 200, undefined, undefined, [array, expect('Area desactivada excluida', 'pm.expect(pm.response.json().some(x => x.id === Number(pm.environment.get("area_id")))).to.eql(false);')]);
request('Reactivar area', 'PATCH', '/api/areas/{{area_id}}/estado', 200);
for (const [method, route, body] of [['POST', '/api/areas', { nombre: v('area_nombre') }], ['PUT', '/api/areas/{{area_id}}', { nombre: v('area_nombre') }], ['PATCH', '/api/areas/{{area_id}}/estado', undefined]]) request('Lector sin permiso de modificar', method, route, 403, body, 'token_lector');

group('Recursos', 'R');
request('Sin token', 'GET', '/api/recursos', 401, undefined, null);
request('Listar bibliotecario', 'GET', '/api/recursos', 200, undefined, undefined, [array]);
request('Listar lector', 'GET', '/api/recursos', 200, undefined, 'token_lector', [array]);
request('ID invalido', 'GET', '/api/recursos/no-numero', 400);
request('Recurso inexistente', 'GET', '/api/recursos/{{id_inexistente}}', 404);
request('Faltan datos', 'POST', '/api/recursos', 400, {});
request('Autor vacio', 'POST', '/api/recursos', 400, { ...libro, autor: '' });
request('Cantidad invalida', 'POST', '/api/recursos', 400, { ...libro, cantidad_total: -1 });
request('Area inexistente', 'POST', '/api/recursos', 400, { ...libro, area_id: v('id_inexistente') });
request('Crear libro', 'POST', '/api/recursos', 201, libro, undefined, [capture('libro_id'), expect('Stock inicial', 'pm.expect(pm.response.json().cantidad_disponible).to.eql(2);')]);
request('Codigo duplicado', 'POST', '/api/recursos', 409, libro);
request('Consultar disponibilidad lector', 'GET', '/api/recursos/{{libro_id}}', 200, undefined, 'token_lector', [expect('Disponible', 'pm.expect(pm.response.json().cantidad_disponible).to.eql(2);')]);
request('Editar libro', 'PUT', '/api/recursos/{{libro_id}}', 200, { ...libro, titulo: 'Libro temporal actualizado E3' });
request('Editar inexistente', 'PUT', '/api/recursos/{{id_inexistente}}', 404, libro);
request('Estado invalido', 'PATCH', '/api/recursos/{{libro_id}}/estado', 400, { estado: 'INVALIDO' });
request('Poner mantenimiento', 'PATCH', '/api/recursos/{{libro_id}}/estado', 200, { estado: 'MANTENIMIENTO' });
request('Restaurar disponible', 'PATCH', '/api/recursos/{{libro_id}}/estado', 200, { estado: 'DISPONIBLE' });
request('Tesis incompleta', 'POST', '/api/recursos', 400, { ...tesis, tutor_guia: '' });
request('Crear tesis', 'POST', '/api/recursos', 201, tesis, undefined, [capture('tesis_id'), expect('Una unidad de tesis', 'pm.expect(pm.response.json().cantidad_total).to.eql(1);')]);
for (const [method, route, body] of [['POST', '/api/recursos', libro], ['PUT', '/api/recursos/{{libro_id}}', libro], ['PATCH', '/api/recursos/{{libro_id}}/estado', { estado: 'BAJA' }], ['DELETE', '/api/recursos/{{libro_id}}', undefined]]) request('Lector sin permiso de modificar', method, route, 403, body, 'token_lector');
request('Crear libro para eliminar', 'POST', '/api/recursos', 201, { ...libro, codigo_topografico: v('borrable_codigo') }, undefined, [capture('borrable_id')]);
request('Eliminar recurso sin prestamos', 'DELETE', '/api/recursos/{{borrable_id}}', 200);
request('Eliminado no existe', 'GET', '/api/recursos/{{borrable_id}}', 404);

group('Prestamos', 'PR');
request('Sin token', 'GET', '/api/prestamos', 401, undefined, null);
request('Listado bibliotecario', 'GET', '/api/prestamos', 200, undefined, undefined, [array]);
request('Lector no ve todos', 'GET', '/api/prestamos', 403, undefined, 'token_lector');
request('Lector no crea prestamos', 'POST', '/api/prestamos', 403, loan, 'token_lector');
request('Datos faltantes', 'POST', '/api/prestamos', 400, {});
request('ID invalido', 'POST', '/api/prestamos', 400, { ...loan, lector_id: -1 });
request('Fecha imposible', 'POST', '/api/prestamos', 400, { ...loan, fecha_devolucion_prevista: '2999-02-31' });
request('Fecha pasada', 'POST', '/api/prestamos', 400, { ...loan, fecha_devolucion_prevista: v('fecha_ayer') });
request('Tipo invalido', 'POST', '/api/prestamos', 400, { ...loan, tipo_prestamo: 'INVALIDO' });
request('Lector inexistente', 'POST', '/api/prestamos', 404, { ...loan, lector_id: v('id_inexistente') });
request('Recurso inexistente', 'POST', '/api/prestamos', 404, { ...loan, recurso_id: v('id_inexistente') });
request('Lector sancionado', 'POST', '/api/prestamos', 409, { ...loan, lector_id: v('lector_sancionado_id') });
request('Preparar mantenimiento', 'PATCH', '/api/recursos/{{libro_id}}/estado', 200, { estado: 'MANTENIMIENTO' });
request('Recurso en mantenimiento', 'POST', '/api/prestamos', 409, loan);
request('Restaurar recurso', 'PATCH', '/api/recursos/{{libro_id}}/estado', 200, { estado: 'DISPONIBLE' });
request('Tesis no sale a domicilio', 'POST', '/api/prestamos', 400, { ...loan, recurso_id: v('tesis_id') });
request('Prestar libro', 'POST', '/api/prestamos', 201, loan, undefined, [capture('prestamo_id', 'pm.response.json().prestamo.id')]);
request('Stock descontado', 'GET', '/api/recursos/{{libro_id}}', 200, undefined, 'token_lector', [expect('Queda una unidad', 'pm.expect(pm.response.json().cantidad_disponible).to.eql(1);')]);
request('Prestamo activo duplicado', 'POST', '/api/prestamos', 409, loan);
request('Prestar otra unidad a otro lector', 'POST', '/api/prestamos', 201, { ...loan, lector_id: v('lector_otro_id') }, undefined, [capture('prestamo_otro_id', 'pm.response.json().prestamo.id')]);
request('Sin unidades', 'POST', '/api/prestamos', 409, { ...loan, lector_id: v('usuario_lector_id') });
request('Mis prestamos solo propios', 'GET', '/api/prestamos/mis-prestamos', 200, undefined, 'token_lector', [array, expect('Pendiente propio y aislamiento', 'const rows = pm.response.json(); pm.expect(rows.some(x => x.id === Number(pm.environment.get("prestamo_id")) && x.estado === "PRESTADO")).to.eql(true); pm.expect(rows.every(x => x.lector_id === Number(pm.environment.get("lector_id")))).to.eql(true); pm.expect(rows.some(x => x.id === Number(pm.environment.get("prestamo_otro_id")))).to.eql(false);')]);
request('Mis alertas propias', 'GET', '/api/prestamos/mis-alertas', 200, undefined, 'token_lector', [array, expect('Vence hoy y aislamiento', 'const rows = pm.response.json(); pm.expect(rows.some(x => x.id === Number(pm.environment.get("prestamo_id")) && x.tipo_alerta === "VENCE_HOY")).to.eql(true); pm.expect(rows.every(x => x.lector_id === Number(pm.environment.get("lector_id")))).to.eql(true);')]);
request('Bibliotecario no usa mis prestamos', 'GET', '/api/prestamos/mis-prestamos', 403);
request('Bibliotecario no usa mis alertas', 'GET', '/api/prestamos/mis-alertas', 403);
request('Eliminar recurso con prestamos', 'DELETE', '/api/recursos/{{libro_id}}', 409);
request('Eliminar lector con prestamos', 'DELETE', '/api/lectores/{{lector_id}}', 409);
request('Lector no registra devolucion', 'PATCH', '/api/prestamos/devolver/{{prestamo_id}}', 403, undefined, 'token_lector');
request('Devolver inexistente', 'PATCH', '/api/prestamos/devolver/{{id_inexistente}}', 404);
request('Devolver ID invalido', 'PATCH', '/api/prestamos/devolver/no-numero', 400);
request('Devolver libro', 'PATCH', '/api/prestamos/devolver/{{prestamo_id}}', 200, undefined, undefined, [expect('Estado devuelto', 'pm.expect(pm.response.json().prestamo.estado).to.eql("DEVUELTO");')]);
request('Stock restaurado', 'GET', '/api/recursos/{{libro_id}}', 200, undefined, 'token_lector', [expect('Una unidad disponible', 'pm.expect(pm.response.json().cantidad_disponible).to.eql(1);')]);
request('Segunda devolucion', 'PATCH', '/api/prestamos/devolver/{{prestamo_id}}', 409);
request('Historial propio', 'GET', '/api/prestamos/mis-prestamos', 200, undefined, 'token_lector', [array, expect('Historial devuelto', 'pm.expect(pm.response.json().some(x => x.id === Number(pm.environment.get("prestamo_id")) && x.estado === "DEVUELTO")).to.eql(true);')]);
request('Sin alerta tras devolver', 'GET', '/api/prestamos/mis-alertas', 200, undefined, 'token_lector', [array, expect('Devuelto excluido de alertas', 'pm.expect(pm.response.json().some(x => x.id === Number(pm.environment.get("prestamo_id")))).to.eql(false);')]);
request('Prestar tesis en sala', 'POST', '/api/prestamos', 201, { ...loan, recurso_id: v('tesis_id'), tipo_prestamo: 'SALA' }, undefined, [capture('prestamo_tesis_id', 'pm.response.json().prestamo.id')]);
request('Devolver tesis', 'PATCH', '/api/prestamos/devolver/{{prestamo_tesis_id}}', 200);
request('Devolver otra unidad', 'PATCH', '/api/prestamos/devolver/{{prestamo_otro_id}}', 200);
request('Stock final completo', 'GET', '/api/recursos/{{libro_id}}', 200, undefined, 'token_lector', [expect('Dos unidades disponibles', 'pm.expect(pm.response.json().cantidad_disponible).to.eql(2);')]);

const auth = JSON.parse(await readFile(new URL('./salud-auth.postman_collection.json', import.meta.url), 'utf8'));
const collection = { ...auth, info: { ...auth.info, name: 'E3 - Biblioteca completa', description: 'Salud, Auth, Usuarios, Lectores, Areas, Recursos y Prestamos. Ejecutar pnpm test:automated con API y PostgreSQL locales; el ejecutor prepara variables, datos ficticios y limpieza.' }, item: [...auth.item, ...folders] };
await writeFile(new URL('./biblioteca.postman_collection.json', import.meta.url), JSON.stringify(collection, null, 2) + '\n');
console.log(`Coleccion generada: ${folders.reduce((n, f) => n + f.item.length, 0)} solicitudes adicionales.`);
