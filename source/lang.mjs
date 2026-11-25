// Every user-facing text, one table per language. build.mjs writes one page per language from them:
//   out      where the page goes, relative to the folder above source/
//   failed   prefix of an unexpected startup error (see wrap in build.mjs)
//   js       the texts the scripts set at run time: prepended to the bundle as `const T`, read there as T.key
//   the rest fills the {{key}} placeholders of template.html ({{lang}} is the name of the table)
// The values are trusted and go into the page as they are, so no <, & or quotes in them.
export default {
  en: {
    out: 'index.html',
    failed: 'Could not start: ',
    title: 'Htone',
    night: 'Night…',
    chrome: 'Works best in Google Chrome',
    go: 'Go to the window',
    detail: 'Detail', low: 'Low', medium: 'Medium', high: 'High',
    fly: 'Fly', updown: 'Down / up', faster: 'Faster', views: 'Viewpoints',
    menu: 'Menu', sound: 'Sound', stats: 'Stats', use: 'Use', tour: 'Fly over the town',
    repo: 'Source on GitHub',
    touch: 'Hold a finger to fly · drag to turn · second finger - faster · tap - use',
    js: {
      noGpu: 'This scene needs WebGPU. Open it in a recent Chrome or Edge.',
      noAdapter: 'No graphics adapter with WebGPU found.',
      lost: 'The graphics device was lost. Reload the page.',
      shaders: 'Compiling shaders…', houses: 'Building houses…', lamps: 'Hanging lamps…', dark: 'Putting out the lights…',
      resume: 'Resume',
      // what F uses in the flat, and the word for it on a touch screen
      light: 'Light', door: 'Door', tv: 'Television', kettle: 'Kettle', tap: 'Tap',
      // the words of the stats line
      worst: 'worst frame', ms: 'ms', late: 'late', total: 'total',
    },
  },
};
