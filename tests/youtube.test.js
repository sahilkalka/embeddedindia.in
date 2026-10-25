const { formatYouTubeEmbedUrl, YouTubeUrlError } = require('../src/utils/youtube');

const expected = 'https://www.youtube-nocookie.com/embed/HQbmP7AgbkE?rel=0';
const supported = [
  'https://youtu.be/HQbmP7AgbkE?si=2Tyy4Rh8lPOC1SEc',
  'https://www.youtube.com/embed/HQbmP7AgbkE?si=t4jxP7XMdEBFOchf',
  '<iframe width="560" height="315" src="https://www.youtube.com/embed/HQbmP7AgbkE?si=t4jxP7XMdEBFOchf" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
  'https://www.youtube.com/watch?v=HQbmP7AgbkE&feature=shared',
  'https://m.youtube.com/watch?v=HQbmP7AgbkE',
  'https://www.youtube.com/shorts/HQbmP7AgbkE',
  'https://www.youtube.com/live/HQbmP7AgbkE',
  expected,
  "<iframe src='https://www.youtube-nocookie.com/embed/HQbmP7AgbkE?rel=0&amp;start=5'></iframe>"
];

test.each(supported)('normalizes supported YouTube input: %s', value => {
  expect(formatYouTubeEmbedUrl(value)).toBe(expected);
});
test.each(['', '   ', null, undefined])('allows an empty optional video: %s', value => {
  expect(formatYouTubeEmbedUrl(value)).toBe('');
});
test.each([
  'https://youtube.com.evil.test/embed/HQbmP7AgbkE',
  'https://evil.test/youtube.com/embed/HQbmP7AgbkE',
  'https://youtu.be/HQbmP7AgbkEextra', 'https://youtube.com/watch?v=short',
  'javascript:alert(1)', '<iframe src="javascript:alert(1)"></iframe>',
  '<iframe src="https://youtube.com/embed/HQbmP7AgbkE"></iframe><script>alert(1)</script>',
  'https://user:password@youtube.com/embed/HQbmP7AgbkE', {}, ['https://youtu.be/HQbmP7AgbkE']
])('rejects unsupported or malformed input: %s', value => {
  expect(() => formatYouTubeEmbedUrl(value)).toThrow(YouTubeUrlError);
});
