function createPngDataTable() {
  /* Table of CRCs of all 8-bit messages. */
  const crcTable = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c;
  }
  return crcTable;
}

function calcCrc(buf) {
  let c = -1;
  if (!pngDataTable) pngDataTable = createPngDataTable();
  for (let n = 0; n < buf.length; n++) {
    c = pngDataTable[(c ^ buf[n]) & 0xFF] ^ (c >>> 8);
  }
  return c ^ -1;
}

let pngDataTable;

const PNG = 'image/png';
const JPEG = 'image/jpeg';

// those are 3 possible signature of the physBlock in base64.
// the pHYs signature block is preceed by the 4 bytes of lenght. The length of
// the block is always 9 bytes. So a phys block has always this signature:
// 0 0 0 9 p H Y s.
// However the data64 encoding aligns we will always find one of those 3 strings.
// this allow us to find this particular occurence of the pHYs block without
// converting from b64 back to string
const b64PhysSignature1 = 'AAlwSFlz';
const b64PhysSignature2 = 'AAAJcEhZ';
const b64PhysSignature3 = 'AAAACXBI';

const _P = 'p'.charCodeAt(0);
const _H = 'H'.charCodeAt(0);
const _Y = 'Y'.charCodeAt(0);
const _S = 's'.charCodeAt(0);

function isBufferPNG(buffer) {
  if (buffer.length < 8) return;
  return buffer[0] === 137 && buffer[1] === 80 && buffer[2] === 78 && buffer[3] === 71 && buffer[4] === 13 && buffer[5] === 10 && buffer[6] === 26 && buffer[7] === 10;
}

function isBufferJPEG(buffer) {
  if (buffer.length < 3) return;
  return buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
}

function getType(buffer) {
  if (isBufferJPEG(buffer)) {
    return JPEG;
  }
  if (isBufferPNG(buffer)) {
    return PNG;
  }
}

function mergedTypedArrays(a, b) {
  var c = new a.constructor(a.length + b.length);
  c.set(a);
  c.set(b, a.length);
  return c;
}

export function changeDpiBuffer(buffer, dpi) {
  const headerChunk = new Uint8Array(buffer.slice(0, 33));
  const rest = buffer.slice(33);
  const type = getType(buffer);
  const changedHeader = changeDpiOnArray(headerChunk, dpi, type);
  return mergedTypedArrays(changedHeader, rest);
}

export function changeDpiBlob(blob, dpi) {
  // 33 bytes are ok for pngs and jpegs
  // to contain the information.
  const headerChunk = blob.slice(0, 33);
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = () => {
      const dataArray = new Uint8Array(fileReader.result);
      const tail = blob.slice(33);
      const changedArray = changeDpiOnArray(dataArray, dpi, blob.type);
      resolve(new Blob([changedArray, tail], { type: blob.type }));
    };
    fileReader.readAsArrayBuffer(headerChunk);
  });
}

export function changeDpiDataUrl(base64Image, dpi) {
  const dataSplitted = base64Image.split(',');
  const format = dataSplitted[0];
  const body = dataSplitted[1];
  let type;
  let headerLength;
  let overwritepHYs = false;
  if (format.indexOf(PNG) !== -1) {
    type = PNG;
    const b64Index = detectPhysChunkFromDataUrl(body);
    // 28 bytes in dataUrl are 21bytes, length of phys chunk with everything inside.
    if (b64Index >= 0) {
      headerLength = Math.ceil((b64Index + 28) / 3) * 4;
      overwritepHYs = true;
    } else {
      headerLength = 33 / 3 * 4;
    }
  }
  if (format.indexOf(JPEG) !== -1) {
    type = JPEG;
    headerLength = 18 / 3 * 4;
  }
  // 33 bytes are ok for pngs and jpegs
  // to contain the information.
  const stringHeader = body.substring(0, headerLength);
  const restOfData = body.substring(headerLength);
  const headerBytes = atob(stringHeader);
  const dataArray = new Uint8Array(headerBytes.length);
  for (let i = 0; i < dataArray.length; i++) {
    dataArray[i] = headerBytes.charCodeAt(i);
  }
  const finalArray = changeDpiOnArray(dataArray, dpi, type, overwritepHYs);
  const base64Header = btoa(String.fromCharCode(...finalArray));
  return [format, ',', base64Header, restOfData].join('');
}

function detectPhysChunkFromDataUrl(data) {
  let b64index = data.indexOf(b64PhysSignature1);
  if (b64index === -1) {
    b64index = data.indexOf(b64PhysSignature2);
  }
  if (b64index === -1) {
    b64index = data.indexOf(b64PhysSignature3);
  }
  // if b64index === -1 chunk is not found
  return b64index;
}

function searchStartOfPhys(data) {
  const length = data.length - 1;
  // we check from the end since we cut the string in proximity of the header
  // the header is within 21 bytes from the end.
  for (let i = length; i >= 4; i--) {
    if (data[i - 4] === 9 && data[i - 3] === _P &&
      data[i - 2] === _H && data[i - 1] === _Y &&
      data[i] === _S) {
        return i - 3;
    }
  }
}

function changeDpiOnArray(dataArray, dpi, format, overwritepHYs) {
  if (format === JPEG) {
    dataArray[13] = 1; // 1 pixel per inch or 2 pixel per cm
    dataArray[14] = dpi >> 8; // dpiX high byte
    dataArray[15] = dpi & 0xff; // dpiX low byte
    dataArray[16] = dpi >> 8; // dpiY high byte
    dataArray[17] = dpi & 0xff; // dpiY low byte
    return dataArray;
  }
  if (format === PNG) {
    const physChunk = new Uint8Array(13);
    // chunk header pHYs
    // 9 bytes of data
    // 4 bytes of crc
    // this multiplication is because the standard is dpi per meter.
    dpi *= 39.3701;
    physChunk[0] = _P;
    physChunk[1] = _H;
    physChunk[2] = _Y;
    physChunk[3] = _S;
    physChunk[4] = dpi >>> 24; // dpiX highest byte
    physChunk[5] = dpi >>> 16; // dpiX veryhigh byte
    physChunk[6] = dpi >>> 8; // dpiX high byte
    physChunk[7] = dpi & 0xff; // dpiX low byte
    physChunk[8] = physChunk[4]; // dpiY highest byte
    physChunk[9] = physChunk[5]; // dpiY veryhigh byte
    physChunk[10] = physChunk[6]; // dpiY high byte
    physChunk[11] = physChunk[7]; // dpiY low byte
    physChunk[12] = 1; // dot per meter....

    const crc = calcCrc(physChunk);

    const crcChunk = new Uint8Array(4);
    crcChunk[0] = crc >>> 24;
    crcChunk[1] = crc >>> 16;
    crcChunk[2] = crc >>> 8;
    crcChunk[3] = crc & 0xff;

    if (overwritepHYs) {
      const startingIndex = searchStartOfPhys(dataArray);
      dataArray.set(physChunk, startingIndex);
      dataArray.set(crcChunk, startingIndex + 13);
      return dataArray;
    } else {
      // i need to give back an array of data that is divisible by 3 so that
      // dataurl encoding gives me integers, for luck this chunk is 17 + 4 = 21
      // if it was we could add a text chunk contaning some info, untill desired
      // length is met.

      // chunk structur 4 bytes for length is 9
      const chunkLength = new Uint8Array(4);
      chunkLength[0] = 0;
      chunkLength[1] = 0;
      chunkLength[2] = 0;
      chunkLength[3] = 9;

      const finalHeader = new Uint8Array(54);
      finalHeader.set(dataArray, 0);
      finalHeader.set(chunkLength, 33);
      finalHeader.set(physChunk, 37);
      finalHeader.set(crcChunk, 50);
      return finalHeader;
    }
  }
}
