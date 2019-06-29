import Bundler from 'parcel-bundler';
import { join } from 'path';
import rimraf from 'rimraf';

const BUILD_DIR = join(__dirname, 'build');
const SRC_DIR = join(__dirname, 'src');

const BUNDLER_OPTIONS = {
  outDir: BUILD_DIR,
  watch: false,
  minify: true,
};

(async function() {
  rimraf.sync(BUILD_DIR);

  const bundler = new Bundler(join(SRC_DIR, 'template.html'), BUNDLER_OPTIONS);

  await bundler.bundle();
})();
