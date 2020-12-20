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
    createCaptionFromTitle: false,
    resizeOriginal: true,
    cropPosition: "gravity.center",
    dirs: {
      temp: "./.tmp/",
      input: "./src/",
      output: "./dist/"
    }
  }

  let processedImageArray = [];

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

    // let toDelete = fs.readdirSync(config.dirs.temp).filter( ( el ) => !imageArray.includes( el ) );
    // console.log(toDelete);
    //
    // toDelete.forEach(file => {
    //   let pathToFile = getTempPath(file);
    //   console.log('maybe unlink... ', pathToFile);
    //   if(!fs.lstatSync(pathToFile).isDirectory()) {
    //     console.log('unlink... ', pathToFile);
    //     fs.unlink(pathToFile);
    //   }
    // });

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

  function getTempPath(outputName) {
    return path.join(process.cwd(), config.dirs.temp, outputName);
  }

  function sharpCropStringToArray(string) {
    return sharp[string.split('.')[0]][string.split('.')[1]];
  }

  eleventyConfig.addShortcode('srcset', (image, alt, className = null, width, height, sizes, cropPosition) => {
    if(image) {
      return `<img
                srcset="${ !hasSvgExtension(image) ? generateSrcset(image, width, height, cropPosition) : ''}"
                sizes="${ sizes || '100vw' }"
                class="${ className || '' }"
                src="${ generateSrc(image, width, height, cropPosition) }"
                alt="${ alt || '' }"
                >`;
    }
  });

  eleventyConfig.addTransform('autoSrcset', async (content, outputPath) => {
    if (config.autoselector && outputPath.endsWith(".html")) {
      const dom = new JSDOM(content);
      const images = [...dom.window.document.querySelectorAll(config.autoselector)];
      if (images.length > 0) {
        await Promise.all(images.map(updateExistingImg));
      }
      content = dom.serialize();
    }

    return content;
  });

  const generateSrc = function(image, width = config.fallbackWidth, height = config.fallbackHeight, cropPosition = config.cropPosition) {
    config.resizeOriginal ? resizeSingleImage(image, width, height, cropPosition, false) : resizeSingleImage(image);
  }

  const updateExistingImg = async imgElem => {
    let image = imgElem.src;

    if(!hasSvgExtension(image)) {
      imgElem.setAttribute('srcset', generateSrcset(image));
      imgElem.setAttribute('sizes', `(min-width: ${ config.fallbackWidth }px) ${ config.fallbackWidth }px, 100vw`);
      imgElem.setAttribute('src', generateSrc(image));
    }

    if (config.createCaptionFromTitle && imgElem.getAttribute('title')) {
      imgElem.insertAdjacentHTML(
        'afterend',
        `<figure>
          <img alt="${ imgElem.alt || null }" src="${ imgElem.src }" srcset="${ imgElem.srcset || null }" sizes="${ imgElem.sizes || null }" />
          <figcaption>${ imgElem.title }</figcaption>
        </figure>`);
      imgElem.remove();
    }
  }

  const generateSrcset = function(image, width = config.fallbackWidth, height = config.fallbackHeight, cropPosition = config.cropPosition) {
    fs.ensureDirSync(getDirectory(image));

    return config.srcsetWidths.map((w) => {
      let computedHeight = height ? Math.floor(height / width * w) : null;
      return `${resizeSingleImage(image, w, computedHeight, cropPosition, true)} ${ w }w`;
    }).join(', ');
  }

  const resizeSingleImage = function(image, width, height, cropPosition, rename) {
    var outputFilename = `${getFilename(image)}_${createHash([image, width, height, cropPosition, fs.statSync(getInputPath(image)).mtime])}.${getExtension(image)}`;

    processedImageArray.push(outputFilename);

    if (!fs.existsSync(getTempPath(image))) {
      if(!hasSvgExtension(image)) {
        sharp(getInputPath(image)).resize(width, height, {
          fit: sharp.fit.cover,
          position: sharpCropStringToArray(cropPosition)
        }).toFile(getTempPath(outputFilename))
      }
      else {
        fs.copyFile(image, config.dirs.temp);
      }
    }

    return outputFilename;
  }
};
