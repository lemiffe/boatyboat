# BoatyBoat Records

This is the Jekyll-based repository for boatyboat.com

## Local Development

- `gem install bundler` (needs Ruby)
- `bundle install` (might need sudo)
  - If it fails try `sudo /usr/bin/ruby /usr/local/bin/bundle install --without production`
- `bundle exec jekyll serve --watch`

## Structure

- Development
  - _includes
  - _layouts
  - _posts
  - assets - referenced like this: [Title]({{ site.url }}/assets/media/file.ext)
  - public - referenced from HTML (e.g. see _layouts)
- Release
  - _site
- Config
  - .bundle - Jekyll-related
  - .github - Release / dependabot
  - _config.yml - Site info