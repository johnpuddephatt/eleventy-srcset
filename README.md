@todo

This [Eleventy](https://www.11ty.dev/) plugin generates responsive image markup along with the corresponding image files.

It can be used in two ways:

1. The manual inserted **shortcode**, {% srcset %}
2. The automatic **filter**, mode which finds images based on a provided CSS selector

### Configuration

| Value | Details | Default |
|---|---|---|
|autoselector|Specifies the CSS selector used to automatically find <img> elements to replace.|'.page-body img'|
|srcsetWidths|An array of the breakpoint widths used to generate images|[ 320, 480, 640, 960, 1280, 1600 ]|
|fallbackWidth|The width for the fallback 'src' image|640|
|fallbackHeight|The height for the fallback 'src' image, when null the image will be automatic based on the aspect ratio and fallbackWidth|null|
|createCaptions|When true, automatic mode wraps outputted <img> tags in a <figure> tag with a <figcaption> whose text is a copy of the image's title attribute. This makes [generating captions from markdown](https://daringfireball.net/projects/markdown/syntax#img) possible.|false|
|resizeOriginal|When true, the original image will be resized.|true|
|cropPosition|Specifies the default crop position for [Sharp](https://sharp.pixelplumbing.com/) to use when cropping. Can be overridden on shortcode|gravity.centre|
|dirs.input|Path to input directory|./src|
|dirs.output|Path to output directory|./dist|


### Using the shortcode

The shortcode syntax is:

{% srcset image, alt, className, width, height, sizes, cropPosition %}

| Attribute | Details |
|---|---|
|image| Path to input image|
|alt|Image alt text|
|className|Desired class of output image|
|width|Image width (used to establish image aspect ratio)|
|height|Image height (used to establish image aspect ratio)|
|sizes|Image sizes attribute, e.g. "(min-width: 600px) 50vw, 100vw"|
|cropPosition|Sharp crop position, e.g. gravity.centre|
