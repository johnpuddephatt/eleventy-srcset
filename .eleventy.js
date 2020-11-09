"use strict";

const sharp = require('sharp');
const rimraf = require('rimraf');
const path = require('path');
const fs = require('fs-extra');
const {
  JSDOM
} = require('jsdom');
const crypto = require('crypto');

module.exports = function(eleventyConfig, options) {

  const defaults = {
    autoselector: '.page-body img',
    srcsetWidths: [320, 480, 640, 960, 1280, 1600],
    fallbackWidth: 640,
    fallbackHeight: null,
    createCaptions: false,
    resizeOriginal: true,
    cropPosition: "gravity.center",
    dirs: {
      temp: "./.tmp/",
      input: "./src/",
      output: "./dist/"
    }
  }

  const config = {
    ...defaults,
    ...options
  }

  eleventyConfig.on('afterBuild', () => {
    let tempDir = path.join(process.cwd(), config.dirs.temp);
    let outputDir = path.join(process.cwd(), config.dirs.output);
    fs.copy(tempDir, outputDir, function(err) {
      if (err) {
        console.error(err);
      }
    });
  });

  function hasSvgExtension(image) {
    let imageExtension = image.split('.').pop();
    return imageExtension == 'svg';
  }

  function createHash(values) {
    return crypto.createHash('md5').update(values.join('')).digest('hex');
  }

  function getDirectory(image) {
    return path.join(process.cwd(), config.dirs.temp, image.substring(0, image.lastIndexOf("/")));
  }

  function getFilename(image) {
    return image.split('.').shift().replace(/\s+/g, '-');
  }

  function getExtension(image) {
    return image.split('.').pop();
  }

  function getInputPath(image) {
    return path.join(process.cwd(), config.dirs.input, image);
  }

  function getOutputPath(outputName) {
    return path.join(process.cwd(), config.dirs.temp, outputName);
  }

  function sharpCropStringToArray(string) {
    return sharp[string.split('.')[0]][string.split('.')[1]];
  }

  eleventyConfig.addShortcode('srcset', (image, alt, className = null, width, height, sizes, cropPosition) => {
    if(image) {
      return `<img
        srcset="${ !hasSvgExtension(image) ? generateImageSizes(image, width, height, cropPosition) : ''}"
        sizes="${ sizes ?? '100vw' }"
        class="${ className ?? null }"
        src="${ generateImage(image, width, height, cropPosition) }"
        alt="${ alt ?? '' }"
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
    }

    return content;
  });

  function generateImage(image, width, height, cropPosition) {
    config.resizeOriginal ? resizeSingleImage(image, width, height, cropPosition, false) : resizeSingleImage(image);
  }

  const updateImage = async imgElem => {
    let image = imgElem.src;

    if (!hasSvgExtension(image)) {
      imgElem.setAttribute('srcset', generateImageSizes(image, config.fallbackWidth, config.fallbackHeight, config.cropPosition));
      imgElem.setAttribute('sizes', `(min-width: ${ config.fallbackWidth }px) ${ config.fallbackWidth }px, 100vw`);
    }

    if (config.createCaptions && imgElem.getAttribute('title')) {
      imgElem.insertAdjacentHTML('afterend', `<figure><img alt="${imgElem.alt}" src="${imgElem.src}" srcset="${srcset || null}"/><figcaption>${imgElem.title}</figcaption></figure>`);
      imgElem.remove();
    }
  }

  const generateImageSizes = function(image, width, height, cropPosition = null) {
    fs.ensureDirSync(getDirectory(image));

   return config.srcsetWidths.map((w) => {
      let computedHeight = height ? Math.floor(height / width * w) : 0;
      return `${resizeSingleImage(image, w, computedHeight, cropPosition, true)} ${ w }w`;
    }).join(', ');
  }

  const resizeSingleImage = function(image, width, height, cropPosition, rename) {

    var outputFilename = rename ? `${getFilename(image)}_${createHash([image, width, height, config.cropPosition])}.${getExtension(image)}` : `${getFilename(image)}.${getExtension(image)}`;

    if (!fs.existsSync(getOutputPath(image))) {
      if(!hasSvgExtension(image)) {
        sharp(getInputPath(image)).resize(width, (height || null), {
          fit: sharp.fit.cover,
          position: sharpCropStringToArray(cropPosition || config.cropPosition)
        }).toFile(getOutputPath(outputFilename))
      }
      else {
        fs.copyFile(image, config.dirs.temp);
      }
    }

    return outputFilename;
  }
};
