const React = require('react');
const {Image} = require('react-native');

const FastImage = React.forwardRef((props, ref) => (
  <Image ref={ref} {...props} />
));
FastImage.resizeMode = Image.resizeMode || {
  contain: 'contain',
  cover: 'cover',
  stretch: 'stretch',
  center: 'center',
  repeat: 'repeat',
};
FastImage.priority = {low: 'low', normal: 'normal', high: 'high'};
FastImage.cacheControl = {
  immutable: 'immutable',
  web: 'web',
  cacheOnly: 'cacheOnly',
};

module.exports = FastImage;
