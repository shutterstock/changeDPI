# changeDPI

changeDPI provides 2 utility functions that can change the dpi of canvas generated image, both on the dataUrl or Blob format. The functions works on separating the header from the image data, convert and manipulate the header only, and then stick the header back to the file.
In this way giant images can be converted fast without having to convert all the content of the file.
Image data does not get modified in the process, the image stays the same.

## Install

This project depends on [node](https://nodejs.org) and [npm](https://npmjs.com).

```js
npm install --save changedpi
```

## Usage

From a canvas element dataUrl:
```js
// create the dataUrl at standard 72dpi
var dataUrl = canvas.toDataURL('image/jpeg', 0.92);
var daurl150dpi = changeDpiDataUrl(dataUrl, 150);
```

From a canvas element blob:
```js
// create the blob at standard 72dpi
canvas.toBlob(function(blob) {
  changeDpiBlob(blob, 300).then(function(blob){
    // use your changed blob
  })
},'image/jpeg', 0.92);
```

```js
  TODO add example with file reader.
```

### ES6

This module uses ES6. To see a compiled ES5 version, run `npm run build` and look in `dist/`.

## Testing

```js
npm install .
npm run test
```

## Maintainer

This project is maintained by @abogazzi.

If you're interested in helping out and you are already a committer on the project, open an issue and ask to be added as a contributor.

## Contribute

Please do contribute! Open an issue or submit a pull request.

The project falls under [@Shutterstock](https://github.com/shutterstock/welcome)'s [Code of Conduct](https://github.com/shutterstock/welcome/blob/master/CODE_OF_CONDUCT.md).

## License

MIT.
