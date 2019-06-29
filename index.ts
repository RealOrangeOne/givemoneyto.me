import Bundler from 'parcel-bundler';
import { join, dirname } from 'path';
import rimraf from 'rimraf';
import { readFileSync, writeFileSync } from 'fs';
import Handlebars from 'handlebars';
import mkdirp from 'mkdirp';
import { range } from 'underscore';

const BUILD_DIR = join(__dirname, 'build');
const SRC_DIR = join(__dirname, 'src');

const BUNDLER_OPTIONS = {
  outDir: BUILD_DIR,
  watch: false,
  minify: true,
};

function writeTemplate(content: string, value: string) {
  const outputFile = join(BUILD_DIR, value, 'index.html');
  mkdirp.sync(dirname(outputFile));
  writeFileSync(outputFile, content);
}

function renderTemplate(template: HandlebarsTemplateDelegate, value: number) {
  const html = template({value});
  writeTemplate(html, value.toString());
}

(async function() {
  rimraf.sync(BUILD_DIR);

  const bundler = new Bundler(join(SRC_DIR, 'template.html'), BUNDLER_OPTIONS);

  await bundler.bundle();

  const template = Handlebars.compile(readFileSync(join(BUILD_DIR, 'template.html')).toString());

  range(0, 10, 0.5).forEach((i) => {
    console.log(i);
    renderTemplate(template, i);
  });
})();
