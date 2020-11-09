"use strict";

const sharp = require('sharp');
const rimraf = require('rimraf');
const path = require('path');
const fs = require('fs-extra');
const {
  JSDOM
} = require('jsdom');


module.exports = function (eleventyConfig, options) {

  const defaults = {
    autoselector: '.page-body img',
    srcsetWidths: [320, 480, 640, 960, 1280, 1600],
    fallbackWidth: 640,
    fallbackHeight: null,
    createCaptions: false,
    resizeOriginal: true,
    cropPosition: "gravity.center",
    inputDir: "./src/",
    outputDir: "./dist/"
  }

  const config = {
    ...defaults,
    ...options
  }


  // TODO change namespace to something adequate
  eleventyConfig.namespace('elevent-srcset', () => {

    eleventyConfig.addShortcode('srcset', (image, alt, className, width, height, sizes, cropPosition) => {
      if (image) {
        let imageExtension = image.split('.').pop();
        let imageFilename = image.split('.').shift().replace(/\s+/g, '-');

        generateImageSizes(image, width, height, cropPosition || null);

        let srcSet = imageExtension != 'svg' ? config.srcsetWidths.map((w) => {
          return `${ imageFilename }_${ w }w${height ? Math.floor(height/width * w) + 'h' : ''}.${ imageExtension } ${ w }w`
        }).join(', ') : '';

        return `<img
          srcset="${ srcSet }"
          sizes="${ sizes ? sizes : '100vw' }"
          class="${ className }"
          src="${ image }"
          alt="${ alt ? alt : '' }"
          >`;
      }
    });

    eleventyConfig.addTransform('autoSrcset', async (content, outputPath) => {
      if (outputPath.endsWith(".html") && config.autoselector) {
        const dom = new JSDOM(content);
        const images = [...dom.window.document.querySelectorAll(config.autoselector)];
        if (images.length > 0) {
          await Promise.all(images.map(updateImage));
        }
        content = dom.serialize();
        return content;
      }
      else {
        return content;
      }
    });

  });

  const updateImage = async imgElem => {
    let imageName = imgElem.src;
    let imageExtension = imageName.split('.').pop();
    let imageFilename = imageName.split('.').shift().replace(/\s+/g, '-');
    let height = config.fallbackHeight || null;
    let width = config.fallbackWidth;

    generateImageSizes(imageName, width, height);

    if (imageExtension != 'svg') {
      // create srcset images and markup
      let srcset = `${
        config.srcsetWidths.map( ( w ) => {
          return `${ imageFilename }_${ w }w${height ? (height/width * w) + 'h' : ''}.${ imageExtension } ${ w }w`
        } ).join( ', ' )
        }`;
      imgElem.setAttribute('srcset', srcset);
      // set the sizes attribute
      imgElem.setAttribute('sizes', `(min-width: ${width}px) ${width}px, 100vw`);
    }

    // Create captions if enabled
    if (config.createCaptions && imgElem.getAttribute('title')) {
      imgElem.insertAdjacentHTML('afterend', `<figure><img alt="${imgElem.alt}" src="${imgElem.src}" srcset="${srcset || null}"/><figcaption>${imgElem.title}</figcaption></figure>`);
      imgElem.remove();
    }

  }

  // Function to resize a single image
  const generateImageSizes = function (image, width, height, cropPosition) {
    if (image) {
      let imageFilename = image.split('.').shift().replace(/\s+/g, '-');
      let imageExtension = image.split('.').pop();

      fs.ensureDirSync(path.join(process.cwd(), config.outputDir, image.substring(0, image.lastIndexOf("/"))));
      // Resize the original image, retaining the same filename
      if (config.resizeOriginal) {
        resizeSingleImage(image, width, height, (cropPosition || null), false);
      } else {
        resizeSingleImage(image, null, null, (cropPosition || null), false);
      }
      // Resize based on srcsetWidths
      if (imageExtension != 'svg') {
        config.srcsetWidths.forEach((size, counter) => {
          resizeSingleImage(image, size, (height ? Math.floor(height / width * size) : null), (cropPosition || null), true);
        });
      }
    }
  }

  const resizeSingleImage = function (image, width, height, cropPosition, rename) {
    let srcPath = path.join(process.cwd(), config.inputDir, image);
    let imageExtension = image.split('.').pop();
    let imageFilename = image.split('.').shift().replace(/\s+/g, '-');
    if (rename) {
      var outputPath = path.join(process.cwd(), config.outputDir, imageFilename + '_' + width + 'w' + (height ? height + 'h' : '') + '.' + imageExtension);
    } else {
      var outputPath = path.join(process.cwd(), config.outputDir, imageFilename + '.' + imageExtension);
    }
    if (!fs.existsSync(outputPath)) {
      if (imageExtension != 'svg') {
        sharp(srcPath).resize(width, (height || null), {
            fit: sharp.fit.cover,
            position: cropPosition ? sharp[cropPosition.split('.')[0]][cropPosition.split('.')[1]] : sharp[config.cropPosition.split('.')[0]][config.cropPosition.split('.')[1]]
          }).toFile(outputPath)
          .catch(err => {
            console.log(`${err} (${image})`)
          });
      } else {
        fs.copyFile(srcPath, outputPath);
        console.log('svg copied to ' + outputPath);
      }
    }
  }
};
