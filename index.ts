import Bundler from 'parcel-bundler';
import { join, dirname } from 'path';
import rimraf from 'rimraf';
import { readFileSync, writeFileSync } from 'fs';
import Handlebars from 'handlebars';
import mkdirp from 'mkdirp';
import { range } from 'underscore';
import ProgressBar from 'progress';

const BUILD_DIR = join(__dirname, 'build');
const SRC_DIR = join(__dirname, 'src');
const PROGRESS_BAR_FORMAT = '[:bar] :rate/ps :percent :current/:total';
const MAX_VALUE = process.env.MAX_VALUE ? parseInt(process.env.MAX_VALUE) : 10;

const BUNDLER_OPTIONS = {
  outDir: BUILD_DIR,
  watch: false,
  minify: true,
};

function statusOutput(message: string) {
  console.log('> ' + message + '...');
}

function isPrecision(value: number, precision: number) {
  return parseFloat(value.toFixed(precision)) === value;
}

function writeTemplate(content: string, value: string) {
  const outputFile = join(BUILD_DIR, value, 'index.html');
  mkdirp.sync(dirname(outputFile));
  writeFileSync(outputFile, content);
}

function renderTemplate(template: HandlebarsTemplateDelegate, value: number) {
  const html = template({ value });
  writeTemplate(html, value.toString());
  if (isPrecision(value, 1)) {
    writeTemplate(html, value.toString() + '0');
  }
  if (isPrecision(value, 0)) {
    writeTemplate(html, value.toString() + '.0');
    writeTemplate(html, value.toString() + '.00');
  }
}

(async function() {
  rimraf.sync(BUILD_DIR);

  statusOutput('Creating template');
  const bundler = new Bundler(join(SRC_DIR, 'template.html'), BUNDLER_OPTIONS);
  await bundler.bundle();

  statusOutput('Compiling HTML template');
  const template = Handlebars.compile(
    readFileSync(join(BUILD_DIR, 'template.html')).toString()
  );

  const possibleValues = range(0, MAX_VALUE, 0.01);
  const bar = new ProgressBar(PROGRESS_BAR_FORMAT, {
    total: possibleValues.length,
    width: 40,
  });

  statusOutput('Generating pages');
  possibleValues.forEach(i => {
    if (i) {
      renderTemplate(template, parseFloat(i.toFixed(2)));
    }
    bar.tick();
  });
})();
