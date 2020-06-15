module.exports = {
  webDependencies: [
    "delta-crdts-msgpack-codec",
    "delta-crdts",
    "text-diff",
    "buffer-es6"
  ],
  rollup: {
    plugins: [
      require('@rollup/plugin-replace')({
        values: {
          'readable-stream/transform': '_stream_transform',
          'readable-stream/duplex': '_stream_duplex'
        }
      }),
      require('rollup-plugin-node-polyfills')()
    ]
  }
}

