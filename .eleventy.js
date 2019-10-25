"use strict";

const sharp = require('sharp');
const rimraf = require('rimraf');
const path = require('path');
const fs = require('fs-extra');
const { JSDOM } = require('jsdom');


module.exports = function (eleventyConfig, pluginNamespace) {

  const srcsetConfig = {
    selector: eleventyConfig.srcsetAutoselector || '.page-body img',
    srcsetWidths: eleventyConfig.srcsetWidths || [ 320, 640, 960, 1280, 1600 ],
    fallbackWidth: eleventyConfig.srcsetFallbackWidth || 640,
    fallbackHeight: eleventyConfig.srcsetFallbackHeight || 360,
    createCaptions: eleventyConfig.srcsetCreateCaptions || false,
    dirs: {
      input: "./src/",
      output: "./dist/"
    }
  }

  eleventyConfig.namespace(pluginNamespace, () => {

    eleventyConfig.addShortcode('srcset', (image, alt, className, width, height, sizes) => {
      generateImageSizes(image, width, height);
      let imageExtension = image.split('.').pop();
      let imageFilename = image.split('.').shift();
      return `<img
        srcset="${
        srcsetConfig.srcsetWidths.map( ( w ) => {
          return `${ imageFilename }_${ w }w${height ? Math.floor(height/width * w) + 'h' : ''}.${ imageExtension } ${ w }w`
        } ).join( ', ' )
        }"
        sizes="${ sizes ? sizes : '100vw' }"
        class="${ className }"
        src="${ imageFilename }_${ width ? width : srcsetConfig.fallbackWidth }w${height ? height + 'h' : ''}.${ imageExtension }"
        alt="${ alt ? alt : '' }"
        >`;
    });

    eleventyConfig.addTransform('autoSrcset', async (content, outputPath) => {
      if( outputPath.endsWith(".html") && srcsetConfig.selector) {
        const dom = new JSDOM(content);
        const images = [...dom.window.document.querySelectorAll(srcsetConfig.selector)];
        if(images.length > 0) {
          await Promise.all(images.map(updateImage));
        }
        content = dom.serialize();
        return content;
      }
    });

  });

  const updateImage = async imgElem => {
    let imageName = imgElem.src;
    let imageExtension = imageName.split('.').pop();
    let imageFilename = imageName.split('.').shift();
    let height = srcsetConfig.fallbackHeight || null;
    let width = srcsetConfig.fallbackWidth;

   // update markup
    let srcset = `${
      srcsetConfig.srcsetWidths.map( ( w ) => {
        return `${ imageFilename }_${ w }w${height ? (height/width * w) + 'h' : ''}.${ imageExtension } ${ w }w`
      } ).join( ', ' )
      }`;
    imgElem.setAttribute('srcset', srcset);

    if(srcsetConfig.createCaptions && imgElem.getAttribute('title')) {
      imgElem.insertAdjacentHTML('afterend', `<figure><img src="${imgElem.src}" srcset="${srcset}"/><figcaption>${imgElem.title}</figcaption></figure>`);
      imgElem.remove();
    }

    // generate image files
    resizeImage(imageName, width, height);
  }

  // Function to resize a single image
  const generateImageSizes = function(image, width, height) {
    fs.ensureDirSync(path.join(process.cwd(), srcsetConfig.dirs.output, 'uploads'));
    resizeSingleImage(image,width,height);
    srcsetConfig.srcsetWidths.forEach((size, counter) => {
        resizeSingleImage(image,size,(height ? Math.floor(height/width * size) : null));
    });
  }

  const resizeSingleImage = function(image,width,height) {
    let srcPath = path.join(process.cwd(), srcsetConfig.dirs.input, image);
    let imageExtension = image.split('.').pop();
    let imageFilename = image.split('.').shift();
    let outputPath = path.join(process.cwd(), srcsetConfig.dirs.output, imageFilename + '_' +  width + 'w' + (height? height + 'h' : '') + '.' + imageExtension);
    if (!fs.existsSync(outputPath)) {
      sharp(srcPath).resize(width,(height? height : null),{
        fit: sharp.fit.cover,
        position: sharp.strategy.attention
        // position: sharp.gravity.west
      }).toFile(outputPath)
      .catch( err => { console.log(err) });
    }
  }

};
