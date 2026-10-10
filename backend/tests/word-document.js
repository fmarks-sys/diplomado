import { writeFile } from 'node:fs/promises';

// Empaquetar las partes XML de Word como ZIP sin dependencias externas.
export const guardarWord = async (partes, destino) => {
    const crc32 = (bytes) => {
        let crc = 0xFFFFFFFF;
        for (const byte of bytes) {
            crc ^= byte;
            for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    };
    const locales = [];
    const centrales = [];
    let offset = 0;
    for (const [nombre, contenido] of Object.entries(partes)) {
        const name = Buffer.from(nombre);
        const data = Buffer.from(contenido);
        const crc = crc32(data);
        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034B50); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x800, 6);
        local.writeUInt16LE(0x21, 12); local.writeUInt32LE(crc, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
        locales.push(local, name, data);
        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014B50); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x800, 8);
        central.writeUInt16LE(0x21, 14); central.writeUInt32LE(crc, 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(offset, 42);
        centrales.push(central, name);
        offset += local.length + name.length + data.length;
    }
    const directorio = Buffer.concat(centrales);
    const fin = Buffer.alloc(22);
    fin.writeUInt32LE(0x06054B50); fin.writeUInt16LE(centrales.length / 2, 8); fin.writeUInt16LE(centrales.length / 2, 10); fin.writeUInt32LE(directorio.length, 12); fin.writeUInt32LE(offset, 16);
    await writeFile(destino, Buffer.concat([...locales, directorio, fin]));
};
