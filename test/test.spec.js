import chai, { expect } from 'chai';
import fs from 'fs';
import { changeDpiDataUrl, changeDpiBlob } from '../src/index';
import btoa from 'btoa';
import atob from 'atob';

const FileReader = function() {};
FileReader.prototype.readAsArrayBuffer = function(buffer) {
  this.result = buffer;
  this.onload();
};
const Blob = function(arrays, options) {
  const a = Buffer.from(arrays[0]);
  const b = Buffer.from(arrays[1]);
  const newbuff = Buffer.concat([a,b]);
  newbuff.type = options.type;
  return newbuff;
};

global.Blob = Blob;
global.FileReader = FileReader;
global.btoa = btoa;
global.atob = atob;

function base64_encode(file, type) {
    // read binary data
    var bitmap = fs.readFileSync(__dirname + '/' + file);
    // convert binary data to base64 encoded string
    return 'data:' + type + ';base64,' + bitmap.toString('base64');
}

function saveFile(dataUrl, type, name) {
  const base64Data = dataUrl.replace('data:' + type + ';base64,', '');
  return fs.writeFileSync(__dirname + '/' + name, base64Data, 'base64');
}

describe('It can convert dpi', function() {
  it('PNG conversion dataurl', function() {
    const pngat415 = base64_encode('test415.png', 'image/png');
    const pngat830 = base64_encode('test830.png', 'image/png');
    const converted = changeDpiDataUrl(pngat415, 830);
    expect(pngat830 === converted).to.equal(true);
    expect(pngat415 === converted).to.equal(false);
  });
  it('JPEG conversion dataurl', function() {
    const jpeg123 = base64_encode('jpeg123.jpg', 'image/jpeg');
    const jpeg456 = base64_encode('jpeg456.jpg', 'image/jpeg');
    const converted = changeDpiDataUrl(jpeg123, 456);
    expect(jpeg456 === converted).to.equal(true);
    expect(jpeg123 === converted).to.equal(false);
  });
  it('JPEG conversion blob', function() {
    const b = fs.readFileSync(__dirname + '/jpeg123.jpg');
    const a = fs.readFileSync(__dirname + '/jpeg456.jpg');
    b.type = 'image/jpeg';
    return changeDpiBlob(b, 456).then(blob => {
      expect(Buffer.compare(blob,a)).to.equal(0);
      expect(Buffer.compare(blob,b)).to.not.equal(0);
    });
  });
  // it('PNG conversion blob', function() {
  //   const b = fs.readFileSync(__dirname + '/test415.png');
  //   const a = fs.readFileSync(__dirname + '/test830.png');
  //   b.type = 'image/png';
  //   a.type = 'image/png';
  //   return changeDpiBlob(b, 830).then(blob => {
  //     fs.writeFileSync(__dirname + '/test.png', blob);
  //     expect(Buffer.compare(blob, a)).to.equal(0);
  //   });
  // });
});
